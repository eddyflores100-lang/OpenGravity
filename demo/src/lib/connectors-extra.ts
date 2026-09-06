/**
 * connectors-extra.ts — CONECTORES AMPLIADOS DEL ORÁCULO (v12).
 *
 * Cinco vectores nuevos + la segunda ola de consultas de seguimiento, todos
 * sobre la capa fiable net.ts (ledger de salud, reintentos, DoH dual):
 *
 *   enciclopedia → Wikipedia (es/en) + Wikidata: cómo desambigua un analista
 *                  humano. Wikidata P856 declara el SITIO OFICIAL de la
 *                  entidad — si coincide con el sitio verificado por
 *                  OG-Scout, tercer refuerzo independiente de identidad.
 *   hn           → Hacker News (Algolia, CORS ✓): stories + puntos reales.
 *   reddit       → PullPush (archivo público de Reddit, API nativa) con
 *                  fallback al vector DDG site:reddit.com existente.
 *   archivo      → Wayback CDX (años con capturas, último snapshot) +
 *                  Certificate Transparency via crt.sh (subdominios reales).
 *   noticiasg    → Google News RSS (lector) + GDELT DOC 2.0 (directo con
 *                  reintento y respaldo por lector — geobloqueo documentado).
 *   paquetes     → crates.io (ecosistema Rust).
 *
 * Verificación CORS empírica (curl, commit v12): hn.algolia.com ✓ *,
 * es.wikipedia.org ✓ *, wikidata.org ✓ *, dns.google ✓ *. PullPush y
 * crates.io devuelven 403 desde IPs de datacenter (protección bot) pero
 * funcionan desde navegadores residenciales — se implementan con
 * degradación honesta: si la red los bloquea, el ledger lo dice.
 */

import { jsonGet, readerGet, readerJson, type NetOpts } from "@/lib/net";
import { parseDdg, runReddit } from "@/lib/engines-static";
import { entityRelevance, filterRelevant, entityCompact, normalizeEntity } from "@/lib/verify";
import type {
  EvidenceItem,
  FollowUp,
  GovSourceLog,
  MoreData,
  SearchVectorResult,
  TimelineEvent,
  WikiInfo,
} from "@/lib/research";

const hostOf = (u: string) => {
  try {
    return new URL(u).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const clean = (s: unknown, cap = 300) =>
  (s ?? "")
    .toString()
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, cap);

const item = (title: string, url: string, snippet: string, date = ""): EvidenceItem => ({
  title: clean(title, 140),
  url,
  host: hostOf(url),
  snippet: clean(snippet),
  date: clean(date, 24),
});

const bare = (h: string) => h.replace(/^www\./, "").toLowerCase();

/** ¿El host declarado "parece" la entidad? (compacto o todos los tokens) */
function hostLooksLike(host: string, name: string): boolean {
  const h = bare(host).split(".")[0] ?? "";
  const hc = h.replace(/[^a-z0-9]/g, "");
  const compact = entityCompact(name);
  const tokens = normalizeEntity(name).split(" ").filter((t) => t.length >= 3);
  if (!hc || !compact) return false;
  if (hc === compact) return true;
  return tokens.length >= 1 && tokens.every((t) => h.includes(t));
}

/* ═══════════════ ENCICLOPEDIA — Wikipedia + Wikidata ═══════════════ */

interface WikiSearchRes {
  query?: { search?: { title?: string; snippet?: string }[] };
}
interface WikiPageRes {
  query?: {
    pages?: Record<string, { title?: string; extract?: string; extlinks?: Record<string, string>[] }>;
  };
}
interface WdSearchRes {
  search?: { id?: string; label?: string; description?: string; concepturi?: string }[];
}
interface WdEntitiesRes {
  entities?: Record<
    string,
    {
      claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
      descriptions?: { es?: { value?: string }; en?: { value?: string } };
    }
  >;
}

async function wikiProbe(lang: string, name: string, dom: string | null, opt: NetOpts): Promise<{ title: string; url: string; extract: string; official: string | null } | null> {
  const s = await jsonGet<WikiSearchRes>(
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`,
    { ...opt, count: (d) => d.query?.search?.length ?? 0 }
  );
  const hits = (s.query?.search ?? []).filter((h) => entityRelevance(name, `${h.title ?? ""} ${h.snippet ?? ""}`, dom) >= 2);
  const hit = hits[0];
  if (!hit?.title) return null;
  const p = await jsonGet<WikiPageRes>(
    `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(hit.title)}&prop=extracts|extlinks&explaintext=1&exintro=1&ellimit=40&format=json&origin=*`,
    { ...opt, key: `${opt.key}-page`, label: `${opt.label} — extracto y enlaces`, count: () => 1 }
  );
  const page = Object.values(p.query?.pages ?? {})[0];
  if (!page) return null;
  let official: string | null = null;
  for (const l of page.extlinks ?? []) {
    const raw = l["*"] ?? Object.values(l)[0];
    if (!raw || typeof raw !== "string" || !/^https?:\/\//i.test(raw)) continue;
    const host = hostOf(raw);
    // enlaces de la enciclopedia a redes/archivos no son el sitio oficial
    if (/wikipedia|wikimedia|wikidata|wiktionary|archive\.org|creativecommons|facebook|instagram|twitter|x\.com|youtube|linkedin|reddit|github\.io|medium\.com|t\.me|discord/.test(host)) continue;
    if (hostLooksLike(host, name)) {
      official = bare(host);
      break;
    }
  }
  return {
    title: page.title ?? hit.title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((page.title ?? hit.title).replace(/ /g, "_"))}`,
    extract: clean(page.extract ?? hit.snippet ?? "", 400),
    official,
  };
}

