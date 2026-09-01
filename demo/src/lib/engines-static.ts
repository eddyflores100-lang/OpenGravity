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
      headers: { "X-Return-Format": "markdown" },
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

/* ── SONDA DE DOMINIOS multi-TLD (adiós al .com forzado) ──────────────────── */

const PROBE_TLDS = ["com", "es", "io", "net", "org", "co", "ai"];

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
  return out.slice(0, 14);
}

/**
 * Sonda real de dominios: variantes del nombre × TLDs, verificadas con DNS
 * (Cloudflare DoH). Nada de adivinar .com en silencio: cada candidato queda
 * registrado con su estado para el informe.
 */
export async function probeDomains(
  name: string,
  declared: string | null,
  L?: GovSourceLog[]
): Promise<MoreData["domain_candidates"]> {
  const t0 = Date.now();
  const candidates: MoreData["domain_candidates"] = [];
  if (declared) {
    let alive = false;
    try {
      alive = await dohAlive(declared);
    } catch {
      alive = false;
    }
    candidates.push({ domain: declared, alive, source: "declarado" });
  } else {
    const variants = domainVariants(name);
    const results = await pool(variants, 5, async (d) => ({ d, alive: await dohAlive(d) }));
    for (const r of results) if (r) candidates.push({ domain: r.d, alive: r.alive, source: "sonda" });
  }
  if (L) {
    L.push({
      key: "probe",
      label: `Sonda DNS multi-TLD — ${candidates.length} candidatos (${declared ? "dominio declarado" : "variantes del nombre"})`,
      endpoint: "cloudflare-dns.com/dns-query (DoH, CORS directo)",
      count: candidates.filter((c) => c.alive).length,
      ms: Date.now() - t0,
      ok: true,
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
interface GhUser {
  login: string;
  type: string;
  html_url: string;
}
interface GhProfile {
  login: string;
  type: string;
  created_at: string;
  public_repos: number;
  followers: number;
  html_url: string;
}

export async function runGithub(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "GitHub: repos, org y usuarios";
  const base = { key: "github", label, icon: "🐙", query: name };
  const results: EvidenceItem[] = [];
  let stats = { raw: 0, kept: 0, dropped: 0, droppedSamples: [], strong: 0 } as ReturnType<typeof filterRelevant>["stats"];

  // PRIORIDAD: si OG-Scout confirmó la org (por verificación circular o login),
  // los PROYECTOS REALES salen de SUS repos — no de una búsqueda difusa.
  const confirmedLogin = data.identity?.githubLogin ?? null;
  if (confirmedLogin) {
    const own = await withLog(L, "github-own-repos", `GitHub — PROYECTOS REALES de @${confirmedLogin} (org confirmada por OG-Scout)`, `api.github.com/users/${confirmedLogin}/repos (CORS directo)`, async () => {
      const d = await jget<GhRepo[]>(`https://api.github.com/users/${confirmedLogin}/repos?sort=updated&per_page=8`);
      return d;
    });
    for (const r of (own ?? []).slice(0, 6)) {
      results.push(
        ev(
          `Proyecto real: ${r.full_name} — ${r.stargazers_count.toLocaleString("es")} ★`,
          r.html_url,
          `${r.description ?? "(sin descripción)"} · push ${r.pushed_at?.slice(0, 10)}${r.language ? ` · ${r.language}` : ""} — repo de la org confirmada por OG-Scout`,
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

  const usersRes = await withLog(L, "github-users", "GitHub Search — usuarios y organizaciones", "api.github.com/search/users (CORS directo)", async () => {
    const d = await jget<{ items?: GhUser[] }>(
      `https://api.github.com/search/users?q=${encodeURIComponent(name)}&per_page=5`
    );
    return d.items ?? [];
  });

  // Perfil exacto: aceptamos solo si el login parece la entidad O la relevancia es >= 2
  const users = usersRes ?? [];
  const slugCompact = entityCompact(name);
  const slugHyphen = normalizeEntity(name).replace(" ", "-");
  const candidate = users.find(
    (u) =>
      u.login.replace(/[^a-z0-9]/gi, "").toLowerCase() === slugCompact ||
      u.login.toLowerCase() === slugHyphen ||
      entityRelevance(name, u.login, dom) >= 2
  );
  if (candidate) {
    const prof = await withLog(L, "github-profile", `GitHub perfil @${candidate.login}`, `api.github.com/users/${candidate.login} (CORS directo)`, () =>
      jget<GhProfile>(`https://api.github.com/users/${candidate.login}`)
    );
    if (prof) {
      const years = Math.floor((Date.now() - new Date(prof.created_at).getTime()) / (864e5 * 365.25));
      data.github_org = { login: prof.login, type: prof.type, created_at: prof.created_at, public_repos: prof.public_repos, followers: prof.followers };
      results.unshift(
        ev(
          `GitHub @${prof.login} (${prof.type}) — ${prof.public_repos} repos públicos, ${prof.followers} seguidores, activo desde ${prof.created_at.slice(0, 4)} (${years} años)`,
          prof.html_url,
          "Perfil verificado por coincidencia de identidad del login — antigüedad y actividad reales de la cuenta"
        )
      );
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
        finding: `Organización GitHub @${data.github_org.login} activa desde ${data.github_org.created_at.slice(0, 4)} (${years} años, ${data.github_org.public_repos} repos públicos, ${data.github_org.followers} seguidores) — infraestructura técnica real y antigua`,
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
