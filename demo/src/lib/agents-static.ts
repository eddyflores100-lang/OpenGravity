/**
 * agents-static.ts — Motor de investigación autónoma 100% cliente.
 *
 * Reconstrucción del pipeline agéntico del repo para despliegues estáticos
 * (GitHub Pages no tiene backend):
 *
 *   Layer 1 · harvesters  → 6 vectores que rastrean fuentes públicas abiertas
 *                           (Wikipedia, Wikidata, GitHub, Hacker News, DuckDuckGo),
 *                           espejo de los harvesters archivados
 *                           (encyclopedia_harvester.mjs consultaba YC, SEC EDGAR,
 *                           Wikidata, HN, World Bank, GitHub, Wikipedia).
 *   Layer 2 · auditor     → DeerFlowDispatcher (archive/scripts/v10_orchestrator.py)
 *                           usaba Tavily + Cerebras LLM; en modo estático corre el
 *                           extractor heurístico del auditor (el mismo fallback
 *                           keyword-based del orquestador original) y añade señales
 *                           estructuradas de las APIs (estrellas GitHub, cobertura
 *                           HN, fundadores en Wikidata).
 *   Layer 3 · el motor bayesiano re-puntúa con Σ impactos (src/lib/opengravity.ts).
 *
 * Todas las fuentes son keyless y con CORS abierto — verificado para
 * Origin https://alicelabsllc.github.io.
 */

import { findingsOverlap, govStructuralSignalsStatic } from "@/lib/agents-gov-static";
import { companySentence, entityRelevance, filterRelevant, mergeStats, type VerificationStats } from "@/lib/verify";
import {
  fetchDocker,
  fetchGdelt,
  fetchNpm,
  fetchPypi,
  fetchStackExchange,
  fetchYahoo,
  moreStructuralSignals,
  type SeOut,
} from "@/lib/agents-more-static";
import {
  VECTOR_META,
  type EvidenceItem,
  type SearchVectorResult,
  type Synthesis,
  type SynthesisSignal,
  type GovPayload,
  type MoreData,
  type VectorPayload,
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
  return {
    title: clean(title, 140),
    url,
    host: hostOf(url),
    snippet: clean(snippet),
    date: clean(date, 24),
  };
}

async function jget<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Fuentes compartidas (memoizadas: los 6 vectores reutilizan 1 llamada) */
/* ------------------------------------------------------------------ */

interface HNHit {
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  author: string | null;
  objectID: string;
}

async function fetchHN(name: string): Promise<HNHit[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
    name
  )}&tags=story&hitsPerPage=50`;
  const data = await jget<{ hits: HNHit[] }>(url);
  return (data.hits ?? []).filter((h) => h.title);
}

const PERSON_HINTS =
  /\b(inventor|physicist|actor|actress|singer|musician|footballer|player|politician|writer|author|poet|painter|artist|scientist|professor|philosopher|composer|athlete|engineer|architect|economist|mathematician)\b/i;

interface GHRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  language: string | null;
}

async function fetchGitHub(name: string, domain?: string | null): Promise<GHRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    name
  )}&sort=stars&order=desc&per_page=8`;
  const data = await jget<{ items?: GHRepo[] }>(url);
  return (data.items ?? []).filter((r) => {
    const hay = `${r.full_name} ${r.description ?? ""}`;
    return entityRelevance(name, hay, domain) >= 2;
  });
}

interface WikiPage {
  title: string;
  extract?: string;
  fullurl?: string;
  touched?: string;
}

async function fetchWiki(name: string, domain?: string | null): Promise<WikiPage | null> {
  const search = await jget<{
    query?: { search?: { title: string; wordcount: number }[] };
  }>(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      name
    )}&srlimit=3&format=json&origin=*`
  );
  // Anti-homónimos: solo candidatos cuyo TÍTULO menciona a la entidad.
  const candidates = (search.query?.search ?? []).filter(
    (c) => entityRelevance(name, c.title, domain) >= 2
  );
  if (!candidates.length) return null;
  for (const hit of candidates.slice(0, 2)) {
    const page = await jget<{
      query?: { pages?: Record<string, WikiPage> };
    }>(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&titles=${encodeURIComponent(
        hit.title
      )}&format=json&origin=*`
    );
    const page0 = Object.values(page.query?.pages ?? {})[0];
    if (!page0?.extract) continue;
    // Anti-Nikola-Tesla: la primera oración debe DEFINIR una empresa
    // ("… is an American manufacturer…"), no una persona/lugar/obra.
    if (companySentence(page0.extract)) return page0;
  }
  return null;
}

