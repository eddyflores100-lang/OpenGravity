/**
 * agents-more-static.ts — AMPLIACIÓN del arsenal de investigación (100% cliente,
 * 100% APIs gratuitas verificadas con curl: estado HTTP + Access-Control-Allow-Origin).
 *
 * 6 vectores nuevos que se suman a los 6 originales:
 *   talento  → Greenhouse / Lever / SmartRecruiters / Workable (job boards públicos)
 *   apps     → iTunes Search API (valoraciones App Store)
 *   ciencia  → OpenAlex (papers) + ClinicalTrials.gov v2 (ensayos patrocinados)
 *   web      → Cloudflare DoH (DNS) + RDAP vía r.jina.ai (antigüedad del dominio)
 *              + Wayback CDX (primer snapshot; degrada si la red bloquea archive.org)
 *   mercados → Yahoo Finance vía r.jina.ai (ticker + tendencia 1y) + CoinGecko (cripto)
 *   regs     → Federal Register + openFDA (aprobaciones y retiradas)
 *
 * Fuentes descartadas honestamente tras verificación: GDELT (caída geobloqueo),
 * crt.sh (502 intermitente), Google Patents (anti-bot), Reddit (403), Grants.gov/NSF
 * (requieren clave), Ashby (401 desde 2025), PageSpeed (cuota+lentitud), NIH RePORTER
 * (endpoint caído). Tavily queda como vector opt-in con clave del usuario (runTavily).
 *
 * Los fusibles objetivos de estos datos entran al auditor vía moreStructuralSignals(),
 * con el mismo contrato que govStructuralSignalsStatic() para los scrapers .gov.
 */

import { jinaJson } from "@/lib/agents-gov-static";
import {
  EMPTY_MORE_DATA,
  VECTOR_META,
  TAVILY_META,
  type EvidenceItem,
  type GovSourceLog,
  type MoreBundle,
  type MoreData,
  type SearchVectorResult,
  type SynthesisSignal,
} from "@/lib/research";

const TIMEOUT_MS = 9000;

const hostOf = (u: string) => {
  try {
    return new URL(u).host;
  } catch {
    return "web";
  }
};

const clean = (s: unknown, cap = 300) =>
  (s ?? "")
    .toString()
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, cap);

function item(title: string, url: string, snippet: string, date = ""): EvidenceItem {
  return { title: clean(title, 140), url, host: hostOf(url), snippet: clean(snippet), date: clean(date, 24) };
}

/* ── utilidades de red ─────────────────────────────────────────────────────── */

const memo = new Map<string, unknown>();

/** GET JSON directo (CORS abierto verificado) con memoización. */
async function mget<T>(url: string, ms = TIMEOUT_MS): Promise<T> {
  if (memo.has(url)) return memo.get(url) as T;
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as T;
  memo.set(url, json);
  return json;
}

/** GET JSON que devuelve 404 cuando no hay registros (openFDA): 404 → vacío, no error. */
async function mget404<T>(url: string, ms = TIMEOUT_MS): Promise<T | null> {
  if (memo.has(url)) return memo.get(url) as T;
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as T;
  memo.set(url, json);
  return json;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const dashSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+$/i;

export function guessDomain(name: string): string | null {
  const t = name.trim();
  if (DOMAIN_RE.test(t)) return t.toLowerCase();
  const s = slugify(t);
  return s ? `${s}.com` : null;
}

/** Log de sub-fuente con cronometraje (para el mapa de investigación). */
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
    L.push({ key, label, endpoint, ok: true, count, ms: Date.now() - t0, error: count === 0 ? zeroNote : undefined });
    return out;
  } catch (e) {
    L.push({ key, label, endpoint, ok: false, count: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : "error" });
    return null;
  }
}

/* ═══════════════════════ TALENTO — job boards públicos ═════════════════════ */

interface JobsOut { board: string; count: number; sample: string[]; url: string }

