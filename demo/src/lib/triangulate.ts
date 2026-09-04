/**
 * triangulate.ts — MOTOR DE TRIANGULACIÓN DE INTELIGENCIA (OG-ORACLE v2).
 *
 * Lo que separa un dossier defendible de una lista de enlaces:
 *
 *   1. AGRUPAR la evidencia verificada en AFIRMACIONES temáticas
 *      (contratación, financiación, producto, riesgo, comunidad, mercado,
 *      regulación) — cada afirmación con sus fuentes reales.
 *   2. TRIANGULAR: una afirmación es CORROBORADA cuando ≥2 dominios
 *      independientes la reportan; con 1 sola fuente queda NO CONFIRMADA.
 *   3. Detectar COBERTURA MIXTA (el mismo tema con señales de signo opuesto)
 *      y BRECHAS DE COBERTURA (vectores que no produjeron nada — honesto).
 *   4. RQI — Research Quality Index: puntuación 0-100 de calidad de la
 *      investigación, desglosada y auditable (no es una caja negra):
 *        cobertura de vectores · solidez de identidad · tasa de corroboración
 *        · frescura de la evidencia · registro oficial.
 *
 * Todo es determinista y explicable: cada punto del RQI puede recalcularse a
 * mano desde el dossier exportado. Nada simulado.
 */

import type { EvidenceItem, GovBundle, MoreData, SearchVectorResult, Synthesis } from "@/lib/research";
import { entityRelevance, type VerificationStats } from "@/lib/verify";

export interface ClaimSource {
  host: string;
  url: string;
  title: string;
  vector: string;
  date: string;
}

export interface Claim {
  topic: string;
  label: string;
  icon: string;
  finding: string;
  sources: ClaimSource[];
  independentDomains: number;
  corroborated: boolean;
  polarity: "positive" | "negative" | "neutral";
}

export interface RqiPart {
  key: string;
  label: string;
  value: number;
  max: number;
  note: string;
}

export interface Rqi {
  total: number;
  grade: "A" | "B" | "C" | "D" | "F";
  parts: RqiPart[];
}

export interface IntelDossier {
  claims: Claim[];
  corroborated: Claim[];
  unconfirmed: Claim[];
  mixed: { label: string; positive: Claim; negative: Claim }[];
  rqi: Rqi;
  gaps: string[];
  coverage: { ran: number; total: number; empty: string[]; failed: string[] };
  identityLine: string;
  generatedAt: string;
}

/* ── taxonomía temática ──────────────────────────────────────────────────── */

interface TopicDef {
  key: string;
  label: string;
  icon: string;
  re: RegExp;
}

const TOPICS: TopicDef[] = [
  { key: "talento", label: "Contratación y talento", icon: "🧑‍💼", re: /\b(hiring|is hiring|job|jobs|vacante|vacancies|careers?|recruit\w*|oferta laboral|contrata\w*|headcount|open role|engineering role)\b/i },
  { key: "financiacion", label: "Financiación y capital", icon: "💰", re: /\b(fund(ing|ed|raise|raised|raising)?|seed round|series [a-e]|valuation|ronda|inversi\w*|investment|venture capital|vc|pre-seed|series a|series b|filing form d)\b/i },
  { key: "producto", label: "Producto y tracción", icon: "📦", re: /\b(launch\w*|releases?|ship\w*|beta|product|feature|platform|app store|ga (release|launch)|mvp|onboard\w*|deploy\w*)\b/i },
  { key: "riesgo", label: "Riesgo y litigio", icon: "⚠️", re: /\b(lawsuit|sue\w*|fraud|scam|layoff\w*|investigat\w*|scandal|bankrupt\w*|demanda|fraude|quiebra|despid\w*|breach|hack\w*|data leak|sanction\w*)\b/i },
  { key: "comunidad", label: "Comunidad técnica", icon: "🟠", re: /\b(hacker news|reddit|stack overflow|forum|discussion|community|show hn|thread|upvote|github stars?)\b/i },
  { key: "mercado", label: "Mercado y clientes", icon: "💹", re: /\b(revenue|customers?|growth|growing|sales|users|mrr|arr|contract\w*|partnership|pilot|deal\w*|ingresos|clientes|crecimiento)\b/i },
  { key: "regulacion", label: "Regulación y registro oficial", icon: "🏛️", re: /\b(fda|federal register|approval|compliance|patent|trademark|sec (filing|edgar)|10-k|10-q|8-k|form d|registration)\b/i },
];

const POS_RE = /\b(grow\w*|surge\w*|record|profit\w*|raises?|raised|launch\w*|wins?|award\w*|partnership|contract\w*|expands?\w*|boost\w*|soars?|tops?|best|lead\w*|success\w*|crecimiento|éxito|triunf\w*|amplía|gana)\b/i;
const NEG_RE = /\b(lawsuit|sue[ds]?|fraud|scam|layoff\w*|fires?|investigat\w*|scandal|bankrupt\w*|shut ?down|ceases?|probe\w*|fines?|penalt\w*|breach|hack\w*|leak\w*|delist\w*|plunge\w*|slump\w*|drop\w*|fall\w*|loss\w*|demanda|fraude|quiebra|despid\w*|multa|caída|pérdida)\b/i;

