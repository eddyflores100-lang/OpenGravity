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
  Globe2,
  Landmark,
  Printer,
  Scale,
  ScrollText,
  ShieldCheck,
  Users,
  Radar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ENGINE_VERSION } from "@/lib/opengravity";
import { buildIntelDossier } from "@/lib/triangulate";
import {
  GOV_META,
  VECTOR_META,
  type GovBundle,
  type GovSourceLog,
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
  domain?: string;
  missionId: string;
  startedAt: string;
  finishedAt: string;
  vectors: SearchVectorResult[];
  gov: GovBundle | null;
  synth: Synthesis;
  verification?: import("@/lib/verify").VerificationStats | null;
  more?: import("@/lib/research").MoreData | null;
  fallbackUsed: boolean;
  biasSum: number;
  rawProb: number;
  adjProb: number;
  /** Registro unificado de fuentes consultadas (con timestamps) — panel y export. */
  sourceLogs?: GovSourceLog[];
  /** Profundidad de la misión (rápida/estándar/profunda). */
  depth?: string;
}

export function DossierReport(props: DossierProps) {
  const { name, sector, domain, missionId, startedAt, finishedAt, vectors, gov, synth, verification, more, fallbackUsed, biasSum, rawProb, adjProb, sourceLogs, depth } = props;
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

  /* ── DOSSIER DE INTELIGENCIA: triangulación + RQI (motor algorítmico) ──── */
  const intel = useMemo(
    () =>
      buildIntelDossier({
        name,
        sector,
        vectors,
        gov,
        synth,
        verification: verification ?? null,
        more: more ?? null,
        domain: domain ?? "",
        startedAt,
        finishedAt,
      }),
    [name, sector, vectors, gov, synth, verification, more, domain, startedAt, finishedAt]
  );

  /* ── Markdown export ─────────────────────────────────────────────────── */
  const buildMarkdown = () => {
    const L: string[] = [];
    L.push(`# INFORME DE INVESTIGACIÓN AUTÓNOMA — ${name}`);
    L.push("");
    L.push(`- **Misión:** ${missionId} · OpenGravity DeerFlow/MiroFish`);
    L.push(`- **Inicio:** ${dt(startedAt)} → **Fin:** ${dt(finishedAt)}`);
    if (sector) L.push(`- **Sector declarado:** ${sector}`);
    if (domain) L.push(`- **Dominio declarado (desambiguador):** ${domain}`);
    L.push(`- **Fuentes rastreadas:** ${totalSources} hallazgos · ${vectors.length + (gov?.log.length ?? 0)} vectores/scrapers`);
    L.push("");
    L.push(`## 0-A. Dossier de inteligencia (OG-Oracle)`);
    L.push(`- **RQI:** ${intel.rqi.total}/100 — grado ${intel.rqi.grade} (${intel.rqi.parts.map((p) => `${p.label} ${p.value}/${p.max}`).join(" · ")})`);
    L.push(`- **Identidad:** ${intel.identityLine}`);
    L.push(`- **Triangulación:** ${intel.corroborated.length} afirmación(es) CORROBORADA(S) por ≥2 dominios independientes · ${intel.unconfirmed.length} no confirmada(s)`);
    for (const c of intel.corroborated) {
      L.push(`  - ✓ ${c.finding} — fuentes: ${c.sources.map((s) => `${s.host}${s.date ? ` (${s.date})` : ""} ${s.url}`).join(" | ")}`);
    }
    for (const c of intel.unconfirmed) {
      L.push(`  - ◌ ${c.finding} — fuente única: ${c.sources[0] ? `${c.sources[0].host} ${c.sources[0].url}` : "(n/d)"}`);
    }
    if (intel.mixed.length) L.push(`  - ⚖ Cobertura mixta: ${intel.mixed.map((m) => m.label).join(", ")}`);
    if (intel.gaps.length) for (const g of intel.gaps) L.push(`  — Brecha: ${g}`);
    if (more?.timeline?.length) {
      L.push("");
      L.push(`## 0-B. Línea de tiempo verificable de la entidad`);
      for (const t of more.timeline) L.push(`- ${t.date.slice(0, 10)} — ${t.label} *(fuente: ${t.source}, ${t.url})*`);
    }
    if (more?.followups?.length) {
      L.push("");
      L.push(`## 0-C. Segunda ola — consultas de seguimiento (la misión se re-planeó con lo verificado)`);
      for (const f of more.followups) L.push(`- [${f.angle}] «${f.query}» → ${f.found} hallazgo(s) que mencionan a la entidad`);
    }
    if (sourceLogs?.length) {
      L.push("");
      L.push(`## 0-D. Fuentes consultadas (${sourceLogs.length} consultas reales, con cadena de custodia temporal)`);
      for (const s of sourceLogs) L.push(`- [${s.ok ? (s.count > 0 ? "OK" : "VACÍA") : "FALLO"}] ${s.label} — ${s.endpoint} · ${s.ms}ms · ${s.count} resultado(s)${s.at ? ` · ${s.at}` : ""}${s.error ? ` · ${s.error}` : ""}`);
    }
    if ((more?.site_pages_scanned ?? 0) > 0 || (more?.site_findings?.length ?? 0) > 0 || more?.openalex_org) {
      L.push("");
      L.push(`## 0-E. Evidencia primaria — scraping directo del sitio verificado + triangulación científica`);
      if ((more?.site_pages_scanned ?? 0) > 0) L.push(`- Subpáginas descargadas del sitio VERIFICADO (${more?.identity?.selected?.host ?? domain ?? "—"}): ${more!.site_pages_scanned} — cero scraping sobre homónimos`);
      for (const f of more?.site_findings ?? []) L.push(`- [${f.kind}] ${f.label} — ${f.detail} (fuente: ${f.url})`);
      for (const b of more?.blog_posts ?? []) L.push(`- blog: «${b.title}» ${b.url}`);
      if ((more?.papers_count ?? 0) > 0 && (more?.crossref_papers ?? 0) > 0) L.push(`- ✓ Triangulación científica: ${more!.papers_count} paper(s) en OpenAlex + ${more!.crossref_papers} en CrossRef (dos bases independientes)`);
      if (more?.openalex_org) L.push(`- Registro ROR (OpenAlex): ${more.openalex_org.name} (${more.openalex_org.country ?? "—"}) — ${more.openalex_org.works_count} trabajos, ${more.openalex_org.cited_by_count} citas — ${more.openalex_org.url}`);
    }
    L.push("");
    L.push(`## 0. Veredicto del auditor`);
    if (synth.company_identified) L.push(`**Entidad identificada:** ${synth.company_identified}`);
    L.push(synth.summary);
    if (synth.is_fatal) L.push(`\n> ⛔ **POLICY_FATAL_VETO** — evidencia fatal: el veredicto se fuerza a DROP.`);
    L.push(`\nP(Hit) sin señales: **${(rawProb * 100).toFixed(1)}%** → con agentes: **${(adjProb * 100).toFixed(1)}%** (${adjProb >= rawProb ? "+" : ""}${((adjProb - rawProb) * 100).toFixed(1)} pp, suma logit ${biasSum >= 0 ? "+" : ""}${biasSum.toFixed(1)}).`);
    L.push("");
    if (verification) {
      L.push(`## 0-bis. Verificación de identidad (capa anti-homónimos)`);
      L.push(`- Método: cada hallazgo debe demostrar que menciona a la entidad — frase exacta del nombre, dominio declarado, o todos sus términos significativos.`);
      L.push(`- Resultado: **${verification.kept}/${verification.raw} hallazgos verificados** · ${verification.dropped} descartados como homónimos o ruido · ${verification.strong} con identidad fuerte (nivel 3).`);
      if (verification.droppedSamples.length) {
        L.push(`- Ejemplos de descartes (prueba del filtro):`);
        for (const s of verification.droppedSamples.slice(0, 5)) L.push(`  - "${s.title}" — ${s.host}`);
      }
      L.push("", `> Regla del oráculo: sin verificación de identidad no hay señal — las señales negativas exigen identidad fuerte (frase exacta o dominio), las positivas identidad probable (todos los términos).`);
      L.push("");
    }
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
    const dossier = {
      format: "opengravity-intel-dossier/v4",
      mission: missionId,
      name,
      sector,
      declared: { domain: domain || null, generatedAt: intel.generatedAt },
      depth: depth ?? "estandar",
      startedAt,
      finishedAt,
      oracle: {
        rqi: intel.rqi,
        identity: intel.identityLine,
        identity_resolution: more?.identity
          ? {
              summary: more.identity.summary,
              selected: more.identity.selected?.host ?? null,
              ambiguous: more.identity.ambiguous,
              github: more.identity.githubLogin,
              github_candidates: more.identity.githubCandidates,
              candidates: more.identity.candidates,
            }
          : null,
        encyclopedia: more?.wiki ?? null,
        claims: intel.claims,
        corroborated: intel.corroborated.length,
        unconfirmed: intel.unconfirmed.length,
        mixed_coverage: intel.mixed,
        gaps: intel.gaps,
        coverage: intel.coverage,
        timeline: more?.timeline ?? [],
        followup_wave: more?.followups ?? [],
      },
      /* v4 — evidencia primaria del sitio verificado + triangulación científica */
      site_scrape: more
        ? {
            verified_site: more.identity?.selected?.host ?? more.domain ?? null,
            pages_scanned: more.site_pages_scanned,
            findings: more.site_findings,
            blog_posts: more.blog_posts,
          }
        : null,
      science: more
        ? {
            openalex_papers: more.papers_count,
            crossref_papers: more.crossref_papers,
            independent_databases_agree: more.papers_count > 0 && more.crossref_papers > 0,
            openalex_org_ror: more.openalex_org,
            trials: more.trials_count,
          }
        : null,
      verification,
      synthesis: synth,
      vectors: vectors.map((v) => ({ key: v.key, label: v.label, ok: v.ok, results: v.results, stats: v.stats ?? null })),
      gov,
      sources_consulted: (sourceLogs ?? gov?.log ?? []).map((s) => ({
        key: s.key,
        label: s.label,
        endpoint: s.endpoint,
        ok: s.ok,
        count: s.count,
        ms: s.ms,
        at: s.at ?? null,
        error: s.error ?? null,
      })),
      engine: { biasSum, rawProb, adjProb, fallbackUsed, version: ENGINE_VERSION },
      methodology:
        "Cada hallazgo conserva su URL y fuente; la identidad exige verificación de contenido (existencia DNS ≠ propiedad, DoH dual Cloudflare+Google); las afirmaciones se triangulan con dominios independientes; la enciclopedia (Wikidata P856) actúa como 3.ª fuente de identidad; la producción científica se contrasta en DOS bases bibliográficas independientes (OpenAlex + CrossRef/DOI); el scraper de subpáginas solo opera sobre el sitio VERIFICADO (cero scraping de homónimos); cada conector tiene reintentos con backoff, circuit breaker y validación de forma de respuesta; cada fuente consultada queda registrada con estado, latencia y timestamp; el RQI es determinista y auditable.",
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opengravity-dossier-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${missionId}.json`;
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
            {domain && <span className="text-sky-400/90">dominio: {domain}</span>}
            <span className="text-amber-400/90">{totalSources} hallazgos · {vectors.length + (gov?.log.length ?? 0)} fuentes consultadas</span>
          </div>
        </header>

        {/* 0 — DOSSIER DE INTELIGENCIA (triangulación + RQI) */}
        <Section n="00" title="Dossier de inteligencia — triangulación algorítmica de fuentes (OG-Oracle)" icon={<Radar className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            <div className="text-center">
              <div className={`font-mono text-3xl font-bold tabular-nums ${intel.rqi.grade === "A" ? "text-emerald-300" : intel.rqi.grade === "B" ? "text-sky-300" : intel.rqi.grade === "C" ? "text-amber-300" : "text-red-300"}`}>
                {intel.rqi.total}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">RQI {intel.rqi.grade}</div>
            </div>
            <div className="min-w-[220px] flex-1 space-y-1">
              {intel.rqi.parts.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-[9px] uppercase tracking-wider text-zinc-500">{p.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className={`h-full rounded-full ${p.value >= p.max * 0.66 ? "bg-emerald-500/80" : p.value >= p.max * 0.33 ? "bg-amber-500/80" : "bg-red-500/70"}`}
                      style={{ width: `${Math.round((p.value / p.max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[9px] tabular-nums text-zinc-500">{p.value}/{p.max}</span>
                  <span className="hidden w-56 shrink-0 truncate text-[9px] text-zinc-600 md:block" title={p.note}>{p.note}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-500">
            <span className="text-zinc-400">Cómo se calcula (determinista, auditable):</span> cobertura de vectores 30 pts · solidez de identidad 25 ·
            triangulación 25 · frescura 15 · registro oficial 5. Cada afirmación es <span className="text-emerald-400">CORROBORADA</span> cuando ≥2 dominios
            independientes la reportan; con una sola fuente queda <span className="text-amber-400">NO CONFIRMADA</span>. Identidad: {intel.identityLine}
          </p>

          {intel.claims.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[10px] text-zinc-500">
              Sin afirmaciones clasificables: la evidencia verificada no cubre ningún tema de la taxonomía (talento, financiación, producto, riesgo,
              comunidad, mercado, regulación). Para entidades privadas pequeñas esto es lo esperable — el informe no rellena huecos con suposiciones.
            </p>
          ) : (
            <div className="space-y-2">
              {intel.corroborated.length > 0 && (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">✓ Corroboradas — ≥2 dominios independientes ({intel.corroborated.length})</p>
                  <div className="space-y-1.5">
                    {intel.corroborated.map((c) => (
                      <div key={c.topic} className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-zinc-200">{c.icon} {c.finding}</span>
                          <Badge variant="outline" className="border-emerald-800/60 px-1.5 py-0 font-mono text-[8px] text-emerald-400">CORROBORADA ×{c.independentDomains}</Badge>
                          {c.polarity !== "neutral" && (
                            <Badge variant="outline" className={`px-1.5 py-0 font-mono text-[8px] ${c.polarity === "positive" ? "border-emerald-800/60 text-emerald-400" : "border-red-800/60 text-red-400"}`}>
                              {c.polarity === "positive" ? "tono +" : "tono −"}
                            </Badge>
                          )}
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {c.sources.map((s, i) => (
                            <li key={i} className="truncate text-[10px] text-zinc-500">
                              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-zinc-700 hover:text-amber-300">{s.title}</a>
                              {" "}<span className="font-mono text-zinc-600">[{s.host} · {s.vector}{s.date ? ` · ${s.date}` : ""}]</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {intel.unconfirmed.length > 0 && (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber-400/90">◌ No confirmadas — una sola fuente ({intel.unconfirmed.length})</p>
                  <div className="space-y-1">
                    {intel.unconfirmed.map((c) => (
                      <div key={c.topic} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                        <span className="text-[10px] text-zinc-400">{c.icon} {c.finding}</span>
                        <ul className="mt-0.5 space-y-0.5">
                          {c.sources.map((s, i) => (
                            <li key={i} className="truncate text-[10px] text-zinc-600">
                              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-zinc-800 hover:text-amber-300">{s.title}</a>
                              {" "}<span className="font-mono">[{s.host}{s.date ? ` · ${s.date}` : ""}]</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {intel.mixed.length > 0 && (
                <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-2.5 text-[10px] text-amber-300/90">
                  ⚖ Cobertura mixta en: {intel.mixed.map((m) => `${m.label} (señales + y − a la vez)`).join("; ")}. El oráculo no promedia: ambas direcciones quedan documentadas con sus fuentes.
                </p>
              )}
            </div>
          )}

          {intel.gaps.length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Brechas de cobertura (lo que NO se encontró — honesto)</p>
              <ul className="space-y-0.5">
                {intel.gaps.slice(0, 8).map((g, i) => (
                  <li key={i} className="text-[10px] text-zinc-600">— {g}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* 0-B — LÍNEA DE TIEMPO VERIFICABLE (oráculo: cronología con fuente) */}
        {more?.timeline && more.timeline.length > 0 && (
          <Section n="0-B" title="Línea de tiempo verificable de la entidad — cada evento con su fuente" icon={<ScrollText className="h-3.5 w-3.5" />}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Evento verificado</Th>
                    <Th>Fuente</Th>
                  </tr>
                </thead>
                <tbody>
                  {more.timeline.map((t, i) => (
                    <tr key={i}>
                      <Td mono className="whitespace-nowrap text-zinc-400">{t.date.slice(0, 10)}</Td>
                      <Td>
                        {t.label}
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex align-middle text-zinc-600 hover:text-amber-300" aria-label={`Abrir fuente del evento: ${t.label}`}>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </Td>
                      <Td mono className="whitespace-nowrap text-zinc-500">{t.source}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-600">
              Cronología fusionada de infraestructura (RDAP · Wayback · certificados TLS), identidad (GitHub), comunidad (HN · Reddit · Stack Exchange) y prensa — solo eventos fechados y verificables; sin eventos no hay fila.
              {more.followups.length > 0 && ` Segunda ola ejecutada: ${more.followups.length} consulta(s) de seguimiento (${more.followups.reduce((a, f) => a + f.found, 0)} hallazgos nuevos).`}
            </p>
          </Section>
        )}

        {/* 0-C — SCRAPING DEL SITIO VERIFICADO (v13: evidencia primaria, no búsqueda) */}
        {((more?.site_findings?.length ?? 0) > 0 || (more?.site_pages_scanned ?? 0) > 0 || (more?.openalex_org ?? null)) && (
          <Section n="0-C" title="Evidencia primaria — scraping directo del sitio verificado y triangulación científica" icon={<Globe2 className="h-3.5 w-3.5" />}>
            {(more?.site_pages_scanned ?? 0) > 0 && (
              <p className="text-[10px] text-zinc-500">
                El oráculo DESCARGÓ {more?.site_pages_scanned} subpágina(s) del sitio VERIFICADO ({more?.identity?.selected?.host ?? domain ?? "—"}) — about · contacto · equipo · blog — y extrajo evidencia primaria. Regla: sin sitio verificado no hay scraping (cero datos de homónimos).
              </p>
            )}
            {(more?.site_findings?.length ?? 0) > 0 && (
              <ul className="space-y-1">
                {more!.site_findings.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 text-[11px]">
                    <Badge variant="outline" className="border-sky-800/60 font-mono text-[9px] uppercase text-sky-300">{f.kind}</Badge>
                    <span className="text-zinc-300">{f.label}</span>
                    <span className="text-zinc-500">— {f.detail}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-amber-300" aria-label={`Abrir subpágina de ${f.kind}`}>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {(more?.blog_posts?.length ?? 0) > 0 && (
              <p className="text-[10px] text-zinc-500">Feed del blog: {more!.blog_posts.map((b) => `«${b.title}»`).join(" · ")}</p>
            )}
            {(more?.papers_count ?? 0) > 0 && (more?.crossref_papers ?? 0) > 0 && (
              <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-[10px] text-emerald-200">
                ✓ Triangulación científica: {more!.papers_count} paper(s) en OpenAlex + {more!.crossref_papers} en CrossRef (dos bases bibliográficas INDEPENDIENTES) — el mismo criterio de corroboración que aplicamos a dominios.
              </p>
            )}
            {more?.openalex_org && (
              <p className="text-[10px] text-zinc-500">
                Registro ROR en OpenAlex: <a href={more.openalex_org.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{more.openalex_org.name}</a> ({more.openalex_org.country ?? "—"}) — {more.openalex_org.works_count.toLocaleString("es")} trabajos · {more.openalex_org.cited_by_count.toLocaleString("es")} citas acumuladas.
              </p>
            )}
          </Section>
        )}

        {/* 0-bis — veredicto */}
        <Section n="01" title="Veredicto del auditor" icon={<Bot className="h-3.5 w-3.5" />}>
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

        {/* 02 — verificación de identidad (anti-homónimos) */}
        {verification && (
          <Section n="02" title="Verificación de identidad — qué fue descartado y por qué" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 text-center">
                <div className="font-mono text-lg tabular-nums text-zinc-300">{verification.raw}</div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-600">hallazgos brutos</div>
              </div>
              <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-2.5 text-center">
                <div className="font-mono text-lg tabular-nums text-emerald-300">{verification.kept}</div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-600">mencionan a la entidad</div>
              </div>
              <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-2.5 text-center">
                <div className="font-mono text-lg tabular-nums text-red-300">{verification.dropped}</div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-600">descartados (homónimos/ruido)</div>
              </div>
              <div className="rounded-lg border border-sky-900/60 bg-sky-950/20 p-2.5 text-center">
                <div className="font-mono text-lg tabular-nums text-sky-300">{verification.strong}</div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-600">identidad fuerte (nivel 3)</div>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-500">
              Método: cada hallazgo debe demostrar que menciona a la entidad — <span className="text-zinc-400">frase exacta del nombre</span>,
              <span className="text-zinc-400"> dominio declarado{domain ? ` (${domain})` : ""}</span> o <span className="text-zinc-400">todos sus términos significativos</span>.
              Reglas del oráculo: señales NEGATIVAS exigen identidad fuerte (frase exacta o dominio) — nunca se atribuye un fraude, despido o quiebra a la empresa equivocada;
              señales POSITIVAS exigen identidad probable; el VETO FATAL solo con evidencia verificada.
              {verification.kept === 0 && (
                <span className="mt-1 block rounded border border-amber-800/60 bg-amber-950/20 p-2 text-[10px] text-amber-300">
                  Cobertura NULA: ninguna fuente pública menciona a «{name}» — resultado normal en LLCs privadas pequeñas. El informe no inventa datos;
                  usa el dominio, revisa la grafía legal o evalúa manualmente.
                </span>
              )}
            </p>
            {verification.droppedSamples.length > 0 && (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Muestra del descarte (prueba del filtro)</p>
                <ul className="space-y-1">
                  {verification.droppedSamples.slice(0, 5).map((s, i) => (
                    <li key={i} className="rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1 text-[10px] text-zinc-500">
                      <span className="text-red-400/80">✕</span> “{s.title}” — <span className="font-mono text-zinc-600">{s.host}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Sonda multi-TLD — existencia ≠ propiedad */}
            {more && (more.domain_candidates.length > 0 || more.official_site || more.github_org || (more.github_candidates?.length ?? 0) > 0 || more.x_handles.length > 0) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Sonda DNS multi-TLD — existencia de dominio ≠ propiedad</p>
                <p className="mb-1.5 text-[10px] leading-relaxed text-zinc-500">
                  Cada chip muestra si el dominio <span className="text-zinc-400">resuelve en DNS</span> (que ALGUIEN lo registró) y
                  qué hay realmente publicado ahí. Solo se marca <span className="text-emerald-400">VERIFICADO</span> cuando el
                  contenido real de la web menciona a la entidad o hay verificación circular — un «✓ DNS» jamás prueba que el
                  dominio sea de la empresa (los homónimos existen: misma marca, otro país).
                </p>
                {more.domain_candidates.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {more.domain_candidates.slice(0, 24).map((c) => {
                      const style =
                        c.status === "verificado"
                          ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-300"
                          : c.status === "homónimo"
                            ? "border-red-800/70 bg-red-950/30 text-red-300"
                            : c.status === "sin-relación"
                              ? "border-zinc-700 bg-zinc-950/60 text-zinc-400"
                              : c.status === "caído" || c.status === "sin-probar"
                                ? "border-amber-800/60 bg-amber-950/20 text-amber-300/90"
                                : "border-zinc-800 bg-zinc-950/60 text-zinc-600";
                      const chip =
                        c.status === "verificado" ? "✓ VERIFICADA" : c.status === "homónimo" ? "⚠ HOMÓNIMO" : c.status === "sin-relación" ? "✕ sin relación" : c.status === "caído" ? "✕ caído" : c.status === "libre" ? "– libre" : "? sin probar";
                      return (
                        <span key={c.domain} className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${style}`} title={`${c.evidence} (fuente: ${c.source})`}>
                          {c.domain} {chip}
                        </span>
                      );
                    })}
                  </div>
                )}
                {more.domain_candidates.filter((c) => c.status === "homónimo").length > 0 && (
                  <ul className="mb-1.5 space-y-0.5">
                    {more.domain_candidates.filter((c) => c.status === "homónimo").slice(0, 4).map((c) => (
                      <li key={c.domain} className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[10px] text-red-300/90">
                        ⚠ <span className="font-mono">{c.domain}</span> pertenece a OTRA empresa con nombre similar — NO se atribuye a «{name}». {c.evidence}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="space-y-0.5 text-[10px] text-zinc-500">
                  {more.official_site && (
                    <li>
                      <span className="text-emerald-400/90">sitio oficial:</span>{" "}
                      <a href={`https://${more.official_site}`} target="_blank" rel="noreferrer" className="text-zinc-300 underline decoration-zinc-700 hover:text-amber-300">
                        {more.official_site}
                      </a>{" "}
                      <span className="text-zinc-600">(verificado por contenido real de la homepage — no por parecido de dominio)</span>
                    </li>
                  )}
                  {(more.github_candidates?.length ?? 0) > 0
                    ? more.github_candidates.slice(0, 3).map((c) => (
                        <li key={c.login}>
                          <span className={c.status === "sin-verificar" ? "text-amber-400/90" : "text-emerald-400/90"}>github:</span>{" "}
                          <a href={c.html_url} target="_blank" rel="noreferrer" className="text-zinc-300 underline decoration-zinc-700 hover:text-amber-300">
                            @{c.login}
                          </a>{" "}
                          <span className="text-zinc-600">
                            ({c.type}
                            {c.created_at ? `, desde ${c.created_at.slice(0, 4)}` : ""}
                            {c.public_repos ? `, ${c.public_repos} repos` : ""}) —{" "}
                            {c.status === "circular" ? (
                              <span className="text-emerald-400/90">VERIFICADA por verificación circular</span>
                            ) : c.status === "declarada" ? (
                              <span className="text-emerald-400/90">declarada por el analista</span>
                            ) : c.status === "contenido" ? (
                              <span className="text-sky-400/90">nombre legal en el perfil (sin circular)</span>
                            ) : (
                              <span className="text-amber-400/90">SIN VERIFICAR — posible homónimo, no se atribuye</span>
                            )}
                          </span>
                        </li>
                      ))
                    : more.github_org && (
                        <li>
                          <span className="text-emerald-400/90">github:</span>{" "}
                          <a href={`https://github.com/${more.github_org.login}`} target="_blank" rel="noreferrer" className="text-zinc-300 underline decoration-zinc-700 hover:text-amber-300">
                            @{more.github_org.login}
                          </a>{" "}
                          <span className="text-zinc-600">
                            ({more.github_org.type}, desde {more.github_org.created_at.slice(0, 4)}, {more.github_org.public_repos} repos)
                          </span>
                        </li>
                      )}
                  {more.x_handles.length > 0 && (
                    <li>
                      <span className="text-emerald-400/90">x/twitter:</span>{" "}
                      <span className="text-zinc-300">{more.x_handles.map((h) => `@${h}`).join(", ")}</span>{" "}
                      <span className="text-zinc-600">(indexado públicamente)</span>
                    </li>
                  )}
                  {more.reddit_mentions > 0 && (
                    <li>
                      <span className="text-emerald-400/90">reddit:</span> <span className="text-zinc-300">{more.reddit_mentions} hilo(s) público(s)</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* 0-ter — OG-SCOUT: identidad resuelta (nuestro investigador) */}
        {more?.identity && more.identity.candidates.length > 0 && (
          <Section n="03" title="OG-Scout — identidad de la entidad resuelta (arquitectura DeerFlow: planificar → investigar → verificar → reportar)" icon={<Radar className="h-3.5 w-3.5" />}>
            <p className="text-[10px] leading-relaxed text-zinc-400">
              <span className="font-mono text-amber-400/90">{more.identity.summary}</span>
            </p>
            <div className="space-y-2">
              {more.identity.candidates.map((c) => (
                <div key={c.host} className={`rounded-lg border p-2.5 ${c === more.identity?.selected ? "border-emerald-800/60 bg-emerald-950/20" : "border-zinc-800 bg-zinc-950/40"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-zinc-200 underline decoration-zinc-700 hover:text-amber-300">
                      {c.host}
                    </a>
                    <span className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{c.score} pts</span>
                    {c === more.identity?.selected && <span className="rounded border border-emerald-700/60 bg-emerald-950/40 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">SELECCIONADO</span>}
                    {c.dnsAlive && <span className="font-mono text-[9px] text-zinc-600">DNS ✓</span>}
                    <span className="font-mono text-[9px] text-zinc-600">{c.homepageFetched ? "homepage descargada ✓" : "homepage no accesible"}</span>
                  </div>
                  {c.homepageTitle && <p className="mt-1 text-[10px] text-zinc-500">título real de la página: «{c.homepageTitle}»</p>}
                  <ul className="mt-1 space-y-0.5">
                    {c.confirmations.map((x, i) => (
                      <li key={i} className={`text-[10px] ${x.startsWith("HOMÓNIMO") ? "text-red-400/90" : "text-zinc-500"}`}>
                        {x.startsWith("HOMÓNIMO") ? "⚠ " : "✓ "}
                        {x}
                      </li>
                    ))}
                    {!c.homepageFetched && <li className="text-[10px] text-zinc-600">✗ sin verificación de contenido — no se puede atribuir</li>}
                  </ul>
                </div>
              ))}
            </div>
            {more.identity.ambiguous && (
              <p className="rounded border border-amber-800/60 bg-amber-950/20 p-2 text-[10px] text-amber-300">
                Identidad AMBIGUA: varios candidatos con confirmación fuerte. El informe NO atribuye nada automáticamente — confirma la entidad correcta manualmente antes de presentar este dossier.
              </p>
            )}
            {more.identity.githubLogin && (
              <p className="text-[10px] text-zinc-500">
                <span className="text-emerald-400/90">GitHub confirmado:</span>{" "}
                <a href={`https://github.com/${more.identity.githubLogin}`} target="_blank" rel="noreferrer" className="text-zinc-300 underline decoration-zinc-700 hover:text-amber-300">
                  @{more.identity.githubLogin}
                </a>{" "}
                — sus repositorios se listan como proyectos reales en la sección GitHub.
              </p>
            )}
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Método del scout: F1 descubrimiento (búsqueda web real + GitHub API) → F2 verificación (descarga la homepage real de cada candidato y comprueba si el nombre legal aparece en su contenido; verificación circular sitio↔GitHub) → F3 selección solo con prueba de contenido. Un dominio que «parece» el nombre NO se atribuye: los homónimos quedan documentados como tales.
            </p>
          </Section>
        )}

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
            <li>Pipeline: Layer 1 harvesters ({VECTOR_META.length} vectores: motores reales DDG/Bing/Reddit/X/GitHub + talento/apps/ciencia/web/mercados/regs + scraper del sitio verificado) + scrapers oficiales ({GOV_META.length} endpoints SEC EDGAR/USAspending + ~20 APIs de apoyo keyless) + sonda DNS multi-TLD → Layer 2 auditor DeerFlow ({fallbackUsed ? "heurístico" : "LLM institucional con esquema estricto"}) → Layer 3 motor bayesiano v{ENGINE_VERSION}.</li>
            <li>Regla del oráculo: ninguna señal entra al logit sin URL verificable; el veto fatal (fraude/quiebra) fuerza DROP como el PolicyEngine original.</li>
            <li>SEC EDGAR y USAspending.gov son fuentes públicas y oficiales; el resto proviene de APIs abiertas keyless y búsqueda en vivo en esta misión.</li>
            <li>Misión {missionId} — {totalQueries} consultas registradas, {totalSources} hallazgos trazables. Todo el informe es exportable (Markdown/JSON) y auditable enlace a enlace.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