interface WikiEntity {
  id: string;
  label: string | null;
  description: string | null;
  concepturi?: string;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
}

const COMPANY_HINTS =
  /\b(company|corporation|inc\.?|ltd|llc|gmbh|manufacturer|business|enterprise|software|platform|startup|motor|motors|vehicle|automaker|fintech|bank|airline|retailer|marketplace|saas|technology|tech)\b/i;

async function fetchWikiData(name: string): Promise<{
  entity: WikiEntity | null;
  founders: { label: string; uri: string }[];
  inception: string | null;
  website: string | null;
}> {
  try {
    const search = await jget<{
      search?: { id: string; label: { value: string }; description?: { value: string }; concepturi?: string }[];
    }>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        name
      )}&language=en&limit=5&format=json&origin=*`
    );
    const cands = search.search ?? [];
    const q = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const scored = cands
      .map((c) => {
        const label = c.label?.value ?? "";
        const desc = c.description?.value ?? "";
        const labelScore = label.toLowerCase().replace(/[^a-z0-9]/g, "") === q ? 2 : 0;
        const descScore = COMPANY_HINTS.test(desc) ? 1 : 0;
        // Anti-homónimos y anti-personas: "Nikola" debe resolver a Nikola Corp,
        // no a Nikola Tesla (descriptor de persona) ni a entidades sin relación.
        const isPerson = PERSON_HINTS.test(desc) && !COMPANY_HINTS.test(desc);
        const relevance = entityRelevance(name, `${label} ${desc}`);
        const eligible = !isPerson && relevance >= 2 && (labelScore > 0 || COMPANY_HINTS.test(desc));
        return { c, score: eligible ? labelScore + descScore + 1 : -1 };
      })
      .sort((a, b) => b.score - a.score);
    const best = scored[0]?.score >= 0 ? scored[0]?.c : undefined;
    if (!best) return { entity: null, founders: [], inception: null, website: null };

    const full = await jget<{
      entities?: Record<string, WikiEntity>;
    }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${best.id}&props=claims|labels|descriptions&languages=en&format=json&origin=*`
    );
    const entity = Object.values(full.entities ?? {})[0] ?? null;

    // P112 = fundador(es)
    const founderIds: string[] = (entity?.claims?.P112 ?? [])
      .map((cl) => cl?.mainsnak?.datavalue?.value)
      .filter((v): v is string => typeof v === "string" && v.startsWith("Q"))
      .slice(0, 4);

    let founders: { label: string; uri: string }[] = [];
    if (founderIds.length) {
      const labels = await jget<{ entities?: Record<string, { labels?: { en?: { value: string } } }> }>(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${founderIds.join(
          "|"
        )}&props=labels&languages=en&format=json&origin=*`
      );
      founders = founderIds
        .map((id) => ({
          label: labels.entities?.[id]?.labels?.en?.value ?? id,
          uri: `https://www.wikidata.org/wiki/${id}`,
        }))
        .filter((f) => f.label);
    }

    // P571 = fecha de fundación · P856 = sitio web oficial
    const inceptionRaw = entity?.claims?.P571?.[0]?.mainsnak?.datavalue?.value as
      | { time?: string }
      | undefined;
    const inception = inceptionRaw?.time ? inceptionRaw.time.slice(1, 5) : null;
    const websiteRaw = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    const website = typeof websiteRaw === "string" ? websiteRaw : null;

    return {
      entity: entity
        ? {
            id: entity.id,
            label: entity.label ?? best.label?.value ?? null,
            description: entity.description ?? best.description?.value ?? null,
            concepturi: best.concepturi ?? `https://www.wikidata.org/wiki/${best.id}`,
          }
        : null,
      founders,
      inception,
      website,
    };
  } catch {
    return { entity: null, founders: [], inception: null, website: null };
  }
}

interface DDGTopic {
  FirstURL?: string;
  Text?: string;
  Topics?: DDGTopic[];
}

