/**
 * og-scout.ts — OG-SCOUT: NUESTRO PROPIO INVESTIGADOR (arquitectura DeerFlow).
 *
 * DeerFlow real (bytedance/deer-flow) es un framework server-side: Python 3.12,
 * FastAPI + LangGraph, Docker y claves de LLM/búsqueda — no puede correr dentro
 * de una página estática. OG-Scout es nuestro reemplazo cliente con el MISMO
 * ciclo: PLANIFICAR → INVESTIGAR → VERIFICAR → REPORTAR, 100% real.
 *
 * FASE 1 — DESCUBRIMIENTO: búsqueda web real (DDG) + GitHub (API) del nombre.
 * FASE 2 — VERIFICACIÓN: descarga la HOMEPAGE real de cada candidato y comprueba
 *          si el nombre legal aparece en ella. Verificación circular sitio↔GitHub:
 *          si la org de GitHub enlaza al dominio (campo blog) o el sitio enlaza
 *          a la org, ambos se confirman mutuamente.
 * FASE 3 — SELECCIÓN: puntúa con evidencia. Solo atribuye identidad si hay
 *          confirmación fuerte; si hay ambigüedad, la DECLARA — jamás atribuye
 *          el sitio de un homónimo (el falso positivo "alice-labs.com" que
 *          motivó este módulo muere aquí).
 *
 * Nada de esto es simulado: cada confirmación es un fetch real con URL.
 */

import type { GovSourceLog } from "@/lib/research";
import { jinaHeaders } from "@/lib/jina-auth";
import { entityCompact, entityRelevance, normalizeEntity } from "@/lib/verify";

/* ── red (mismo patrón que engines-static: semáforo jina conc-3 + memo) ───── */

const JINA = "https://r.jina.ai/";
const memo = new Map<string, unknown>();
const active = { n: 0 };
const waiters: (() => void)[] = [];

function slot() {
  if (active.n < 3) {
    active.n++;
    return;
  }
  waiters.push(() => active.n++);
}
function release() {
  active.n--;
  waiters.shift()?.();
}