export async function runEnciclopedia(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Enciclopedia: Wikipedia y Wikidata";
  const base = { key: "enciclopedia", label, icon: "📚", query: `"${name}"` };
  const results: EvidenceItem[] = [];
  const opt: NetOpts = { key: "wikipedia", label: "Wikipedia (búsqueda de la entidad)", ms: 9000, retries: 1 };

  // 1) Wikipedia ES → EN (un analista busca en ambos idiomas)
  let page: Awaited<ReturnType<typeof wikiProbe>> = null;
  for (const lang of ["es", "en"]) {
    try {
      page = await wikiProbe(lang, name, dom, { ...opt, label: `Wikipedia ${lang.toUpperCase()} (búsqueda de la entidad)` });
      if (page) break;
    } catch {
      /* siguiente idioma */
    }
  }

  // 2) Wikidata: entidad + P856 (sitio oficial declarado por la base knowledge)
  let wd: { id: string; url: string; description: string | null; official: string | null } | null = null;
  try {
    const ws = await jsonGet<WdSearchRes>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=es&format=json&origin=*&limit=3`,
      { key: "wikidata", label: "Wikidata (entidad y P856 sitio oficial)", ms: 9000, retries: 1, count: (d) => d.search?.length ?? 0 }
    );
    const hit = (ws.search ?? []).find((h) => entityRelevance(name, `${h.label ?? ""} ${h.description ?? ""}`, dom) >= 2) ?? null;
    if (hit?.id) {
      const ent = await jsonGet<WdEntitiesRes>(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(hit.id)}&props=claims|descriptions&languages=es|en&format=json&origin=*`,
        { key: "wikidata-entity", label: "Wikidata — claims de la entidad", ms: 9000, retries: 1, count: () => 1 }
      );
      const e = ent.entities?.[hit.id];
      const p856 = e?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
      const official = typeof p856 === "string" ? bare(hostOf(p856)) || p856.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase() : null;
      wd = {
        id: hit.id,
        url: hit.concepturi ?? `https://www.wikidata.org/wiki/${hit.id}`,
        description: e?.descriptions?.es?.value ?? e?.descriptions?.en?.value ?? hit.description ?? null,
        official: official && hostLooksLike(official, name) ? official : official,
      };
    }
  } catch {
    /* Wikidata no disponible en esta red — degradación honesta */
  }

  const verifiedHosts = [data.official_site, data.identity?.selected?.host, dom].filter((h): h is string => Boolean(h)).map(bare);
  const declaredOfficial = wd?.official ?? page?.official ?? null;
  const corroborates = Boolean(declaredOfficial && verifiedHosts.some((h) => h === bare(declaredOfficial) || bare(declaredOfficial).endsWith(`.${h}`)));

  data.wiki = {
    page_title: page?.title ?? null,
    page_url: page?.url ?? null,
    extract: page?.extract ?? "",
    official_site: declaredOfficial,
    wikidata_id: wd?.id ?? null,
    wikidata_url: wd?.url ?? null,
    wikidata_description: wd?.description ?? null,
    corroborates_identity: corroborates,
  } satisfies WikiInfo;

  // Refuerzo de identidad: la enciclopedia declara el MISMO sitio verificado
  if (corroborates && data.identity?.selected) {
    data.identity.selected.confirmations.push(
      `Enciclopedia: ${wd ? `Wikidata (${wd.id}) declara` : "Wikipedia declara en su infobox"} ${declaredOfficial} como sitio oficial de la entidad — coincide con el sitio verificado por contenido (tercer refuerzo independiente)`
    );
    data.identity.selected.score += 2;
  }

  if (page) {
    results.push(
      item(
        `Wikipedia: «${page.title}»`,
        page.url,
        page.extract ? `${page.extract.slice(0, 220)}` : "artículo enciclopédico sobre la entidad",
        ""
      )
    );
    if (page.official) {
      results.push(item(`Wikipedia enlaza ${page.official} como sitio oficial de la entidad`, `https://${page.official}`, "enlace externo del artículo enciclopédico (infobox) — desambiguación de homónimos por fuente independiente"));
    }
  }
  if (wd) {
    results.push(
      item(
        `Wikidata: ${wd.id}${wd.description ? ` — ${wd.description}` : ""}`,
        wd.url,
        wd.official ? `P856 (sitio oficial declarado): ${wd.official}${corroborates ? " — COINCIDE con el sitio verificado de la entidad" : " — NO coincide con el sitio verificado (revisar conflicto de identidad o marca diversificada)"}` : "entidad registrada en la base de conocimiento estructurada"
      )
    );
  }
  if (!results.length) {
    results.push(
      item(
        `Sin artículo enciclopédico identificado para "${name}"`,
        `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`,
        "Búsqueda real en Wikipedia (es+en) y Wikidata: sin artículo cuya identidad corresponda a la entidad tras el filtro anti-homónimos — normal en empresas privadas pequeñas; dato defendible, no un fallo"
      )
    );
  }
  return { ...base, ok: true, results: results.slice(0, 6) };
}