async function fetchGreenhouse(slug: string): Promise<JobsOut | null> {
  for (const s of [slug, `${slug}inc`]) {
    try {
      const d = await mget<{ jobs?: { title?: string }[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=false`
      );
      const jobs = d.jobs ?? [];
      return {
        board: "Greenhouse",
        count: jobs.length,
        sample: jobs.slice(0, 3).map((j) => j.title ?? ""),
        url: `https://boards.greenhouse.io/${s}`,
      };
    } catch {
      /* siguiente slug */
    }
  }
  return null;
}

async function fetchLever(slug: string): Promise<JobsOut | null> {
  try {
    const d = await mget<{ title?: string }[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!Array.isArray(d)) return null;
    return {
      board: "Lever",
      count: d.length,
      sample: d.slice(0, 3).map((j) => j.title ?? ""),
      url: `https://jobs.lever.co/${slug}`,
    };
  } catch {
    return null;
  }
}

async function fetchSmartRecruiters(slug: string): Promise<JobsOut | null> {
  try {
    const d = await mget<{ totalFound?: number; content?: { name?: string }[] }>(
      `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=10`
    );
    return {
      board: "SmartRecruiters",
      count: d.totalFound ?? 0,
      sample: (d.content ?? []).slice(0, 3).map((j) => j.name ?? ""),
      url: `https://www.smartrecruiters.com/${slug}`,
    };
  } catch {
    return null;
  }
}

async function fetchWorkable(slug: string): Promise<JobsOut | null> {
  try {
    const d = await mget<{ jobs?: { title?: string }[] }>(
      `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=false`
    );
    const jobs = d.jobs ?? [];
    return {
      board: "Workable",
      count: jobs.length,
      sample: jobs.slice(0, 3).map((j) => j.title ?? ""),
      url: `https://apply.workable.com/${slug}`,
    };
  } catch {
    return null;
  }
}

/* ═══════════════════════ APPS — iTunes Search API ══════════════════════════ */

interface AppOut { trackName: string; sellerName: string; rating: number; ratingCount: number; url: string }

async function fetchiTunes(name: string): Promise<AppOut[]> {
  const d = await mget<{ results?: { trackName?: string; sellerName?: string; averageUserRating?: number; userRatingCount?: number; trackViewUrl?: string; kind?: string }[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=software&limit=8&country=us`
  );
  const token = name.toLowerCase().split(/\s+/)[0] ?? "";
  return (d.results ?? [])
    .filter((a) => a.kind === "software")
    .filter((a) => `${a.trackName ?? ""} ${a.sellerName ?? ""}`.toLowerCase().includes(token))
    .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
    .slice(0, 3)
    .map((a) => ({
      trackName: a.trackName ?? "",
      sellerName: a.sellerName ?? "",
      rating: a.averageUserRating ?? 0,
      ratingCount: a.userRatingCount ?? 0,
      url: a.trackViewUrl ?? "https://apps.apple.com/",
    }));
}

/* ═══════════════════════ CIENCIA — OpenAlex + ClinicalTrials ═══════════════ */

interface PaperOut { title: string; year: number | null; cited: number; url: string }

async function fetchOpenAlex(name: string): Promise<{ papers: PaperOut[]; total: number }> {
  const d = await mget<{ meta?: { count?: number }; results?: { display_name?: string; publication_year?: number; cited_by_count?: number; doi?: string; id?: string }[] }>(
    `https://api.openalex.org/works?search=${encodeURIComponent(name)}&per-page=4&mailto=opengravity.demo@alicelabs.dev`
  );
  const token = name.toLowerCase().split(/\s+/)[0] ?? "";
  const papers = (d.results ?? [])
    .filter((p) => (p.display_name ?? "").toLowerCase().includes(token))
    .map((p) => ({
      title: p.display_name ?? "",
      year: p.publication_year ?? null,
      cited: p.cited_by_count ?? 0,
      url: p.doi || p.id || "https://openalex.org/",
    }));
  return { papers, total: d.meta?.count ?? 0 };
}

interface TrialOut { nct: string; title: string; status: string; sponsor: string }

async function fetchTrials(name: string): Promise<{ trials: TrialOut[]; total: number }> {
  const d = await mget<{ totalCount?: number; studies?: { protocolSection?: { identificationModule?: { nctId?: string; briefTitle?: string }; statusModule?: { overallStatus?: string }; sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } } } }[] }>(
    `https://clinicaltrials.gov/api/v2/studies?query.spons=${encodeURIComponent(name)}&pageSize=6`
  );
  const trials = (d.studies ?? []).map((s) => ({
    nct: s.protocolSection?.identificationModule?.nctId ?? "",
    title: s.protocolSection?.identificationModule?.briefTitle ?? "",
    status: s.protocolSection?.statusModule?.overallStatus ?? "",
    sponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name ?? "",
  }));
  return { trials, total: d.totalCount ?? trials.length };
}

/* ═══════════════════════ WEB — DoH + RDAP + Wayback ════════════════════════ */

async function fetchDoh(domain: string): Promise<{ alive: boolean; answers: number }> {
  const d = await mget<{ Status?: number; Answer?: { type?: number }[] }>(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
    8000
  );
  const answers = (d.Answer ?? []).filter((a) => a.type === 1).length;
  return { alive: d.Status === 0 && answers > 0, answers };
}

interface RdapOut { registrar: string | null; ageYears: number | null }