async function jinaText(url: string, ms = 30000): Promise<string> {
  if (memo.has(url)) return memo.get(url) as string;
  slot();
  await new Promise<void>((r) => setTimeout(r, 0));
  try {
    const res = await fetch(JINA + url, { signal: AbortSignal.timeout(ms), headers: { "X-Return-Format": "markdown", ...jinaHeaders() }, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    memo.set(url, text);
    return text;
  } finally {
    release();
  }
}

async function jget<T>(url: string, ms = 12000): Promise<T> {
  if (memo.has(url)) return memo.get(url) as T;
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as T;
  memo.set(url, json);
  return json;
}

async function logStep<T>(L: GovSourceLog[], key: string, label: string, endpoint: string, fn: () => Promise<T>): Promise<T | null> {
  const t0 = Date.now();
  try {
    const out = await fn();
    const count = Array.isArray(out) ? out.length : out ? 1 : 0;
    L.push({ key, label, endpoint, count, ms: Date.now() - t0, ok: true });
    return out;
  } catch (e) {
    L.push({ key, label, endpoint, count: 0, ms: Date.now() - t0, ok: false, error: e instanceof Error ? e.message : "error" });
    return null;
  }
}

const deaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const hostOf = (u: string) => {
  try {
    return new URL(u).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** Desenvuelve redirects de DDG (uddg=) y Bing (url= en apiclick). */
function unwrap(u: string): string {
  try {
    const url = new URL(u);
    const real = url.searchParams.get("uddg") ?? url.searchParams.get("url");
    if (real && /^https?:/i.test(real)) return real.startsWith("http") ? real : decodeURIComponent(real);
  } catch {
    /* no es redirect */
  }
  return u;
}

/** Extrae resultados (title+url+snippet) del markdown de DDG HTML. */
function parseDdg(md: string, limit = 10): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  let cur: { title: string; url: string; snippet: string } | null = null;
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const m = line.match(/^#{2,3}\s+\[(.+?)\]\((\S+?)\)\s*$/);
    if (m) {
      if (cur) out.push(cur);
      const url = unwrap(m[2]);
      cur = url.startsWith("http") && !/duckduckgo\.com\/(feedback|html)/.test(url)
        ? { title: m[1].replace(/[*_>#`]/g, "").trim().slice(0, 150), url, snippet: "" }
        : null;
      continue;
    }
    if (!cur) continue;
    if (/^!\[|^#|^\[\]\(/.test(line)) continue;
    const text = line.replace(/[*_>#`]/g, "").replace(/\s+/g, " ").trim();
    if (text.length >= 30 && cur.snippet.length < 240) cur.snippet = `${cur.snippet} ${text}`.trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, limit);
}

/* ── tipos ─────────────────────────────────────────────────────────────────── */

export interface SiteCandidate {
  host: string;
  url: string;
  title: string;
  snippet: string;
  /** DNS real del dominio (DoH). */
  dnsAlive: boolean;
  /** Se descargó la homepage real vía lector. */
  homepageFetched: boolean;
  /** Título real de la homepage (fetch). */
  homepageTitle: string | null;
  /** El nombre legal (normalizado) aparece en la homepage. */
  containsFullName: boolean;
  /** Todos los tokens del nombre aparecen en la homepage. */
  containsAllTokens: boolean;
  /** La homepage enlaza a una org/usuario de GitHub (verificación circular). */
  linksToGithub: string | null;
  score: number;
  /** Evidencia legible de cada punto sumado. */
  confirmations: string[];
}

export interface IdentityResolution {
  query: string;
  /** Nombre legal normalizado (sin formas jurídicas) usado para verificar. */
  normalizedName: string;
  candidates: SiteCandidate[];
  /** Identidad seleccionada — SOLO con confirmación fuerte. */
  selected: SiteCandidate | null;
  /** ≥2 candidatos empatados fuertes → el informe declara la ambigüedad. */
  ambiguous: boolean;
  /** Org/usuario de GitHub CONFIRMADO (contenido, circular o declarado).
   *  Que el login se parezca al nombre NO confirma nada — cualquiera puede
   *  registrar @empresa-nombre. Sin confirmación queda null. */
  githubLogin: string | null;
  githubConfirmations: string[];
  /** TODAS las cuentas candidatas con su estado de verificación (para el informe). */
  githubCandidates: import("@/lib/research").GithubCandidate[];
  /** Frase resumen para el informe. */
  summary: string;
}

export const EMPTY_IDENTITY: IdentityResolution = {
  query: "",
  normalizedName: "",
  candidates: [],
  selected: null,
  ambiguous: false,
  githubLogin: null,
  githubConfirmations: [],
  githubCandidates: [],
  summary: "no ejecutado",
};

/* ── DoH (DNS real) ────────────────────────────────────────────────────────── */

async function dnsAlive(domain: string): Promise<boolean> {
  const key = `doh:${domain}`;
  if (memo.has(key)) return memo.get(key) as boolean;
  // DoH JSON se agota bajo ráfaga: un reintento evita falsos "sin DNS"
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
        signal: AbortSignal.timeout(6000),
        headers: { Accept: "application/dns-json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { Status?: number; Answer?: { type?: number }[] };
      const alive = d.Status === 0 && (d.Answer ?? []).some((a) => a.type === 1);
      memo.set(key, alive);
      return alive;
    } catch (e) {
      if (attempt === 1) throw e;
      await new Promise<void>((r) => setTimeout(r, 900));
    }
  }
  return false;
}

/* ── OG-SCOUT: el investigador ─────────────────────────────────────────────── */

interface GhUserLite {
  login: string;
  type: string;
}

interface GhProfileFull {
  login: string;
  type: string;
  created_at: string;
  public_repos: number;
  followers: number;
  html_url: string;
  blog: string;
  name: string | null;
  bio: string | null;
}

/** Limpia las cachés de red entre misiones: cada investigación verifica en vivo. */
export function clearScoutCaches(): void {
  memo.clear();
}

/**
 * Ejecuta el ciclo completo del scout para un nombre de empresa.
 * Devuelve la identidad RESUELTA con evidencia, o ambigüedad honesta.
 */
export async function runScout(name: string, L: GovSourceLog[], declaredDomain?: string | null, ghHandle?: string | null): Promise<IdentityResolution> {
  const normalized = normalizeEntity(name);
  const compact = entityCompact(name);
  const tokens = normalized.split(" ").filter((t) => t.length >= 3);
  const out: IdentityResolution = {
    query: name,
    normalizedName: normalized,
    candidates: [],
    selected: null,
    ambiguous: false,
    githubLogin: null,
    githubConfirmations: [],
    githubCandidates: [],
    summary: "",
  };

  /* FASE 1 — DESCUBRIMIENTO (búsqueda web real + GitHub real) */

  // 1a. Búsqueda web con frase exacta — la misma que haría un analista humano
  const q = encodeURIComponent(`"${name}"`);
  const ddgMd = await logStep(L, "scout-ddg", "OG-Scout F1 — búsqueda web del nombre (frase exacta)", "html.duckduckgo.com/html vía r.jina.ai", () =>
    jinaText(`https://html.duckduckgo.com/html/?q=${q}`)
  );
  const hits = ddgMd ? parseDdg(ddgMd, 10) : [];

  // 1b. Candidatos de sitio: hosts de resultados cuyo dominio "parece" el nombre
  //     (tokens o forma compacta) — SOLO como candidatos, jamás como atribución.
  const hostSeen = new Set<string>();
  const hosts: string[] = [];
  for (const h of hits) {
    const host = hostOf(h.url);
    if (!host || hostSeen.has(host)) continue;
    const bare = host.split(".")[0] ?? "";
    const bareCompact = bare.replace(/[^a-z0-9]/g, "");
    const looksLike =
      (compact.length >= 4 && bareCompact === compact) ||
      tokens.every((t) => bare.includes(t)) ||
      // dominio declarado por el usuario: siempre candidato
      (declaredDomain && host === declaredDomain.replace(/^www\./, ""));
    if (looksLike) {
      hostSeen.add(host);
      hosts.push(host);
    }
  }
  // el dominio declarado entra siempre aunque los buscadores no lo listen
  if (declaredDomain && !hostSeen.has(declaredDomain.replace(/^www\./, ""))) hosts.unshift(declaredDomain.replace(/^www\./, ""));

  // 1c. WIKIPEDIA COMO FUENTE DE IDENTIDAD — lo que haría un analista humano:
  // si el top de resultados tiene la página Wikipedia de la entidad (título con
  // la identidad + contexto de empresa), se descarga y se extraen los dominios
  // que enlaza (la infobox declara el sitio oficial). Verificación por contenido.
  const wikiHit = hits.find(
    (h) => hostOf(h.url).endsWith("wikipedia.org") && entityRelevance(name, h.title, declaredDomain) >= 3 && !/tesla|inventor/i.test(h.title)
  );
  let wikiHosts: string[] = [];
  if (wikiHit) {
    const wikiMd = await logStep(L, "scout-wiki", `OG-Scout F1 — Wikipedia identifica a la entidad («${wikiHit.title.slice(0, 60)}»): extracción del sitio oficial`, `${hostOf(wikiHit.url)} vía r.jina.ai (lectura real de la enciclopedia)`, () =>
      jinaText(wikiHit.url, 30000)
    );
    if (wikiMd) {
      const urlSet = new Set<string>();
      for (const m of wikiMd.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
        const host = m[1].replace(/^www\./, "").toLowerCase();
        if (/wikipedia|wikimedia|wikidata|wiktionary|wikiquote|archive\.org|web\.archive|creativecommons|wikimediafoundation|mediawiki|google\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|linkedin\.com/.test(host)) continue;
        const bare = host.split(".")[0] ?? "";
        const bareCompact = bare.replace(/[^a-z0-9]/g, "");
        const compactName = compact;
        if ((compactName.length >= 4 && bareCompact === compactName) || tokens.every((t) => bare.includes(t)) || tokens.every((t) => host.includes(t))) {
          urlSet.add(host);
        }
      }
      wikiHosts = [...urlSet].slice(0, 2);
    }
  }

  // 1d. GitHub: TODAS las cuentas cuyo login coincide con el nombre son solo
  //     CANDIDATAS — jamás identidad. Cualquiera puede registrar @mi-nombre
  //     (caso real: @alicelabs-llc de un tercero vs @alicelabsllc del analista).
  //     Se descargan los perfiles reales (máx 3) y la verificación ocurre en
  //     F3 con contenido (nombre legal en el perfil) o verificación circular.
  const ghUsers = await logStep(L, "scout-gh-users", "OG-Scout F1 — GitHub: cuentas candidatas (solo candidatas, sin atribuir)", "api.github.com/search/users (CORS directo)", () =>
    jget<{ items?: GhUserLite[] }>(`https://api.github.com/search/users?q=${encodeURIComponent(name)}&per_page=5`).then((d) => d.items ?? [])
  );
  const slugHyphen = normalized.replace(" ", "-");
  const slugNoSpace = normalized.replace(" ", "");
  const loginMatches = (login: string) => {
    const c = login.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return c === compact || login.toLowerCase() === slugHyphen || c === slugNoSpace;
  };
  const ghLoginCandidates = (ghUsers ?? [])
    .filter((u) => loginMatches(u.login) || entityRelevance(name, u.login, declaredDomain) >= 2)
    .slice(0, 3);
  // el handle declarado por el analista entra siempre (aunque el buscador no lo liste)
  const declaredHandle = (ghHandle ?? "").trim().replace(/^@/, "");
  if (declaredHandle && !ghLoginCandidates.some((u) => u.login.toLowerCase() === declaredHandle.toLowerCase())) {
    ghLoginCandidates.unshift({ login: declaredHandle, type: "declarado por el analista" });
  }
  const ghProfiles: GhProfileFull[] = [];
  for (const u of ghLoginCandidates.slice(0, 3)) {
    const prof = await logStep(L, "scout-gh-profile", `OG-Scout F1 — GitHub perfil real @${u.login}`, `api.github.com/users/${u.login} (CORS directo)`, () =>
      jget<GhProfileFull>(`https://api.github.com/users/${u.login}`)
    );
    if (prof) ghProfiles.push(prof);
  }

  /* FASE 2 — VERIFICACIÓN REAL (homepage de cada candidato + circular) */

  // Los dominios que Wikipedia declara van PRIMERO (máxima probabilidad de ser
  // el sitio oficial); después los del buscador. Presupuesto: 4 homepages.
  const toVerify = [...new Set([...wikiHosts, ...hosts])].slice(0, 4);

  // Normalización www (movimiento real de analista): un dominio cuyo apex no
  // tiene registros A pero cuyo www SÍ sirve contenido (CNAME a Firebase,
  // AppEngine, hosting del registrador…) se verifica en su www — un sitio que
  // vive en www nunca se da por muerto ni se confunde con un homónimo.
  const bare = (h: string) => h.replace(/^www\./, "").toLowerCase();
  const normalizedHosts: string[] = [];
  for (const host of toVerify) {
    if (!/^www\./.test(host)) {
      let apexAlive = false;
      try {
        apexAlive = await dnsAlive(host);
      } catch {
        /* red bloquea DoH */
      }
      if (!apexAlive) {
        let wwwAlive = false;
        try {
          wwwAlive = await dnsAlive(`www.${host}`);
        } catch {
          /* red bloquea DoH */
        }
        if (wwwAlive) {
          normalizedHosts.push(`www.${host}`);
          continue;
        }
      }
    }
    normalizedHosts.push(host);
  }
  const toVerifyNorm = [...new Set(normalizedHosts)].slice(0, 5);
  const candidates: SiteCandidate[] = [];

  for (const host of toVerifyNorm) {
    const srcHit = hits.find((h) => bare(hostOf(h.url)) === bare(host));
    const cand: SiteCandidate = {
      host,
      url: `https://${host}`,
      title: srcHit?.title ?? "",
      snippet: srcHit?.snippet ?? "",
      dnsAlive: false,
      homepageFetched: false,
      homepageTitle: null,
      containsFullName: false,
      containsAllTokens: false,
      linksToGithub: null,
      score: 0,
      confirmations: [],
    };
    const confirm = (pts: number, why: string) => {
      cand.score += pts;
      cand.confirmations.push(why);
    };

    // Contexto de EMPRESA en el resultado del buscador que trajo este host:
    // "Nikola Corporation... Nasdaq" puntúa; «juguetes de madera» de un homónimo, no.
    if (srcHit) {
      const lvl = entityRelevance(name, `${srcHit.title} ${srcHit.snippet}`, declaredDomain);
      if (lvl >= 2 && /\b(company|corporation|inc|llc|ltd|gmbh|corp|nasdaq|nyse|ipo|stock|revenue|founder|ceo|startup|manufacturer|automaker|truck|vehicles|technology|platform|bank|group|consulting|agency|services|solutions)\b/i.test(`${srcHit.title} ${srcHit.snippet}`)) {
        confirm(2, `Buscador: la cobertura del resultado habla de la entidad en contexto de empresa («${(srcHit.title).slice(0, 90)}»)`);
      }
    }
    // Wikipedia identifica a la entidad y enlaza este dominio (+3, la fuente
    // enciclopédica es la que usa un analista humano para desambiguar)
    if (wikiHit && wikiHosts.includes(host)) {
      confirm(3, `Wikipedia: la página «${wikiHit.title.replace(/ - Wikipedia$/, "")}» de la entidad enlaza ${host} como dominio propio (infobox/enlaces oficiales)`);
    }

    // DNS real
    try {
      cand.dnsAlive = await dnsAlive(host);
      if (cand.dnsAlive) confirm(1, `DNS: ${host} resuelve con registros A (Cloudflare DoH)`);
    } catch {
      /* red bloquea DoH */
    }

    // Calidad del dominio: un dominio registrable propio vale; una subcarpeta
    // de plataforma de hosting o un dominio en venta NO es el sitio de una empresa.
    const HOSTING = /(vercel\.app|netlify\.app|pages\.dev|github\.io|webflow\.io|herokuapp\.com|firebaseapp\.com|wixsite\.com|weebly\.com|blogspot\.com|wordpress\.com|substack\.com|notion\.site|framer\.website|glitch\.me|railway\.app|onrender\.com|hugedomains\.com|afternic\.com|sedo\.com|dan\.com|godaddy\.com)$/;
    const bareHost = bare(host);
    const bareForExact = bareHost.split(".")[0] ?? "";
    if (HOSTING.test(host) || /for sale|hugedomains|compra de dominio|dominio en venta/i.test(cand.homepageTitle ?? "")) {
      confirm(-2, `Penalización: ${HOSTING.test(host) ? "subdominio de plataforma de hosting (contenido de terceros, no sitio corporativo)" : "dominio en venta/parking — no opera la entidad"}`);
    } else if (bareForExact.replace(/[^a-z0-9]/g, "") === compact || (declaredDomain && bareHost === bare(declaredDomain))) {
      confirm(1, `Dominio registrable propio: ${host} coincide exactamente con la identidad del nombre`);
    }

    // HOMEPAGE REAL — la prueba que mata homónimos: descargamos la página y
    // comprobamos el NOMBRE con el criterio de identidad de verify.ts (para
    // nombres de una sola palabra exige CONTEXTO DE EMPRESA junto a la mención:
    // «Nikola Corporation» pasa; «Nikola Toy», no).
    const page = await logStep(L, "scout-homepage", `OG-Scout F2 — homepage real de ${host}`, `${host} vía r.jina.ai (descarga y lectura real)`, () =>
      jinaText(`https://${host}`, 25000)
    );
    if (page !== null && page !== undefined) {
      cand.homepageFetched = true;
      const mTitle = page.match(/^Title:\s*(.+)$/m);
      cand.homepageTitle = mTitle ? mTitle[1].trim().slice(0, 160) : null;
      // contenido REAL sin metadatos del lector ni la URL del propio host
      // (la URL no es mención de la entidad — evita homónimos falsos en 404)
      const pageContent = page
        .replace(/^Title:.*$/m, "")
        .replace(/^URL Source:.*$/m, "")
        .replace(/^Published Time:.*$/m, "")
        .replace(/^Markdown Content:\s*$/m, "")
        .trim();
      const pageSubstantial = pageContent.length >= 40;
      const hayNoHost = pageContent.split(host).join(" ").split(bareHost).join(" ");
      const pageLevel = entityRelevance(name, hayNoHost, declaredDomain);
      const isDeclaredHost = Boolean(declaredDomain && bareHost === bare(declaredDomain));
      if (pageLevel >= 3 || (isDeclaredHost && pageLevel >= 2)) {
        cand.containsFullName = true;
        confirm(3, `Homepage: la identidad de ${host} se verifica en su contenido real${isDeclaredHost ? " (dominio declarado por el analista + " : " ("}${pageLevel >= 3 ? "identidad fuerte" : "términos del nombre presentes"})`);
      } else if (pageLevel === 2) {
        cand.containsAllTokens = true;
        confirm(1, `Homepage: términos del nombre presentes en ${host} sin contexto de empresa — verificación débil`);
      }
      if (!pageSubstantial) {
        confirm(-2, `SITIO VACÍO/404: ${host} resuelve en DNS pero no publica contenido real — no opera la entidad`);
      }
      // ¿Enlaza a GitHub? (verificación circular sitio→GitHub, sin requerir
      // perfil: basta que el login aparezca en los resultados de GitHub API —
      // la API se agota por rate-limit, pero el LINK en la homepage es real)
      const ghLink = page.match(/github\.com\/([A-Za-z0-9-]+)/);
      const ghLogins = new Set((ghUsers ?? []).map((u) => u.login.toLowerCase()));
      if (ghLink && (ghLogins.has(ghLink[1].toLowerCase()) || ghLink[1].replace(/[^a-z0-9]/gi, "").toLowerCase() === compact)) {
        cand.linksToGithub = ghLink[1];
        confirm(3, `Verificación circular: la homepage real de ${host} enlaza a GitHub @${ghLink[1]} (cuenta presente en la búsqueda de GitHub) — misma identidad`);
      }
    }

    // HOMÓNIMO DETECTADO: la homepage existe, tiene contenido real y NUNCA
    // menciona el nombre → candidato con score bajo; queda documentado.
    if (cand.homepageFetched && !cand.containsFullName && !cand.containsAllTokens && (cand.confirmations.every((c) => !c.includes("SITIO VACÍO")))) {
      cand.confirmations.push(`HOMÓNIMO PROBABLE: la homepage de ${host} NO menciona «${name}» en su contenido real — probablemente es otra empresa`);
    }

    // Verificación circular GitHub→sitio (campo blog de CADA perfil candidato)
    for (const prof of ghProfiles) {
      const blog = (prof.blog ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
      if (blog && blog === bareHost) {
        confirm(3, `Verificación circular: la cuenta GitHub @${prof.login} declara ${host} como su web (campo blog del perfil)`);
      }
      if (prof.name && deaccent(prof.name.toLowerCase()).includes(normalized)) {
        confirm(2, `GitHub @${prof.login}: nombre del perfil «${prof.name}» coincide con el nombre legal`);
      }
    }

    candidates.push(cand);
  }

  out.candidates = candidates;

  /* FASE 3 — SELECCIÓN (con evidencia, o ambigüedad honesta) */

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  // Selección EXIGENTE: prueba de contenido real (identidad fuerte en la
  // homepage o verificación circular) Y score ≥ 4. Con solo «el dominio parece
  // el nombre» NO se atribuye nada — los homónimos se documentan.
  const strongContent = (c: SiteCandidate) => c.containsFullName || c.linksToGithub || c.confirmations.some((x) => x.includes("circular"));
  const declaredBare = declaredDomain ? bare(declaredDomain) : null;
  const contradicted = (c: SiteCandidate | undefined) => Boolean(c && c.confirmations.some((x) => x.includes("HOMÓNIMO PROBABLE") || x.includes("SITIO VACÍO")));
  if (top && top.score >= 4 && strongContent(top) && !(second && second.score === top.score && strongContent(second))) {
    out.selected = top;
    out.summary = `Identidad resuelta: ${top.host} (puntos ${top.score}) — ${top.confirmations.length} confirmaciones reales`;
  } else if (top && second && top.score >= 4 && second.score >= 4 && strongContent(top) && strongContent(second)) {
    out.ambiguous = true;
    out.summary = `Identidad AMBIGUA: ${top.host} y ${second.host} empatan con confirmación fuerte — el informe NO atribuye ninguna; revisa manualmente`;
  } else if (top && declaredBare && bare(top.host) === declaredBare && !contradicted(top)) {
    // El analista DECLARÓ este dominio: si la red no permitió verificar el
    // contenido (lector caído/rate-limit), la atribución es por declaración,
    // dicho explícitamente — nunca se atribuye un homónimo por silencio.
    out.selected = top;
    out.summary = `Identidad por DECLARACIÓN del analista: ${top.host} (${top.confirmations.length} confirmaciones de infraestructura; verificación de contenido ${
      top.homepageFetched ? "sin mención clara del nombre en la página" : "no disponible en esta red"
    }) — atribuida por declaración, no por contenido`;
  } else {
    out.summary = top
      ? `Sin identidad confirmada: el mejor candidato (${top.host}, ${top.score} pts) no alcanzó la prueba de contenido real — el informe NO lo atribuye a «${name}»`
      : `Sin candidatos web para «${name}»: ningún dominio público coincide con la entidad`;
  }

  // ── VERIFICACIÓN de las cuentas GitHub candidatas (AHORA sí, con el sitio
  // ya seleccionado): el estado de cada cuenta se decide con EVIDENCIA, nunca
  // por parecido del login. Solo "circular" y "declarada" confirman identidad.
  const verifiedHost = out.selected?.host ? bare(out.selected.host) : declaredDomain ? bare(declaredDomain) : null;
  const profileByLogin = new Map(ghProfiles.map((p) => [p.login.toLowerCase(), p]));
  for (const cand0 of ghLoginCandidates) {
    const prof = profileByLogin.get(cand0.login.toLowerCase());
    if (!prof) {
      // perfil no descargable (p. ej. rate-limit HTTP 403 de api.github.com):
      // la búsqueda SÍ muestra la cuenta, pero sin contenido no hay prueba —
      // se lista como SIN VERIFICAR (y "declarada" si la aportó el analista).
      const isDeclared0 = Boolean(declaredHandle) && cand0.login.toLowerCase() === declaredHandle.toLowerCase();
      out.githubCandidates.push({
        login: cand0.login,
        type: cand0.type,
        created_at: "",
        public_repos: 0,
        followers: 0,
        blog: null,
        name: null,
        bio: null,
        html_url: `https://github.com/${cand0.login}`,
        status: isDeclared0 ? "declarada" : "sin-verificar",
        evidence: isDeclared0
          ? "handle declarado por el analista (perfil no descargable ahora: rate-limit de api.github.com en esta red) — la atribución es por declaración, sin verificación de contenido en esta misión"
          : "la búsqueda de GitHub SÍ muestra la cuenta, pero el perfil no se pudo descargar (rate-limit HTTP 403 en esta red) — sin prueba de contenido NO se atribuye a la entidad",
      });
      continue;
    }
    const blogHost = (prof.blog ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").toLowerCase();
    const isDeclared = Boolean(declaredHandle) && prof.login.toLowerCase() === declaredHandle.toLowerCase();
    const blogCircular = Boolean(verifiedHost && blogHost && blogHost === verifiedHost);
    const siteLinks = Boolean(out.selected?.linksToGithub && out.selected.linksToGithub.toLowerCase() === prof.login.toLowerCase());
    const contentLevel = entityRelevance(name, `${prof.name ?? ""} ${prof.bio ?? ""}`, declaredDomain);
    const profNameMatches = Boolean(prof.name && deaccent(prof.name.toLowerCase()).includes(normalized));

    let status: import("@/lib/research").GithubStatus = "sin-verificar";
    let evidence = "solo coincide el login con el nombre — SIN verificación de contenido ni circular; puede ser la cuenta de un homónimo, NO se atribuye a la entidad";
    if (isDeclared) {
      status = "declarada";
      evidence = "handle declarado por el analista en el formulario" + (blogCircular ? `; además su campo blog declara ${blogHost} (coincide con el sitio de la entidad)` : "");
    } else if (blogCircular || siteLinks) {
      status = "circular";
      evidence = blogCircular
        ? `verificación circular: el campo blog del perfil declara ${blogHost} — la misma web verificada de la entidad`
        : `verificación circular: la homepage verificada ${out.selected?.host} enlaza a esta cuenta`;
    } else if (contentLevel >= 3 || profNameMatches) {
      status = "contenido";
      evidence = `el perfil declara el nombre legal («${(prof.name ?? prof.bio ?? "").slice(0, 80)}») — coincidencia fuerte pero SIN verificación circular`;
    }
    out.githubCandidates.push({
      login: prof.login,
      type: prof.type,
      created_at: prof.created_at,
      public_repos: prof.public_repos,
      followers: prof.followers,
      blog: prof.blog || null,
      name: prof.name,
      bio: prof.bio,
      html_url: prof.html_url,
      status,
      evidence,
    });
  }
  const ghRank: Record<import("@/lib/research").GithubStatus, number> = { circular: 0, declarada: 1, contenido: 2, "sin-verificar": 3 };
  const confirmedAccounts = out.githubCandidates
    .filter((c) => c.status === "circular" || c.status === "declarada")
    .sort((a, b) => ghRank[a.status] - ghRank[b.status]);
  if (confirmedAccounts.length) {
    out.githubLogin = confirmedAccounts[0].login;
    for (const c of confirmedAccounts.slice(0, 3)) {
      out.githubConfirmations.push(`GitHub @${c.login} (${c.type}, desde ${c.created_at.slice(0, 4)}, ${c.public_repos} repos públicos) — ${c.evidence}`, c.html_url);
    }
  }

  // Fallback sin perfil (rate-limit de la API): el sitio VERIFICADO por el
  // scout enlaza a una cuenta GitHub que existe — identidad circular válida.
  if (!out.githubLogin && out.selected?.linksToGithub) {
    out.githubLogin = out.selected.linksToGithub;
    out.githubConfirmations.push(
      `GitHub @${out.selected.linksToGithub} — enlazado desde la homepage verificada ${out.selected.host} (verificación circular sitio→GitHub)`,
      `https://github.com/${out.selected.linksToGithub}`
    );
  }

  L.push({
    key: "scout-verdict",
    label: `OG-Scout F3 — veredicto de identidad`,
    endpoint: "fase 1-2-3 (descubrimiento → verificación → selección)",
    count: candidates.length,
    ms: 0,
    ok: true,
    error: out.summary,
  });

  return out;
}
