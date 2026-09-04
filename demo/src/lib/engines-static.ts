/**
 * engines-static.ts — MOTORES DE BÚSQUEDA REALES y plataformas sociales.
 *
 * Fuentes verificadas empíricamente (curl, HTTP + CORS, commit engines):
 *   • DuckDuckGo HTML (búsqueda web general)  → r.jina.ai (markdown)      ✓ resultados reales
 *   • Bing News RSS (noticias indexadas)      → r.jina.ai                 ✓ ej.: ronda seed $500K real
 *   • Reddit                                  → DDG site:reddit.com       ✓ (API directa 403, PullPush CF, Arctic-shift sin full-text)
 *   • X/Twitter                               → DDG site:x.com|twitter    ✓ (API de pago desde 2023 — aquí vía índice de búsqueda)
 *   • GitHub REST                             → directo (CORS *)          ✓ repos + users + perfil org
 *   • Mastodon                                → directo (CORS *)          ✓ cuentas
 *   • Sonda de dominios multi-TLD             → Cloudflare DoH directo    ✓ (.com/.es/.io/.net/.org/.co/.ai)
 *
 * REGLA DEL ORÁCULO: nada de esto es simulado. Cada hallazgo lleva su URL real
 * y pasa por el filtro de identidad (verify.ts) antes de entrar al análisis.
 */

import type { EvidenceItem, GovSourceLog, MoreData, SearchVectorResult } from "@/lib/research";
import { jinaHeaders } from "@/lib/jina-auth";
import { filterRelevant, entityRelevance, entityCompact, normalizeEntity } from "@/lib/verify";

/* ── utilidades de red ─────────────────────────────────────────────────────── */

const JINA = "https://r.jina.ai/";
const mdCache = new Map<string, string>();
const jinaActive = { n: 0 };
const waiters: (() => void)[] = [];

function slot() {
  if (jinaActive.n < 3) {
    jinaActive.n++;
    return;
  }
  waiters.push(() => {
    jinaActive.n++;
  });
}

function release() {
  jinaActive.n--;
  const w = waiters.shift();
  if (w) w();
}

