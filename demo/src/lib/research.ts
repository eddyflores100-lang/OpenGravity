/**
 * Shared types for the agentic research squad (DeerFlow/MiroFish demo).
 * Used by /api/research/* routes and components/demo/agent-mode.tsx.
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

/** Vector metadata (client-side mirror of the server VECTORS list). */
export const VECTOR_META: { key: string; label: string; icon: string }[] = [
  { key: "funding", label: "Financiación y valuación", icon: "💰" },
  { key: "news", label: "Noticias recientes", icon: "📰" },
  { key: "risk", label: "Riesgos: despidos, demandas, fraude", icon: "⚠️" },
  { key: "product", label: "Producto y tracción", icon: "📦" },
  { key: "community", label: "Comunidad técnica", icon: "🟠" },
  { key: "people", label: "Fundadores y equipo", icon: "🧑‍💻" },
];
