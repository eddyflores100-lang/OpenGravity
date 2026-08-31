"use client";

/**
 * DossierReport — EL INFORME COMPLETO de investigación autónoma.
 * Documento institucional con trazabilidad total: mapa de investigación
 * (dónde investigó), entidad, finanzas reales (SEC XBRL), financiación,
 * contratos y proyectos públicos (.gov), deudas y litigios, producto,
 * equipo, señales con impacto logit, métricas y cadena de custodia.
 * Exportable: Markdown (copiar), PDF (imprimir) y JSON (descargar).
 */

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Bot,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  Printer,
  Scale,
  ScrollText,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ENGINE_VERSION } from "@/lib/opengravity";
import {
  GOV_META,
  VECTOR_META,
  type GovBundle,
  type SearchVectorResult,
  type Synthesis,
} from "@/lib/research";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const usd = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const usdCompact = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)} MM USD`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M USD`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}K USD`;
  return `${v} USD`;
};

const dt = (iso: string) => (iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "—");

interface EvidenceLike { title: string; url: string; host: string; snippet: string; date: string; }

/* ── subcomponentes ──────────────────────────────────────────────────────── */

function Section({ n, title, icon, children }: { n: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="flex items-center gap-2 border-b border-zinc-800 pb-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-300">
        <span className="text-zinc-600">{n}</span>
        <span className="text-zinc-400">{icon}</span>
        {title}
      </h3>
      <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded border border-dashed border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-600">{text}</p>;
}

function EvidenceList({ items, max = 4 }: { items: EvidenceLike[]; max?: number }) {
  const [all, setAll] = useState(false);
  if (!items.length) return <Empty text="Sin hallazgos en esta fuente." />;
  const shown = all ? items : items.slice(0, max);
  return (
    <ul className="space-y-1.5">
      {shown.map((r, i) => (
        <li key={i} className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-medium leading-snug text-zinc-200">{r.title}</span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-zinc-600 hover:text-amber-300" aria-label={`Abrir fuente: ${r.title}`}>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-500">{r.snippet}</div>
          <div className="mt-0.5 font-mono text-[9px] text-zinc-600">{r.host}{r.date ? ` · ${r.date}` : ""}</div>
        </li>
      ))}
      {items.length > max && (
        <li>
          <button onClick={() => setAll((v) => !v)} className="text-[10px] text-amber-400/90 hover:text-amber-300">
            {all ? "− mostrar menos" : `+ ${items.length - max} hallazgos más`}
          </button>
        </li>
      )}
    </ul>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border-b border-zinc-800 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-500 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, mono, className }: { children: React.ReactNode; right?: boolean; mono?: boolean; className?: string }) {
  return <td className={`border-b border-zinc-900 px-2 py-1 text-[11px] ${mono ? "font-mono tabular-nums" : ""} ${right ? "text-right" : ""} ${className ?? ""}`}>{children}</td>;
}

/* ── props ───────────────────────────────────────────────────────────────── */

export interface DossierProps {
  name: string;
  sector: string;
  missionId: string;
  startedAt: string;
  finishedAt: string;
  vectors: SearchVectorResult[];
  gov: GovBundle | null;
  synth: Synthesis;
  fallbackUsed: boolean;
  biasSum: number;
  rawProb: number;
  adjProb: number;
}

export function DossierReport(props: DossierProps) {
  const { name, sector, missionId, startedAt, finishedAt, vectors, gov, synth, fallbackUsed, biasSum, rawProb, adjProb } = props;
  const [copied, setCopied] = useState(false);

  const evidence = useMemo(() => {
    const map = new Map<string, EvidenceLike[]>();
    for (const v of vectors) map.set(v.key, v.results.map((r) => ({ title: r.title, url: r.url, host: r.host, snippet: r.snippet, date: r.date })));
    return map;
  }, [vectors]);

  const totalSources = vectors.reduce((a, v) => a + v.results.length, 0) + (gov?.total_sources ?? 0);
  const totalQueries = vectors.length + (gov?.log.filter((l) => l.ok && l.count > 0 || l.key === "usaspending" || l.key === "edgar_cik").length ?? 0) + (gov?.log.length ?? 0);

  /* Grouping for financing/debt sections */
  const edgarHits = gov?.edgar_hits ?? [];
  const financingForms = /^(FORM D|D\b|S-1|S-4|424B|425|F-1)/i;
  const financingFilings = edgarHits.filter((h) => financingForms.test(h.form));
  const eventFilings = edgarHits.filter((h) => /^(8-K|10-K|10-Q|20-F)/i.test(h.form));
  const awards = gov?.awards ?? [];

  /* ── Markdown export ─────────────────────────────────────────────────── */
  const buildMarkdown = () => {
    const L: string[] = [];
    L.push(`# INFORME DE INVESTIGACIÓN AUTÓNOMA — ${name}`);
    L.push("");
    L.push(`- **Misión:** ${missionId} · OpenGravity DeerFlow/MiroFish`);
    L.push(`- **Inicio:** ${dt(startedAt)} → **Fin:** ${dt(finishedAt)}`);
    if (sector) L.push(`- **Sector declarado:** ${sector}`);
    L.push(`- **Fuentes rastreadas:** ${totalSources} hallazgos · ${vectors.length + (gov?.log.length ?? 0)} vectores/scrapers`);
    L.push("");
    L.push(`## 0. Veredicto del auditor`);
    if (synth.company_identified) L.push(`**Entidad identificada:** ${synth.company_identified}`);
    L.push(synth.summary);
    if (synth.is_fatal) L.push(`\n> ⛔ **POLICY_FATAL_VETO** — evidencia fatal: el veredicto se fuerza a DROP.`);
    L.push(`\nP(Hit) sin señales: **${(rawProb * 100).toFixed(1)}%** → con agentes: **${(adjProb * 100).toFixed(1)}%** (${adjProb >= rawProb ? "+" : ""}${((adjProb - rawProb) * 100).toFixed(1)} pp, suma logit ${biasSum >= 0 ? "+" : ""}${biasSum.toFixed(1)}).`);
    L.push("");
    L.push(`## 1. Mapa de investigación (dónde investigó)`);
    L.push(`| # | Fuente / scraper | Endpoint | Hallazgos | Latencia | Estado |`);
    L.push(`|---|---|---|---|---|---|`);
    let i = 1;
    for (const v of vectors) L.push(`| ${i++} | ${v.label} (búsqueda web) | motor de búsqueda integrado | ${v.results.length} | — | ${v.ok ? "OK" : "FALLO"} |`);
    if (gov) for (const l of gov.log) L.push(`| ${i++} | ${l.label} (.gov/SEC) | ${l.endpoint} | ${l.count} | ${l.ms}ms | ${l.ok ? "OK" : `FALLO${l.error ? `: ${l.error}` : ""}`} |`);
    L.push("");
    if (synth.signals.length) {
      L.push(`## 2. Señales aplicadas al motor (suma logit ${biasSum >= 0 ? "+" : ""}${biasSum.toFixed(1)})`);
      for (const s of synth.signals) {
        L.push(`- **[${s.impact_magnitude >= 0 ? "+" : ""}${s.impact_magnitude.toFixed(1)}]** ${s.finding}${s.source_urls.length ? ` — evidencia: ${s.source_urls.join(" · ")}` : ""}`);
      }
      L.push("");
    }
    if (gov?.edgar_companies.length) {
      L.push(`## 3. Entidad(es) en SEC EDGAR`);
      for (const c of gov.edgar_companies) {
        L.push(`- **${c.name}** — CIK ${c.cik}${c.tickers.length ? `, tickers: ${c.tickers.join(", ")}` : ""}${c.exchange ? ` (${c.exchange})` : ""}, SIC ${c.sic} ${c.sic_description}, estado ${c.state || c.state_of_incorporation || "—"}, ${c.filing_count} filings recientes. [EDGAR](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik})`);
      }
      L.push("");
    }
    if (gov?.xbrl.length) {
      L.push(`## 4. Finanzas reales (XBRL de los filings)`);
      for (const x of gov.xbrl) L.push(`- ${x.label}: **${usd(x.value)}** (periodo que termina ${x.end}, ${x.form})`);
      L.push("");
    }
    if (financingFilings.length) {
      L.push(`## 5. Financiación registrada en la SEC (Form D / S-1 / 424B)`);
      for (const f of financingFilings.slice(0, 8)) L.push(`- ${f.form} (${f.file_date}) — ${f.display_name} — ${f.file_description || "documento"} [ver filing](${f.url})`);
      L.push("");
    }
    if (awards.length) {
      L.push(`## 6. Contratos y proyectos públicos (USAspending.gov) — total ${usd(gov?.awards_total ?? 0)}`);
      for (const a of awards) L.push(`- ${a.agency} — **${usd(a.amount)}** (${a.type}, ${a.start_date}, premio ${a.id}): ${a.description || "(sin descripción)"} [fuente](${a.url})`);
      L.push("");
    }
    if (eventFilings.length) {
      L.push(`## 7. Deudas, obligaciones y eventos materiales (8-K/10-K/10-Q)`);
      for (const f of eventFilings.slice(0, 8)) L.push(`- ${f.form} (${f.file_date}) — ${f.display_name} — ${f.file_description || "documento"} [ver filing](${f.url})`);
      L.push("");
    }
    const secDefs = (label: string, key: string) => {
      const items = evidence.get(key) ?? [];
      if (!items.length) return;
      L.push(`## ${label}`);
      for (const r of items.slice(0, 6)) L.push(`- "${r.title}" — ${r.host}${r.date ? ` (${r.date})` : ""}: ${r.snippet} [fuente](${r.url})`);
      L.push("");
    };
    secDefs("8. Riesgos: demandas, despidos, regulación (prensa)", "risk");
    secDefs("9. Financiación y valuación (prensa)", "funding");
    secDefs("10. Producto, tracción, talento y apps", "product");
    L.push(`## 10-bis. Talento y apps (vectores ampliados)`);
    for (const r of [...(evidence.get("talento") ?? []), ...(evidence.get("apps") ?? [])].slice(0, 6)) L.push(`- "${r.title}" — ${r.host}${r.date ? ` (${r.date})` : ""}: ${r.snippet} [fuente](${r.url})`);
    L.push("");
    secDefs("11. Comunidad técnica (Hacker News, GitHub, Stack Overflow)", "community");
    secDefs("12. Equipo y fundadores", "people");
    secDefs("13. Noticias recientes", "news");
    L.push(`## 13-bis. Ciencia, ensayos, huella web y mercados (vectores ampliados)`);
    for (const r of [...(evidence.get("ciencia") ?? []), ...(evidence.get("web") ?? []), ...(evidence.get("mercados") ?? []), ...(evidence.get("regs") ?? [])].slice(0, 10)) L.push(`- "${r.title}" — ${r.host}${r.date ? ` (${r.date})` : ""}: ${r.snippet} [fuente](${r.url})`);
    L.push("");
    L.push(`## 14. Métricas cargadas al motor`);
    const em = synth.estimated_metrics;
    L.push(`- Confianza: **${synth.metric_confidence === "found" ? "encontradas en fuentes" : synth.metric_confidence === "estimated" ? "estimadas por el auditor" : "desconocidas (defaults del motor)"}**`);
    L.push(`- LTV/CAC: ${em.ltv_cac !== null ? `~${em.ltv_cac.toFixed(1)}x` : "n/d"} · runway: ${em.months_runway !== null ? `~${Math.round(em.months_runway)} meses` : "n/d"} · crecimiento MoE: ${em.moe_growth !== null ? `~${Math.round(em.moe_growth)}%` : "n/d"} · auditada: ${em.is_audited ? "sí" : "no"}`);
    L.push("");
    L.push(`## 15. Cadena de custodia y metodología`);
    L.push(`- Pipeline: Layer 1 harvesters (${VECTOR_META.length} vectores web) + scrapers .gov (${GOV_META.length} endpoints SEC EDGAR/USAspending) → Layer 2 auditor DeerFlow${fallbackUsed ? " (fallback heurístico)" : " (LLM institucional)"} → Layer 3 motor bayesiano v${ENGINE_VERSION}.`);
    L.push(`- Regla del oráculo: ninguna señal entra sin URL verificable; el veto fatal fuerza DROP como el PolicyEngine original.`);
    L.push(`- Generado el ${dt(finishedAt)} por la demo pública de OpenGravity. Los datos de SEC EDGAR y USAspending.gov son públicos y oficiales; la cobertura web proviene de búsqueda en vivo.`);
    return L.join("\n");
  };

  async function copyMd() {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard bloqueado */ }
  }
  function downloadJson() {
    const blob = new Blob([JSON.stringify({ mission: missionId, name, sector, startedAt, finishedAt, vectors, gov, synthesis: synth, fallbackUsed, biasSum, rawProb, adjProb }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opengravity-informe-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${missionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const riskItems = evidence.get("risk") ?? [];
  const fundingItems = evidence.get("funding") ?? [];
  const productItems = evidence.get("product") ?? [];
  const communityItems = evidence.get("community") ?? [];
  const peopleItems = evidence.get("people") ?? [];
  const newsItems = evidence.get("news") ?? [];

  return (
    <div className="rounded-xl border border-amber-900/40 bg-zinc-950/80 shadow-2xl shadow-amber-950/10">
      {/* Acciones de exportación */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-4 py-2.5 print:hidden">
        <FileText className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Informe exportable</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button onClick={copyMd} size="sm" variant="outline" className="h-7 gap-1.5 border-zinc-700 px-2.5 text-[11px] text-zinc-200 hover:bg-zinc-800">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "¡Copiado!" : "Copiar (Markdown)"}
          </Button>
          <Button onClick={() => window.print()} size="sm" variant="outline" className="h-7 gap-1.5 border-zinc-700 px-2.5 text-[11px] text-zinc-200 hover:bg-zinc-800">
            <Printer className="h-3 w-3" /> PDF / imprimir
          </Button>
          <Button onClick={downloadJson} size="sm" variant="outline" className="h-7 gap-1.5 border-zinc-700 px-2.5 text-[11px] text-zinc-200 hover:bg-zinc-800">
            <Download className="h-3 w-3" /> JSON
          </Button>
        </div>
      </div>

      <div id="dossier-print" className="space-y-5 px-4 py-5 sm:px-6">
        {/* Cabecera del informe */}
        <header className="border-b-2 border-amber-900/50 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500">OpenGravity · DeerFlow / MiroFish · Misión {missionId}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-50 sm:text-xl">Informe de investigación autónoma — {name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[10px] text-zinc-500">
            <span>inicio: {dt(startedAt)}</span>
            <span>fin: {dt(finishedAt)}</span>
            {sector && <span>sector: {sector}</span>}
            <span className="text-amber-400/90">{totalSources} hallazgos · {vectors.length + (gov?.log.length ?? 0)} fuentes consultadas</span>
          </div>
        </header>

        {/* 0 — veredicto */}
        <Section n="00" title="Veredicto del auditor" icon={<Bot className="h-3.5 w-3.5" />}>
          {synth.company_identified && (
            <p className="text-[11px] text-zinc-400"><span className="text-zinc-600">Entidad identificada:</span> {synth.company_identified}</p>
          )}
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[11px]">{synth.summary || "Sin resumen del auditor."}</p>
          {synth.is_fatal && (
            <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-[11px] text-red-200">
              <span className="font-mono font-semibold text-red-300">POLICY_FATAL_VETO ·</span> evidencia de fraude o colapso: el veredicto se fuerza a DROP aunque las métricas digan lo contrario.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
            <span className="font-mono text-lg tabular-nums text-zinc-400">{(rawProb * 100).toFixed(1)}%</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">sin señales</span>
            <span className="text-zinc-600">→</span>
            <span className={`font-mono text-lg font-bold tabular-nums ${adjProb >= rawProb ? "text-emerald-300" : "text-red-300"}`}>{(adjProb * 100).toFixed(1)}%</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">con agentes</span>
            <span className={`ml-auto rounded px-2 py-0.5 font-mono text-xs font-semibold ${biasSum >= 0 ? "bg-emerald-950/50 text-emerald-300" : "bg-red-950/50 text-red-300"}`}>
              Σ logit {biasSum >= 0 ? "+" : ""}{biasSum.toFixed(1)} · {adjProb >= rawProb ? "+" : ""}{((adjProb - rawProb) * 100).toFixed(1)} pp
            </span>
          </div>
          {fallbackUsed && <p className="text-[10px] text-orange-400/90">Nota: auditor LLM no disponible — se usó el extractor heurístico sobre la misma evidencia.</p>}
        </Section>

        {/* 1 — mapa de investigación */}
        <Section n="01" title="Mapa de investigación — dónde investigó" icon={<ScrollText className="h-3.5 w-3.5" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr><Th>#</Th><Th>Fuente / scraper</Th><Th>Endpoint</Th><Th right>Hallazgos</Th><Th right>Latencia</Th><Th>Estado</Th></tr>
              </thead>
              <tbody>
                {vectors.map((v, i) => (
                  <tr key={`v-${v.key}`}><Td mono>{i + 1}</Td><Td>{v.label}</Td><Td mono>web · búsqueda en vivo</Td><Td right mono>{v.results.length}</Td><Td right mono>—</Td><Td><span className={v.ok ? "text-emerald-400" : "text-red-400"}>{v.ok ? "OK" : "FALLO"}</span></Td></tr>
                ))}
                {gov?.log.map((l, i) => (
                  <tr key={`g-${l.key}`} className={l.ok ? "" : "bg-red-950/10"}>
                    <Td mono>{vectors.length + i + 1}</Td><Td>{l.label}</Td><Td mono>{l.endpoint}</Td><Td right mono>{l.count}</Td><Td right mono>{l.ms}ms</Td>
                    <Td><span className={l.ok ? "text-emerald-400" : "text-red-400"}>{l.ok ? "OK" : "FALLO"}</span>{l.error && <span className="block text-[9px] text-zinc-600">{l.error}</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-zinc-600">
            Vectores web (12) = búsqueda y APIs públicas keyless en vivo (equivalente al agente Tavily del Oracle en producción).
            Scrapers = peticiones directas a APIs oficiales y abiertas: SEC EDGAR (full-text search, submissions, XBRL), USAspending.gov
            (POST con CORS verificado), boards de empleo, iTunes Search, OpenAlex, ClinicalTrials.gov, Cloudflare DoH, RDAP, Wayback CDX,
            Yahoo Finance, CoinGecko, Federal Register y openFDA. Todo se ejecutó en esta misión, con latencias reales.
          </p>
        </Section>

        {/* 2 — señales */}
        <Section n="02" title={`Señales conseguidas (${synth.signals.length}) — impacto logit`} icon={<Scale className="h-3.5 w-3.5" />}>
          {synth.signals.length ? (
            <ul className="space-y-1.5">
              {synth.signals.map((s, i) => (
                <li key={i} className={`rounded border px-2.5 py-1.5 ${s.polarity === "negative" ? "border-red-900/60 bg-red-950/20" : s.polarity === "positive" ? "border-emerald-900/60 bg-emerald-950/20" : "border-zinc-700 bg-zinc-900"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] leading-snug">{s.finding}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${s.impact_magnitude >= 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-red-900/60 text-red-300"}`}>{s.impact_magnitude >= 0 ? "+" : ""}{s.impact_magnitude.toFixed(1)}</span>
                  </div>
                  {s.source_urls.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {s.source_urls.slice(0, 4).map((u, j) => (
                        <a key={j} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[260px] items-center gap-1 truncate text-[10px] text-zinc-500 hover:text-amber-300">
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />{(() => { try { return new URL(u).host; } catch { return u.slice(0, 30); } })()}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Sin señales respaldadas por la evidencia en esta misión." />
          )}
        </Section>

        {/* 3 — entidad EDGAR */}
        {(gov?.edgar_companies.length ?? 0) > 0 && (
          <Section n="03" title="Entidad registrada en SEC EDGAR" icon={<Landmark className="h-3.5 w-3.5" />}>
            {gov!.edgar_companies.map((c) => (
              <div key={c.cik} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{c.name}</span>
                  {c.tickers.map((t) => <Badge key={t} variant="outline" className="border-zinc-700 font-mono text-[9px] text-amber-300">{t}</Badge>)}
                  <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=10-K`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-amber-300">
                    CIK {c.cik} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[10px] text-zinc-500 sm:grid-cols-4">
                  <span>bolsa: {c.exchange || "—"}</span>
                  <span>SIC {c.sic}: {c.sic_description || "—"}</span>
                  <span>estado: {c.state || c.state_of_incorporation || "—"}</span>
                  <span>filings recientes: {c.filing_count}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {c.filings.slice(0, 12).map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 hover:bg-amber-950/50 hover:text-amber-300">{f.form} {f.date}</a>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* 4 — finanzas reales */}
        {(gov?.xbrl.length ?? 0) > 0 && (
          <Section n="04" title="Finanzas reales extraídas de los filings (XBRL)" icon={<BadgeDollarSign className="h-3.5 w-3.5" />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse">
                <thead><tr><Th>Métrica</Th><Th right>Valor</Th><Th right>Periodo</Th><Th>Form</Th></tr></thead>
                <tbody>
                  {gov!.xbrl.map((x, i) => (
                    <tr key={i}><Td>{x.label}</Td><Td right mono className={x.value < 0 ? "text-red-400" : "text-emerald-300"}>{usd(x.value)}</Td><Td right mono>{x.end}</Td><Td mono>{x.form}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-600">Cifras oficiales presentadas por la empresa a la SEC (tag us-gaap, valores USD). Son los números reales del 10-K — no estimaciones.</p>
          </Section>
        )}

        {/* 5 — financiación SEC */}
        {financingFilings.length > 0 && (
          <Section n="05" title={`Financiación registrada en la SEC (${financingFilings.length})`} icon={<BadgeDollarSign className="h-3.5 w-3.5" />}>
            <ul className="space-y-1.5">
              {financingFilings.slice(0, 6).map((f, i) => (
                <li key={i} className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] text-amber-300">{f.form}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-zinc-600 hover:text-amber-300"><ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <div className="text-[10px] text-zinc-400">{f.file_description || f.display_name}</div>
                  <div className="font-mono text-[9px] text-zinc-600">{f.display_name} · {f.file_date}</div>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-zinc-600">Form D = venta privada de valores (ronda); S-1/F-1 = salida a bolsa; 424B = oferta pública. Son registros oficiales de levantamiento de capital.</p>
          </Section>
        )}

        {/* 6 — contratos públicos */}
        {awards.length > 0 && (
          <Section n="06" title={`Contratos y proyectos públicos — USAspending.gov (${usdCompact(gov?.awards_total ?? 0)} en los ${awards.length} mayores)`} icon={<Landmark className="h-3.5 w-3.5" />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead><tr><Th>Agencia</Th><Th right>Monto</Th><Th right>Fecha</Th><Th>Proyecto / descripción</Th></tr></thead>
                <tbody>
                  {awards.map((a, i) => (
                    <tr key={i}>
                      <Td>{a.agency}<span className="block font-mono text-[9px] text-zinc-600">{a.id} · {a.type}</span></Td>
                      <Td right mono className="text-emerald-300">{usd(a.amount)}</Td>
                      <Td right mono>{a.start_date}</Td>
                      <Td><span className="line-clamp-2 text-[10px] text-zinc-400">{a.description || "—"} </span><a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 hover:text-amber-300">ver premio</a></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-600">Receptores matcheados: {gov?.awards_recipients.join(" · ") || "—"}. Datos oficiales de gasto federal (contracts + grants). Un contrato federal vigente es un moat de ingresos verificable.</p>
          </Section>
        )}

        {/* 7 — deudas/litigios */}
        <Section n="07" title="Deudas, obligaciones y eventos materiales" icon={<Scale className="h-3.5 w-3.5" />}>
          {eventFilings.length > 0 ? (
            <ul className="space-y-1.5">
              {eventFilings.slice(0, 6).map((f, i) => (
                <li key={i} className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] text-zinc-300">{f.form}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-zinc-600 hover:text-amber-300"><ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <div className="text-[10px] text-zinc-400">{f.file_description || f.display_name}</div>
                  <div className="font-mono text-[9px] text-zinc-600">{f.file_date} · {f.biz_location}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Sin filings materiales públicos localizados (normal en startups privadas tempranas)." />
          )}
          {riskItems.length > 0 && (
            <div className="mt-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Riesgos en prensa ({riskItems.length} hallazgos)</p>
              <div className="mt-1.5"><EvidenceList items={riskItems} max={3} /></div>
            </div>
          )}
        </Section>

        {/* 8 — prensa: financiación */}
        {fundingItems.length > 0 && (
          <Section n="08" title="Financiación y valuación en el mercado (prensa)" icon={<BadgeDollarSign className="h-3.5 w-3.5" />}>
            <EvidenceList items={fundingItems} max={4} />
          </Section>
        )}

        {/* 9 — producto/comunidad/talento/apps */}
        <Section n="09" title="Producto, tracción, talento y apps" icon={<Bot className="h-3.5 w-3.5" />}>
          <EvidenceList items={[...productItems, ...communityItems, ...(evidence.get("talento") ?? []), ...(evidence.get("apps") ?? [])]} max={5} />
        </Section>

        {/* 10 — ciencia / web / mercados / reguladores */}
        {((evidence.get("ciencia")?.length ?? 0) + (evidence.get("web")?.length ?? 0) + (evidence.get("mercados")?.length ?? 0) + (evidence.get("regs")?.length ?? 0)) > 0 && (
          <Section n="10" title="Ciencia, huella web, mercados y reguladores (vectores ampliados)" icon={<Landmark className="h-3.5 w-3.5" />}>
            <EvidenceList items={[...(evidence.get("ciencia") ?? []), ...(evidence.get("web") ?? []), ...(evidence.get("mercados") ?? []), ...(evidence.get("regs") ?? [])]} max={6} />
          </Section>
        )}

        {/* 11 — equipo */}
        <Section n="11" title="Equipo y fundadores" icon={<Users className="h-3.5 w-3.5" />}>
          <EvidenceList items={peopleItems} max={3} />
        </Section>

        {/* 12 — noticias */}
        {newsItems.length > 0 && (
          <Section n="12" title="Noticias recientes (cobertura general)" icon={<FileText className="h-3.5 w-3.5" />}>
            <EvidenceList items={newsItems} max={4} />
          </Section>
        )}

        {/* 13 — métricas + cadena de custodia */}
        <Section n="13" title="Métricas cargadas al motor y cadena de custodia" icon={<ScrollText className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">LTV/CAC: {synth.estimated_metrics.ltv_cac !== null ? `~${synth.estimated_metrics.ltv_cac.toFixed(1)}x` : "n/d (default)"}</Badge>
            <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">runway: {synth.estimated_metrics.months_runway !== null ? `~${Math.round(synth.estimated_metrics.months_runway)}m` : "n/d (default)"}</Badge>
            <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">crecimiento: {synth.estimated_metrics.moe_growth !== null ? `~${Math.round(synth.estimated_metrics.moe_growth)}%` : "n/d (default)"}</Badge>
            <Badge variant="outline" className="border-zinc-700 font-mono text-[10px] text-zinc-300">auditada: {synth.estimated_metrics.is_audited ? "sí" : "no"}</Badge>
            <Badge variant="outline" className={`font-mono text-[10px] ${synth.metric_confidence === "found" ? "border-emerald-800/60 text-emerald-300" : synth.metric_confidence === "estimated" ? "border-amber-800/60 text-amber-300" : "border-zinc-700 text-zinc-500"}`}>confianza: {synth.metric_confidence === "found" ? "cifras encontradas" : synth.metric_confidence === "estimated" ? "estimadas" : "desconocida"}</Badge>
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-zinc-500">
            <li>Pipeline: Layer 1 harvesters ({VECTOR_META.length} vectores: web + talento/apps/ciencia/web/mercados/regs) + scrapers oficiales ({GOV_META.length} endpoints SEC EDGAR/USAspending + ~18 APIs de apoyo keyless) → Layer 2 auditor DeerFlow ({fallbackUsed ? "heurístico" : "LLM institucional con esquema estricto"}) → Layer 3 motor bayesiano v{ENGINE_VERSION}.</li>
            <li>Regla del oráculo: ninguna señal entra al logit sin URL verificable; el veto fatal (fraude/quiebra) fuerza DROP como el PolicyEngine original.</li>
            <li>SEC EDGAR y USAspending.gov son fuentes públicas y oficiales; el resto proviene de APIs abiertas keyless y búsqueda en vivo en esta misión.</li>
            <li>Misión {missionId} — {totalQueries} consultas registradas, {totalSources} hallazgos trazables. Todo el informe es exportable (Markdown/JSON) y auditable enlace a enlace.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