/* ═══════════════ HACKER NEWS — Algolia (CORS ✓) ═══════════════ */

interface HnHit {
  objectID?: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at?: string;
  story_text?: string | null;
}

export async function runHN(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Hacker News: historias y puntos";
  const base = { key: "hn", label, icon: "🧡", query: `"${name}"` };
  let hits: HnHit[] = [];
  try {
    const d = await jsonGet<{ hits?: HnHit[] }>(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${name}"`)}&tags=story&hitsPerPage=14`,
      { key: "hn", label: "Hacker News (Algolia API)", ms: 9000, retries: 1, count: (x) => x.hits?.length ?? 0 }
    );
    hits = d.hits ?? [];
  } catch {
    return { ...base, ok: false, results: [], error: "HN Algolia no accesible en esta red" };
  }
  const relevant = hits
    .filter((h) => entityRelevance(name, `${h.title ?? ""} ${h.story_text ?? ""}`, dom) >= 2)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  data.hn_stories = relevant.length;
  data.hn_points_total = relevant.reduce((a, h) => a + (h.points ?? 0), 0);
  const items = relevant.slice(0, 6).map((h) =>
    item(
      `HN: ${clean(h.title, 110)} — ${h.points ?? 0} puntos, ${h.num_comments ?? 0} comentarios`,
      h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      `Historia real en Hacker News (${(h.created_at ?? "").slice(0, 10)}) — discusión de la comunidad técnica`,
      (h.created_at ?? "").slice(0, 10)
    )
  );
  if (!items.length) {
    return {
      ...base,
      ok: true,
      results: [
        item(
          `Sin historias relevantes en Hacker News para "${name}"`,
          `https://hn.algolia.com/?q=${encodeURIComponent(name)}`,
          `Búsqueda real en el índice Algolia de HN: ${hits.length} historias revisadas, ninguna corresponde a la entidad tras el filtro anti-homónimos — sin tracción en la comunidad técnica (o demasiado temprana); dato defendible`
        ),
      ],
    };
  }
  return { ...base, ok: true, results: items };
}

