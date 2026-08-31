"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, Dices, FlaskConical, Info, Plus, RotateCcw, Rocket, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Architecture,
  FinalCta,
  Footer,
  Hero,
  Methodology,
  Nav,
  fadeUp,
} from "@/components/demo/sections";
import { AgentMission } from "@/components/demo/agent-mode";
import {
  CUSTOM_DEFAULTS,
  ENGINE_VERSION,
  PRESETS,
  TIERS,
  type Metrics,
  monteCarlo,
  evaluate,
  statusColor,
  type AgentSignalPreset,
} from "@/lib/opengravity";

interface SignalState extends AgentSignalPreset {
  enabled: boolean;
}

function Gauge({ prob, status }: { prob: number; status: string }) {
  const R = 90;
  const ARC = Math.PI * R;
  const clamped = Math.min(1, Math.max(0, prob));
  const colors = statusColor(status);
  const stroke =
    status.startsWith("CRITICAL") || status === "DROP"
      ? "#f87171"
      : status === "WINNER"
        ? "#34d399"
        : status === "INVEST"
          ? "#fbbf24"
          : "#fb923c";
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 220 130" className="w-full" role="img" aria-label={`Probabilidad de éxito ${Math.round(prob * 100)}%`}>
        <path d="M 20 115 A 90 90 0 0 1 200 115" fill="none" stroke="#27272a" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 115 A 90 90 0 0 1 200 115"
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${clamped * ARC} ${ARC}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s" }}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const a = Math.PI * (1 - t);
          const x1 = 110 + Math.cos(a) * 72;
          const y1 = 115 - Math.sin(a) * 72;
          const x2 = 110 + Math.cos(a) * 80;
          const y2 = 115 - Math.sin(a) * 80;
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#52525b" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className={`font-mono text-4xl font-bold tabular-nums ${colors.text}`}>
          {(prob * 100).toFixed(1)}
          <span className="text-xl">%</span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">P(Hit)</div>
      </div>
    </div>
  );
}