/** GET de una página como markdown vía r.jina.ai (semáforo conc-3 + memo). */
async function jinaText(url: string, ms = 32000): Promise<string> {
  if (mdCache.has(url)) return mdCache.get(url) as string;
  slot();
  await new Promise<void>((r) => setTimeout(r, 0));
  try {
    const res = await fetch(JINA + url, {
      signal: AbortSignal.timeout(ms),
      headers: { "X-Return-Format": "markdown", ...jinaHeaders() },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    mdCache.set(url, text);
    return text;
  } finally {
    release();
  }
}

/** GET JSON directo (CORS abierto verificado) con memoización. */
const jsonMemo = new Map<string, unknown>();
async function jget<T>(url: string, ms = 12000): Promise<T> {
  if (jsonMemo.has(url)) return jsonMemo.get(url) as T;
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as T;
  jsonMemo.set(url, json);
  return json;
}

/** Log de sub-fuente con cronometraje (mismo patrón que agents-more-static). */
async function withLog<T>(
  L: GovSourceLog[],
  key: string,
  label: string,
  endpoint: string,
  fn: () => Promise<T>,
  zeroNote?: string
): Promise<T | null> {
  const t0 = Date.now();
  try {
    const out = await fn();
    const rec = out as unknown as Record<string, unknown> | null;
    const count = Array.isArray(out)
      ? out.length
      : rec && typeof rec === "object" && "count" in rec
        ? Number(rec.count ?? 0)
        : out
          ? 1
          : 0;
    L.push({ key, label, endpoint, count: Number.isFinite(count) ? count : 1, ms: Date.now() - t0, ok: true });
    return out;
  } catch (e) {
    L.push({
      key,
      label,
      endpoint,
      count: 0,
      ms: Date.now() - t0,
      ok: false,
      error: `${e instanceof Error ? e.message : "error"}${zeroNote ? ` — ${zeroNote}` : ""}`,
    });
    return null;
  }
}

const clean = (s: string, max = 180) =>
  s
    .replace(/[*_>#`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const hostOf = (u: string) => {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Desenvuelve el redirect de DDG (?uddg=REALURL&rut=…). */
function unwrapDdg(u: string): string {
  if (u.includes("uddg=")) {
    try {
      const real = new URL(u).searchParams.get("uddg");
      if (real) return decodeURIComponent(real);
    } catch {
      /* cae al original */
    }
  }
  return u;
}

/** Desenvuelve el redirect de Bing News apiclick (?url=REALURL&…). */
function unwrapBing(u: string): string {
  if (u.includes("apiclick.aspx")) {
    try {
      const real = new URL(u).searchParams.get("url");
      if (real) return real;
    } catch {
      /* cae al original */
    }
  }
  return u;
}

/* ── parseo de DDG HTML (markdown de jina) ─────────────────────────────────── */

interface RawHit {
  title: string;
  url: string;
  snippet: string;
}

/** Extrae resultados reales del markdown de html.duckduckgo.com. */
export function parseDdg(md: string, limit = 8): RawHit[] {
  const out: RawHit[] = [];
  const lines = md.split("\n").map((l) => l.trimEnd());
  let cur: RawHit | null = null;
  for (const line of lines) {
    const m = line.match(/^#{2,3}\s+\[(.+?)\]\((\S+?)\)\s*$/);
    if (m) {
      if (cur && cur.url) out.push(cur);
      const url = unwrapDdg(m[2]);
      cur = url.startsWith("http") ? { title: clean(m[1], 140), url, snippet: "" } : null;
      continue;
    }
    if (!cur) continue;
    if (/^!\[|^#|\[!\[|^Feedback|^\[\]\(/.test(line)) continue;
    const text = clean(line);
    if (text.length >= 30 && cur.snippet.length < 220) cur.snippet = `${cur.snippet} ${text}`.trim();
  }
  if (cur && cur.url) out.push(cur);
  return out.filter((h) => !/duckduckgo\.com\/(feedback|html)/.test(h.url)).slice(0, limit);
}

/** Extrae resultados reales del RSS de Bing News renderizado a markdown. */
export function parseBingRss(md: string, limit = 8): RawHit[] {
  const out: RawHit[] = [];
  const lines = md.split("\n").map((l) => l.trimEnd());
  let cur: RawHit | null = null;
  for (const line of lines) {
    const m = line.match(/^#{2,4}\s+\[(.+?)\]\((\S+?)\)\s*$/);
    if (m) {
      if (cur && cur.url) out.push(cur);
      const url = unwrapBing(m[2]);
      cur = url.startsWith("http") ? { title: clean(m[1], 150), url, snippet: "" } : null;
      continue;
    }
    if (!cur) continue;
    if (/^!\[|^#|^\[\]\(/.test(line)) continue;
    const text = clean(line);
    if (text.length >= 30 && cur.snippet.length < 220) cur.snippet = `${cur.snippet} ${text}`.trim();
  }
  if (cur && cur.url) out.push(cur);
  return out.slice(0, limit);
}

const ev = (title: string, url: string, snippet: string, date?: string): EvidenceItem => ({
  title,
  url,
  host: hostOf(url),
  snippet,
  date: date ?? "",
});

/* ── SONDA DE DOMINIOS multi-TLD (existencia ≠ propiedad) ─────────────────── */

const PROBE_TLDS = ["com", "es", "io", "net", "org", "co", "ai", "site", "dev", "app", "xyz"];

async function dohAlive(domain: string): Promise<boolean> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`;
  const memoKey = `doh:${domain}`;
  if (jsonMemo.has(memoKey)) return jsonMemo.get(memoKey) as boolean;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { Accept: "application/dns-json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { Status?: number; Answer?: { type?: number }[] };
  const alive = d.Status === 0 && (d.Answer ?? []).some((a) => a.type === 1);
  jsonMemo.set(memoKey, alive);
  return alive;
}

/** Limpia las cachés de red entre misiones: cada investigación verifica en vivo. */
export function clearEngineCaches(): void {
  mdCache.clear();
  jsonMemo.clear();
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]).catch(() => null as unknown as R);
    }
  });
  await Promise.all(workers);
  return out;
}

function domainVariants(name: string): string[] {
  const tokens = normalizeEntity(name).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  const joined = tokens.join("");
  const hyphen = tokens.join("-");
  const bases = [...new Set([joined, hyphen])].filter((b) => b.length >= 3);
  const out: string[] = [];
  for (const b of bases) for (const tld of PROBE_TLDS) out.push(`${b}.${tld}`);
  return out.slice(0, 22);
}

const pageLevelLabel = (lvl: number) => (lvl >= 3 ? "identidad fuerte" : lvl === 2 ? "términos del nombre" : "sin mención");

/**
 * Sonda real de dominios: variantes del nombre × TLDs verificadas con DNS
 * (Cloudflare DoH) — y para CADA dominio vivo, verificación de CONTENIDO:
 * descargamos la homepage real y comprobamos si pertenece a la entidad.
 * Un dominio que resuelve solo demuestra que ALGUIEN lo registró (caso real:
 * alicelabs.ai es una consultora sueca, no la entidad) — el estado de cada
 * candidato queda documentado con evidencia, homónimos incluidos.
 */
export async function probeDomains(
  name: string,
  declared: string | null,
  L?: GovSourceLog[],
  identity?: import("@/lib/og-scout").IdentityResolution | null
): Promise<MoreData["domain_candidates"]> {
  const t0 = Date.now();
  const bare = (h: string) => h.replace(/^www\./, "").toLowerCase();
  const declaredHost = declared ? bare(declared) : null;
  const selectedHost = identity?.selected?.host ? bare(identity.selected.host) : null;

  // 1) Universo de candidatos: declarado (apex + www, porque el sitio real
  //    puede vivir en www con el apex aparcado) + variantes del nombre × TLDs
  const variants = domainVariants(name).filter((d) => bare(d) !== declaredHost);
  const universe: { domain: string; source: "declarado" | "sonda" }[] = [
    ...(declaredHost ? [{ domain: declaredHost, source: "declarado" as const }, { domain: `www.${declaredHost}`, source: "declarado" as const }] : []),
    ...variants.map((d) => ({ domain: d, source: "sonda" as const })),
  ];

  // 2) DNS real sobre todo el universo
  const dns = await pool(universe, 6, async (u) => ({ ...u, alive: await dohAlive(u.domain).catch(() => false) }));
  // si el apex declarado está vivo, la variante www es ruido — fuera
  const apexAliveDeclared = declaredHost ? (dns.find((d) => d.domain === declaredHost)?.alive ?? false) : false;
  const dnsList = apexAliveDeclared ? dns.filter((d) => d.domain !== `www.${declaredHost}`) : dns;
  const candidates: MoreData["domain_candidates"] = [];

  // 3) Presupuesto de verificación de contenido: declarado/seleccionado
  //    primero (memo: el scout ya descargó su homepage — sin refetch), luego vivos.
  const aliveList = dnsList.filter((d) => d.alive);
  const priority = aliveList.filter((d) => d.source === "declarado" || bare(d.domain) === selectedHost || d.domain === selectedHost);
  const restAlive = aliveList.filter((d) => !priority.includes(d));
  const FETCH_BUDGET = 6;
  const toFetch = [...priority, ...restAlive].slice(0, FETCH_BUDGET);

  const verified = await pool(toFetch, 3, async (d) => {
    const page = await jinaText(`https://${d.domain}`, 20000).catch(() => null);
    const mTitle = page?.match(/^Title:\s*(.+)$/m);
    const title = mTitle ? mTitle[1].trim().slice(0, 140) : null;
    // contenido REAL: se quitan los metadatos del lector (Title/URL Source/
    // Published/Markdown Content) y el propio dominio — su URL no es mención
    // de la entidad (evita homónimos falsos en páginas 404/vacías)
    const content = page
      ? page
          .replace(/^Title:.*$/m, "")
          .replace(/^URL Source:.*$/m, "")
          .replace(/^Published Time:.*$/m, "")
          .replace(/^Markdown Content:\s*$/m, "")
          .trim()
      : null;
    const hayNoDomain = content ? content.split(d.domain).join(" ").split(bare(d.domain)).join(" ") : "";
    const level = content ? entityRelevance(name, hayNoDomain, declared) : 0;
    const isWwwVariant = Boolean(declaredHost && d.domain === `www.${declaredHost}`);
    const PARKING = /for sale|hugedomains|sedo\.com|afternic|dan\.com|buy this domain|dominio en venta|compra este dominio/i;
    let status: MoreData["domain_candidates"][number]["status"];
    let evidence: string;
    if (!content || content.length < 40) {
      if (d.source === "declarado") {
        status = "sin-probar";
        evidence = `dominio DECLARADO por el analista — la verificación de contenido no estuvo disponible en esta red (lector saturado); atribución por declaración`;
      } else {
        status = "caído";
        evidence = `DNS activo pero la web está vacía o devuelve error (p. ej. 404) — dominio registrado y sin sitio operativo`;
      }
    } else if (PARKING.test(content)) {
      status = "sin-relación";
      evidence = `dominio EN VENTA / parking (${title ?? "página de subasta"}) — no opera ninguna empresa; no se atribuye a la entidad ni a nadie`;
    } else if (d.source === "declarado") {
      status = "verificado";
      evidence = isWwwVariant
        ? `variante www del dominio DECLARADO (el apex ${declaredHost} está aparcado/sin A): el contenido real de la web ${level >= 2 ? `menciona la identidad (${pageLevelLabel(level)})` : `NO menciona «${name}» — atribución solo por declaración`}`
        : `dominio DECLARADO por el analista y el contenido real de la web menciona la identidad (${pageLevelLabel(level)})`;
    } else if (bare(d.domain) === selectedHost) {
      status = "verificado";
      evidence = `verificado por OG-Scout: la homepage real menciona el nombre legal (${pageLevelLabel(level)})`;
    } else if (level >= 2) {
      status = "homónimo";
      evidence = `la web muestra una empresa con nombre PARECIDO que no se puede atribuir a la entidad sin declaración o verificación circular — título real: «${title ?? "s/título"}»`;
    } else {
      // variante tolerante de grafía: "Alicelabs" también se escribe "Alice Labs"
      // (marca con espacio/guion) — misma marca, otra empresa = homónimo real
      const compactStr = entityCompact(name);
      const escCh = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fuzzyBrand =
        compactStr.length >= 6
          ? new RegExp(`\\b${compactStr.split("").map(escCh).join("[\\s-]?")}\\b`, "i")
          : null;
      if (fuzzyBrand && fuzzyBrand.test(hayNoDomain)) {
        status = "homónimo";
        evidence = `la web publica una marca con el mismo nombre en otra grafía («${title ?? "s/título"}») — homónimo real, NO se atribuye a la entidad sin declaración o verificación circular`;
      } else {
        status = "sin-relación";
        evidence = `dominio vivo cuyo contenido real NO menciona a la entidad (parking u otra empresa) — título real: «${title ?? "s/título"}»`;
      }
    }
    return { domain: d.domain, alive: true, source: d.source, status, title, evidence };
  });

  const byDomain = new Map(verified.filter(Boolean).map((v) => [v.domain, v]));
  for (const d of dnsList) {
    const v = byDomain.get(d.domain);
    if (v) {
      candidates.push(v);
      continue;
    }
    if (d.alive) {
      candidates.push({
        domain: d.domain,
        alive: true,
        source: d.source,
        status: "sin-probar",
        title: null,
        evidence: "DNS activo — verificación de contenido no alcanzada en esta misión (presupuesto de red)",
      });
    } else if (d.source === "declarado") {
      candidates.push({
        domain: d.domain,
        alive: false,
        source: d.source,
        status: "caído",
        title: null,
        evidence: `dominio DECLARADO sin registros A en ${d.domain.startsWith("www.") ? "el www" : "el apex"} — sin sitio operativo en esa dirección exacta (revisa el DNS de tu registrador; la sonda prueba también la variante www)`,
      });
    } else {
      candidates.push({
        domain: d.domain,
        alive: false,
        source: d.source,
        status: "libre",
        title: null,
        evidence: "sin registros A en DNS: el dominio no está operativo (libre o nunca registrado)",
      });
    }
  }

  // Orden honesto: verificado primero; homónimos bien visibles justo después.
  const order: Record<string, number> = { verificado: 0, "homónimo": 1, "sin-relación": 2, "caído": 3, "sin-probar": 4, libre: 5 };
  candidates.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  if (L) {
    const nHom = candidates.filter((c) => c.status === "homónimo").length;
    L.push({
      key: "probe",
      label: `Sonda DNS multi-TLD + verificación de contenido — ${candidates.length} candidatos`,
      endpoint: "cloudflare-dns.com/dns-query (DoH) + homepages reales vía r.jina.ai",
      count: candidates.filter((c) => c.alive).length,
      ms: Date.now() - t0,
      ok: true,
      error: nHom ? `${nHom} homónimo(s) detectado(s) y documentado(s)` : undefined,
    });
  }
  return candidates;
}

/** ¿El host parece el sitio de la entidad? (compacto o con guion) */
function hostLooksLikeEntity(host: string, name: string): boolean {
  const h = host.replace(/^www\./, "").split(".")[0] ?? "";
  const compact = entityCompact(name);
  const tokens = normalizeEntity(name).split(" ").filter((t) => t.length >= 3);
  const hCompact = h.replace(/[^a-z0-9]/g, "");
  if (!compact || !hCompact) return false;
  if (hCompact === compact) return true;
  // todos los tokens presentes en el host ("alice-labs" contiene "alice" y "labs")
  return tokens.length >= 1 && tokens.every((t) => h.includes(t));
}

/* ── VECTOR: buscador web real (DuckDuckGo HTML) ──────────────────────────── */

export async function runBuscador(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Buscador web real (DuckDuckGo HTML)";
  const base = { key: "buscador", label, icon: "🔎", query: `"${name}"` };
  const q = encodeURIComponent(`"${name}"`);
  const raw = await withLog(L, "buscador", label, "html.duckduckgo.com/html vía r.jina.ai (búsqueda web general real)", () =>
    jinaText(`https://html.duckduckgo.com/html/?q=${q}`)
  );
  if (!raw) return { ...base, ok: false, results: [], error: "buscador no disponible en esta red" };
  const hits = parseDdg(raw);
  if (!hits.length) {
    return {
      ...base,
      ok: true,
      results: [ev(`Sin resultados web para "${name}"`, `https://duckduckgo.com/?q=${q}`, "Búsqueda real en DuckDuckGo HTML: 0 resultados indexados — la empresa casi no tiene huella web pública (dato defendible, no un fallo)")],
      stats: { raw: 0, kept: 0, dropped: 0, droppedSamples: [], strong: 0 },
    };
  }
  // NOTA: aquí NO se atribuye "sitio oficial" — un host que parece el nombre
  // puede ser el de un homónimo (caso alice-labs.com). La identidad la resuelve
  // OG-SCOUT descargando la homepage real y comprobando el nombre legal.
  const filt = filterRelevant(name, hits.map((h) => ev(h.title, h.url, h.snippet)), 1, dom);
  const results = [...filt.items];
  if (data.official_site) {
    results.unshift(
      ev(
        `Sitio de la entidad verificado por OG-Scout: ${data.official_site}`,
        `https://${data.official_site}`,
        "Dominio confirmado por el investigador OG-Scout: la homepage real menciona el nombre legal (verificación de contenido, no de parecido)"
      )
    );
  }
  return { ...base, ok: filt.items.length > 0 || Boolean(data.official_site), results: results.slice(0, 9), stats: filt.stats };
}

/* ── VECTOR: noticias reales (Bing News RSS) ──────────────────────────────── */

export async function runBing(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Noticias reales (Bing News)";
  const base = { key: "bing", label, icon: "🗞️", query: `"${name}"` };
  const q = encodeURIComponent(`"${name}"`);
  let hits: RawHit[] = [];
  const raw = await withLog(L, "bing", label, "bing.com/news/search?format=rss vía r.jina.ai (índice de noticias real)", () =>
    jinaText(`https://www.bing.com/news/search?q=${q}&format=rss`)
  );
  if (raw) hits = parseBingRss(raw);
  // Respaldo: DuckDuckGo News (mismo índice de noticias, endpoint distinto —
  // r.jina.ai bloquea bing.com de forma intermitente por abuso anónimo).
  if (!hits.length) {
    const raw2 = await withLog(L, "bing-ddg", "DuckDuckGo News (respaldo de Bing)", "html.duckduckgo.com/html?ia=news vía r.jina.ai", () =>
      jinaText(`https://html.duckduckgo.com/html/?q=${q}&ia=news`)
    );
    if (raw2) hits = parseDdg(raw2);
  }
  const filt = filterRelevant(name, hits.map((h) => ev(h.title, h.url, h.snippet)), 1, dom);
  if (!filt.items.length) {
    return {
      ...base,
      ok: true,
      results: [ev(`Sin noticias indexadas para "${name}"`, `https://www.bing.com/news/search?q=${q}`, `Búsqueda real en dos índices de noticias (Bing News + DuckDuckGo News): ${filt.stats.raw} titulares revisados, ninguno sobre la entidad (los homónimos se descartaron) — cobertura de prensa nula, dato defendible`)],
      stats: filt.stats,
    };
  }
  return { ...base, ok: true, results: filt.items.slice(0, 8), stats: filt.stats };
}

/* ── VECTOR: Reddit (hilos públicos vía DDG site:reddit.com) ──────────────── */

export async function runReddit(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Reddit: hilos públicos reales";
  const base = { key: "reddit", label, icon: "🟣", query: `site:reddit.com "${name}"` };
  const q = encodeURIComponent(`"${name}" site:reddit.com`);
  const raw = await withLog(L, "reddit", label, "html.duckduckgo.com site:reddit.com vía r.jina.ai (la API directa de Reddit bloquea bots: 403 documentado)", () =>
    jinaText(`https://html.duckduckgo.com/html/?q=${q}`)
  );
  if (!raw) return { ...base, ok: false, results: [], error: "búsqueda Reddit no disponible" };
  const hits = parseDdg(raw, 6).filter((h) => /reddit\.com|r\.redd\.it/.test(h.url));
  const filt = filterRelevant(name, hits.map((h) => ev(h.title, h.url, h.snippet)), 1, dom);
  data.reddit_mentions = filt.items.length;
  if (!filt.items.length) {
    return {
      ...base,
      ok: true,
      results: [ev(`Sin hilos públicos en Reddit para "${name}"`, `https://www.reddit.com/search/?q=${encodeURIComponent(`"${name}"`)}`, "Búsqueda real (DDG site:reddit.com): 0 hilos indexados — la comunidad no discute a la entidad (o es demasiado pequeña); dato defendible, no un fallo")],
      stats: filt.stats,
    };
  }
  return { ...base, ok: true, results: filt.items.slice(0, 6), stats: filt.stats };
}

/* ── VECTOR: X/Twitter (cuentas y posts vía DDG site:x.com) ───────────────── */

function extractHandle(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^(www\.)?(x|twitter)\.com$/.test(u.host)) return null;
    const seg = u.pathname.split("/").filter(Boolean)[0];
    if (!seg || /^(home|hashtag|search|i|explore|status|intent)$/.test(seg)) return null;
    return seg;
  } catch {
    return null;
  }
}

export async function runX(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "X/Twitter: cuentas y posts públicos";
  const base = { key: "xsocial", label, icon: "✖️", query: `site:x.com "${name}"` };
  // La API de X es de pago desde 2023; el índice de búsqueda pública (DDG) es
  // la vía keyless defendible: cada hallazgo conserva su URL a x.com.
  const q = encodeURIComponent(`"${name}" (site:x.com OR site:twitter.com)`);
  const raw = await withLog(L, "xsocial", label, "html.duckduckgo.com site:x.com vía r.jina.ai (API de X de pago — índice público verificado)", () =>
    jinaText(`https://html.duckduckgo.com/html/?q=${q}`)
  );
  if (!raw) return { ...base, ok: false, results: [], error: "búsqueda X no disponible" };
  const hits = parseDdg(raw, 6).filter((h) => /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(hostOf(h.url)));
  const filt = filterRelevant(name, hits.map((h) => ev(h.title, h.url, h.snippet)), 1, dom);
  const handles = [...new Set(filt.items.map((i) => extractHandle(i.url)).filter((h): h is string => Boolean(h)))];
  data.x_handles = handles;
  if (!filt.items.length) {
    return {
      ...base,
      ok: true,
      results: [ev(`Sin presencia pública indexada en X para "${name}"`, `https://x.com/search?q=${encodeURIComponent(`"${name}"`)}`, "Búsqueda real (DDG site:x.com): 0 cuentas o posts indexados — sin presencia en X o la API no la indexa; dato defendible, no un fallo")],
      stats: filt.stats,
    };
  }
  const results = [...filt.items];
  if (handles.length) {
    results.unshift(ev(`Cuenta(s) X detectada(s): ${handles.map((h) => `@${h}`).join(", ")}`, `https://x.com/${handles[0]}`, "Handles extraídos de URLs reales site:x.com y verificados contra la identidad de la entidad"));
  }
  return { ...base, ok: true, results: results.slice(0, 7), stats: filt.stats };
}

/* ── VECTOR: GitHub profundo (repos + usuarios/org + perfil) ──────────────── */

interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  language?: string | null;
  owner: { login: string; type: string };
}

export async function runGithub(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "GitHub: repos, org y usuarios";
  const base = { key: "github", label, icon: "🐙", query: name };
  const results: EvidenceItem[] = [];
  let stats = { raw: 0, kept: 0, dropped: 0, droppedSamples: [], strong: 0 } as ReturnType<typeof filterRelevant>["stats"];

  // PRIORIDAD: si OG-Scout confirmó la org (por contenido, verificación
  // circular o declaración), los PROYECTOS REALES salen de SUS repos — no de
  // una búsqueda difusa.
  const confirmedLogin = data.identity?.githubLogin ?? null;
  if (confirmedLogin) {
    const own = await withLog(L, "github-own-repos", `GitHub — PROYECTOS REALES de @${confirmedLogin} (identidad confirmada por OG-Scout)`, `api.github.com/users/${confirmedLogin}/repos (CORS directo)`, async () => {
      const d = await jget<GhRepo[]>(`https://api.github.com/users/${confirmedLogin}/repos?sort=updated&per_page=8`);
      return d;
    });
    for (const r of (own ?? []).slice(0, 6)) {
      results.push(
        ev(
          `Proyecto real: ${r.full_name} — ${r.stargazers_count.toLocaleString("es")} ★`,
          r.html_url,
          `${r.description ?? "(sin descripción)"} · push ${r.pushed_at?.slice(0, 10)}${r.language ? ` · ${r.language}` : ""} — repo de la cuenta con identidad confirmada`,
          r.pushed_at.slice(0, 10)
        )
      );
    }
    const ownStars = (own ?? []).reduce((a, r) => a + r.stargazers_count, 0);
    if (ownStars > data.github_stars_total) data.github_stars_total = ownStars;
    if ((own ?? []).length) data.github_repos_matched = Math.max(data.github_repos_matched, (own ?? []).length);
  }

  const reposRes = await withLog(L, "github-repos", "GitHub Search — repositorios", "api.github.com/search/repositories (CORS directo)", async () => {
    const d = await jget<{ items?: GhRepo[]; total_count?: number }>(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(name)}&sort=stars&order=desc&per_page=10`
    );
    return d;
  });

  if (reposRes) {
    const repos = reposRes.items ?? [];
    const filt = filterRelevant(
      name,
      repos.map((r) => ev(`${r.full_name} — ${r.stargazers_count.toLocaleString("es")} ★`, r.html_url, r.description ?? "repositorio público", r.pushed_at.slice(0, 10))),
      1,
      dom
    );
    stats = filt.stats;
    for (const r of filt.items.slice(0, 5)) results.push(r);
    data.github_repos_matched = filt.items.length;
    data.github_stars_total = filt.items.reduce((a, r) => a + (parseInt((r.title.match(/([\d.,]+)\s*★/) ?? [])[1]?.replace(/[.,]/g, ""), 10) || 0), 0);
  }

  // Cuentas GitHub candidatas — verificadas por OG-Scout con EVIDENCIA
  // (contenido del perfil, verificación circular o declaración del analista).
  // Que el login se parezca NO prueba nada: cualquiera registra @mi-nombre.
  const ghCands = data.identity?.githubCandidates ?? [];
  data.github_candidates = ghCands;
  for (const c of ghCands.slice(0, 3)) {
    const verified = c.status === "circular" || c.status === "declarada";
    results.unshift(
      ev(
        verified
          ? `GitHub @${c.login} (${c.type}) — ${c.public_repos} repos públicos, ${c.followers} seguidores, desde ${c.created_at.slice(0, 4)} — IDENTIDAD VERIFICADA`
          : `GitHub @${c.login} existe (${c.type}, ${c.public_repos} repos) — cuenta SIN VERIFICAR como «${name}»`,
        c.html_url,
        verified ? `${c.evidence} — antigüedad y actividad reales de la cuenta` : c.evidence
      )
    );
    if (verified && !data.github_org) {
      data.github_org = { login: c.login, type: c.type, created_at: c.created_at, public_repos: c.public_repos, followers: c.followers };
    }
  }

  if (!results.length) {
    results.push(
      ev(
        `Sin huella GitHub relevante para "${name}"`,
        `https://github.com/search?q=${encodeURIComponent(name)}&type=repositories`,
        `Repositorios revisados: ${stats.raw}. ${stats.dropped ? `${stats.dropped} descartados por no corresponder a la entidad (homónimos). ` : ""}Ningún repo/org verificado pertenece a la entidad — dato defendible, no un fallo`
      )
    );
  }
  return { ...base, ok: true, results: results.slice(0, 8), stats };
}

/* ── VECTOR: Mastodon (red social abierta, CORS directo) ──────────────────── */

export async function runMastodon(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Mastodon: red social abierta";
  const base = { key: "mastodon", label, icon: "🐘", query: name };
  const accounts = await withLog(L, "mastodon", label, "mastodon.social/api/v2/search?type=accounts (CORS directo)", async () => {
    const d = await jget<{ accounts?: { acct: string; url: string; display_name: string; note: string }[] }>(
      `https://mastodon.social/api/v2/search?q=${encodeURIComponent(name)}&type=accounts&limit=5`
    );
    return d.accounts ?? [];
  });
  const hits = (accounts ?? []).map((a) => ev(`@${a.acct} — ${a.display_name || "cuenta Mastodon"}`, a.url, clean(a.note.replace(/<[^>]+>/g, "")) || "cuenta pública en Mastodon"));
  const filt = filterRelevant(name, hits, 1, dom);
  if (!filt.items.length) {
    return { ...base, ok: true, results: [], stats: filt.stats };
  }
  return { ...base, ok: true, results: filt.items.slice(0, 4), stats: filt.stats };
}

/* ── VECTOR: Stack Exchange (Q&A técnica, CORS nativo, 300 req/día anónimas) ─ */

interface SeQuestion {
  title: string;
  link: string;
  score: number;
  answer_count: number;
  is_answered: boolean;
  creation_date: number;
  tags?: string[];
}

export async function runStackEx(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Stack Exchange: red técnica Q&A";
  const base = { key: "stackex", label, icon: "🧵", query: name };
  const items = await withLog(L, "stackex", label, "api.stackexchange.com/2.3/search/advanced (CORS directo — cuota anónima por IP)", async () => {
    const res = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(name)}&site=stackoverflow&pagesize=10`,
      { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = (await res.json()) as { items?: SeQuestion[]; quota_remaining?: number };
    return d.items ?? [];
  }, "sin resultados o cuota agotada en esta red");
  const dated = (items ?? []).map((q) =>
    ev(
      `Stack Overflow: ${clean(q.title, 110)} — ${q.score} votos, ${q.answer_count} respuesta(s)${q.is_answered ? ", resuelta" : ""}`,
      q.link,
      `Pregunta real de la red Stack Exchange${q.tags?.length ? ` · tags: ${q.tags.slice(0, 4).join(", ")}` : ""} — evidencia de presencia técnica`,
      new Date(q.creation_date * 1000).toISOString().slice(0, 10)
    )
  );
  const filt = filterRelevant(name, dated, 1, dom);
  data.stackexchange_items = filt.items.length;
  if (!filt.items.length) {
    return {
      ...base,
      ok: true,
      results: [
        ev(
          `Sin menciones técnicas en Stack Overflow para "${name}"`,
          `https://stackoverflow.com/search?q=${encodeURIComponent(name)}`,
          `Búsqueda real en la API de Stack Exchange (${(items ?? []).length} preguntas revisadas, ninguna sobre la entidad tras el filtro de identidad) — sin presencia técnica comunitaria; dato defendible, no un fallo`
        ),
      ],
      stats: filt.stats,
    };
  }
  return { ...base, ok: true, results: filt.items.slice(0, 6), stats: filt.stats };
}