/* ═══════════════ REDDIT — PullPush (API nativa) + fallback DDG ═══════════════ */

interface PpPost {
  title?: string;
  selftext?: string;
  permalink?: string;
  created_utc?: number;
  subreddit?: string;
  score?: number;
  num_comments?: number;
}

export async function runRedditPP(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Reddit: hilos públicos reales";
  const base = { key: "reddit", label, icon: "🟣", query: `site:reddit.com "${name}"` };
  // 1) PullPush: archivo completo de Reddit con API JSON nativa (CORS abierto
  //    desde navegador; 403 documentado desde IPs de datacenter — ahí cae al 2)
  try {
    const d = await jsonGet<{ data?: PpPost[] }>(
      `https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(`"${name}"`)}&size=12&sort=desc`,
      { key: "pullpush", label: "PullPush — archivo público de Reddit (API nativa)", ms: 11000, retries: 1, count: (x) => x.data?.length ?? 0 }
    );
    const posts = (d.data ?? [])
      .filter((p) => entityRelevance(name, `${p.title ?? ""} ${p.selftext ?? ""}`, dom) >= 2)
      .sort((a, b) => (b.created_utc ?? 0) - (a.created_utc ?? 0));
    data.pullpush_posts = posts.length;
    const existing = data.reddit_mentions;
    data.reddit_mentions = Math.max(existing, posts.length);
    if (posts.length) {
      const results = posts.slice(0, 6).map((p) =>
        item(
          `Reddit r/${p.subreddit ?? "?"}: ${clean(p.title, 100)}`,
          `https://www.reddit.com${p.permalink ?? ""}`,
          `Hilo público del archivo Reddit (PullPush)${p.score ? ` · ${p.score} puntos` : ""}${p.num_comments ? ` · ${p.num_comments} comentarios` : ""}`,
          p.created_utc ? new Date(p.created_utc * 1000).toISOString().slice(0, 10) : ""
        )
      );
      return { ...base, ok: true, results, query: `PullPush "${name}"` };
    }
    // 0 posts en PullPush →probamos el índice DDG antes de declarar cero
  } catch {
    /* PullPush bloqueado en esta red → fallback DDG */
  }
  // 2) Fallback existente: DDG site:reddit.com vía lector
  return await runReddit(name, data, L, dom);
}

/* ═══════════════ ARCHIVO — Wayback CDX + Certificate Transparency ═══════════════ */