function CiBar({ ci, prob }: { ci: [number, number]; prob: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="font-mono">Intervalo de confianza {(ci[0] * 100).toFixed(0)}–{(ci[1] * 100).toFixed(0)}%</span>
        <span>{prob >= 0.8 || prob <= 0.2 ? "rango estrecho" : "rango declarado"}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="absolute h-full rounded-full bg-amber-400/80 transition-all duration-500"
          style={{ left: `${ci[0] * 100}%`, width: `${(ci[1] - ci[0]) * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)] transition-all duration-500"
          style={{ left: `calc(${prob * 100}% - 2px)` }}
        />
      </div>
    </div>
  );
}

function LogitBars({ components }: { components: { key: string; label: string; value: number }[] }) {
  const max = Math.max(...components.map((c) => Math.abs(c.value)), 1);
  return (
    <div className="space-y-2">
      {components.map((c) => {
        const w = (Math.abs(c.value) / max) * 50;
        const positive = c.value >= 0;
        return (
          <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[200px_1fr_auto]">
            <span className="truncate text-[11px] text-zinc-400">{c.label}</span>
            <div className="relative hidden h-3.5 rounded bg-zinc-800/80 sm:block">
              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
              <div
                className={`absolute inset-y-0 rounded-sm transition-all duration-500 ${positive ? "bg-emerald-500/80" : "bg-red-500/80"}`}
                style={positive ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
              />
            </div>
            <span className={`text-right font-mono text-[11px] tabular-nums ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {c.value >= 0 ? "+" : ""}{c.value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function binColor(mid: number) {
  if (mid >= 0.8) return "#34d399";
  if (mid >= 0.55) return "#fbbf24";
  if (mid >= 0.25) return "#fb923c";
  return "#f87171";
}

const VERDICT_META = [
  { key: "winner" as const, label: "WINNER", cls: "bg-emerald-400" },
  { key: "invest" as const, label: "INVEST", cls: "bg-amber-400" },
  { key: "review" as const, label: "REVIEW", cls: "bg-orange-400" },
  { key: "drop" as const, label: "DROP", cls: "bg-red-400" },
];

interface MetricFieldProps {
  label: string;
  display: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  step: number;
  inputMax: number;
  onChange: (v: number) => void;
  aria: string;
}

function MetricField({ label, display, helper, value, min, max, step, inputMax, onChange, aria }: MetricFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-zinc-300">{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={Math.round(value * 100) / 100}
            min={min}
            max={inputMax}
            step={step}
            onChange={(e) => {
              const v = e.target.value === "" ? min : Number(e.target.value);
              if (!Number.isNaN(v)) onChange(Math.min(inputMax, Math.max(min, v)));
            }}
            className="h-7 w-20 border-zinc-700 bg-zinc-950/80 text-right font-mono text-xs text-amber-300"
            aria-label={`${aria} (valor numérico)`}
          />
          <span className="hidden font-mono text-sm font-semibold text-amber-300 sm:inline">{display}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="mt-3"
        aria-label={aria}
      />
      <p className="mt-1.5 text-[10px] leading-snug text-zinc-600">{helper}</p>
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [metrics, setMetrics] = useState<Metrics>(PRESETS[0].metrics);
  const [signals, setSignals] = useState<SignalState[]>(
    PRESETS[0].signals.map((s) => ({ ...s, enabled: true }))
  );
  const [startupName, setStartupName] = useState<string>(PRESETS[0].name);
  const [sector, setSector] = useState<string>(PRESETS[0].sector);
  const [tier, setTier] = useState<string>(PRESETS[0].tier);
  const [seed, setSeed] = useState(42);
  const [newFinding, setNewFinding] = useState("");
  const [newImpact, setNewImpact] = useState(-1.5);

  const activePreset = PRESETS.find((p) => p.id === presetId);
  const isCustom = presetId === "custom";
  const agentBias = signals.filter((s) => s.enabled).reduce((acc, s) => acc + s.impact_magnitude, 0);
  const result = useMemo(() => evaluate(metrics, agentBias), [metrics, agentBias]);
  const mc = useMemo(() => monteCarlo(metrics, agentBias, 1500, seed), [metrics, agentBias, seed]);

  function loadPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setMetrics({ ...p.metrics });
    setSignals(p.signals.map((s) => ({ ...s, enabled: true })));
    setStartupName(p.name);
    setSector(p.sector);
    setTier(p.tier);
    setSeed(42);
  }

  function loadCustom() {
    setPresetId("custom");
    setMetrics({ ...CUSTOM_DEFAULTS });
    setSignals([]);
    setStartupName("");
    setSector("B2B SaaS");
    setTier("Series A");
    setSeed(42);
  }

  function editMetrics(fn: (m: Metrics) => Metrics) {
    setMetrics((m) => fn(m));
    setPresetId("custom");
  }

  /** Carga el informe del escuadrón agéntico (métricas parciales + señales). */
  function applyResearch(patch: {
    metrics: Partial<Metrics> | null;
    signals: AgentSignalPreset[];
    name: string;
    sector: string;
  }) {
    setPresetId("custom");
    if (patch.metrics) {
      setMetrics((m) => ({ ...m, ...patch.metrics }));
    } else {
      // Sin métricas con respaldo: defaults neutros para que el motor
      // coincida con la franja "Efecto agéntico" del informe.
      setMetrics({ ...CUSTOM_DEFAULTS });
    }
    setSignals(patch.signals.map((s) => ({ ...s, enabled: true })));
    if (patch.name) setStartupName(patch.name);
    setSector(patch.sector || "Sin clasificar");
    setSeed(42);
  }

  function addSignal() {
    const finding = newFinding.trim();
    if (!finding) {
      toast({ title: "Falta el hallazgo", description: "Describe qué encontró la investigación." });
      return;
    }
    const impact = Math.min(5, Math.max(-5, newImpact));
    const polarity: AgentSignalPreset["polarity"] = impact > 0.2 ? "positive" : impact < -0.2 ? "negative" : "neutral";
    setSignals((arr) => [...arr, { finding, impact_magnitude: Math.round(impact * 100) / 100, polarity, enabled: true }]);
    setNewFinding("");
    setPresetId("custom");
  }

  function copySummary() {
    const name = startupName.trim() || "Evaluación personalizada";
    const lines = [
      `OpenGravity V${ENGINE_VERSION} — ${name}`,
      `${sector} · ${tier} · datos ${metrics.is_audited ? "auditados" : "inferidos"}`,
      ``,
      `P(Hit): ${(result.probability_hit * 100).toFixed(1)}%  [IC ${(result.confidence_interval[0] * 100).toFixed(0)}–${(result.confidence_interval[1] * 100).toFixed(0)}%]  →  ${result.status}`,
      `Logit: ${result.logit_score.toFixed(2)} · Bias agéntico: ${result.agent_bias_applied >= 0 ? "+" : ""}${result.agent_bias_applied.toFixed(1)} · Riesgo down-round 24m: ${(result.down_round_risk_24m * 100).toFixed(0)}%`,
      `Métricas: LTV/CAC ${metrics.ltv_cac.toFixed(1)}x · Runway ${Math.round(metrics.months_runway)}m · Crecimiento ${metrics.moe_growth.toFixed(0)}% MoM`,
      `Monte Carlo n=${mc.iterations}: media ${(mc.mean * 100).toFixed(1)}% · P10 ${(mc.p10 * 100).toFixed(1)}% · P50 ${(mc.p50 * 100).toFixed(1)}% · P90 ${(mc.p90 * 100).toFixed(1)}%`,
      `Veredictos: WINNER ${((mc.verdicts.winner / mc.iterations) * 100).toFixed(1)}% · INVEST ${((mc.verdicts.invest / mc.iterations) * 100).toFixed(1)}% · REVIEW ${((mc.verdicts.review / mc.iterations) * 100).toFixed(1)}% · DROP ${((mc.verdicts.drop / mc.iterations) * 100).toFixed(1)}%`,
      ``,
      `github.com/alicelabsllc/OpenGravity`,
    ];
    const text = lines.join("\n");
    const done = () => toast({ title: "Resumen copiado", description: "Pégalo en tu memo de inversión." });
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        toast({ title: "No se pudo copiar automáticamente", description: "Selecciona y copia manualmente." });
      });
    } else {
      toast({ title: "Portapapeles no disponible", description: "Selecciona y copia manualmente." });
    }
  }

  const sc = statusColor(result.status);
  const displayName = startupName.trim() || "Tu startup";

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b10] text-zinc-200">
      <Nav />
      <main className="flex-1">
        <Hero />

        {/* ============ SIMULADOR ============ */}
        <section id="simulador" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400">Simulador en vivo</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Evalúa cualquier startup, ahora
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Despliega el <span className="font-medium text-amber-300">escuadrón agéntico</span> solo con el
              nombre y que rastree el mercado por ti, elige un caso histórico para ver cómo piensa el motor — o
              pulsa <span className="font-medium text-amber-300">Tu startup</span> y mete los números a mano.
              Es un port exacto de{" "}
              <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-amber-200">scoring.py</code>{" "}
              (V{ENGINE_VERSION}) con los agentes DeerFlow/MiroFish del repo, corriendo en vivo.
            </p>
          </motion.div>

          {/* Presets + custom */}
          <motion.div {...fadeUp(0.05)} className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <button
                  key={p.id}
                  onClick={() => loadPreset(p.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-amber-500/70 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                  }`}
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl" aria-hidden>{p.icon}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{p.year}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">{p.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-zinc-500">{p.sector}</div>
                </button>
              );
            })}
            <button
              onClick={loadCustom}
              className={`rounded-xl border p-4 text-left transition-all ${
                isCustom
                  ? "border-amber-500/70 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
                  : "border-dashed border-zinc-700 bg-transparent hover:border-amber-600/60"
              }`}
              aria-pressed={isCustom}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30">
                  <Rocket className="h-3.5 w-3.5 text-amber-400" />
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-amber-300">Tu startup</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">evaluación libre</div>
            </button>
          </motion.div>

          {activePreset && (
            <motion.p
              key={activePreset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-zinc-500"
            >
              <span className="text-zinc-300">{activePreset.name}:</span> {activePreset.narrative}{" "}
              <span className={`font-mono ${activePreset.id === "wework" || activePreset.id === "petscom" ? "text-red-400" : "text-emerald-400"}`}>
                → {activePreset.outcome}
              </span>
            </motion.p>
          )}
          {isCustom && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto mt-4 max-w-3xl text-center text-xs leading-relaxed text-zinc-500"
            >
              <span className="text-amber-300">Modo libre:</span> escribe el nombre, ajusta las métricas reales de
              tu startup y añade tus propios hallazgos como señales agénticas. Todo se recalcula al instante —
              también la simulación Monte Carlo.
            </motion.p>
          )}

          {/* Escuadrón agéntico: investigación autónoma solo con el nombre */}
          <motion.div {...fadeUp(0.02)} className="mt-8">
            <AgentMission onApply={applyResearch} />
          </motion.div>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {/* Controles */}
            <motion.div {...fadeUp(0.08)} className="lg:col-span-2">
              <Card className="h-full border-zinc-800 bg-zinc-900/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                    <FlaskConical className="h-4 w-4 text-amber-400" />
                    Datos de la startup
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isCustom
                      ? "Introduce las métricas de la startup que quieres probar."
                      : "Unit economics del caso cargado — edítalas libremente."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Nombre</Label>
                      <Input
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                        placeholder="Ej. MiSaaS AI"
                        className="h-9 border-zinc-700 bg-zinc-950/80 text-sm text-zinc-100 placeholder:text-zinc-600"
                        aria-label="Nombre de la startup"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">Sector</Label>
                      <Input
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        placeholder="Ej. Fintech B2B"
                        className="h-9 border-zinc-700 bg-zinc-950/80 text-sm text-zinc-100 placeholder:text-zinc-600"
                        aria-label="Sector de la startup"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-300">Etapa</Label>
                    <Select value={tier} onValueChange={(v) => { setTier(v); setPresetId("custom"); }}>
                      <SelectTrigger className="h-9 border-zinc-700 bg-zinc-950/80 text-sm text-zinc-100" aria-label="Etapa de la startup">
                        <SelectValue placeholder="Selecciona etapa" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-950">
                        {TIERS.map((t) => (
                          <SelectItem key={t} value={t} className="text-sm text-zinc-100">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="bg-zinc-800" />

                  <MetricField
                    label="LTV / CAC"
                    display={`${metrics.ltv_cac.toFixed(1)}x`}
                    helper="Valor de vida del cliente ÷ costo de adquisición. < 1x = DROP automático."
                    value={metrics.ltv_cac}
                    min={0}
                    max={20}
                    step={0.1}
                    inputMax={20}
                    onChange={(v) => editMetrics((m) => ({ ...m, ltv_cac: Math.round(v * 10) / 10 }))}
                    aria="Ratio LTV sobre CAC"
                  />

                  <MetricField
                    label="Runway"
                    display={`${Math.round(metrics.months_runway)} meses`}
                    helper="Caja disponible. 12 meses es la referencia neutra del prior."
                    value={metrics.months_runway}
                    min={1}
                    max={60}
                    step={1}
                    inputMax={120}
                    onChange={(v) => editMetrics((m) => ({ ...m, months_runway: Math.round(v) }))}
                    aria="Meses de runway"
                  />

                  <MetricField
                    label="Crecimiento mes a mes"
                    display={`${metrics.moe_growth.toFixed(0)}%`}
                    helper="> 40% con LTV/CAC < 1.5x dispara la penalización por burn. El motor acepta hasta 200%."
                    value={metrics.moe_growth}
                    min={0}
                    max={100}
                    step={1}
                    inputMax={200}
                    onChange={(v) => editMetrics((m) => ({ ...m, moe_growth: Math.round(v) }))}
                    aria="Crecimiento mes a mes en porcentaje"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-xs text-zinc-300">Datos auditados</Label>
                      <p className="mt-0.5 text-[10px] text-zinc-600">10-K/auditoría externa → IC ±5% en vez de ±15%</p>
                    </div>
                    <Switch
                      checked={metrics.is_audited}
                      onCheckedChange={(v) => editMetrics((m) => ({ ...m, is_audited: v }))}
                      aria-label="Datos auditados"
                    />
                  </div>

                  <Separator className="bg-zinc-800" />

                  {/* Señales agénticas */}
                  <div>
                    <Label className="text-xs text-zinc-300">Señales agénticas</Label>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      Hallazgos de investigación — empujan el logit, no la probabilidad.
                    </p>

                    {signals.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {signals.map((s, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border p-3 transition-all ${
                              !s.enabled
                                ? "border-zinc-800 bg-zinc-900/60 opacity-50"
                                : s.polarity === "negative"
                                  ? "border-red-900/70 bg-red-950/30"
                                  : s.polarity === "positive"
                                    ? "border-emerald-900/70 bg-emerald-950/30"
                                    : "border-zinc-700 bg-zinc-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => setSignals((arr) => arr.map((x, j) => (j === i ? { ...x, enabled: !x.enabled } : x)))}
                                className="flex-1 text-left"
                                aria-pressed={s.enabled}
                                aria-label={`Alternar señal: ${s.finding}`}
                              >
                                <span className="text-[11px] leading-snug text-zinc-300">{s.finding}</span>
                              </button>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                    s.impact_magnitude >= 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-red-900/60 text-red-300"
                                  }`}
                                >
                                  {s.impact_magnitude >= 0 ? "+" : ""}{s.impact_magnitude.toFixed(1)}
                                </span>
                                <button
                                  onClick={() => setSignals((arr) => arr.filter((_, j) => j !== i))}
                                  className="rounded p-0.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                                  aria-label={`Eliminar señal: ${s.finding}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Añadir señal */}
                    <div className="mt-3 rounded-lg border border-dashed border-zinc-700 p-3">
                      <Input
                        value={newFinding}
                        onChange={(e) => setNewFinding(e.target.value)}
                        placeholder="Hallazgo propio — ej. 'Churn del 8% mensual detectado en reviews'"
                        className="h-8 border-zinc-700 bg-zinc-950/80 text-xs text-zinc-100 placeholder:text-zinc-600"
                        aria-label="Descripción del hallazgo"
                        onKeyDown={(e) => { if (e.key === "Enter") addSignal(); }}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          value={newImpact}
                          min={-5}
                          max={5}
                          step={0.1}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v)) setNewImpact(Math.min(5, Math.max(-5, v)));
                          }}
                          className="h-8 w-24 border-zinc-700 bg-zinc-950/80 font-mono text-xs text-zinc-100"
                          aria-label="Impacto en el logit de -5 a 5"
                        />
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                            newImpact >= 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-red-900/60 text-red-300"
                          }`}
                        >
                          {newImpact >= 0 ? "+" : ""}{newImpact.toFixed(1)} logit
                        </span>
                        <span className="text-[10px] text-zinc-600">−5 castigo severo · +5 impulso fuerte</span>
                        <Button
                          size="sm"
                          className="ml-auto h-8 gap-1 bg-amber-400 px-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
                          onClick={addSignal}
                        >
                          <Plus className="h-3 w-3" />
                          Añadir
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Resultados */}
            <motion.div id="resultado-motor" {...fadeUp(0.12)} className="space-y-4 scroll-mt-20 lg:col-span-3">
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-zinc-50">{displayName}</h3>
                      <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-400">{sector || "—"}</Badge>
                      <Badge variant="outline" className="border-amber-800/60 bg-amber-950/30 font-mono text-[10px] text-amber-300">{tier}</Badge>
                      {!metrics.is_audited && (
                        <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-500">datos inferidos</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-zinc-600 bg-zinc-900 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-amber-300"
                      onClick={copySummary}
                    >
                      <Copy className="h-3 w-3" />
                      Copiar resumen
                    </Button>
                  </div>

                  <div className="grid items-center gap-6 sm:grid-cols-2">
                    <Gauge prob={result.probability_hit} status={result.status} />
                    <div className="space-y-4">
                      <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold tracking-wider ${sc.bg} ${sc.border} ${sc.text}`}>
                        <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                        {result.status}
                      </div>
                      <CiBar ci={result.confidence_interval} prob={result.probability_hit} />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-2.5">
                          <div className="font-mono text-sm font-semibold text-zinc-200">{result.logit_score.toFixed(2)}</div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">logit</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-2.5">
                          <div className="font-mono text-sm font-semibold text-orange-300">
                            {(result.down_round_risk_24m * 100).toFixed(0)}%
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">riesgo 24m</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-2.5">
                          <div className={`font-mono text-sm font-semibold ${result.agent_bias_applied >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {result.agent_bias_applied >= 0 ? "+" : ""}{result.agent_bias_applied.toFixed(1)}
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">bias agentes</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-5 bg-zinc-800" />

                  <div className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-zinc-600" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                      Descomposición del logit — todo auditable
                    </span>
                  </div>
                  <div className="mt-3">
                    <LogitBars components={result.components} />
                  </div>
                </CardContent>
              </Card>

              {/* Monte Carlo */}
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
                      <Dices className="h-4 w-4 text-amber-400" />
                      Simulación Monte Carlo
                      <Badge variant="outline" className="ml-1 border-zinc-700 font-mono text-[10px] text-zinc-400">
                        n={mc.iterations.toLocaleString("es")}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Ruido gaussiano ±15–25% sobre las métricas, re-puntuado {mc.iterations.toLocaleString("es")} veces.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-zinc-600 bg-zinc-900 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-amber-300"
                      onClick={() => setSeed((s) => s + 1)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-simular
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {[
                      { k: "Media", v: mc.mean },
                      { k: "P10", v: mc.p10 },
                      { k: "P50 (mediana)", v: mc.p50 },
                      { k: "P90", v: mc.p90 },
                    ].map((s) => (
                      <div key={s.k} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-center">
                        <div className="font-mono text-base font-semibold tabular-nums text-amber-300">
                          {(s.v * 100).toFixed(1)}%
                        </div>
                        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">{s.k}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mc.histogram} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <XAxis
                          dataKey="bin"
                          tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace" }}
                          interval={3}
                          axisLine={{ stroke: "#3f3f46" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(251,191,36,0.06)" }}
                          contentStyle={{
                            background: "#0d0d13",
                            border: "1px solid #3f3f46",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "#e4e4e7", fontFamily: "monospace" }}
                          formatter={(value: number | string) => [`${value} sims`, "escenarios"]}
                        />
                        <ReferenceLine x={mc.histogram[Math.round(mc.p50 * 19)]?.bin} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.7} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {mc.histogram.map((h, i) => (
                            <Cell key={i} fill={binColor(h.mid)} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4">
                    <div className="flex h-3 overflow-hidden rounded-full">
                      {VERDICT_META.map((v) => (
                        <div
                          key={v.key}
                          className={v.cls}
                          style={{ width: `${(mc.verdicts[v.key] / mc.iterations) * 100}%` }}
                          title={`${v.label}: ${mc.verdicts[v.key]}`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {VERDICT_META.map((v) => (
                        <span key={v.key} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                          <span className={`h-2 w-2 rounded-sm ${v.cls}`} />
                          {v.label}
                          <span className="text-zinc-200">{((mc.verdicts[v.key] / mc.iterations) * 100).toFixed(1)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.p {...fadeUp(0)} className="mt-6 text-center text-[11px] text-zinc-600">
            Nota: demo educativa con el algoritmo público del repo. La calibración completa (Monolito de la Verdad V9.7.1,
            isotónica, Brier) y las señales agénticas en producción corren en el Oracle FastAPI.
          </motion.p>
        </section>

        <Methodology />
        <Architecture />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