async function fetchRdap(domain: string): Promise<RdapOut | null> {
  try {
    const d = await jinaJson<{
      events?: { eventAction?: string; eventDate?: string }[];
      entities?: { roles?: string[]; vcardArray?: unknown[] }[];
    }>(`https://rdap.org/domain/${domain}`, 15000);
    const reg = (d.events ?? []).find((e) => e.eventAction === "registration")?.eventDate;
    const registrarEnt = (d.entities ?? []).find((e) => (e.roles ?? []).includes("registrar"));
    let registrar: string | null = null;
    const vcard = registrarEnt?.vcardArray as unknown[] | undefined;
    if (Array.isArray(vcard) && Array.isArray(vcard[1])) {
      for (const row of vcard[1] as unknown[]) {
        if (Array.isArray(row) && row[0] === "fn" && typeof row[3] === "string") registrar = row[3];
      }
    }
    const ageYears = reg ? Math.floor((Date.now() - new Date(reg).getTime()) / (864e5 * 365.25)) : null;
    return { registrar, ageYears };
  } catch {
    return null;
  }
}

async function fetchWayback(domain: string): Promise<number | null> {
  const rows = await mget<(string | URL)[][]>(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=3&fl=timestamp,original`,
    8000
  );
  const first = rows.length > 1 ? String(rows[1]?.[0] ?? "") : "";
  const year = parseInt(first.slice(0, 4), 10);
  return Number.isFinite(year) && year > 1990 ? year : null;
}

/* ═══════════════════════ MERCADOS — Yahoo + CoinGecko ══════════════════════ */

interface YahooOut {
  quotes: { symbol?: string; shortname?: string; quoteType?: string; exchange?: string }[];
  news: { title?: string; link?: string; publisher?: string; providerPublishTime?: number }[];
}

export async function fetchYahoo(name: string): Promise<YahooOut> {
  const d = await jinaJson<YahooOut>(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(name)}&quotesCount=6&newsCount=4`,
    18000
  );
  return { quotes: d.quotes ?? [], news: d.news ?? [] };
}

async function fetchYahooTrend(symbol: string): Promise<number | null> {
  const d = await jinaJson<{ chart?: { result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[] } }>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1mo`,
    18000
  );
  const closes = (d.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => typeof v === "number");
  if (closes.length < 2) return null;
  const first = closes[0];
  const last = closes[closes.length - 1];
  if (!first) return null;
  return ((last - first) / first) * 100;
}

async function fetchCoinGecko(name: string): Promise<{ name: string; rank: number | null; url: string }[]> {
  const d = await mget<{ coins?: { id?: string; name?: string; symbol?: string; market_cap_rank?: number | null }[] }>(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`,
    10000
  );
  const token = name.toLowerCase().split(/\s+/)[0] ?? "";
  return (d.coins ?? [])
    .filter((c) => `${c.name ?? ""} ${c.symbol ?? ""}`.toLowerCase().includes(token))
    .slice(0, 2)
    .map((c) => ({
      name: c.name ?? c.id ?? "",
      rank: c.market_cap_rank ?? null,
      url: `https://www.coingecko.com/en/coins/${c.id ?? ""}`,
    }));
}

/* ═══════════════════════ REGS — Federal Register + openFDA ═════════════════ */

interface RegDoc { title: string; url: string; date: string; type: string }

async function fetchFedRegister(name: string): Promise<{ docs: RegDoc[]; count: number }> {
  const d = await mget<{ count?: number; results?: { title?: string; html_url?: string; publication_date?: string; type?: string }[] }>(
    `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${encodeURIComponent(`"${name}"`)}&per_page=4&order=relevance`
  );
  const docs = (d.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.html_url ?? "https://www.federalregister.gov/",
    date: r.publication_date ?? "",
    type: r.type ?? "",
  }));
  return { docs, count: d.count ?? 0 };
}

async function fetchFda(name: string): Promise<{ approvals: number; recalls: number; recallItems: RegDoc[] }> {
  const q = encodeURIComponent(`"${name}"`);
  const appr = await mget404<{ meta?: { results?: { total?: number } }; results?: { openfda?: { brand_name?: string[] }[] } }>(
    `https://api.fda.gov/drug/drugsfda.json?search=sponsor_name:${q}&limit=3`
  );
  const rec = await mget404<{ meta?: { results?: { total?: number } }; results?: { recalling_firm?: string; product_description?: string; report_date?: string }[] }>(
    `https://api.fda.gov/drug/enforcement.json?search=recalling_firm:${q}&limit=3`
  );
  return {
    approvals: appr?.meta?.results?.total ?? 0,
    recalls: rec?.meta?.results?.total ?? 0,
    recallItems: (rec?.results ?? []).map((r) => ({
      title: `Retirada FDA — ${r.recalling_firm ?? ""}`,
      url: `https://open.fda.gov/data/enforcement/`,
      date: r.report_date ?? "",
      type: "enforcement",
    })),
  };
}

