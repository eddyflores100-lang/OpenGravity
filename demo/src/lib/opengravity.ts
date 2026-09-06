/**
 * OpenGravity V10.5.0 — TypeScript port of scoring.py
 * Faithful reproduction of the Bayesian engine (Truth Monolith V9.7.1 calibration).
 * Source of truth: github.com/eddyflores100-lang/OpenGravity/blob/main/scoring.py
 */

export const ENGINE_VERSION = "10.5.0";

export const COEFFICIENTS = {
  ltv_cac: 0.7,
  growth: 2.5,
  runway: 0.5,
  interaction: 3.0,
  burn_penalty: 1.5,
  bias: 1.8,
} as const;

export const THRESHOLDS = {
  invest: 0.55,
  winner: 0.8,
  drop: 0.25,
  criticalBias: -2.0,
  survivalHigh: 0.9,
  survivalLow: 0.3,
  priorLogit: -1.386,
} as const;

export interface Metrics {
  ltv_cac: number;
  months_runway: number;
  moe_growth: number;
  is_audited: boolean;
}

export interface LogitComponent {
  key: string;
  label: string;
  value: number;
}

export interface ScoringResult {
  probability_hit: number;
  confidence_interval: [number, number];
  logit_score: number;
  status: string;
  down_round_risk_24m: number;
  agent_bias_applied: number;
  components: LogitComponent[];
}

export function stableSigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1.0 / (1.0 + z);
  }
  const z = Math.exp(x);
  return z / (1.0 + z);
}

export function calculateLogit(m: Metrics, agentBiasSum = 0.0) {
  const ltv = Math.max(0, Math.min(20, m.ltv_cac));
  const growth = Math.log1p(Math.max(-0.5, Math.min(2.0, m.moe_growth / 100.0)));
  const runway = Math.max(1, m.months_runway);

  const interaction = ltv * growth;
  const burnPenalty =
    growth > 0.4 && ltv < 1.5 ? COEFFICIENTS.burn_penalty : 0.0;
  const runwaySignal = Math.log(runway / 12.0);

  const cLtv = ltv * COEFFICIENTS.ltv_cac;
  const cGrowth = growth * COEFFICIENTS.growth;
  const cRunway = runwaySignal * COEFFICIENTS.runway;
  const cInteraction = interaction * COEFFICIENTS.interaction;

  const baseLogit =
    THRESHOLDS.priorLogit +
    cLtv +
    cGrowth +
    cRunway +
    cInteraction -
    burnPenalty -
    COEFFICIENTS.bias;

  const components: LogitComponent[] = [
    { key: "prior", label: "Prior bayesiano + sesgo", value: THRESHOLDS.priorLogit - COEFFICIENTS.bias },
    { key: "ltv", label: "LTV/CAC × 0.70", value: cLtv },
    { key: "growth", label: "log(1+crecim.) × 2.50", value: cGrowth },
    { key: "runway", label: "log(runway/12) × 0.50", value: cRunway },
    { key: "interaction", label: "Interacción LTV×Crecim. × 3.0", value: cInteraction },
    { key: "burn", label: "Penalización por burn", value: -burnPenalty },
    { key: "agent", label: "Señales agénticas (logit)", value: agentBiasSum },
  ];

  return { logit: baseLogit + agentBiasSum, agentBiasSum, components };
}

export function getConfidenceInterval(prob: number, isAudited: boolean): [number, number] {
  const spread = isAudited ? 0.05 : 0.15;
  return [Math.max(0, prob - spread), Math.min(1, prob + spread)];
}