async function fetchDDG(name: string): Promise<{
  heading: string | null;
  abstract: string | null;
  abstractUrl: string | null;
  topics: { text: string; url: string }[];
} | null> {
  try {
    const data = await jget<{
      Heading?: string;
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: DDGTopic[];
    }>(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        name
      )}&format=json&no_html=1&skip_disambig=1&t=opengravity_demo`
    );
    // Anti-homónimos: el abstract debe describir a la entidad Y definirla como
    // empresa; si DDG resuelve otra cosa (persona/lugar), se ignora el abstract.
    const abstractOk =
      Boolean(data.AbstractText) &&
      entityRelevance(name, `${data.Heading ?? ""} ${data.AbstractText ?? ""}`) >= 2 &&
      companySentence(data.AbstractText ?? "");
    const flat: { text: string; url: string }[] = [];
    for (const t of data.RelatedTopics ?? []) {
      if (t.Topics) {
        for (const sub of t.Topics) {
          if (sub.FirstURL && sub.Text) flat.push({ text: sub.Text, url: sub.FirstURL });
        }
      } else if (t.FirstURL && t.Text) {
        flat.push({ text: t.Text, url: t.FirstURL });
      }
    }
    return {
      heading: data.Heading ?? null,
      abstract: abstractOk ? data.AbstractText ?? null : null,
      abstractUrl: abstractOk ? data.AbstractURL ?? null : null,
      topics: flat.slice(0, 12),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Layer 1 — los 6 vectores                                            */
/* ------------------------------------------------------------------ */

const FUNDING_RE =
  /\braises?d?\b|\braising\b|funding|series [abc]|\bseed round\b|valuation|\$\d+(\.\d+)?\s?(m|b|million|billion)|levanta|ronda|financia/i;
const RISK_RE =
  /layoff|despido|job cuts|lawsuit|sue[sd]?|demanda|litigation|fraud|scam|fraude|ponzi|bankrupt|quiebra|insolven|shut ?down|ceases?|wind(ing)? down|investigat|sec charges|regulator|multa|fine[sd]?\b|scandal|escándalo|backlash|breach|hack|recalls?/i;
const GROWTH_RE =
  /growth|crecimiento|profitable|rentabilidad|surge|record|expansion|expansión|tripled|doubled|revenue|ingresos|users|customers|clientes/i;

function hnToItem(h: HNHit): EvidenceItem {
  const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
  const meta = `Hacker News · ${h.points ?? 0} puntos · ${h.num_comments ?? 0} comentarios`;
  return item(h.title ?? "", url, meta, h.created_at?.slice(0, 10));
}

async function runVector(key: string, name: string, domain?: string | null): Promise<SearchVectorResult> {
  const meta = VECTOR_META.find((v) => v.key === key)!;
  const base = { key, label: meta.label, icon: meta.icon, query: name };

  try {
    let results: EvidenceItem[] = [];

    if (key === "community") {
      const hn = (await fetchHN(name).catch(() => [])) as HNHit[];
      results = [...hn]
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        .slice(0, 6)
        .map(hnToItem);
      // Stack Exchange API (keyless, CORS abierto): preguntas técnicas sobre la empresa
      const se = await fetchStackExchange(name).catch(() => [] as SeOut[]);
      results.push(
        ...se.slice(0, 3).map((s) =>
          item(`Stack Overflow: ${s.title}`, s.url, `score ${s.score} · traza técnica pública de la empresa/su stack`, s.date)
        )
      );
    } else if (key === "news") {
      const hn = (await fetchHN(name).catch(() => [])) as HNHit[];
      const yearAgo = Date.now() - 365 * 864e5;
      results = hn
        .filter((h) => new Date(h.created_at).getTime() > yearAgo)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 4)
        .map(hnToItem);
      const ddg = await fetchDDG(name);
      if (ddg?.abstract && ddg.abstractUrl) {
        results.push(item(`${ddg.heading ?? name} — resumen enciclopédico`, ddg.abstractUrl, ddg.abstract));
      }
      if (ddg) {
        results.push(
          ...ddg.topics
            .filter((t) => !RISK_RE.test(t.text) && !FUNDING_RE.test(t.text))
            .slice(0, 2)
            .map((t) => item(t.text.slice(0, 120), t.url, t.text))
        );
      }
      // GDELT DOC 2.0 (índice global de noticias, keyless) + Yahoo Finance news
      const [gd, yn] = await Promise.all([
        fetchGdelt(name).catch(() => []),
        fetchYahoo(name).then((y) => y.news).catch(() => []),
      ]);
      results.push(
        ...gd.slice(0, 3).map((g) => item(g.title, g.url, `${g.domain} — índice global de noticias GDELT`, g.date))
      );
      results.push(
        ...yn
          .filter((n) => Boolean(n.title && n.link))
          .slice(0, 3)
          .map((n) =>
            item(n.title ?? "", n.link ?? "", `${n.publisher ?? "Yahoo Finance"} — cobertura financiera indexada`, n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString().slice(0, 10) : "")
          )
      );
    } else if (key === "funding") {
      const hn = (await fetchHN(name).catch(() => [])) as HNHit[];
      results = hn.filter((h) => FUNDING_RE.test(h.title ?? "")).slice(0, 4).map(hnToItem);
      const ddg = await fetchDDG(name);
      if (ddg) {
        results.push(
          ...ddg.topics
            .filter((t) => FUNDING_RE.test(t.text))
            .slice(0, 3)
            .map((t) => item(t.text.slice(0, 120), t.url, t.text))
        );
      }
    } else if (key === "risk") {
      const hn = (await fetchHN(name).catch(() => [])) as HNHit[];
      results = hn.filter((h) => RISK_RE.test(h.title ?? "")).slice(0, 4).map(hnToItem);
      const wiki = await fetchWiki(name, domain).catch(() => null);
      if (wiki?.extract && RISK_RE.test(wiki.extract)) {
        const sent = wiki.extract.split(/(?<=[.!?])\s+/).find((s) => RISK_RE.test(s)) ?? "";
        results.push(item(`${wiki.title} — riesgo citado en Wikipedia`, wiki.fullurl ?? `https://en.wikipedia.org/wiki/${wiki.title}`, sent));
      }
      const ddg = await fetchDDG(name);
      if (ddg) {
        results.push(
          ...ddg.topics
            .filter((t) => RISK_RE.test(t.text))
            .slice(0, 3)
            .map((t) => item(t.text.slice(0, 120), t.url, t.text))
        );
      }
      // GDELT: cobertura global con patrón de riesgo
      const gd = await fetchGdelt(name).catch(() => []);
      results.push(
        ...gd
          .filter((g) => RISK_RE.test(g.title))
          .slice(0, 2)
          .map((g) => item(g.title, g.url, `${g.domain} — índice global de noticias GDELT`, g.date))
      );
    } else if (key === "product") {
      // GitHub tiene ahora su PROPIO vector (engines-static: repos + org + perfil).
      // Aquí queda Wikipedia + distribución de software (npm/PyPI/Docker).
      const wiki = await fetchWiki(name, domain).catch(() => null);
      if (wiki?.extract) {
        results.push(item(wiki.title, wiki.fullurl ?? `https://en.wikipedia.org/wiki/${wiki.title}`, wiki.extract.slice(0, 280)));
      }
      // Distribución de software verificable: npm, PyPI, Docker Hub (keyless)
      const [npm, pypi, docker] = await Promise.all([
        fetchNpm(name).catch(() => []),
        fetchPypi(name).catch(() => false),
        fetchDocker(name).catch(() => ({ pulls: null, repos: [] })),
      ]);
      for (const p of npm.slice(0, 2)) {
        results.push(item(`npm: ${p.name}${p.monthly ? ` — ${p.monthly.toLocaleString("es")} descargas/mes` : ""}`, p.url, p.description));
      }
      if (pypi) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        results.push(item(`PyPI: paquete "${slug}" publicado`, `https://pypi.org/project/${slug}/`, "Paquete Python publicado — distribución open-source verificable"));
      }
      for (const r of docker.repos.slice(0, 1)) {
        results.push(item(`Docker Hub: ${r.name} — ${r.pulls.toLocaleString("es")} pulls`, r.url, r.description));
      }
    } else if (key === "people") {
      const wd = await fetchWikiData(name);
      if (wd.entity?.label) {
        results.push(
          item(
            `${wd.entity.label} — ficha corporativa en Wikidata`,
            wd.entity.concepturi ?? `https://www.wikidata.org/wiki/${wd.entity.id}`,
            wd.entity.description ?? "Entidad identificada en registros públicos estructurados"
          )
        );
      }
      for (const f of wd.founders) {
        results.push(item(`Fundador identificado: ${f.label}`, f.uri, "Registro de fundador en Wikidata (propiedad P112)"));
      }
      if (wd.inception) {
        results.push(item(`Año de fundación: ${wd.inception}`, wd.entity?.concepturi ?? "https://www.wikidata.org", "Propiedad P571 (fecha de creación) en Wikidata"));
      }
      if (wd.website) {
        results.push(item(`Sitio oficial: ${hostOf(wd.website)}`, wd.website, "Dominio oficial declarado en Wikidata (P856)"));
      }
      const wiki = await fetchWiki(name, domain).catch(() => null);
      if (wiki?.extract) {
        const founderSent = wiki.extract.split(/(?<=[.!?])\s+/).find((s) => /found|co-found|founded by|creada por|fundad/i.test(s));
        if (founderSent) {
          results.push(item(`${wiki.title} — origen y fundadores (Wikipedia)`, wiki.fullurl ?? `https://en.wikipedia.org/wiki/${wiki.title}`, founderSent));
        }
      }
    }

    // CAPA ANTI-ALUCINACIÓN: solo entran hallazgos que mencionan a la entidad.
    // Lo demás (homónimos, artículos genéricos, personas homónimas) se descarta
    // y queda contado para el informe.
    const filt = filterRelevant(name, results, 1, domain);
    return { ...base, ok: true, results: filt.items, stats: { ...filt.stats } };
  } catch (e) {
    return {
      ...base,
      ok: false,
      results: [],
      error: e instanceof Error ? e.message : "vector sin respuesta",
    };
  }
}