/* ═══════════════════════ Comunidad/Productos (para vectores originales) ════ */

export interface PkgOut { name: string; description: string; monthly: number | null; url: string }

export async function fetchNpm(name: string): Promise<PkgOut[]> {
  const d = await mget<{ objects?: { package?: { name?: string; description?: string; links?: { npm?: string } }; downloads?: { monthly?: number } }[] }>(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=5`
  );
  const token = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (d.objects ?? [])
    .filter((o) => (o.package?.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(token))
    .slice(0, 2)
    .map((o) => ({
      name: o.package?.name ?? "",
      description: o.package?.description ?? "",
      monthly: o.downloads?.monthly ?? null,
      url: o.package?.links?.npm ?? `https://www.npmjs.com/package/${o.package?.name ?? ""}`,
    }));
}

export async function fetchPypi(name: string): Promise<boolean> {
  const slug = slugify(name);
  if (!slug) return false;
  const d = await mget404<{ info?: { name?: string; summary?: string } }>(`https://pypi.org/pypi/${slug}/json`, 6000);
  return Boolean(d?.info?.name);
}

export async function fetchDocker(name: string): Promise<{ pulls: number | null; repos: { name: string; description: string; pulls: number; url: string }[] }> {
  const d = await jinaJson<{ results?: { repo_name?: string; short_description?: string; pull_count?: number }[] }>(
    `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(name)}&page_size=4`,
    18000
  );
  const token = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const repos = (d.results ?? [])
    .filter((r) => (r.repo_name ?? "").toLowerCase().replace(/[^a-z0-9/_]/g, "").includes(token))
    .slice(0, 2)
    .map((r) => ({
      name: r.repo_name ?? "",
      description: r.short_description ?? "",
      pulls: r.pull_count ?? 0,
      url: `https://hub.docker.com/r/${r.repo_name ?? ""}`,
    }));
  return { pulls: repos.length ? Math.max(...repos.map((r) => r.pulls)) : null, repos };
}

export interface SeOut { title: string; url: string; score: number; date: string }

export async function fetchStackExchange(name: string): Promise<SeOut[]> {
  const d = await mget<{ items?: { title?: string; link?: string; score?: number; creation_date?: number }[] }>(
    `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(name)}&site=stackoverflow&pagesize=5`
  );
  return (d.items ?? []).slice(0, 4).map((it) => ({
    title: it.title ?? "",
    url: it.link ?? "https://stackoverflow.com/",
    score: it.score ?? 0,
    date: it.creation_date ? new Date(it.creation_date * 1000).toISOString().slice(0, 10) : "",
  }));
}

export interface GdeltOut { title: string; url: string; date: string; domain: string }

/** GDELT DOC 2.0 — caído desde IPs de datacenter (verificado); desde navegadores
 * residenciales puede responder. Timeout corto + degradación honesta. */
export async function fetchGdelt(name: string): Promise<GdeltOut[]> {
  const d = await mget<{ articles?: { url?: string; title?: string; seendate?: string; domain?: string }[] }>(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${name}"`)}&mode=artlist&maxrecords=8&format=json&sort=datedesc`,
    7000
  );
  return (d.articles ?? [])
    .filter((a) => a.url && a.title)
    .slice(0, 5)
    .map((a) => ({
      title: a.title ?? "",
      url: a.url ?? "",
      date: (a.seendate ?? "").replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3"),
      domain: a.domain ?? hostOf(a.url ?? ""),
    }));
}

/* ═══════════════════════ Los 6 vectores nuevos ═════════════════════════════ */

async function runTalento(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "talento")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const slug = slugify(name);
  const dash = dashSlug(name);
  if (!slug) return { ...base, ok: false, results: [], error: "nombre no normalizable" };

  const [gh, lv, sr, wb] = await Promise.all([
    withLog(L, "greenhouse", "Greenhouse — board público de vacantes", "boards-api.greenhouse.io (CORS directo)", () => fetchGreenhouse(slug), "sin board con este slug"),
    withLog(L, "lever", "Lever — board público de vacantes", "api.lever.co/v0/postings (CORS directo)", () => fetchLever(dash), "sin board con este slug"),
    withLog(L, "smartrecruiters", "SmartRecruiters — board público de vacantes", "api.smartrecruiters.com/v1/companies (CORS directo)", () => fetchSmartRecruiters(slug), "sin cuenta con este slug"),
    withLog(L, "workable", "Workable — board público de vacantes", "apply.workable.com/api/v1/widget (CORS directo)", () => fetchWorkable(slug), "sin cuenta con este slug"),
  ]);

  const boards = [gh, lv, sr, wb].filter((b): b is JobsOut => Boolean(b && b.count > 0));
  data.jobs_detail = boards.map((b) => ({ board: b.board, count: b.count, sample: b.sample.filter(Boolean) }));
  data.jobs_total = boards.reduce((a, b) => a + b.count, 0);

  const results = boards.map((b) =>
    item(`${b.count} vacantes abiertas en ${b.board}`, b.url, b.sample.filter(Boolean).join(" · ") || "vacantes activas publicadas")
  );
  if (!results.length) {
    results.push(
      item(
        "Sin vacantes en los 4 ATS públicos consultados",
        "https://boards-api.greenhouse.io/",
        "Greenhouse, Lever, SmartRecruiters y Workable no devuelven board con el slug de la empresa — normal en startups muy tempranas o que contratan vía otros canales"
      )
    );
  }
  return { ...base, ok: true, results };
}