export function evaluate(m: Metrics, agentBiasSum = 0.0): ScoringResult {
  const { logit, agentBiasSum: bias, components } = calculateLogit(m, agentBiasSum);
  const prob = stableSigmoid(logit);
  const ci = getConfidenceInterval(prob, m.is_audited);
  const survival = prob > 0.5 ? THRESHOLDS.survivalHigh : THRESHOLDS.survivalLow;

  let status: string;
  if (m.ltv_cac < 1.0) status = "DROP";
  else if (prob > THRESHOLDS.winner) status = "WINNER";
  else if (prob > THRESHOLDS.invest) status = "INVEST";
  else if (prob < THRESHOLDS.drop) status = "DROP";
  else status = "REVIEW";

  if (bias < THRESHOLDS.criticalBias) status = `CRITICAL ${status}`;

  return {
    probability_hit: Math.round(prob * 10000) / 10000,
    confidence_interval: [Math.round(ci[0] * 10000) / 10000, Math.round(ci[1] * 10000) / 10000],
    logit_score: Math.round(logit * 10000) / 10000,
    status,
    down_round_risk_24m: Math.round((1.0 - survival) * 10000) / 10000,
    agent_bias_applied: Math.round(bias * 10000) / 10000,
    components,
  };
}

// ---------- Monte Carlo ----------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface MonteCarloResult {
  histogram: { bin: string; count: number; mid: number }[];
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  verdicts: { winner: number; invest: number; review: number; drop: number };
  iterations: number;
}

/**
 * Monte Carlo simulation: perturbs the input metrics with multiplicative
 * Gaussian noise (±15% LTV, ±20% runway, ±25% growth) and re-scores each
 * draw — mirroring the stress-test methodology of archive/scripts/run_*.
 */
export function monteCarlo(
  m: Metrics,
  agentBiasSum = 0.0,
  iterations = 1500,
  seed = 42
): MonteCarloResult {
  const rand = mulberry32(seed);
  const probs: number[] = [];
  const verdicts = { winner: 0, invest: 0, review: 0, drop: 0 };

  for (let i = 0; i < iterations; i++) {
    const noisy: Metrics = {
      ltv_cac: Math.min(20, Math.max(0, m.ltv_cac * (1 + gaussian(rand) * 0.15))),
      months_runway: Math.min(120, Math.max(1, m.months_runway * (1 + gaussian(rand) * 0.2))),
      moe_growth: Math.min(200, Math.max(0, m.moe_growth * (1 + gaussian(rand) * 0.25))),
      is_audited: m.is_audited,
    };
    const r = evaluate(noisy, agentBiasSum);
    probs.push(r.probability_hit);
    const s = r.status.replace("CRITICAL ", "");
    if (s === "WINNER") verdicts.winner++;
    else if (s === "INVEST") verdicts.invest++;
    else if (s === "REVIEW") verdicts.review++;
    else verdicts.drop++;
  }

  probs.sort((a, b) => a - b);
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
  const q = (p: number) => probs[Math.min(probs.length - 1, Math.floor(p * probs.length))];

  const BINS = 20;
  const histogram = Array.from({ length: BINS }, (_, i) => ({
    bin: `${(i * 5)}–${(i * 5) + 5}%`,
    mid: (i + 0.5) / BINS,
    count: 0,
  }));
  for (const p of probs) {
    const idx = Math.min(BINS - 1, Math.floor(p * BINS));
    histogram[idx].count++;
  }

  return {
    histogram,
    mean: Math.round(mean * 1000) / 1000,
    p10: Math.round(q(0.1) * 1000) / 1000,
    p50: Math.round(q(0.5) * 1000) / 1000,
    p90: Math.round(q(0.9) * 1000) / 1000,
    verdicts,
    iterations,
  };
}

// ---------- Historical presets (archived forensic cases) ----------

export interface AgentSignalPreset {
  finding: string;
  impact_magnitude: number;
  polarity: "positive" | "negative" | "neutral";
}

export interface Preset {
  id: string;
  name: string;
  year: string;
  sector: string;
  tier: string;
  icon: string;
  metrics: Metrics;
  signals: AgentSignalPreset[];
  narrative: string;
  outcome: string;
}

export const TIERS = ["Seed", "Series A", "Series B", "Late Stage"] as const;

export const CUSTOM_DEFAULTS: Metrics = {
  ltv_cac: 3.0,
  months_runway: 12,
  moe_growth: 8,
  is_audited: false,
};

