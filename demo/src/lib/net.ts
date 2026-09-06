/**
 * net.ts — CAPA DE RED FIABLE del oráculo (v12).
 *
 * Todo conector nuevo pasa por aquí para que la fiabilidad sea MEDIBLE, no
 * prometida:
 *
 *   • LEDGER DE SALUD — cada petición (API, scraper o DoH) queda registrada
 *     con estado, latencia, URL real, vía y timestamp ISO. El panel
 *     "Fuentes consultadas" del informe se construye con esto: el usuario
 *     ve QUÉ se consultó, CUÁNDO y QUÉ devolvió — incluso los fallos.
 *   • REINTENTOS CON BACKOFF — 401/403/429/5xx y fallos de red se reintentan
 *     (backoff exponencial con jitter). Caso real medido: r.jina.ai anónimo
 *     devuelve 401 transitorio "bad IP reputation" en ráfagas y responde 200
 *     al reintento — sin reintento, la misión pierde fuentes por ruido.
 *   • SEMÁFORO de concurrencia para el lector (respeta su rate-limit anónimo).
 *   • DoH DUAL — Cloudflare primero, Google (dns.google/resolve, CORS ✓
 *     verificado) como respaldo: una sonda DNS no falla por un proveedor caído.
 *
 * Nada simulado: si una fuente falla tras los reintentos, queda como
 * "bloqueada" o "error" en el ledger y el informe lo dice.
 */

/** Estado de una fuente consultada. */
export type NetStatus = "ok" | "empty" | "blocked" | "error";

/* ── CIRCUIT BREAKER por conector (v13) ──────────────────────────────────
 * Si un conector acumula fallos consecutivos dentro de la misma misión se
 * abre su breaker: el resto de la misión NO vuelve a gastar presupuesto de
 * red en él (falla en <1ms con estado "blocked") y el panel de fuentes lo
 * muestra. Un analista humano también deja de golpear una puerta cerrada.
 * Se resetea con el ledger en cada misión nueva. */

const BREAKER_THRESHOLD = 3;

interface BreakerState {
  fails: number;
  open: boolean;
  trippedAt?: string;
}

const breakers = new Map<string, BreakerState>();

function breakerOpen(key: string): boolean {
  return breakers.get(key)?.open ?? false;
}

function recordFail(key: string): void {
  const b = breakers.get(key) ?? { fails: 0, open: false };
  b.fails++;
  if (b.fails >= BREAKER_THRESHOLD && !b.open) {
    b.open = true;
    b.trippedAt = nowIso();
  }
  breakers.set(key, b);
}

function recordOk(key: string): void {
  const b = breakers.get(key);
  if (b) {
    b.fails = 0;
    b.open = false;
  }
}

/** Instantánea del estado de los breakers de esta misión (auditable en el export). */
export function breakerSnapshot(): { key: string; fails: number; open: boolean; trippedAt: string | null }[] {
  return [...breakers.entries()].map(([key, b]) => ({ key, fails: b.fails, open: b.open, trippedAt: b.trippedAt ?? null }));
}

export interface NetEntry {
  key: string;
  label: string;
  /** URL real solicitada (defendible y auditable). */
  endpoint: string;
  /** "directo" | "r.jina.ai" | "cloudflare-doh" | "google-doh" */
  via: string;
  status: NetStatus;
  http?: number;
  ms: number;
  count: number;
  /** Timestamp ISO del momento de la consulta (cadena de custodia). */
  at: string;
  error?: string;
}

const ledger: NetEntry[] = [];

/** Copia del ledger de salud de esta misión. */
export function netLedger(): NetEntry[] {
  return [...ledger];
}

/** Pone el ledger y los breakers a cero al empezar una misión (nunca contamina otra). */
export function resetNetLedger(): void {
  ledger.length = 0;
  breakers.clear();
}

function log(entry: NetEntry): void {
  // keep the newest 120 entries — el panel es legible, no un volcado infinito
  ledger.push(entry);
  if (ledger.length > 120) ledger.shift();
}

const nowIso = () => new Date().toISOString();

/* ── semáforo para el lector público (rate-limit anónimo por IP) ──────────── */

const READER_CONC = 3;
let readerActive = 0;
const readerQueue: (() => void)[] = [];