async function runApps(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "apps")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const apps = await withLog(L, "itunes", "iTunes Search API — apps y valoraciones", "itunes.apple.com/search (CORS directo)", () => fetchiTunes(name), "sin apps con ese nombre");
  const found = apps ?? [];
  data.apps_count = found.length;
  data.apps_rating_count = found.reduce((a, x) => a + x.ratingCount, 0);
  const results = found.map((a) =>
    item(`App Store: ${a.trackName} — ★${a.rating.toFixed(1)} (${a.ratingCount.toLocaleString("es")} valoraciones)`, a.url, `Publicada por ${a.sellerName} — señal de producto en el mercado`)
  );
  if (!results.length) results.push(item("Sin apps en App Store con ese nombre", "https://performance-partners.apple.com/search-api/", "iTunes Search API sin resultados (la startup puede ser B2B o web-only)"));
  return { ...base, ok: true, results };
}

async function runCiencia(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "ciencia")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const [oa, ct] = await Promise.all([
    withLog(L, "openalex", "OpenAlex — trabajos científicos indexados", "api.openalex.org/works (CORS directo)", () => fetchOpenAlex(name), "sin papers con ese nombre"),
    withLog(L, "clinicaltrials", "ClinicalTrials.gov v2 — ensayos patrocinados", "clinicaltrials.gov/api/v2/studies (CORS directo)", () => fetchTrials(name), "sin ensayos con ese patrocinador"),
  ]);
  const papers = oa?.papers ?? [];
  const trials = ct?.trials ?? [];
  // Conteo honesto: solo papers cuyo título menciona el nombre (evita el ruido
  // de coincidencias genéricas — p.ej. "Nikola Tesla" para "Nikola").
  data.papers_count = papers.length;
  data.trials_count = ct?.total ?? 0;

  const results: EvidenceItem[] = papers.map((p) =>
    item(`Paper indexado en OpenAlex: ${p.title.slice(0, 90)}`, p.url, `${p.year ?? "s/f"} · ${p.cited} citas — base científica verificable`)
  );
  for (const t of trials.slice(0, 3)) {
    results.push(item(`Ensayo clínico ${t.nct}: ${t.title.slice(0, 80)}`, `https://clinicaltrials.gov/study/${t.nct}`, `Patrocinador: ${t.sponsor || name} · estado: ${t.status || "—"} — registro público oficial`));
  }
  if (!results.length) results.push(item("Sin papers ni ensayos con ese nombre", "https://openalex.org/", "OpenAlex y ClinicalTrials.gov sin coincidencias relevantes"));
  return { ...base, ok: true, results };
}

async function runWeb(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "web")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const domain = data.domain ?? guessDomain(name);
  const results: EvidenceItem[] = [];
  if (!domain) return { ...base, ok: false, results: [], error: "sin dominio inferible" };
  data.domain = domain;

  const [doh, rdap, wb] = await Promise.all([
    withLog(L, "doh", "Cloudflare DoH — el dominio resuelve en DNS", "cloudflare-dns.com/dns-query (CORS directo)", () => fetchDoh(domain), "sin registros A"),
    withLog(L, "rdap", "RDAP — antigüedad y registrador del dominio", "rdap.org vía r.jina.ai", () => fetchRdap(domain), "sin registro RDAP"),
    withLog(L, "wayback", "Wayback CDX — primer snapshot archivado", "web.archive.org/cdx (CORS directo)", () => fetchWayback(domain), "sin snapshots o red bloquea archive.org"),
  ]);

  if (doh) {
    data.domain_alive = doh.alive;
    results.push(
      doh.alive
        ? item(`Dominio ${domain} ACTIVO — resuelve con ${doh.answers} registro(s) A`, `https://dns.google/query?name=${domain}`, "Cloudflare DNS-over-HTTPS: NOERROR con registros A (infraestructura web viva)")
        : item(`Dominio ${domain} SIN resolución DNS`, `https://dns.google/query?name=${domain}`, "Cloudflare DoH: sin registros A — la web oficial declarada/inferida está caída o nunca existió (verificar TLD alternativo)")
    );
  }
  if (rdap) {
    data.domain_registrar = rdap.registrar;
    data.domain_age_years = rdap.ageYears;
    if (rdap.ageYears !== null) {
      results.push(item(`Dominio ${domain} registrado hace ~${rdap.ageYears} años`, `https://rdap.org/domain/${domain}`, `RDAP${rdap.registrar ? ` · registrador: ${rdap.registrar}` : ""} — antigüedad del activo digital`));
    } else {
      results.push(item(`RDAP consultado para ${domain}`, `https://rdap.org/domain/${domain}`, "Registro consultado sin fecha de evento legible"));
    }
  }
  if (wb !== null) {
    data.wayback_first_year = wb;
    results.push(item(`Historial en Wayback Machine desde ${wb}`, `https://web.archive.org/web/*/${domain}`, "Internet Archive CDX: primer snapshot archivado — el dominio tiene historia documentada"));
  }
  if (!results.length) {
    results.push(item(`Sin verificación de dominio para ${domain}`, "https://archive.org/", "DoH/RDAP/Wayback degradadas en esta red — el informe continúa con el resto de fuentes"));
  }
  return { ...base, ok: true, results };
}