export async function runArchivo(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Archivo: Wayback + certificados CT";
  const base = { key: "archivo", label, icon: "🗄️", query: data.domain ?? name };
  const results: EvidenceItem[] = [];
  const domain = data.domain;

  if (!domain) {
    return {
      ...base,
      ok: true,
      results: [
        item(
          "Sin dominio verificado — archivo histórico no consultable",
          "https://web.archive.org/",
          `La sonda no resolvió un dominio propio para la entidad (candidatos: ${data.domain_candidates.slice(0, 4).map((c) => c.domain).join(", ") || "ninguno"}); declara el dominio en el formulario para consultar Wayback y los certificados de TU empresa`
        ),
      ],
    };
  }

  // 1) Wayback CDX: años con capturas (colapsado por año)
  try {
    const rows = await jsonGet<(string | URL)[][]>(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&collapse=timestamp:4&limit=80`,
      { key: "wayback-cdx", label: "Wayback CDX — años con capturas del dominio", ms: 12000, retries: 1, count: (r) => Math.max(0, (r as unknown[][]).length - 1) }
    );
    const years = [...new Set(rows.slice(1).map((r) => parseInt(String(r[0]).slice(0, 4), 10)).filter((y) => y > 1990 && y <= new Date().getFullYear()))].sort((a, b) => a - b);
    data.wayback_years_active = years.length;
    if (years.length) {
      data.wayback_first_year = data.wayback_first_year ?? years[0];
      data.wayback_last_year = years[years.length - 1];
      results.push(
        item(
          `Historial archivado: capturas en ${years.length} año(s) distintos (${years[0]}–${years[years.length - 1]})`,
          `https://web.archive.org/web/*/${domain}`,
          "Internet Archive CDX real (colapsado por año) — continuidad documentada del sitio de la entidad"
        )
      );
    }
  } catch {
    /* archive.org bloqueado o dominio sin historial — ledger lo registra */
  }

  // 2) Último snapshot disponible (API de disponibilidad)
  try {
    const av = await jsonGet<{ archived_snapshots?: { closest?: { timestamp?: string; url?: string; status?: string } } }>(
      `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`,
      { key: "wayback-avail", label: "Wayback — snapshot más reciente", ms: 9000, retries: 1, count: (r) => (r.archived_snapshots?.closest ? 1 : 0) }
    );
    const snap = av.archived_snapshots?.closest;
    if (snap?.url) {
      const ts = snap.timestamp ?? "";
      results.push(
        item(
          `Última captura archivada: ${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`,
          snap.url,
          "Wayback Machine — el estado reciente del sitio está documentado y es visitable"
        )
      );
    }
  } catch {
    /* degradación honesta */
  }

  // 3) Certificate Transparency via crt.sh (a través del lector — crt.sh no
  //    emite CORS fiable; 502 intermitente documentado → degradación honesta)
  const bareDom = bare(domain);
  try {
    const rows = await readerJson<{ name_value?: string; not_before?: string; issuer_name?: string }[]>(
      `https://crt.sh/?q=%25.${encodeURIComponent(bareDom)}&output=json`,
      { key: "crtsh", label: "crt.sh — certificados TLS del dominio (CT logs)", ms: 28000, retries: 1, count: (r) => (Array.isArray(r) ? r.length : 0) }
    );
    const names = new Set<string>();
    let firstTs: string | null = null;
    for (const r of rows) {
      if (!firstTs && r.not_before) firstTs = r.not_before;
      for (const n of (r.name_value ?? "").split("\n")) {
        const h = bare(n.trim().toLowerCase().replace(/^\*\./, ""));
        if (h && h.endsWith(bareDom) && h !== bareDom) names.add(h);
      }
      if (names.size >= 12) break;
    }
    data.crt_subdomains = [...names].slice(0, 12);
    const year = firstTs ? parseInt(firstTs.slice(0, 4), 10) : null;
    if (Number.isFinite(year) && year! > 1990) data.crt_first_year = year;
    if (data.crt_subdomains.length) {
      results.push(
        item(
          `Infraestructura real: ${data.crt_subdomains.length} subdominio(s) en certificados TLS públicos`,
          `https://crt.sh/?q=%25.${bareDom}`,
          `Certificate Transparency (logs públicos de TLS): ${data.crt_subdomains.slice(0, 8).join(", ")}${data.crt_subdomains.length > 8 ? "…" : ""}${data.crt_first_year ? ` · primer certificado desde ${data.crt_first_year}` : ""} — la entidad opera servidores reales, no una LLC de papel`
        )
      );
    } else {
      results.push(item("Sin subdominios adicionales en CT logs", `https://crt.sh/?q=%25.${bareDom}`, "crt.sh: solo certificados para el dominio raíz — footprint de infraestructura mínimo (normal en empresas pequeñas)"));
    }
  } catch {
    results.push(item("crt.sh no disponible en esta red", `https://crt.sh/?q=%25.${bareDom}`, "Certificate Transparency no consultable ahora (502 intermitente documentado del servicio) — el resto del vector Archivo sí se ejecutó"));
  }

  return { ...base, ok: true, results };
}

/* ═══════════════ NOTICIAS GLOBALES — Google News RSS + GDELT ═══════════════ */

/** Parser tolerante de RSS renderizado a markdown por el lector (soporta
 * títulos tipo `#### [t](u)` y listas `- [t](u)` — Google News y Bing). */
