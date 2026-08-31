/**
 * Shared types for the agentic research squad (DeerFlow/MiroFish demo).
 * Used by /api/research/* routes, components/demo/agent-mode.tsx and dossier.tsx.
 */

export interface EvidenceItem {
  title: string;
  url: string;
  host: string;
  snippet: string;
  date: string;
}

export interface SearchVectorResult {
  key: string;
  label: string;
  icon: string;
  query: string;
  ok: boolean;
  results: EvidenceItem[];
  error?: string;
}

export interface SearchResponse {
  ok: boolean;
  name?: string;
  vectors?: SearchVectorResult[];
  total?: number;
  error?: string;
}

/** Payload que el cliente envía al sintetizador (sin metadatos de búsqueda). */
export type VectorPayload = Pick<SearchVectorResult, "key" | "label" | "results">;

export interface SynthesisSignal {
  finding: string;
  impact_magnitude: number;
  polarity: "positive" | "negative" | "neutral";
  source_urls: string[];
}

export interface Synthesis {
  company_identified: string | null;
  summary: string;
  signals: SynthesisSignal[];
  estimated_metrics: {
    ltv_cac: number | null;
    months_runway: number | null;
    moe_growth: number | null;
    is_audited: boolean;
  };
  metric_confidence: "found" | "estimated" | "unknown";
  is_fatal: boolean;
}

export interface SynthResponse {
  ok: boolean;
  name?: string;
  synthesis?: Synthesis;
  fallback_used?: boolean;
  note?: string;
  error?: string;
}

/* ── Scrapers .gov / SEC EDGAR (Task: informe completo) ─────────────────── */

export interface GovSourceLog {
  key: string;
  label: string;
  endpoint: string;
  ok: boolean;
  count: number;
  ms: number;
  error?: string;
}

export interface EdgarHit {
  cik: string;
  form: string;
  file_date: string;
  display_name: string;
  biz_location: string;
  file_type: string;
  file_description: string;
  url: string;
}

export interface EdgarCompany {
  cik: string;
  name: string;
  tickers: string[];
  exchange: string;
  sic: string;
  sic_description: string;
  state: string;
  state_of_incorporation: string;
  phone: string;
  filings: { form: string; date: string; url: string }[];
  filing_count: number;
}

export interface XbrlFinancial {
  label: string;
  tag: string;
  value: number;
  fy: number;
  fp: string;
  form: string;
  end: string;
}

export interface GovAward {
  id: string;
  recipient: string;
  amount: number;
  start_date: string;
  agency: string;
  description: string;
  type: string;
  url: string;
}

export interface GovBundle {
  ok: boolean;
  name: string;
  edgar_hits: EdgarHit[];
  edgar_companies: EdgarCompany[];
  xbrl: XbrlFinancial[];
  awards: GovAward[];
  awards_total: number;
  awards_recipients: string[];
  log: GovSourceLog[];
  total_sources: number;
}

export interface GovResponse {
  ok: boolean;
  name?: string;
  gov?: GovBundle;
  error?: string;
}

/** Resumen compacto que el cliente envía al auditor LLM junto a los vectores web. */
export interface GovPayload {
  edgar_mentions: { form: string; date: string; name: string; description: string; url: string }[];
  companies: { name: string; cik: string; tickers: string[]; recent: string[] }[];
  financials: { label: string; value: number; end: string; form: string }[];
  awards: { agency: string; amount: number; description: string; date: string; id: string }[];
}

/** Vector metadata (client-side mirror of the server VECTORS list). */
export const VECTOR_META: { key: string; label: string; icon: string }[] = [
  { key: "funding", label: "Financiación y valuación", icon: "💰" },
  { key: "news", label: "Noticias recientes", icon: "📰" },
  { key: "risk", label: "Riesgos: despidos, demandas, fraude", icon: "⚠️" },
  { key: "product", label: "Producto y tracción", icon: "📦" },
  { key: "community", label: "Comunidad técnica", icon: "🟠" },
  { key: "people", label: "Fundadores y equipo", icon: "🧑‍💻" },
  { key: "talento", label: "Talento: vacantes en ATS", icon: "🧑‍💼" },
  { key: "apps", label: "Apps móviles y valoraciones", icon: "📱" },
  { key: "ciencia", label: "Ciencia: papers y ensayos", icon: "🔬" },
  { key: "web", label: "Huella web: dominio, DNS, archivo", icon: "🌐" },
  { key: "mercados", label: "Mercados: cotización y cripto", icon: "💹" },
  { key: "regs", label: "Reguladores: FedRegister, FDA", icon: "🏛️" },
];