async function readerSlot(): Promise<void> {
  if (readerActive < READER_CONC) {
    readerActive++;
    return;
  }
  await new Promise<void>((r) => readerQueue.push(r));
  readerActive++;
}
function readerRelease(): void {
  readerActive--;
  const next = readerQueue.shift();
  if (next) next();
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Reintentable: 401/403/429/5xx y errores de red/timeout. 4xx de datos no. */
function retryable(http: number | undefined, err?: unknown): boolean {
  if (http !== undefined) return http === 401 || http === 403 || http === 429 || http >= 500;
  return true; // timeout / red
}

export interface NetOpts<T = unknown> {
  key: string;
  label: string;
  ms?: number;
  retries?: number;
  /** Cómo contar resultados (para el ledger). Por defecto 1 si hay datos. */
  count?: (data: T) => number;
  /** Validación de forma (v13): si la API responde 200 pero con una estructura
   * inesperada (p.ej. una página HTML de error con status 200), NO entra a las
   * señales — se registra como error "respuesta no reconocida" y no se reintenta
   * (la forma no cambia entre intentos). Fiabilidad: los conectores validan lo
   * que esperan ANTES de usarlo. */
  shape?: (data: T) => boolean;
}

/** GET JSON directo (CORS abierto) con reintentos y registro de salud. */
export async function jsonGet<T>(url: string, opts: NetOpts<T>): Promise<T> {
  const { key, label, ms = 10000, retries = 1 } = opts;
  const t0 = Date.now();
  let lastHttp: number | undefined;
  let lastErr: unknown;
  // Circuit breaker: si ya está abierto, falla sin gastar red.
  if (breakerOpen(key)) {
    log({ key, label, endpoint: url, via: "directo", status: "blocked", ms: 0, count: 0, at: nowIso(), error: "circuit-breaker abierto (fallos consecutivos previos en esta misión)" });
    throw new Error(`breaker:${key}`);
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: "application/json" }, cache: "no-store" });
      lastHttp = res.status;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      if (opts.shape && !opts.shape(data)) {
        // Forma inesperada: error de fiabilidad, sin reintento (la forma no cambia entre intentos).
        recordFail(key);
        log({ key, label, endpoint: url, via: "directo", status: "error", http: res.status, ms: Date.now() - t0, count: 0, at: nowIso(), error: "respuesta no reconocida (forma inesperada)" });
        throw new Error("shape");
      }
      const count = opts.count ? opts.count(data) : 1;
      recordOk(key);
      log({ key, label, endpoint: url, via: "directo", status: count === 0 ? "empty" : "ok", http: res.status, ms: Date.now() - t0, count, at: nowIso() });
      return data;
    } catch (e) {
      lastErr = e;
      const msgText = e instanceof Error ? e.message : "";
      if (msgText === "shape") break; // ya registrado arriba, no reintentar
      const http = /HTTP (\d+)/.exec(msgText)?.[1];
      lastHttp = http ? Number(http) : undefined;
      if (attempt < retries && retryable(lastHttp, e)) {
        await sleep(700 * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
        continue;
      }
      break;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : "error";
  if (msg !== "shape") recordFail(key);
  const blocked = (lastHttp !== undefined && (lastHttp === 401 || lastHttp === 403 || lastHttp === 429)) || msg.startsWith("breaker:");
  log({ key, label, endpoint: url, via: "directo", status: blocked ? "blocked" : "error", http: lastHttp, ms: Date.now() - t0, count: 0, at: nowIso(), error: msg });
  throw lastErr;
}

const JINA = "https://r.jina.ai/";
import { jinaHeaders } from "@/lib/jina-auth";

/** GET de una página vía lector r.jina.ai (markdown) con reintentos y ledger. */
export async function readerGet(url: string, opts: NetOpts<string>): Promise<string> {
  const { key, label, ms = 30000, retries = 2 } = opts;
  const t0 = Date.now();
  let lastHttp: number | undefined;
  let lastErr: unknown;
  // Circuit breaker (comparte registro con el JSON directo: mismo conector lógico).
  if (breakerOpen(key)) {
    log({ key, label, endpoint: url, via: "r.jina.ai", status: "blocked", ms: 0, count: 0, at: nowIso(), error: "circuit-breaker abierto (fallos consecutivos previos en esta misión)" });
    throw new Error(`breaker:${key}`);
  }
  await readerSlot();
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(JINA + url, { signal: AbortSignal.timeout(ms), headers: { "X-Return-Format": "markdown", ...jinaHeaders() }, cache: "no-store" });
        lastHttp = res.status;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        recordOk(key);
        log({ key, label, endpoint: url, via: "r.jina.ai", status: text.length < 40 ? "empty" : "ok", http: res.status, ms: Date.now() - t0, count: 1, at: nowIso() });
        return text;
      } catch (e) {
        lastErr = e;
        const http = /HTTP (\d+)/.exec(e instanceof Error ? e.message : "")?.[1];
        lastHttp = http ? Number(http) : undefined;
        if (attempt < retries && retryable(lastHttp, e)) {
          await sleep(800 * Math.pow(2, attempt) + Math.floor(Math.random() * 300));
          continue;
        }
        break;
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : "error";
    recordFail(key);
    const blocked = lastHttp !== undefined && (lastHttp === 401 || lastHttp === 403 || lastHttp === 429);
    log({ key, label, endpoint: url, via: "r.jina.ai", status: blocked ? "blocked" : "error", http: lastHttp, ms: Date.now() - t0, count: 0, at: nowIso(), error: msg });
    throw lastErr;
  } finally {
    readerRelease();
  }
}