/** Marcadores de "resultado cero honesto" — informan cobertura, no son afirmaciones. */
const ZERO_MARK = /^sin (resultados?|hilos?|menciones?|noticias?|apps?|papers?|cotización|rastro|cobertura|presencia|registro|huella|verificación)|sin hallazgos/i;

const polarityOf = (text: string): "positive" | "negative" | "neutral" => {
  const neg = NEG_RE.test(text);
  const pos = POS_RE.test(text);
  if (neg && !pos) return "negative";
  if (pos && !neg) return "positive";
  return "neutral";
};

const normTitleKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 9)
    .join(" ");

/* ── construcción del dossier ────────────────────────────────────────────── */

export function buildIntelDossier(input: {
  name: string;
  sector: string;
  vectors: SearchVectorResult[];
  gov: GovBundle | null;
  synth: Synthesis;
  verification: VerificationStats | null;
  more: MoreData | null;
  domain: string;
  startedAt: string;
  finishedAt: string;
}): IntelDossier {
  const { name, vectors, gov, synth, verification, more, domain, finishedAt } = input;
  const dom = domain || more?.domain || null;

  /* 1 — Afirmaciones: evidencia que pasa la barra de identidad, clasificada */
  const byTopic = new Map<string, { def: TopicDef; sources: ClaimSource[] }>();
  const seenKeys = new Set<string>();
  const newestMs: number[] = [];

  for (const v of vectors) {
    for (const it of v.results) {
      const text = `${it.title} ${it.snippet}`;
      if (ZERO_MARK.test(it.title)) continue;
      // Barra de identidad igual que el auditor: positivo exige nivel ≥ 2
      const lvl = entityRelevance(name, text, dom || null);
      if (lvl < 2) continue;
      const dedupe = `${it.host}::${normTitleKey(it.title)}`;
      if (seenKeys.has(dedupe)) continue;
      seenKeys.add(dedupe);
      if (it.date) {
        const t = Date.parse(it.date);
        if (Number.isFinite(t)) newestMs.push(t);
      }
      const def = TOPICS.find((t) => t.re.test(text));
      if (!def) continue;
      const bucket = byTopic.get(def.key) ?? { def, sources: [] };
      bucket.sources.push({ host: it.host, url: it.url, title: it.title.slice(0, 140), vector: v.label, date: it.date ?? "" });
      byTopic.set(def.key, bucket);
    }
  }

  // Evidencia oficial (.gov) entra como afirmación de regulación corroborable
  const govSources: ClaimSource[] = [];
  if (gov?.ok) {
    for (const h of (gov.edgar_hits ?? []).slice(0, 4))
      govSources.push({ host: "sec.gov", url: h.url, title: `${h.form} — ${h.display_name}`, vector: "SEC EDGAR", date: h.file_date });
    for (const a of (gov.awards ?? []).slice(0, 3))
      govSources.push({ host: "usaspending.gov", url: a.url, title: `${a.agency}: ${a.description.slice(0, 90)}`, vector: "USAspending", date: a.start_date });
    if (govSources.length) {
      for (const g of govSources) {
        if (g.date) {
          const t = Date.parse(g.date);
          if (Number.isFinite(t)) newestMs.push(t);
        }
      }
      const bucket = byTopic.get("regulacion") ?? { def: TOPICS.find((t) => t.key === "regulacion")!, sources: [] };
      bucket.sources.push(...govSources);
      byTopic.set("regulacion", bucket);
    }
  }

  /* 2 — Triangulación: dominios independientes por afirmación */
  const claims: Claim[] = [];
  for (const { def, sources } of byTopic.values()) {
    // dedupe por dominio+tema para independentDomains, pero conservamos todas
    const hosts = new Set(sources.map((s) => s.host));
    const polCount = { positive: 0, negative: 0, neutral: 0 } as Record<string, number>;
    for (const s of sources) polCount[polarityOf(`${s.title}`)]++;
    const polarity = (polCount.negative > polCount.positive ? "negative" : polCount.positive > polCount.negative ? "positive" : "neutral") as Claim["polarity"];
    const top = sources.slice(0, 6);
    claims.push({
      topic: def.key,
      label: def.label,
      icon: def.icon,
      finding:
        `${def.label}: ${sources.length} hallazgo(s) verificado(s) en ${hosts.size} dominio(s) independiente(s)` +
        (polarity !== "neutral" ? ` — tono predominantly ${polarity === "positive" ? "positivo" : "negativo"}` : ""),
      sources: top,
      independentDomains: hosts.size,
      corroborated: hosts.size >= 2,
      polarity,
    });
  }
  claims.sort((a, b) => Number(b.corroborated) - Number(a.corroborated) || b.independentDomains - a.independentDomains);
  const corroborated = claims.filter((c) => c.corroborated);
  const unconfirmed = claims.filter((c) => !c.corroborated);

  /* 3 — Cobertura mixta: el mismo tema con señales de ambos signos */
  const mixed: IntelDossier["mixed"] = [];
  for (const t of TOPICS) {
    const pos = claims.find((c) => c.topic === t.key && c.polarity === "positive");
    const neg = claims.find((c) => c.topic === t.key && c.polarity === "negative");
    if (pos && neg) mixed.push({ label: t.label, positive: pos, negative: neg });
  }

  /* 4 — Cobertura de vectores y brechas honestas */
  const failed = vectors.filter((v) => !v.ok).map((v) => v.label);
  const empty = vectors.filter((v) => v.ok && v.results.length === 0).map((v) => v.label);
  const gaps: string[] = [...empty, ...failed].slice(0, 8).map((l) => `Sin cobertura verificable en: ${l}`);
  if (verification && verification.raw === 0) gaps.push("Ninguna fuente pública arrojó hallazgos que mencionen a la entidad (cobertura nula honesta)");
  if (synth.metric_confidence === "unknown") gaps.push("Métricas financieras (LTV/CAC, runway, crecimiento) no encontradas en fuentes públicas — el motor usa defaults y lo dice");
  if (!more?.github_repos_matched && !more?.github_org) gaps.push("Sin huella GitHub verificada para la entidad");
  if (!more?.official_site && !more?.identity?.selected) gaps.push("Sin sitio web verificado como propiedad de la entidad (declara el dominio para cerrar la identidad)");

  /* 5 — RQI: Research Quality Index (auditable, desglosado) */
  const ran = vectors.filter((v) => v.ok && v.results.length > 0).length;
  const total = Math.max(vectors.length, 1);
  const coveragePts = Math.round((ran / total) * 30);

  const idSelected = Boolean(more?.identity?.selected);
  const idAmbiguous = Boolean(more?.identity?.ambiguous);
  const idSite = Boolean(more?.official_site) || idSelected;
  const idDeclared = Boolean(domain);
  const idPts = idSelected ? 25 : idAmbiguous ? 12 : idSite ? (idDeclared ? 18 : 15) : idDeclared ? 10 : 5;
  const idNote = idSelected
    ? `identidad resuelta por OG-Scout: ${more?.identity?.selected?.host}`
    : idAmbiguous
      ? "identidad AMBIGUA — el informe no atribuye el sitio"
      : idSite
        ? `sitio verificado: ${more?.official_site}`
        : idDeclared
          ? "dominio declarado por el analista, sin verificación de contenido"
          : "sin identidad digital verificada";

  const corroborable = corroborated.length + unconfirmed.length;
  const corrobPts = corroborable ? Math.round((corroborated.length / corroborable) * 25) : 0;

  let freshPts = 0;
  let freshNote = "sin evidencia fechada";
  if (newestMs.length) {
    const days = (Date.now() - Math.max(...newestMs)) / 864e5;
    if (days <= 45) [freshPts, freshNote] = [15, `evidencia de hace ${Math.max(1, Math.round(days))} día(s)`];
    else if (days <= 180) [freshPts, freshNote] = [11, `evidencia de hace ~${Math.round(days / 30)} meses`];
    else if (days <= 365) [freshPts, freshNote] = [7, `evidencia de hace ~${Math.round(days / 30)} meses`];
    else [freshPts, freshNote] = [3, `evidencia desactualizada (>${Math.round(days / 365)} año(s))`];
  }

  const hasOfficial = Boolean(gov?.ok && (gov.edgar_companies.length || gov.edgar_hits.length || gov.xbrl.length || gov.awards.length));
  const officialPts = hasOfficial ? 5 : 0;

  const total_ = coveragePts + idPts + corrobPts + freshPts + officialPts;
  const grade: Rqi["grade"] = total_ >= 85 ? "A" : total_ >= 70 ? "B" : total_ >= 55 ? "C" : total_ >= 40 ? "D" : "F";
  const rqi: Rqi = {
    total: total_,
    grade,
    parts: [
      { key: "coverage", label: "Cobertura de vectores", value: coveragePts, max: 30, note: `${ran}/${total} vectores con hallazgos` },
      { key: "identity", label: "Solidez de identidad", value: idPts, max: 25, note: idNote },
      { key: "corroboration", label: "Triangulación", value: corrobPts, max: 25, note: corroborable ? `${corroborated.length}/${corroborable} afirmaciones con ≥2 dominios` : "sin afirmaciones clasificables" },
      { key: "freshness", label: "Frescura", value: freshPts, max: 15, note: freshNote },
      { key: "official", label: "Registro oficial", value: officialPts, max: 5, note: hasOfficial ? "SEC EDGAR / USAspending con registros" : "sin registros oficiales" },
    ],
  };

  /* 6 — Línea de identidad */
  const identityLine = more?.identity
    ? more.identity.summary
    : dom
      ? `dominio declarado: ${dom} (sin resolución de identidad completa)`
      : "sin identidad resuelta — declara dominio y/o cuenta GitHub";

  return {
    claims,
    corroborated,
    unconfirmed,
    mixed,
    rqi,
    gaps,
    coverage: { ran, total: vectors.length, empty, failed },
    identityLine,
    generatedAt: finishedAt || new Date().toISOString(),
  };
}