function parseRss(md: string, limit = 8): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  let cur: { title: string; url: string; snippet: string } | null = null;
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const m = line.match(/^#{2,4}\s+\[(.+?)\]\((\S+?)\)\s*$/) ?? line.match(/^[-*]\s+\[(.+?)\]\((\S+?)\)\s*$/);
    if (m) {
      if (cur && cur.url) out.push(cur);
      cur = m[2].startsWith("http") ? { title: clean(m[1], 150), url: m[2], snippet: "" } : null;
      continue;
    }
    if (!cur) continue;
    if (/^!\[|^#/.test(line)) continue;
    const text = clean(line);
    if (text.length >= 30 && cur.snippet.length < 200) cur.snippet = `${cur.snippet} ${text}`.trim();
  }
  if (cur && cur.url) out.push(cur);
  return out.slice(0, limit);
}

interface GdeltArt { url?: string; title?: string; seendate?: string; domain?: string }

export async function runNoticiasG(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Noticias globales: Google News + GDELT";
  const base = { key: "noticiasg", label, icon: "🌍", query: `"${name}"` };
  const collected: EvidenceItem[] = [];

  // 1) Google News RSS vía lector (índice de noticias GLOBAL, no solo Bing)
  try {
    const md = await readerGet(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${name}"`)}&hl=es&gl=US&ceid=US:es`, {
      key: "gnews",
      label: "Google News RSS (búsqueda global de prensa)",
      ms: 26000,
      retries: 2,
    });
    const hits = parseRss(md, 10);
    const filt = filterRelevant(name, hits.map((h) => item(h.title, h.url, h.snippet)), 1, dom);
    collected.push(...filt.items);
  } catch {
    /* degradación honesta — GDELT puede cubrir */
  }

  // 2) GDELT DOC 2.0: directo primero; si la red lo bloquea (geobloqueo
  //    documentado desde datacenter), respaldo vía lector.
  const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${name}"`)}&mode=artlist&maxrecords=8&format=json&sort=datedesc`;
  const gdeltParse = (arts: GdeltArt[]) =>
    (arts ?? [])
      .filter((a) => a.url && a.title)
      .slice(0, 5)
      .map((a) => item(a.title ?? "", a.url ?? "", `GDELT — cobertura de prensa indexada (${a.domain ?? hostOf(a.url ?? "")})`, (a.seendate ?? "").replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3")));
  let gdelt: EvidenceItem[] = [];
  try {
    const d = await jsonGet<{ articles?: GdeltArt[] }>(gdeltUrl, { key: "gdelt", label: "GDELT DOC 2.0 (prensa mundial)", ms: 8000, retries: 1, count: (x) => x.articles?.length ?? 0 });
    gdelt = gdeltParse(d.articles ?? []);
  } catch {
    try {
      const d = await readerJson<{ articles?: GdeltArt[] }>(gdeltUrl, { key: "gdelt-lector", label: "GDELT vía lector (respaldo de geobloqueo)", ms: 26000, retries: 1, count: (x) => x.articles?.length ?? 0 });
      gdelt = gdeltParse(d.articles ?? []);
    } catch {
      /* ambas rutas caídas — ledger lo registra */
    }
  }
  collected.push(...gdelt);

  // dedupe por host+título
  const seen = new Set<string>();
  const uniq = collected.filter((i) => {
    const k = `${i.host}::${clean(i.title, 60).toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!uniq.length) {
    return {
      ...base,
      ok: true,
      results: [
        item(
          `Sin cobertura en los índices globales de noticias para "${name}"`,
          `https://news.google.com/search?q=${encodeURIComponent(`"${name}"`)}`,
          "Google News RSS + GDELT consultados de verdad: 0 titulares sobre la entidad tras el filtro anti-homónimos — sin cobertura de prensa (datos defendibles, no un fallo)"
        ),
      ],
    };
  }
  return { ...base, ok: true, results: uniq.slice(0, 8) };
}

/* ═══════════════ PAQUETES — crates.io (ecosistema Rust) ═══════════════ */

