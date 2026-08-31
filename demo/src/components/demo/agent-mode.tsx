"use client";

/**
 * AgentMission — escuadrón agéntico en vivo (DeerFlow/MiroFish demo).
 * Reconstrucción del pipeline original del repo:
 *   Layer 1: harvesters (búsqueda web multi-vector, solo con el nombre)
 *   Layer 2: DeerFlowDispatcher (LLM auditor → señales + métricas + veto)
 *   Layer 3: el motor bayesiano re-puntúa con agent_bias (auto-aplicado).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOM_DEFAULTS,
  evaluate,
  type AgentSignalPreset,
  type Metrics,
} from "@/lib/opengravity";
import { runAgentSearch, runAuditor } from "@/lib/agents-static";
import { VECTOR_META, type SearchVectorResult, type Synthesis } from "@/lib/research";

type Phase = "idle" | "searching" | "synth" | "done" | "error";

interface AgentMissionProps {
  onApply: (patch: {
    metrics: Partial<Metrics> | null;
    signals: AgentSignalPreset[];
    name: string;
    sector: string;
  }) => void;
}

export function AgentMission({ onApply }: AgentMissionProps) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [vectors, setVectors] = useState<SearchVectorResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [synth, setSynth] = useState<Synthesis | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);

  const running = phase === "searching" || phase === "synth";

  const biasSum = useMemo(
    () => (synth ? synth.signals.reduce((a, s) => a + s.impact_magnitude, 0) : 0),
    [synth]
  );

  /** Métricas sobre las que el motor calcula el antes/después del informe. */
  const probeMetrics: Metrics | null = useMemo(() => {
    if (!synth) return null;
    const m = synth.estimated_metrics;
    return {
      ltv_cac: m.ltv_cac ?? CUSTOM_DEFAULTS.ltv_cac,
      months_runway: m.months_runway ?? CUSTOM_DEFAULTS.months_runway,
      moe_growth: m.moe_growth ?? CUSTOM_DEFAULTS.moe_growth,
      is_audited: m.is_audited,
    };
  }, [synth]);

  const probeUsesDefaults = Boolean(
    synth && synth.metric_confidence === "unknown"
  );

  const rawProb = probeMetrics ? evaluate(probeMetrics, 0).probability_hit : null;
  const adjProb = probeMetrics ? evaluate(probeMetrics, biasSum).probability_hit : null;

  const evidence = useMemo(() => {
    if (!vectors) return [];
    const seen = new Set<string>();
    const out: { title: string; url: string; host: string; snippet: string; date: string; vector: string }[] = [];
    for (const v of vectors) {
      for (const r of v.results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        out.push({ ...r, vector: v.label });
      }
    }
    return out;
  }, [vectors]);

  async function run() {
    const q = name.trim();
    if (!q) {
      setErrorMsg("Escribe primero el nombre de la startup — los agentes rastrean el mercado solo con el nombre.");
      setPhase("error");
      return;
    }
    setPhase("searching");
    setVectors(null);
    setSynth(null);
    setApplied(false);
    setErrorMsg(null);
    setShowAll(false);

    try {
      // Layer 1 — harvesters en el navegador: 6 vectores sobre fuentes públicas
      // abiertas (Wikipedia, Wikidata, GitHub, Hacker News, DuckDuckGo), sin
      // backend. Cada vector se pinta al aterrizar.
      const { vectors: vs, total: tot } = await runAgentSearch(q, (vec) => {
        setVectors((prev) => {
          const base = prev ? prev.filter((v) => v.key !== vec.key) : [];
          return [...base, vec];
        });
      });
      setVectors(vs);
      setTotal(tot);

      // Layer 2 — auditor DeerFlow (extractor heurístico en modo estático)
      setPhase("synth");
      await new Promise((r) => setTimeout(r, 450));
      const { synthesis, fallback_used: fb } = await runAuditor(q, sector.trim(), vs);
      setSynth(synthesis);
      setFallbackUsed(fb);

      // Auto-carga al motor: métricas solo si hay respaldo, señales siempre.
      const m = synthesis.estimated_metrics;
      const patchMetrics: Partial<Metrics> | null =
        synthesis.metric_confidence === "unknown"
          ? null
          : {
              ...(m.ltv_cac !== null ? { ltv_cac: m.ltv_cac } : {}),
              ...(m.months_runway !== null ? { months_runway: Math.round(m.months_runway) } : {}),
              ...(m.moe_growth !== null ? { moe_growth: Math.round(m.moe_growth) } : {}),
              is_audited: m.is_audited,
            };
      onApply({
        metrics: patchMetrics,
        signals: synthesis.signals.map((s) => ({
          finding: s.finding,
          impact_magnitude: s.impact_magnitude,
          polarity: s.polarity,
        })),
        name: q,
        sector: sector.trim(),
      });
      setApplied(true);
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error desconocido");
      setPhase("error");
    }
  }

  const visibleEvidence = showAll ? evidence : evidence.slice(0, 6);

  return (
    <div id="agentes" className="scroll-mt-20">
      <Card className="border-amber-900/40 bg-gradient-to-b from-amber-950/10 to-zinc-900/40">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30">
              <Radar className="h-4 w-4 text-amber-400" />
            </span>
            <CardTitle className="text-base text-zinc-50">
              Escuadrón agéntico — investigación autónoma
            </CardTitle>
            <Badge variant="outline" className="border-amber-800/60 bg-amber-950/30 font-mono text-[10px] text-amber-300">
              DeerFlow / MiroFish
            </Badge>
          </div>
          <CardDescription className="mt-1 text-xs leading-relaxed">
            Escribe <span className="text-zinc-200">solo el nombre</span>: los agentes rastrean fuentes
            públicas abiertas en vivo — Wikipedia, Wikidata, GitHub, Hacker News, DuckDuckGo — buscando
            financiación, noticias, riesgos, tracción, comunidad y fundadores, y cargan las señales al motor
            bayesiano. Es el pipeline de los harvesters del repo corriendo en tu navegador — después puedes
            ajustar todo a mano.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Entrada */}
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Nombre de la startup</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Nikola, Klarna, tu startup…"
                className="h-9 border-zinc-700 bg-zinc-950/80 text-sm text-zinc-100 placeholder:text-zinc-600"
                aria-label="Nombre de la startup a investigar"
                onKeyDown={(e) => { if (e.key === "Enter" && !running) run(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Sector <span className="text-zinc-600">(opcional)</span></Label>
              <Input
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej. DeepTech"
                className="h-9 border-zinc-700 bg-zinc-950/80 text-sm text-zinc-100 placeholder:text-zinc-600"
                aria-label="Sector de la startup (opcional)"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="h-9 w-full gap-2 bg-amber-400 px-4 font-semibold text-zinc-950 hover:bg-amber-300 sm:w-auto"
                onClick={run}
                disabled={running}
                aria-label="Desplegar agentes de investigación"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Radar className="h-4 w-4" />
                )}
                {running ? "Rastreando…" : "Desplegar agentes"}
              </Button>
            </div>
          </div>

          {/* Vectores de búsqueda */}
          {(running || vectors) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {VECTOR_META.map((vm, i) => {
                const done = vectors?.find((v) => v.key === vm.key);
                const count = done?.results.length ?? 0;
                return (
                  <motion.div
                    key={vm.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className={`rounded-lg border p-2.5 text-left ${
                      done
                        ? done.ok
                          ? "border-zinc-800 bg-zinc-950/60"
                          : "border-red-900/60 bg-red-950/20"
                        : "border-zinc-800/60 bg-zinc-950/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm" aria-hidden>{vm.icon}</span>
                      {done ? (
                        done.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-600" />
                      )}
                    </div>
                    <div className="mt-1 truncate text-[10px] leading-tight text-zinc-500" title={vm.label}>
                      {vm.label}
                    </div>
                    <div className={`mt-0.5 font-mono text-[11px] ${done && done.ok ? "text-amber-300" : "text-zinc-600"}`}>
                      {done ? (done.ok ? `${count} fuentes` : "sin datos") : "buscando…"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {phase === "error" && errorMsg && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Síntesis en curso */}
          {phase === "synth" && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  Auditor DeerFlow sintetizando {total} fuentes…
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Extrayendo señales con impacto logit, métricas estimadas y vetos de política de la evidencia pública recopilada.
                </p>
              </div>
            </div>
          )}

          {/* Informe del auditor */}
          {synth && phase === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                  Informe del auditor
                </span>
                <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-400">
                  {evidence.length} evidencias
                </Badge>
                {fallbackUsed ? (
                  <Badge variant="outline" className="border-orange-800/60 bg-orange-950/30 font-mono text-[10px] text-orange-300">
                    sin evidencia · fallback heurístico
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-800/60 bg-amber-950/30 font-mono text-[10px] text-amber-300">
                    auditor heurístico local
                  </Badge>
                )}
                {synth.metric_confidence !== "unknown" && (
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] ${
                      synth.metric_confidence === "found"
                        ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-300"
                        : "border-amber-800/60 bg-amber-950/30 text-amber-300"
                    }`}
                  >
                    métricas {synth.metric_confidence === "found" ? "encontradas" : "estimadas"}
                  </Badge>
                )}
              </div>

              {synth.company_identified && (
                <p className="text-xs text-zinc-300">
                  <span className="text-zinc-500">Empresa identificada:</span> {synth.company_identified}
                </p>
              )}

              {synth.summary && (
                <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-300">
                  {synth.summary}
                </p>
              )}

              {/* Veto fatal */}
              {synth.is_fatal && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-800 bg-red-950/40 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div className="text-xs">
                    <p className="font-mono font-semibold tracking-wide text-red-300">
                      VETO DE POLÍTICA — POLICY_FATAL_VETO
                    </p>
                    <p className="mt-0.5 text-red-200/80">
                      Evidencia de fraude o colapso fatal: el veredicto se fuerza a DROP aunque las métricas
                      digan lo contrario (como Nikola en el archivo).
                    </p>
                  </div>
                </div>
              )}

              {/* Señales descubiertas */}
              {synth.signals.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    Señales descubiertas ({synth.signals.length}) — suma logit{" "}
                    <span className={biasSum >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {biasSum >= 0 ? "+" : ""}{biasSum.toFixed(1)}
                    </span>
                  </p>
                  {synth.signals.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i, duration: 0.3 }}
                      className={`rounded-lg border p-3 ${
                        s.polarity === "negative"
                          ? "border-red-900/70 bg-red-950/30"
                          : s.polarity === "positive"
                            ? "border-emerald-900/70 bg-emerald-950/30"
                            : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] leading-snug text-zinc-300">{s.finding}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                              s.impact_magnitude >= 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-red-900/60 text-red-300"
                            }`}
                          >
                            {s.impact_magnitude >= 0 ? "+" : ""}{s.impact_magnitude.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      {s.source_urls.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {s.source_urls.slice(0, 3).map((u, j) => (
                            <a
                              key={j}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[240px] items-center gap-1 truncate text-[10px] text-zinc-500 underline-offset-2 hover:text-amber-300 hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              {(() => { try { return new URL(u).host; } catch { return u.slice(0, 30); } })()}
                            </a>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-xs text-zinc-500">
                  Sin señales respaldadas por la evidencia. Si la empresa es muy pequeña o privada, evalúala
                  manualmente con los controles del motor.
                </p>
              )}

              {/* Métricas estimadas */}
              {synth.metric_confidence !== "unknown" &&
                (synth.estimated_metrics.ltv_cac !== null ||
                  synth.estimated_metrics.months_runway !== null ||
                  synth.estimated_metrics.moe_growth !== null) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Métricas:</span>
                    {synth.estimated_metrics.ltv_cac !== null && (
                      <Badge variant="outline" className="border-zinc-700 bg-zinc-950/60 font-mono text-[10px] text-amber-300">
                        LTV/CAC ~{synth.estimated_metrics.ltv_cac.toFixed(1)}x
                      </Badge>
                    )}
                    {synth.estimated_metrics.months_runway !== null && (
                      <Badge variant="outline" className="border-zinc-700 bg-zinc-950/60 font-mono text-[10px] text-amber-300">
                        runway ~{Math.round(synth.estimated_metrics.months_runway)}m
                      </Badge>
                    )}
                    {synth.estimated_metrics.moe_growth !== null && (
                      <Badge variant="outline" className="border-zinc-700 bg-zinc-950/60 font-mono text-[10px] text-amber-300">
                        crecimiento ~{Math.round(synth.estimated_metrics.moe_growth)}%
                      </Badge>
                    )}
                    <span className="text-[10px] text-zinc-600">cargadas al motor — editables abajo</span>
                  </div>
                )}

              {/* Antes / después */}
              {probeMetrics && rawProb !== null && adjProb !== null && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Efecto agéntico sobre el motor
                    {probeUsesDefaults && (
                      <span className="normal-case tracking-normal text-zinc-600">
                        (métricas por defecto 3.0x / 12m / 8%)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-center">
                      <div className="font-mono text-2xl font-bold tabular-nums text-zinc-400">
                        {(rawProb * 100).toFixed(1)}%
                      </div>
                      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">
                        sin señales
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600" />
                    <div className="text-center">
                      <div
                        className={`font-mono text-2xl font-bold tabular-nums ${
                          adjProb >= rawProb ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {(adjProb * 100).toFixed(1)}%
                      </div>
                      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">
                        con agentes
                      </div>
                    </div>
                    <div
                      className={`ml-auto rounded-lg px-2.5 py-1 font-mono text-xs font-semibold ${
                        biasSum >= 0
                          ? "bg-emerald-950/40 text-emerald-300"
                          : "bg-red-950/40 text-red-300"
                      }`}
                    >
                      {adjProb >= rawProb ? "+" : ""}
                      {((adjProb - rawProb) * 100).toFixed(1)} pp
                    </div>
                  </div>
                </div>
              )}

              {/* Cargado al motor */}
              {applied && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-xs text-emerald-200/90">
                    Informe cargado al motor bayesiano — el veredicto de abajo ya incluye las señales. Todo es
                    editable: alterna o elimina señales, corrige métricas.
                  </p>
                  <a
                    href="#resultado-motor"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200"
                  >
                    Ver evaluación
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {/* Evidencia */}
          {evidence.length > 0 && phase === "done" && (
            <div>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-left transition-colors hover:border-zinc-600"
                aria-expanded={showAll}
              >
                <span className="flex items-center gap-2 text-xs text-zinc-300">
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                  {evidence.length} fuentes crudas bajo las piedras
                  <span className="text-zinc-600">— haz clic para {showAll ? "ocultar" : "inspeccionar"}</span>
                </span>
                {showAll ? (
                  <ChevronUp className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                )}
              </button>
              {showAll && (
                <div className="mt-2 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibleEvidence.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 transition-colors hover:border-amber-700/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[10px] text-zinc-500">
                          {r.host}{r.date ? ` · ${r.date}` : ""}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600 group-hover:text-amber-300" />
                      </div>
                      <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-zinc-200">
                        {r.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                        {r.snippet}
                      </div>
                      <span className="mt-1.5 inline-block rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-600">
                        {r.vector}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