async function runMercados(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "mercados")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const results: EvidenceItem[] = [];

  const yahoo = await withLog(L, "yahoo", "Yahoo Finance — cotización y noticias de mercado", "query1.finance.yahoo.com vía r.jina.ai", () => fetchYahoo(name), "sin cotización con ese nombre");
  if (yahoo) {
    const eq = yahoo.quotes.find((q) => q.quoteType === "EQUITY") ?? null;
    if (eq?.symbol) {
      const trend = await withLog(L, "yahoo_chart", "Yahoo Finance — tendencia del precio (12 meses)", "query1.finance.yahoo.com/v8/finance/chart vía r.jina.ai", () => fetchYahooTrend(eq.symbol!), "serie sin datos");
      data.ticker = { symbol: eq.symbol, type: eq.quoteType ?? "EQUITY", exchange: eq.exchange ?? "", trend_1y: trend };
      results.push(
        item(
          `Compañía pública: ${eq.shortname ?? name} (${eq.symbol}${eq.exchange ? ` · ${eq.exchange}` : ""})`,
          `https://finance.yahoo.com/quote/${eq.symbol}`,
          trend !== null
            ? `Cotización activa — variación 12 meses: ${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`
            : "Cotización activa en mercado — serie sin datos suficientes para tendencia"
        )
      );
    }
    for (const n of yahoo.news.slice(0, 3)) {
      if (n.title && n.link) {
        results.push(item(`Mercados: ${n.title}`, n.link, `${n.publisher ?? "Yahoo Finance"} — cobertura financiera indexada`));
      }
    }
  }

  const cg = await withLog(L, "coingecko", "CoinGecko — activos cripto con ese nombre", "api.coingecko.com/api/v3/search (CORS directo)", async () => {
    const coins = await fetchCoinGecko(name);
    return { count: coins.length, coins };
  }, "sin activos con ese nombre");
  if (cg) {
    data.crypto_top = cg.coins.map((c) => ({ name: c.name, rank: c.rank }));
    for (const c of cg.coins) {
      results.push(item(`Criptoactivo: ${c.name}${c.rank ? ` — rank #${c.rank} por capitalización` : ""}`, c.url, "CoinGecko: token con mercado público — flujo de caja cripto-verificable"));
    }
  }

  if (!results.length) results.push(item("Sin huella en mercados públicos", "https://www.coingecko.com/", "Ni cotización bursátil (Yahoo) ni criptoactivo (CoinGecko) — empresa privada (lo normal en startups tempranas)"));
  return { ...base, ok: true, results };
}

async function runRegs(name: string, data: MoreData, L: GovSourceLog[]): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === "regs")!;
  const base = { key: meta.key, label: meta.label, icon: meta.icon, query: name };
  const results: EvidenceItem[] = [];

  const [fr, fda] = await Promise.all([
    withLog(L, "fedregister", "Federal Register — menciones en el boletín regulatorio", "federalregister.gov/api/v1 (CORS directo)", () => fetchFedRegister(name), "sin documentos con ese nombre"),
    withLog(L, "fda", "openFDA — aprobaciones y retiradas", "api.fda.gov drugsfda+enforcement (CORS directo)", () => fetchFda(name), "sin registros con ese nombre"),
  ]);

  if (fr) {
    data.fedregister_count = fr.count;
    for (const d of fr.docs.slice(0, 3)) {
      results.push(item(`Federal Register (${d.type}): ${d.title.slice(0, 90)}`, d.url, `${d.date} — documento regulatorio federal que menciona el nombre`));
    }
  }
  if (fda) {
    data.fda_approvals = fda.approvals;
    data.fda_recalls = fda.recalls;
    if (fda.approvals > 0) {
      results.push(item(`openFDA: ${fda.approvals} registro(s) de fármacos con sponsor "${name}"`, "https://open.fda.gov/data/drugsfda/", "Fármacos con aprobación registrada a nombre de la empresa — señal fuerte en biotech/pharma"));
    }
    for (const r of fda.recallItems.slice(0, 2)) {
      results.push(item(r.title, r.url, `${r.date} — retirada de producto registrada en openFDA`));
    }
  }
  if (!results.length) {
    results.push(item("Sin rastro en Federal Register ni openFDA", "https://www.federalregister.gov/", "Ni menciones regulatorias ni registros farmacéuticos — neutro para la mayoría de startups"));
  }
  return { ...base, ok: true, results };
}