/** Vector opt-in Tavily (solo con clave del usuario). */
export const TAVILY_META = { key: "deepweb", label: "Tavily: búsqueda profunda (tu clave)", icon: "🔎" };

/**
 * Datos estructurados que extraen los 6 vectores nuevos — entrada de los
 * fusibles objetivos del auditor (mismo patrón que GovPayload para .gov).
 */
export interface MoreData {
  domain: string | null;
  domain_from_input: boolean;
  domain_alive: boolean | null; // null = no verificado
  domain_registrar: string | null;
  domain_age_years: number | null;
  wayback_first_year: number | null;
  jobs_total: number;
  jobs_detail: { board: string; count: number; sample: string[] }[];
  apps_count: number;
  apps_rating_count: number;
  npm_monthly: number | null;
  pypi_found: boolean;
  docker_pulls: number | null;
  stackexchange_items: number;
  papers_count: number;
  trials_count: number;
  crypto_top: { name: string; rank: number | null }[];
  ticker: { symbol: string; type: string; exchange: string; trend_1y: number | null } | null;
  fedregister_count: number;
  fda_approvals: number;
  fda_recalls: number;
}

export const EMPTY_MORE_DATA: MoreData = {
  domain: null,
  domain_from_input: false,
  domain_alive: null,
  domain_registrar: null,
  domain_age_years: null,
  wayback_first_year: null,
  jobs_total: 0,
  jobs_detail: [],
  apps_count: 0,
  apps_rating_count: 0,
  npm_monthly: null,
  pypi_found: false,
  docker_pulls: null,
  stackexchange_items: 0,
  papers_count: 0,
  trials_count: 0,
  crypto_top: [],
  ticker: null,
  fedregister_count: 0,
  fda_approvals: 0,
  fda_recalls: 0,
};

/** Resultado de runMoreSearch: 6 vectores nuevos + log por sub-fuente. */
export interface MoreBundle {
  ok: boolean;
  vectors: SearchVectorResult[];
  logs: GovSourceLog[];
  data: MoreData;
}

/** Metadatos de los scrapers .gov/SEC para el mapa de investigación. */
export const GOV_META: { key: string; label: string; icon: string }[] = [
  { key: "edgar_fts", label: "SEC EDGAR — búsqueda global de filings", icon: "🏛️" },
  { key: "edgar_cik", label: "SEC EDGAR — entidad y historial de filings", icon: "🏛️" },
  { key: "edgar_xbrl", label: "SEC EDGAR XBRL — finanzas reales (10-K/10-Q)", icon: "📊" },
  { key: "usaspending", label: "USAspending.gov — contratos y subvenciones", icon: "🇺🇸" },
];

/** Convierte el bundle .gov en el resumen compacto que entiende el auditor. */
export function toGovPayload(gov: GovBundle | null): GovPayload | null {
  if (!gov || !gov.ok) return null;
  return {
    edgar_mentions: gov.edgar_hits.slice(0, 12).map((h) => ({
      form: h.form,
      date: h.file_date,
      name: h.display_name,
      description: h.file_description.slice(0, 200),
      url: h.url,
    })),
    companies: gov.edgar_companies.map((c) => ({
      name: c.name,
      cik: c.cik,
      tickers: c.tickers,
      recent: c.filings.slice(0, 8).map((f) => `${f.form} (${f.date})`),
    })),
    financials: gov.xbrl.slice(0, 6).map((x) => ({
      label: x.label,
      value: x.value,
      end: x.end,
      form: x.form,
    })),
    awards: gov.awards.slice(0, 8).map((a) => ({
      agency: a.agency,
      amount: a.amount,
      description: a.description.slice(0, 180),
      date: a.start_date,
      id: a.id,
    })),
  };
}