/** GET JSON a través del lector (APIs sin CORS) con ledger — para crt.sh etc. */
export async function readerJson<T>(url: string, opts: NetOpts<T>): Promise<T> {
  const text = await readerGet(url, opts as NetOpts<string>);
  const start = text.indexOf('{"');
  if (start === -1) throw new Error("respuesta sin JSON");
  return JSON.parse(text.slice(start)) as T;
}

/* ── DoH dual: Cloudflare primero, Google de respaldo ─────────────────────── */

export interface DohResult {
  alive: boolean;
  answers: number;
  provider: "cloudflare" | "google" | "ambos-fallaron";
}

const dohMemo = new Map<string, DohResult>();

async function dohProvider(domain: string, base: string, accept: string, ms: number): Promise<{ alive: boolean; answers: number }> {
  const res = await fetch(`${base}?name=${encodeURIComponent(domain)}&type=A`, {
    signal: AbortSignal.timeout(ms),
    headers: { Accept: accept },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { Status?: number; Answer?: { type?: number }[] };
  const answers = (d.Answer ?? []).filter((a) => a.type === 1).length;
  return { alive: d.Status === 0 && answers > 0, answers };
}

/**
 * Resolución DNS-over-HTTPS con proveedor dual y memo.
 * Cloudflare exige Accept: application/dns-json EXACTO; Google usa
 * dns.google/resolve (JSON normal). Si el primero falla o se agota,
 * el segundo responde — la sonda de dominios no se rinde por un proveedor.
 */
export async function dohResolve(domain: string, key = "doh", label = "DoH (DNS real)"): Promise<DohResult> {
  const memoKey = `${key}:${domain}`;
  const hit = dohMemo.get(memoKey);
  if (hit) return hit;
  const t0 = Date.now();
  const attempts: { base: string; accept: string; provider: "cloudflare" | "google" }[] = [
    { base: "https://cloudflare-dns.com/dns-query", accept: "application/dns-json", provider: "cloudflare" },
    { base: "https://dns.google/resolve", accept: "application/json", provider: "google" },
  ];
  let lastErr: unknown;
  for (const a of attempts) {
    try {
      const r = await dohProvider(domain, a.base, a.accept, 6500);
      const out: DohResult = { ...r, provider: a.provider };
      dohMemo.set(memoKey, out);
      log({ key, label: `${label} (${a.provider})`, endpoint: `${a.base}?name=${domain}&type=A`, via: a.provider === "cloudflare" ? "cloudflare-doh" : "google-doh", status: r.alive ? "ok" : "empty", ms: Date.now() - t0, count: r.answers, at: nowIso() });
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  const out: DohResult = { alive: false, answers: 0, provider: "ambos-fallaron" };
  dohMemo.set(memoKey, out);
  log({ key, label, endpoint: `cloudflare+google DoH → ${domain}`, via: "cloudflare-doh", status: "error", ms: Date.now() - t0, count: 0, at: nowIso(), error: lastErr instanceof Error ? lastErr.message : "ambos proveedores DoH fallaron" });
  return out;
}

/** Limpia el memo DoH entre misiones. */
export function resetNetMemos(): void {
  dohMemo.clear();
}