/* ═══════════════════════ Orquestador de los vectores nuevos ════════════════ */

const MORE_KEYS = ["talento", "apps", "ciencia", "web", "mercados", "regs"] as const;

export async function runMoreSearch(
  name: string,
  onOne?: (v: SearchVectorResult) => void
): Promise<MoreBundle> {
  const logs: GovSourceLog[] = [];
  const data: MoreData = {
    ...EMPTY_MORE_DATA,
    domain: guessDomain(name),
    domain_from_input: DOMAIN_RE.test(name.trim()),
  };

  const runners: Record<(typeof MORE_KEYS)[number], (d: MoreData, L: GovSourceLog[]) => Promise<SearchVectorResult>> = {
    talento: (d, L) => runTalento(name, d, L),
    apps: (d, L) => runApps(name, d, L),
    ciencia: (d, L) => runCiencia(name, d, L),
    web: (d, L) => runWeb(name, d, L),
    mercados: (d, L) => runMercados(name, d, L),
    regs: (d, L) => runRegs(name, d, L),
  };

  const vectors = await Promise.all(
    MORE_KEYS.map(async (k) => {
      const v = await runners[k](data, logs);
      onOne?.(v);
      return v;
    })
  );

  return {
    ok: vectors.some((v) => v.ok && v.results.length > 0),
    vectors,
    logs,
    data,
  };
}

/* ═══════════════════════ Tavily opt-in (clave del usuario) ═════════════════ */

/** Búsqueda profunda con Tavily si el usuario aporta su clave (gratis: 1.000
 * créditos/mes). La clave vive SOLO en localStorage del navegador del usuario —
 * nunca se envía a ningún servidor de OpenGravity. */
export async function runTavily(name: string, apiKey: string): Promise<SearchVectorResult> {
  const base = { key: TAVILY_META.key, label: TAVILY_META.label, icon: TAVILY_META.icon, query: name };
  const queries = [
    `${name} startup funding OR valuation OR round`,
    `${name} lawsuit OR layoff OR fraud OR investigation OR scandal`,
  ];
  try {
    const all: EvidenceItem[] = [];
    for (const q of queries) {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query: q, max_results: 5, search_depth: "basic" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { results?: { title?: string; url?: string; content?: string; published_date?: string }[] };
      for (const r of (d.results ?? []).slice(0, 4)) {
        if (r.url && r.title) all.push(item(r.title, r.url, r.content ?? "", r.published_date ?? ""));
      }
    }
    return { ...base, ok: all.length > 0, results: all.slice(0, 8), error: all.length ? undefined : "sin resultados Tavily" };
  } catch (e) {
    return {
      ...base,
      ok: false,
      results: [],
      error: e instanceof Error ? `Tavily no accesible desde el navegador (${e.message}) — verifica la clave; en el Oracle corre con la clave del servidor` : "error Tavily",
    };
  }
}

/* ═══════════════════════ Fusibles objetivos de los datos nuevos ════════════ */

/** Señales estructurales de los 6 vectores nuevos — mismo contrato que los
 * fusibles .gov: datos duros primero, deduplicación en el auditor. */
