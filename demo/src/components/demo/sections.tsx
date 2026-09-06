"use client";

import { motion } from "framer-motion";
import {
  Atom,
  Bot,
  BrainCircuit,
  CloudDownload,
  Dices,
  Github,
  LineChart,
  Orbit,
  Scale,
  ShieldCheck,
  Signal,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const GITHUB_URL = "https://github.com/eddyflores100-lang/OpenGravity";

export function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.55, delay, ease: "easeOut" as const },
  };
}

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[#0b0b10]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30">
            <Orbit className="h-4 w-4 text-amber-400" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-tight text-zinc-100">
            OpenGravity
          </span>
          <Badge variant="outline" className="hidden font-mono text-[10px] text-zinc-400 border-zinc-700 sm:inline-flex">
            v12.0.0
          </Badge>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <a href="#agentes" className="transition-colors hover:text-amber-300">Agentes</a>
          <a href="#simulador" className="transition-colors hover:text-amber-300">Simulador</a>
          <a href="#metodologia" className="transition-colors hover:text-amber-300">Metodología</a>
          <a href="#arquitectura" className="transition-colors hover:text-amber-300">Arquitectura</a>
        </nav>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-2 border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 hover:text-amber-300">
            <Github className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Star en GitHub</span>
            <span className="sm:hidden">GitHub</span>
          </Button>
        </a>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <motion.div {...fadeUp(0)} className="flex flex-wrap items-center justify-center gap-2">
          <Badge className="border-emerald-800 bg-emerald-950/60 font-mono text-[11px] text-emerald-300 hover:bg-emerald-950/60">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            CI passing
          </Badge>
          <Badge variant="outline" className="border-zinc-700 font-mono text-[11px] text-zinc-300">
            Motor V10.5.0
          </Badge>
          <Badge variant="outline" className="border-amber-800/60 bg-amber-950/30 font-mono text-[11px] text-amber-300">
            AliceLabs Proprietary
          </Badge>
        </motion.div>

        <motion.h1
          {...fadeUp(0.08)}
          className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-5xl md:text-6xl"
        >
          Due diligence de startups con{" "}
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            física bayesiana
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.16)}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          OpenGravity convierte unit economics en una probabilidad calibrada de éxito —{" "}
          <span className="font-mono text-amber-300">P(Hit)</span> — combinando un prior
          bayesiano, señales de agentes de investigación y simulación Monte Carlo. Nada de
          corazonadas: cada punto del logit es auditable.
        </motion.p>

        <motion.div {...fadeUp(0.24)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#simulador">
            <Button size="lg" className="gap-2 bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300">
              <Terminal className="h-4 w-4" />
              Probar el motor en vivo
            </Button>
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="gap-2 border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-amber-300">
              <Github className="h-4 w-4" />
              Ver el código fuente
            </Button>
          </a>
        </motion.div>

        <motion.dl
          {...fadeUp(0.32)}
          className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { k: "12/12", v: "tests de regresión" },
            { k: "1.500", v: "sims Monte Carlo por veredicto" },
            { k: "±5%", v: "IC con datos auditados" },
            { k: "6", v: "vectores de investigación agéntica" },
          ].map((s) => (
            <div key={s.v} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-4">
              <dt className="sr-only">{s.v}</dt>
              <dd className="font-mono text-xl font-semibold text-amber-300 sm:text-2xl">{s.k}</dd>
              <dd className="mt-1 text-[11px] leading-snug text-zinc-500 sm:text-xs">{s.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

const METHOD_STEPS = [
  {
    icon: Scale,
    title: "1 · Prior bayesiano",
    body: "El motor parte de una creencia previa (P = 20%) y la ajusta con unit economics: LTV/CAC, runway y crecimiento mes a mes, con interacción LTV×crecimiento y penalización por burn desenfrenado.",
    formula: "logit = −1.386 + 0.70·LTV + 2.50·log(1+g) + 0.50·log(R/12) + 3.0·LTV·g − burn − 1.8",
  },
  {
    icon: BrainCircuit,
    title: "2 · Señales agénticas",
    body: "Agentes de investigación (DeerFlow, MiroFish) devuelven hallazgos con evidencia y credibilidad. Cada señal empuja el logit directamente — un hallazgo crítico puede tumbar métricas espectaculares, como en WeWork.",
    formula: "logit_final = logit_base + Σ impactos_agénticos",
  },
  {
    icon: Dices,
    title: "3 · Monte Carlo",
    body: "Se perturban las métricas con ruido gaussiano (±15–25%) y se re-puntúan 1.500 escenarios. El resultado no es un número mágico: es una distribución completa con percentiles P10/P50/P90 y tasa de veredictos.",
    formula: "P(Hit)ᵢ = σ(logit(métricas + εᵢ))  ×  1.500 iteraciones",
  },
  {
    icon: LineChart,
    title: "4 · Calibración honesta",
    body: "El modelo se calibró contra datasets con ground truth y se validó fuera de distribución (reportes de Brier score en el repo). Datos auditados → IC ±5%; datos inferidos → IC ±15%. La incertidumbre se declara, no se esconde.",
    formula: "IC = P(Hit) ± 0.05 (auditado) | ± 0.15 (inferido)",
  },
];

export function Methodology() {
  return (
    <section id="metodologia" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
      <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400">Metodología</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          Cuatro capas, cero cajas negras
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
          Todo el pipeline está documentado en el repo: desde el Monolito de la Verdad V9.7.1
          que calibró los coeficientes hasta los reportes de Brier score. Esto es lo que corre
          bajo el capó.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {METHOD_STEPS.map((s, i) => (
          <motion.article
            key={s.title}
            {...fadeUp(0.06 * i)}
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 transition-colors hover:border-amber-800/50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 ring-1 ring-amber-400/25">
                <s.icon className="h-5 w-5 text-amber-400" />
              </span>
              <h3 className="font-semibold text-zinc-100">{s.title}</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{s.body}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-[#0d0d13] p-3 font-mono text-[11px] leading-relaxed text-amber-200/90">
              {s.formula}
            </pre>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

const ARCH_CARDS = [
  {
    icon: Atom,
    name: "Oracle",
    tech: "FastAPI · Python 3.12",
    body: "La API del motor: POST /evaluate recibe métricas y devuelve P(Hit), IC, logit y riesgo de down round. Almacenamiento acotado, CORS configurable y endpoint de callback para agentes.",
    port: ":8000",
  },
  {
    icon: Bot,
    name: "Core Bot",
    tech: "grammY · TypeScript",
    body: "Reconocimiento vía Telegram con enrutador LLM multi-proveedor (Mistral / Moonshot / Gemini) y failover secuencial. Storage con motor de queries real: where, orderBy y limit que sí ejecutan.",
    port: ":3001",
  },
  {
    icon: CloudDownload,
    name: "Dashboard",
    tech: "Next.js · Tailwind",
    body: "Panel institucional para revisar evaluaciones, intervalos de confianza y señales agénticas con su evidencia enlazada. Esta misma página es una demostración del estilo del producto.",
    port: ":3000",
  },
];

export function Architecture() {
  return (
    <section id="arquitectura" className="scroll-mt-20 border-y border-zinc-800/60 bg-zinc-950/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400">Arquitectura</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Tres servicios, despliegue en un comando
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Docker Compose levanta todo el stack con healthchecks. Los agentes externos
            reportan hallazgos de vuelta al Oracle mediante{" "}
            <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-amber-200">
              /callback/agent-report/{"{id}"}
            </code>{" "}
            — el loop agéntico se cierra solo.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ARCH_CARDS.map((c, i) => (
            <motion.article
              key={c.name}
              {...fadeUp(0.08 * i)}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 transition-colors hover:border-amber-800/50"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 ring-1 ring-amber-400/25">
                  <c.icon className="h-5 w-5 text-amber-400" />
                </span>
                <span className="font-mono text-[11px] text-zinc-500">{c.port}</span>
              </div>
              <h3 className="mt-4 font-semibold text-zinc-100">{c.name}</h3>
              <p className="mt-0.5 font-mono text-xs text-amber-300/80">{c.tech}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          {...fadeUp(0.1)}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 px-6 py-5 font-mono text-xs text-zinc-400"
        >
          <span className="text-zinc-200">telegram</span>
          <span className="text-amber-500">→</span>
          <span className="text-zinc-200">core bot</span>
          <span className="text-amber-500">→</span>
          <span className="text-zinc-200">oracle</span>
          <span className="text-amber-500">→</span>
          <span className="text-zinc-200">P(Hit)</span>
          <span className="text-amber-500">→</span>
          <Signal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-zinc-200">agentes investigan</span>
          <span className="text-amber-500">→</span>
          <span className="text-emerald-300">callback con evidencia</span>
        </motion.div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <motion.div {...fadeUp(0)}>
        <ShieldCheck className="mx-auto h-10 w-10 text-amber-400" />
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
          El código es tuyo para auditar
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Motor completo, tests de regresión, datasets de calibración y reportes forenses
          históricos viven en el repo. Despliegalo en tu próximo comité de inversión.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="gap-2 bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300">
              <Github className="h-4 w-4" />
              github.com/eddyflores100-lang/OpenGravity
            </Button>
          </a>
          <a href="#simulador">
            <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-amber-300">
              Volver al simulador
            </Button>
          </a>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800/60 bg-[#0b0b10]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
        <p className="font-mono text-xs text-zinc-500">
          © 2026 AliceLabs LLC — OpenGravity V10.5.0 · Licencia propietaria source-available
        </p>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-amber-300">
            GitHub
          </a>
          <a href={`${GITHUB_URL}/blob/main/README.es.md`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-amber-300">
            Documentación (ES)
          </a>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            GitHub Pages · agentes con fuentes públicas en vivo
          </span>
        </div>
      </div>
    </footer>
  );
}