export async function runPaquetes(name: string, data: MoreData, L: GovSourceLog[], dom: string | null): Promise<SearchVectorResult> {
  const label = "Paquetes: crates.io (ecosistema Rust)";
  const base = { key: "paquetes", label, icon: "📥", query: name };
  const token = entityCompact(name);
  try {
    const d = await jsonGet<{ crates?: { id?: string; name?: string; description?: string | null; downloads?: number; repository?: string | null }[] }>(
      `https://crates.io/api/v1/crates?q=${encodeURIComponent(name)}&per_page=6`,
      { key: "cratesio", label: "crates.io — paquetes Rust del ecosistema", ms: 10000, retries: 1, count: (x) => x.crates?.length ?? 0 }
    );
    const crates = (d.crates ?? [])
      .filter((c) => {
        const id = (c.id ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const desc = `${c.name ?? ""} ${c.description ?? ""}`;
        return (token && id.replace(/[-_]/g, "").includes(token)) || entityRelevance(name, desc, dom) >= 2;
      })
      .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    if (crates.length) {
      data.crates_found = true;
      data.crates_downloads = crates[0]?.downloads ?? null;
      const results = crates.slice(0, 3).map((c) =>
        item(
          `crates.io: ${c.name ?? c.id} — ${(c.downloads ?? 0).toLocaleString("es")} descargas`,
          c.repository ?? `https://crates.io/crates/${c.id}`,
          `${c.description ?? "crate público"} — distribución verificable en el ecosistema Rust`
        )
      );
      return { ...base, ok: true, results };
    }
    return {
      ...base,
      ok: true,
      results: [
        item(`Sin paquetes en crates.io para "${name}"`, `https://crates.io/search?q=${encodeURIComponent(name)}`, "Búsqueda real en crates.io: ningún crate del ecosistema Rust corresponde a la entidad — normal salvo producto dev en Rust"),
      ],
    };
  } catch {
    // 403 documentado desde IPs de datacenter (protección bot de crates.io);
    // desde el navegador del usuario funciona — degradación honesta aquí.
    return { ...base, ok: false, results: [], error: "crates.io no accesible desde esta red (protección bot; en tu navegador sí responde)" };
  }
}

/* ═══════════════ SEGUNDA OLA — consultas de seguimiento (profunda) ═══════════════ */

/**
 * El rasgo distintivo de la investigación algorítmica: la misión SE RE-PLANEA
 * a sí misma con lo que ya verificó. Ángulos fijos de un analista humano
 * (financiación, riesgo, producto, clientes) + consulta site: del sitio
 * verificado. Cada consulta se ejecuta de verdad y deja su contador.
 */
export async function runFollowUpWave(name: string, data: MoreData, dom: string | null, onOne?: (v: SearchVectorResult) => void): Promise<SearchVectorResult | null> {
  const angles: { angle: string; q: string }[] = [
    { angle: "financiación", q: `"${name}" (funding OR "seed round" OR "series a" OR valuation OR raises)` },
    { angle: "riesgo", q: `"${name}" (lawsuit OR layoff OR fraud OR investigation OR scandal)` },
    { angle: "producto", q: `"${name}" (launch OR release OR beta OR platform OR ships)` },
    { angle: "clientes", q: `"${name}" (customers OR contract OR partnership OR revenue OR deal)` },
  ];
  if (data.identity?.selected) {
    angles.push({ angle: "marca (sitio verificado)", q: `"${name}" site:${data.identity.selected.host}` });
  }

  const items: EvidenceItem[] = [];
  for (const a of angles) {
    try {
      const md = await readerGet(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(a.q)}`, {
        key: "profunda",
        label: `Segunda ola — ${a.angle}`,
        ms: 26000,
        retries: 2,
      });
      const hits = parseDdg(md, 6);
      const filt = filterRelevant(name, hits.map((h) => item(h.title, h.url, h.snippet)), 1, dom);
      const fu: FollowUp = { angle: a.angle, query: a.q, found: filt.items.length };
      data.followups.push(fu);
      items.push(...filt.items.slice(0, 3));
    } catch {
      data.followups.push({ angle: a.angle, query: a.q, found: 0 });
    }
  }
  if (!data.followups.length) return null;
  const foundTotal = data.followups.reduce((a, f) => a + f.found, 0);
  const v: SearchVectorResult = {
    key: "profunda",
    label: "Segunda ola: consultas de seguimiento (oráculo)",
    icon: "🎯",
    query: `${data.followups.length} consultas de seguimiento`,
    ok: true,
    results: items.slice(0, 10),
    error: foundTotal === 0 ? "las consultas de seguimiento no arrojaron hallazgos nuevos que mencionen a la entidad" : undefined,
  };
  onOne?.(v);
  return v;
}

/* ═══════════════ LÍNEA DE TIEMPO VERIFICABLE ═══════════════ */

/**
 * Fusiona eventos FECHADOS y verificables de toda la misión en una cronología
 * única: infraestructura (RDAP, Wayback, certificados), identidad (GitHub),
 * comunidad (HN, Reddit, Stack Exchange) y prensa. Cada evento conserva su
 * URL de fuente — la línea de tiempo de un oráculo es auditable.
 */
export function buildTimeline(data: MoreData, vectors: SearchVectorResult[], name?: string): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const push = (date: string, label: string, source: string, url: string) => {
    if (!date || !/^\d{4}/.test(date)) return;
    ev.push({ date, label, source, url });
  };

  // Infraestructura
  if (data.domain_age_years !== null && data.domain) {
    const y = new Date().getFullYear() - data.domain_age_years;
    const edad = data.domain_age_years <= 0 ? "menos de 1 año" : `≈${data.domain_age_years} años`;
    push(`${Math.max(1980, y)}-01-01`, `Dominio ${data.domain} registrado (edad ${edad}, RDAP)`, "RDAP", `https://rdap.org/domain/${data.domain}`);
  }
  if (data.crt_first_year && data.domain) {
    push(`${data.crt_first_year}-01-01`, `Primer certificado TLS del dominio en los logs públicos de Certificate Transparency`, "crt.sh", `https://crt.sh/?q=%25.${bare(data.domain)}`);
  }
  if (data.wayback_first_year && data.domain) {
    push(`${data.wayback_first_year}-01-01`, `Primera captura archivada en Wayback Machine${data.wayback_years_active ? ` (${data.wayback_years_active} años con capturas)` : ""}`, "Internet Archive", `https://web.archive.org/web/*/${data.domain}`);
  }

  // Identidad (solo cuentas con verificación — nunca por parecido de login)
  for (const c of (data.identity?.githubCandidates ?? []).filter((c) => c.status === "circular" || c.status === "declarada" || c.status === "contenido").slice(0, 2)) {
    if (c.created_at) push(c.created_at.slice(0, 10), `Cuenta GitHub @${c.login} creada (${c.type})`, "GitHub", c.html_url);
  }

  // Comunidad + prensa con fecha real, deduplicadas por host+fecha.
  // Barra de identidad EXTRA para la cronología: una fila de timeline debe
  // mencionar a la entidad en su título (evita que repos/menciones del ruido
  // de búsqueda diluyan la línea de tiempo del oráculo).
  const seen = new Set<string>();
  for (const v of vectors) {
    for (const r of v.results) {
      if (!r.date || !/^\d{4}/.test(r.date)) continue;
      const k = `${r.host}::${r.date}::${clean(r.title, 40).toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const isZero = /^sin /i.test(r.title);
      if (isZero) continue;
      if (name) {
        const compactName = entityCompact(name);
        const titleCompact = clean(r.title, 200).toLowerCase().replace(/[^a-z0-9]/g, "");
        const mentions =
          (compactName && titleCompact.includes(compactName)) ||
          entityRelevance(name, r.title, data.domain) >= 2 ||
          /proyecto real|identidad verificada|verificado por og-scout|sitio de la entidad|cuenta\(s\)|identidad triple/i.test(r.title);
        if (!mentions) continue;
      }
      push(r.date.slice(0, 10), clean(r.title, 130), v.label, r.url);
    }
  }

  // Ancla honesta: si la misión resolvió/verificó identidad pero la red no
  // dio eventos fechados (archive.org/crt.sh caídos, p. ej.), la cronología
  // registra al menos CUÁNDO se verificó el sitio — hecho real de la misión.
  if (!ev.length && (data.identity?.selected || data.official_site)) {
    const host = data.identity?.selected?.host ?? data.official_site!;
    push(new Date().toISOString().slice(0, 10), `Sitio ${host} verificado por contenido real en esta misión (OG-Scout)`, "OG-Scout", `https://${host}`);
  }

  ev.sort((a, b) => a.date.localeCompare(b.date));
  return ev.slice(0, 26);
}