export function moreStructuralSignals(data: MoreData, name: string): SynthesisSignal[] {
  const out: SynthesisSignal[] = [];

  // 1) Contratación activa (ATS públicos)
  if (data.jobs_total >= 15) {
    out.push({
      finding: `Maquinaria de contratación verificable: ${data.jobs_total} vacantes abiertas en boards públicos (${data.jobs_detail.map((j) => `${j.board}: ${j.count}`).join(", ")})`,
      impact_magnitude: 0.9,
      polarity: "positive",
      source_urls: [],
    });
  } else if (data.jobs_total >= 5) {
    out.push({
      finding: `Contratación activa: ${data.jobs_total} vacantes abiertas en boards públicos (${data.jobs_detail.map((j) => `${j.board}: ${j.count}`).join(", ")})`,
      impact_magnitude: 0.5,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 2) Dominio muerto — solo si el usuario escribió un dominio (evita falsos
  //    positivos por slug .com equivocado de empresas con .io/.ai)
  if (data.domain_from_input && data.domain_alive === false) {
    out.push({
      finding: `El dominio declarado ${data.domain} no resuelve en DNS (sin registros A) — infraestructura web inactiva`,
      impact_magnitude: -2.0,
      polarity: "negative",
      source_urls: [],
    });
  }

  // 3) Antigüedad del activo digital
  if (data.domain_age_years !== null && data.domain_age_years >= 8) {
    out.push({
      finding: `Dominio ${data.domain} registrado hace ~${data.domain_age_years} años (RDAP) — activo digital maduro, no una LLC de papel`,
      impact_magnitude: 0.3,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 4) Tracción de producto en App Store
  if (data.apps_rating_count >= 1000) {
    out.push({
      finding: `Tracción de producto real: ${data.apps_rating_count.toLocaleString("es")} valoraciones acumuladas en App Store (${data.apps_count} app/s)`,
      impact_magnitude: 0.6,
      polarity: "positive",
      source_urls: [],
    });
  } else if (data.apps_rating_count >= 100) {
    out.push({
      finding: `Adopción medible en App Store: ${data.apps_rating_count} valoraciones (${data.apps_count} app/s)`,
      impact_magnitude: 0.3,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 5) Distribución open-source (npm/PyPI/Docker)
  const dist: string[] = [];
  if (data.npm_monthly !== null && data.npm_monthly >= 10000) dist.push(`npm: ${data.npm_monthly.toLocaleString("es")} descargas/mes`);
  if (data.pypi_found) dist.push("paquete publicado en PyPI");
  if (data.docker_pulls !== null && data.docker_pulls >= 10000) dist.push(`Docker Hub: ${data.docker_pulls.toLocaleString("es")} pulls`);
  if (dist.length) {
    out.push({
      finding: `Distribución de software verificable: ${dist.join(" · ")}`,
      impact_magnitude: data.npm_monthly !== null && data.npm_monthly >= 100000 ? 0.5 : 0.3,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 6) Base científica y ensayos clínicos
  if (data.papers_count >= 5) {
    out.push({
      finding: `Base científica publicada: ${data.papers_count} trabajos indexados en OpenAlex citando el nombre`,
      impact_magnitude: 0.5,
      polarity: "positive",
      source_urls: [],
    });
  }
  if (data.trials_count >= 1) {
    out.push({
      finding: `${data.trials_count} ensayo(s) clínico(s) patrocinado(s) registrados en ClinicalTrials.gov — pipeline biomédico activo y auditable`,
      impact_magnitude: 0.6,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 7) Mercados públicos
  if (data.ticker && data.ticker.type === "EQUITY") {
    out.push({
      finding: `Compañía pública con cotización activa: ${data.ticker.symbol}${data.ticker.trend_1y !== null ? ` (variación 12 meses: ${data.ticker.trend_1y >= 0 ? "+" : ""}${data.ticker.trend_1y.toFixed(1)}%)` : ""}`,
      impact_magnitude: 0.8,
      polarity: "positive",
      source_urls: [],
    });
  }
  const cryptoRanked = data.crypto_top.find((c) => c.rank !== null && c.rank <= 300);
  if (cryptoRanked) {
    out.push({
      finding: `Criptoactivo con mercado líquido: ${cryptoRanked.name} — rank #${cryptoRanked.rank} por capitalización (CoinGecko)`,
      impact_magnitude: 0.7,
      polarity: "positive",
      source_urls: [],
    });
  }

  // 8) Escrutinio regulatorio
  if (data.fedregister_count >= 1) {
    out.push({
      finding: `${data.fedregister_count} documento(s) del Federal Register de EE.UU. mencionan el nombre — exposición regulatoria federal documentada`,
      impact_magnitude: -1.2,
      polarity: "negative",
      source_urls: [],
    });
  }
  if (data.fda_recalls >= 1) {
    out.push({
      finding: `${data.fda_recalls} retirada(s) de producto(s) registrada(s) en openFDA a nombre de la empresa — riesgo de calidad/producto`,
      impact_magnitude: -1.8,
      polarity: "negative",
      source_urls: [],
    });
  }
  if (data.fda_approvals >= 1 && data.fda_recalls === 0) {
    out.push({
      finding: `${data.fda_approvals} registro(s) de fármacos aprobados en openFDA con sponsor "${name}" — pipeline regulado con autorización vigente`,
      impact_magnitude: 1.2,
      polarity: "positive",
      source_urls: [],
    });
  }

  return out;
}