/** Lanza los 6 vectores en paralelo; reporta cada vector al terminar (UI en vivo). */
/* Claves de los 6 vectores base (los demás viven en agents-more-static). */
const BASE_KEYS = ["funding", "news", "risk", "product", "community", "people"] as const;

export async function runAgentSearch(
  name: string,
  onOne?: (v: SearchVectorResult) => void,
  domain?: string | null
): Promise<{ vectors: SearchVectorResult[]; total: number; verification: VerificationStats }> {
  // SOLO los 6 vectores base viven aquí. Los vectores de motores reales
  // (buscador/bing/reddit/xsocial/github/mastodon) y especializados corren en
  // runMoreSearch (agents-more-static) — iterar VECTOR_META entero los duplicaría.
  const jobs = BASE_KEYS.map(async (key) => {
    const vm = VECTOR_META.find((m) => m.key === key)!;
    const v = await runVector(vm.key, name, domain);
    onOne?.(v);
    return v;
  });
  const vectors = await Promise.all(jobs);
  const total = vectors.reduce((acc, v) => acc + v.results.length, 0);
  const verification = mergeStats(vectors.map((v) => v.stats).filter((s): s is VerificationStats => Boolean(s)));
  return { vectors, total, verification };
}

/* ------------------------------------------------------------------ */
/* Layer 2 — auditor heurístico (DeerFlowDispatcher en modo estático)   */
/* ------------------------------------------------------------------ */