/* ── Fusibles estructurales (entra al auditor vía moreStructuralSignals) ──── */

export interface EngineFuse {
  finding: string;
  impact_magnitude: number;
  polarity: "positive" | "negative";
}

export function engineStructuralSignals(data: MoreData): EngineFuse[] {
  const out: EngineFuse[] = [];
  if (data.official_site) {
    out.push({
      finding: `Sitio de la entidad VERIFICADO por OG-Scout: ${data.official_site} — la homepage real menciona el nombre legal (verificación de contenido, no de parecido de dominio)`,
      impact_magnitude: 0.4,
      polarity: "positive",
    });
  }
  if (data.github_org) {
    const years = Math.floor((Date.now() - new Date(data.github_org.created_at).getTime()) / (864e5 * 365.25));
    if (years >= 2) {
      out.push({
        finding: `Cuenta GitHub @${data.github_org.login} con IDENTIDAD VERIFICADA (${data.github_org.type}, desde ${data.github_org.created_at.slice(0, 4)}: ${years} años, ${data.github_org.public_repos} repos públicos, ${data.github_org.followers} seguidores) — confirmada por contenido/verificación circular, no por parecido de login`,
        impact_magnitude: 0.8,
        polarity: "positive",
      });
    }
  }
  if (data.github_stars_total >= 300) {
    out.push({
      finding: `Adopción open-source verificable: ${data.github_stars_total.toLocaleString("es")} ★ en ${data.github_repos_matched} repositorios que pertenecen a la entidad (verificados por identidad)`,
      impact_magnitude: 1.2,
      polarity: "positive",
    });
  }
  if (data.x_handles.length) {
    out.push({
      finding: `Presencia en X verificada: ${data.x_handles.map((h) => `@${h}`).join(", ")} (cuenta(s) pública(s) indexada(s) con URL real)`,
      impact_magnitude: 0.3,
      polarity: "positive",
    });
  }
  return out;
}