export const PRESETS: Preset[] = [
  {
    id: "wework",
    name: "WeWork",
    year: "2016",
    sector: "Space-as-a-Service",
    tier: "Late Stage",
    icon: "🏢",
    metrics: { ltv_cac: 4.2, months_runway: 7, moe_growth: 12, is_audited: true },
    signals: [
      {
        finding: "Apalancamiento operativo crítico: leasing a largo plazo como costo fijo masivo (bancarrota simulada 100%)",
        impact_magnitude: -2.6,
        polarity: "negative",
      },
      {
        finding: "Expansión internacional rápida replica exposición a costos fijos sin demanda validada",
        impact_magnitude: -1.8,
        polarity: "negative",
      },
    ],
    narrative:
      "El caso estrella del archivo: LTV/CAC reportado de 13.41x — espectacular en papel — pero ocultaba costos fijos extremos. Los agentes modelan ese hallazgo como señales negativas: sin ellas el motor ve REVIEW, con ellas vota CRITICAL DROP.",
    outcome: "Fracaso: IPO retirada, valuación −95%",
  },
  {
    id: "uber",
    name: "Uber",
    year: "2010",
    sector: "Marketplace de movilidad",
    tier: "Seed",
    icon: "🚕",
    metrics: { ltv_cac: 1.4, months_runway: 9, moe_growth: 28, is_audited: false },
    signals: [
      {
        finding: "Efecto red observable: densidad de conductores atrae pasajeros en cada ciudad lanzada",
        impact_magnitude: 1.2,
        polarity: "positive",
      },
    ],
    narrative:
      "Unit economics apenas aceptables en el arranque, pero crecimiento mes a mes brutal y señales agénticas de efecto red. El motor premia la sinergia LTV×crecimiento sobre el ratio estático.",
    outcome: "IPO 2019: ~$75B al debut",
  },
  {
    id: "petscom",
    name: "Pets.com",
    year: "1999",
    sector: "E-commerce",
    tier: "Seed",
    icon: "🧦",
    metrics: { ltv_cac: 0.6, months_runway: 5, moe_growth: 18, is_audited: false },
    signals: [
      {
        finding: "Envío gratuito de bolsas de 20 lb destruye margen por pedido: CAC nunca se recupera",
        impact_magnitude: -1.5,
        polarity: "negative",
      },
    ],
    narrative:
      "Unit economics negativos: cada cliente adquirido costaba más de lo que dejaba. El motor ni siquiera llega a evaluar el crecimiento — LTV/CAC < 1 es DROP automático.",
    outcome: "Quiebra en 9 meses, -$300M",
  },
  {
    id: "neuralnet",
    name: "NeuralNet Corp",
    year: "Hypothetical",
    sector: "B2B SaaS",
    tier: "Series A",
    icon: "🧠",
    metrics: { ltv_cac: 5.5, months_runway: 18, moe_growth: 20, is_audited: true },
    signals: [],
    narrative:
      "El ejemplo canónico de la documentación: ratios auditados sanos, runway cómodo y crecimiento compuesto. Sin señales agénticas — el prior bayesiano hace el trabajo.",
    outcome: "Perfil de referencia WINNER",
  },
];

export function statusColor(status: string): { text: string; bg: string; border: string; dot: string } {
  if (status.startsWith("CRITICAL"))
    return { text: "text-red-300", bg: "bg-red-950/60", border: "border-red-800", dot: "bg-red-400" };
  if (status === "WINNER")
    return { text: "text-emerald-300", bg: "bg-emerald-950/60", border: "border-emerald-700", dot: "bg-emerald-400" };
  if (status === "INVEST")
    return { text: "text-amber-300", bg: "bg-amber-950/60", border: "border-amber-700", dot: "bg-amber-400" };
  if (status === "REVIEW")
    return { text: "text-orange-300", bg: "bg-orange-950/60", border: "border-orange-800", dot: "bg-orange-400" };
  return { text: "text-red-300", bg: "bg-red-950/60", border: "border-red-800", dot: "bg-red-400" };
}