const NEG: [RegExp, string, number][] = [
  [/layoff|despido|job cuts|staff cuts/i, "Despidos masivos reportados en la cobertura encontrada", -2.2],
  [/\bsue[sd]?\b|demanda|litigation|court case|\blawsuit\b/i, "Litigios activos contra la empresa en fuentes de prensa", -2.0],
  [/fraud|scam|fraude|ponzi/i, "Alegaciones de fraude en la cobertura de la startup", -4.0],
  [/bankrupt|quiebra|insolven|shut ?down|ceases? operations|wind(ing)? down/i, "Riesgo o realidad de cese de operaciones / quiebra", -4.5],
  [/investigat|sec charges|regulator|\bmulta\b|\bfine[sd]?\b|\bfined\b/i, "Investigación regulatoria o sanciones detectadas", -2.8],
  [/controversy|scandal|escándalo|backlash|\bbreach\b|\bhack\b|\brecalls?\b/i, "Escándalo o reacción adversa pública relevante", -1.8],
];

const POS: [RegExp, string, number][] = [
  [/raises?d?\b|raised|levanta|ronda de|series [abc] funding|funding round/i, "Ronda de financiación reportada por fuentes del mercado", 1.8],
  [/acquisition|acquires?\b|adquisición|m&a\b/i, "Movimiento de consolidación: adquisición reportada", 1.5],
  [/growth|crecimiento|profitable|rentabilidad|surge|tripled|revenue|ingresos/i, "Señales de crecimiento o rentabilidad en la cobertura", 1.6],
  [/partnership|contract|deal with|colaboración/i, "Contratos o alianzas comerciales verificables", 1.4],
  [/ipo|goes public|salida a bolsa/i, "Camino a salida a bolsa reportado", 2.0],
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export async function runAuditor(
  name: string,
  sector: string,
  vectors: SearchVectorResult[],
  gov?: GovPayload | null,
  more?: MoreData | null,
  domain?: string | null
): Promise<{ synthesis: Synthesis; fallback_used: boolean; verification: VerificationStats }> {
  const payloads: VectorPayload[] = vectors.map((v) => ({ key: v.key, label: v.label, results: v.results }));
  const allEvidence = payloads.flatMap((v) => v.results);
  const signals: SynthesisSignal[] = [];
  const seen = new Set<string>();

  // CAPA ANTI-ALUCINACIÓN — severidad por tipo de señal:
  //   negativas (demandas, fraude, quiebra) → exigir IDENTIDAD FUERTE (nivel 3)
  //   positivas (rondas, crecimiento)       → exigir nivel 2 (todos los términos)
  // Atribuir fraude a la empresa equivocada es el peor fallo posible del oráculo.
  const levelOf = (it: EvidenceItem) => entityRelevance(name, `${it.title} ${it.snippet}`, domain);

  // 1) Patrones keyword-based (mismo extractor heurístico del orquestador archivado)
  // Los informes de short-sellers y alegaciones se excluyen de los patrones
  // positivos: "deal with"/"contract" dentro de una investigación de fraude
  // no es una alianza (caso Hindenburg/Nikola en el archivo forense).
  const SHORT_SELLER_RE =
    /hindenburg|short.?sell|short report|short position|alleg\w*|accus\w*|whistleblow|denies|deny|refut\w*|investigat/i;
  for (const it of allEvidence) {
    // La URL forma parte del análisis: "deal with" en un enlace de
    // hindenburgresearch.com NO es una alianza comercial.
    const text = `${it.title} ${it.snippet} ${it.url}`;
    const lvl = levelOf(it);
    for (const [re, finding, impact] of [...NEG, ...POS]) {
      if (re.test(text) && !seen.has(finding) && signals.length < 6) {
        if (impact > 0 && SHORT_SELLER_RE.test(text)) continue;
        // Umbral de identidad por severidad de la señal
        if (impact < 0 && lvl < 3) continue;
        if (impact > 0 && lvl < 2) continue;
        seen.add(finding);
        signals.push({
          finding: `${finding} — hallazgo en ${it.host}`,
          impact_magnitude: impact,
          polarity: impact > 0 ? "positive" : "negative",
          source_urls: [it.url].filter(Boolean),
        });
      }
    }
  }

  // 2) Señal estructural: huella GitHub — ahora vector PROPIO (engines-static);
  // las estrellas verificadas vienen de MoreData (repos filtrados por identidad).
  const githubVector = vectors.find((v) => v.key === "github");
  const repoItems = githubVector?.results.filter((r) => r.host === "github.com") ?? [];
  const stars = more?.github_stars_total ?? 0;
  if (stars >= 1000) {
    signals.push({
      finding: `Tracción open-source verificable: ${stars.toLocaleString("es")} ★ acumuladas en ${repoItems.length} repositorios públicos`,
      impact_magnitude: 1.2,
      polarity: "positive",
      source_urls: repoItems.slice(0, 2).map((r) => r.url),
    });
  } else if (stars >= 100) {
    signals.push({
      finding: `Adopción técnica moderada: ${stars} ★ en ${repoItems.length} repositorios públicos`,
      impact_magnitude: 0.6,
      polarity: "positive",
      source_urls: repoItems.slice(0, 2).map((r) => r.url),
    });
  }
  const newestPush = repoItems
    .map((r) => r.snippet.match(/push (\d{4}-\d{2}-\d{2})/)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  if (newestPush) {
    const months = (Date.now() - new Date(newestPush).getTime()) / (864e5 * 30.4);
    if (months > 18 && signals.length < 7) {
      signals.push({
        finding: `Actividad de desarrollo estancada: último push hace ${Math.round(months)} meses`,
        impact_magnitude: -0.4,
        polarity: "negative",
        source_urls: repoItems[0] ? [repoItems[0].url] : [],
      });
    }
  }

  // 3) Señal estructural: cobertura y sentimiento en Hacker News
  const communityVector = vectors.find((v) => v.key === "community");
  const hnItems = communityVector?.results.filter((r) => r.host === "news.ycombinator.com") ?? [];
  if (hnItems.length >= 4) {
    const posHits = hnItems.filter((h) => [...POS, ...GROWTH_POS].some(([re]) => re.test(h.title))).length;
    const negHits = hnItems.filter((h) => NEG.some(([re]) => re.test(h.title))).length;
    const ratio = posHits + negHits > 0 ? posHits / (posHits + negHits) : 0.5;
    const impact = ratio >= 0.65 ? 0.8 : ratio <= 0.35 ? -0.8 : 0.2;
    if (Math.abs(impact) > 0.25) {
      signals.push({
        finding: `Sentimiento de la comunidad técnica: ${hnItems.length} historias en Hacker News, ${Math.round(
          ratio * 100
        )}% de tono positivo entre titulares valorados`,
        impact_magnitude: impact,
        polarity: impact > 0 ? "positive" : "negative",
        source_urls: hnItems.slice(0, 2).map((h) => h.url),
      });
    }
  }

  // 4) Señal estructural: identidad verificable en Wikidata (fundadores, antigüedad)
  const peopleVector = vectors.find((v) => v.key === "people");
  const wdEntity = peopleVector?.results.find((r) => r.title.includes("Wikidata"));
  const founderItems = peopleVector?.results.filter((r) => r.title.startsWith("Fundador identificado")) ?? [];
  if (founderItems.length && signals.length < 8) {
    signals.push({
      finding: `Fundadores identificables en registros públicos: ${founderItems
        .map((f) => f.title.replace("Fundador identificado: ", ""))
        .join(", ")}`,
      impact_magnitude: 0.3,
      polarity: "positive",
      source_urls: founderItems.slice(0, 2).map((f) => f.url),
    });
  }

  signals.sort((a, b) => a.impact_magnitude - b.impact_magnitude);
  const finalSignals = signals.slice(0, 8);
  const companyIdentified =
    wdEntity?.title.replace(" — ficha corporativa en Wikidata", "") ??
    (vectors.find((v) => v.key === "product")?.results.find((r) => r.host === "en.wikipedia.org")?.title ?? null);

  // Verificación de entidad agregada sobre TODA la evidencia de la misión
  const verification = mergeStats(
    vectors.map((v) => v.stats).filter((s): s is VerificationStats => Boolean(s))
  );
  const verifiedCount = verification.kept;

  const verificationLine =
    `Verificación de identidad: ${verifiedCount} de ${verification.raw} hallazgos mencionan a la entidad ` +
    `(${verification.dropped} descartados como homónimos o ruido, ${verification.strong} con identidad fuerte).`;

  // ESTADO HONESTO "SIN HUELLA": si tras el filtro no queda evidencia y no hay
  // registros oficiales, el informe lo dice en voz alta — cero señales, cero
  // métricas inventadas. Es el resultado correcto para LLCs privadas pequeñas.
  const hasOfficial = Boolean(gov && (gov.companies.length || gov.edgar_mentions.length || gov.financials.length || gov.awards.length));
  const hasMoreStructural = Boolean(more && (more.jobs_total > 0 || more.apps_count > 0 || more.papers_count > 0 || more.trials_count > 0 || more.fda_approvals > 0 || more.ticker));
  if (verifiedCount === 0 && !hasOfficial && !hasMoreStructural) {
    return {
      synthesis: {
        company_identified: null,
        summary:
          `SIN HUELLA PÚBLICA VERIFICABLE para "${name}". Los agentes rastrearon ${verification.raw} hallazgos en ~30 fuentes y NINGUNO menciona a la entidad ` +
          `(los homónimos y el ruido fueron descartados por la verificación de identidad). Esto es lo esperable para una empresa privada o muy pequeña: ` +
          `sin evidencia real no hay señales ni métricas — el oráculo no inventa datos. Sugerencias: (1) añade el dominio web propio para desambiguar homónimos, ` +
          `(2) revisa la grafía exacta del nombre legal, (3) evalúala manualmente con los controles del motor.`,
        signals: [],
        estimated_metrics: { ltv_cac: null, months_runway: null, moe_growth: null, is_audited: false },
        metric_confidence: "unknown",
        is_fatal: false,
      },
      fallback_used: true,
      verification,
    };
  }

  const summary = verifiedCount > 0 || hasOfficial || hasMoreStructural
    ? `Los ${VECTOR_META.length} vectores agénticos rastrearon ${allEvidence.length} hallazgos con MOTORES DE BÚSQUEDA REALES (DuckDuckGo HTML, Bing News, Reddit site:, X site:, GitHub API) y fuentes públicas (Wikipedia, Wikidata, Hacker News, Stack Overflow, npm/PyPI/Docker, GDELT/Yahoo Finance) más APIs especializadas de empleo, apps, ciencia, huella web, mercados y reguladores para "${name}"${
        sector ? ` (sector ${sector})` : ""
      }. ${companyIdentified ? `Entidad identificada: ${companyIdentified}. ` : ""}${
        stars > 0 ? `Huella GitHub: ${stars.toLocaleString("es")} ★. ` : "Sin huella GitHub relevante. "
      }${
        hnItems.length ? `Cobertura en Hacker News: ${hnItems.length} historias comunitarias. ` : ""
      }${verificationLine} El auditor heurístico extrae ${finalSignals.length} señales con impacto directo en el logit bayesiano: las negativas exigen identidad verificada (nivel fuerte), los datos de SEC/.gov entran como fusibles objetivos. Ajusta las métricas a mano para calibrar el veredicto.`
    : `Los agentes no encontraron rastro verificable para "${name}" en las fuentes públicas abiertas. Sin evidencia no hay señales: revisa el nombre (¿es una empresa muy pequeña o privada?) o evalúala manualmente con los controles del motor.`;

  const isFatal =
    finalSignals.some((s) => s.impact_magnitude <= -4) ||
    // El veto fatal exige IDENTIDAD FUERTE: al menos 1 evidencia de nivel 3 o
    // 2 de nivel 2 que hablen de colapso — los homónimos ya no pueden vetar.
    allEvidence.filter((e) => /bankrupt|shut ?down|ceases? operations|fraud|scam|fraude|quiebra/i.test(`${e.title} ${e.snippet}`) && levelOf(e) >= 3).length >= 1 ||
    allEvidence.filter((e) => /bankrupt|shut ?down|ceases? operations/i.test(`${e.title} ${e.snippet}`) && levelOf(e) === 2).length >= 2;

  // Policy layer del orquestador original: un hallazgo fatal activa el veto
  // POLICY_FATAL_VETO y entra al logit con el castigo máximo (−5), de modo que
  // el veredicto cae a DROP aunque las métricas digan lo contrario. La señal
  // queda visible y desactivable en el panel del motor (todo auditable).
  if (isFatal) {
    const fatalUrls = allEvidence
      .filter((e) => /fraud|scam|bankrupt|shut ?down|ceases?|fraude|quiebra/i.test(`${e.title} ${e.snippet}`))
      .slice(0, 2)
      .map((e) => e.url);
    finalSignals.push({
      finding: "VETO DE POLÍTICA — POLICY_FATAL_VETO: hallazgo fatal (fraude condenado o colapso). El veredicto se fuerza a DROP aunque las métricas digan lo contrario",
      impact_magnitude: -5,
      polarity: "negative",
      source_urls: fatalUrls,
    });
  }

  // Fusibles objetivos de SEC EDGAR (.gov) con deduplicación contra el extractor
  // heurístico — los datos exactos de los filings mandan sobre las keywords.
  if (gov) {
    for (const g of govStructuralSignalsStatic(gov)) {
      const dup = finalSignals.findIndex((s) => s.polarity === g.polarity && findingsOverlap(s.finding, g.finding));
      if (dup === -1) finalSignals.push(g);
      else if (Math.abs(g.impact_magnitude) > Math.abs(finalSignals[dup].impact_magnitude)) finalSignals[dup] = g;
    }
    finalSignals.sort((a, b) => a.impact_magnitude - b.impact_magnitude);
  }

  // Fusibles de los vectores ampliados (empleo ATS, App Store, ciencia, huella
  // web, mercados, reguladores) — mismas reglas: datos duros, dedupe por hecho.
  if (more) {
    for (const g of moreStructuralSignals(more, name)) {
      const dup = finalSignals.findIndex((s) => s.polarity === g.polarity && findingsOverlap(s.finding, g.finding));
      if (dup === -1) finalSignals.push(g);
      else if (Math.abs(g.impact_magnitude) > Math.abs(finalSignals[dup].impact_magnitude)) finalSignals[dup] = g;
    }
    finalSignals.sort((a, b) => a.impact_magnitude - b.impact_magnitude);
  }

  return {
    synthesis: {
      company_identified: companyIdentified ? clean(companyIdentified, 160) : null,
      summary: clean(summary, 1100),
      signals: finalSignals,
      estimated_metrics: { ltv_cac: null, months_runway: null, moe_growth: null, is_audited: false },
      metric_confidence: "unknown",
      is_fatal: Boolean(isFatal),
    },
    fallback_used: allEvidence.length === 0,
    verification,
  };
}

// Alias de crecimiento usado solo para el ratio de sentimiento de HN
const GROWTH_POS: [RegExp, string, number][] = [
  [/growth|crecimiento|profitable|surge|record|revenue|launch|lanza|wins?|award/i, "", 0],
];
