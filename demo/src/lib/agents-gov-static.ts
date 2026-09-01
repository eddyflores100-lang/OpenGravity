/**
 * agents-gov-static.ts — Scrapers regulatorios 100% cliente para despliegues
 * estáticos (GitHub Pages no tiene backend).
 *
 * Reconstrucción de sec_extractor.mjs + api_harvester.mjs del repo:
 *   1. SEC EDGAR full-text search — menciones del nombre en TODOS los filings
 *   2. SEC EDGAR submissions     — tarjeta de entidad + historial de filings
 *   3. SEC EDGAR XBRL            — finanzas reales (Ingresos / Resultado neto)
 *   4. USAspending.gov           — contratos (A-D) y subvenciones (02-05) por
 *      POST directo: verificado empíricamente que la API emite
 *      Access-Control-Allow-Origin: *, así que el navegador puede llamarla
 *      sin backend (curl-verified 200 + ACAO).
 *
 * EDGAR no permite CORS de navegador, así que las peticiones GET pasan por
 * r.jina.ai (lector público que sí refleja Origin), con memo-cache y semáforo
 * de concurrencia para respetar su rate-limit anónimo. Si el lector falla o
 * aplica rate-limit, la fuente se registra como degradada y el informe
 * continúa con el resto — igual que el fallback del orquestador original.
 */

import type {
  EdgarCompany,
  EdgarHit,
  GovAward,
  GovBundle,
  GovSourceLog,
  XbrlFinancial,
} from "@/lib/research";

const JINA = "https://r.jina.ai/";
import { jinaHeaders } from "@/lib/jina-auth";

/* Memo-cache + semáforo: r.jina.ai limita ~20 rpm anónimas por IP; la misión
 * lanza hasta ~10 peticiones jina (EDGAR 1-5 + Docker/Yahoo/RDAP), así que se
 * encolan con concurrencia 3 y se reutilizan respuestas idénticas. */
const jinaCache = new Map<string, unknown>();
let jinaActive = 0;
const jinaQueue: (() => void)[] = [];
async function jinaSlot(): Promise<void> {
  if (jinaActive < 3) {
    jinaActive++;
    return;
  }
  await new Promise<void>((r) => jinaQueue.push(r));
  jinaActive++;
}
function jinaRelease() {
  jinaActive--;
  const next = jinaQueue.shift();
  if (next) next();
}

/** GET a una API JSON sin CORS a través del lector público (memoizado). */
export async function jinaJson<T>(url: string, ms = 25000): Promise<T> {
  if (jinaCache.has(url)) return jinaCache.get(url) as T;
  await jinaSlot();
  try {
    const res = await fetch(JINA + url, { signal: AbortSignal.timeout(ms), cache: "no-store", headers: jinaHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const start = text.indexOf('{"');
    if (start === -1) throw new Error("respuesta sin JSON");
    // El JSON puede venir con contenido jina delante; recorta desde el primer objeto.
    const sliced = text.slice(start);
    const parsed = JSON.parse(sliced) as T;
    jinaCache.set(url, parsed);
    return parsed;
  } finally {
    jinaRelease();
  }
}

const today = new Date().toISOString().slice(0, 10);

/* ── 1. EDGAR FTS ────────────────────────────────────────────────────────── */
interface FtsSource {
  ciks: string[];
  display_names: string[];
  form: string;
  file_date: string;
  file_type: string;
  file_description: string;
  biz_locations: string[];
  adsh: string;
}
interface FtsJson { hits: { total: { value: number }; hits: { _source: FtsSource; _id: string }[] } }

/* ── 2. Submissions ──────────────────────────────────────────────────────── */
interface SubmissionsJson {
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  stateOfIncorporation: string;
  phone: string;
  addresses: { business?: { state?: string } };
  filings: { recent: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } };
}

/* ── 3. XBRL ─────────────────────────────────────────────────────────────── */
interface ConceptJson { units: Record<string, { val: number; fy?: number; fp?: string; form?: string; end: string }[]> }

export async function runGovStatic(
  name: string,
  onStep?: (msg: string) => void
): Promise<GovBundle> {
  const LOG: GovSourceLog[] = [];
  const log = (key: string, label: string, endpoint: string, ok: boolean, count: number, ms: number, error?: string) =>
    LOG.push({ key, label, endpoint, ok, count, ms, error });

  /* 1 — FTS */
  onStep?.("SEC EDGAR: búsqueda global de filings…");
  let hits: EdgarHit[] = [];
  let ftsTotal = 0;
  const cikRank = new Map<string, number>();
  {
    const t0 = Date.now();
    try {
      const q = encodeURIComponent(`"${name}"`);
      const data = await jinaJson<FtsJson>(`https://efts.sec.gov/LATEST/search-index?q=${q}&dateRange=custom&startdt=2001-01-01&enddt=${today}`);
      ftsTotal = data.hits.total.value;
      for (const h of data.hits.hits) {
        const s = h._source;
        const cik = (s.ciks[0] ?? "").replace(/^0+/, "") || (s.ciks[0] ?? "");
        if (cik) cikRank.set(cik, (cikRank.get(cik) ?? 0) + 1);
        const doc = (h._id ?? "").split(":")[1] ?? "";
        hits.push({
          cik,
          form: s.form,
          file_date: s.file_date,
          display_name: s.display_names[0] ?? "",
          biz_location: s.biz_locations?.[0] ?? "",
          file_type: s.file_type,
          file_description: (s.file_description ?? "").trim(),
          url:
            cik && s.adsh && doc
              ? `https://www.sec.gov/Archives/edgar/data/${cik}/${s.adsh.replace(/-/g, "")}/${doc}`
              : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}`,
        });
      }
      log("edgar_fts", "SEC EDGAR — búsqueda global de filings", "efts.sec.gov vía r.jina.ai", true, hits.length, Date.now() - t0);
    } catch (e) {
      log("edgar_fts", "SEC EDGAR — búsqueda global de filings", "efts.sec.gov vía r.jina.ai", false, 0, Date.now() - t0, e instanceof Error ? e.message : "error");
    }
  }

  /* 2 — tarjeta de entidad del CIK con más menciones */
  onStep?.("SEC EDGAR: entidad e historial de filings…");
  let companies: EdgarCompany[] = [];
  const topCiks = [...cikRank.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1).map(([c]) => c);
  if (topCiks.length) {
    const t0 = Date.now();
    try {
      const cik = topCiks[0];
      const d = await jinaJson<SubmissionsJson>(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`);
      const f = d.filings.recent;
      companies = [{
        cik,
        name: d.name,
        tickers: d.tickers ?? [],
        exchange: d.exchanges?.[0] ?? "",
        sic: d.sic ?? "",
        sic_description: d.sicDescription ?? "",
        state: d.addresses?.business?.state ?? "",
        state_of_incorporation: d.stateOfIncorporation ?? "",
        phone: d.phone ?? "",
        filings: f.form.slice(0, 60).map((form, i) => ({
          form,
          date: f.filingDate[i] ?? "",
          url: `https://www.sec.gov/Archives/edgar/data/${cik}/${(f.accessionNumber[i] ?? "").replace(/-/g, "")}/${f.primaryDocument[i] ?? ""}`,
        })),
        filing_count: f.form.length,
      }];
      log("edgar_filings", "SEC EDGAR — entidad e historial de filings", "data.sec.gov/submissions vía r.jina.ai", true, Math.min(companies[0].filings.length, 20), Date.now() - t0);
    } catch (e) {
      log("edgar_filings", "SEC EDGAR — entidad e historial de filings", "data.sec.gov/submissions vía r.jina.ai", false, 0, Date.now() - t0, e instanceof Error ? e.message : "error");
    }
  } else {
    log("edgar_filings", "SEC EDGAR — entidad e historial de filings", "data.sec.gov/submissions vía r.jina.ai", true, 0, 0, "sin CIK en los hits → empresa privada sin filings públicos (normal en startups tempranas)");
  }

  /* 3 — XBRL del CIK principal */
  onStep?.("SEC EDGAR XBRL: finanzas reales de los filings…");
  let xbrl: XbrlFinancial[] = [];
  if (topCiks.length) {
    const t0 = Date.now();
    const cik10 = topCiks[0].padStart(10, "0");
    const attempts: [string, string][] = [
      ["Revenues", "Ingresos (Revenues)"],
      ["RevenueFromContractWithCustomerExcludingAssessedTax", "Ingresos (Revenue from contracts)"],
      ["NetIncomeLoss", "Resultado neto (Net income)"],
    ];
    const results = await Promise.allSettled(
      attempts.map(async ([tag, label]) => {
        const d = await jinaJson<ConceptJson>(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik10}/us-gaap/${tag}.json`);
        const annual = (d.units.USD ?? []).filter((u) => u.fp === "FY" && u.form && /^10-K/.test(u.form));
        const seen = new Set<string>();
        const out: XbrlFinancial[] = [];
        for (const u of annual.reverse()) {
          if (seen.has(u.end)) continue;
          seen.add(u.end);
          out.push({ label, tag, value: u.val, fy: u.fy ?? 0, fp: u.fp ?? "FY", form: u.form ?? "10-K", end: u.end });
          if (out.length >= 2) break;
        }
        return out;
      })
    );
    for (const r of results) if (r.status === "fulfilled") xbrl.push(...r.value);
    const okCount = results.filter((r) => r.status === "fulfilled" && r.value.length).length;
    log("edgar_xbrl", "SEC EDGAR XBRL — finanzas reales extraídas de los filings", "data.sec.gov/api/xbrl vía r.jina.ai", okCount > 0, xbrl.length, Date.now() - t0, okCount === 0 ? "sin XBRL USD para este CIK" : undefined);
  } else {
    log("edgar_xbrl", "SEC EDGAR XBRL — finanzas reales extraídas de los filings", "data.sec.gov/api/xbrl vía r.jina.ai", true, 0, 0, "sin CIK → sin XBRL");
  }

  /* 4 — USAspending: POST directo (CORS abierto verificado con curl) */
  onStep?.("USAspending.gov: contratos y subvenciones federales…");
  let awards: GovAward[] = [];
  let awardsTotal = 0;
  let awardsRecipients: string[] = [];
  {
    const t0 = Date.now();
    try {
      const BASE = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
      const year = new Date().getFullYear();
      const tp = { start_date: "2008-01-01", end_date: `${year}-12-31` };
      const FIELDS = ["Recipient Name", "Award ID", "Award Amount", "Awarding Agency", "Start Date", "Description", "Award Type"];
      const call = async (award_type_codes: string[], type: string): Promise<GovAward[]> => {
        const body = {
          filters: { keywords: [name], award_type_codes, time_period: [tp] },
          fields: FIELDS,
          limit: 5,
          page: 1,
          sort: "Award Amount",
          order: "desc",
          subawards: false,
        };
        const res = await fetch(BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { results?: Record<string, unknown>[] };
        return (json.results ?? []).map((r) => {
          const amount = Number(r["Award Amount"] ?? 0);
          const id = String(r["Award ID"] ?? "");
          return {
            id: id || "—",
            recipient: String(r["Recipient Name"] ?? ""),
            amount,
            start_date: String(r["Start Date"] ?? "").slice(0, 10),
            agency: String(r["Awarding Agency"] ?? ""),
            description: String(r["Description"] ?? "").slice(0, 220),
            type,
            url: `https://www.usaspending.gov/award/${encodeURIComponent(id)}`,
          } as GovAward;
        });
      };
      const [contracts, grants] = await Promise.all([
        call(["A", "B", "C", "D"], "contrato").catch(() => [] as GovAward[]),
        call(["02", "03", "04", "05"], "subvención").catch(() => [] as GovAward[]),
      ]);
      const found = [...contracts, ...grants];
      awards = found;
      awardsTotal = found.reduce((a, x) => a + (Number.isFinite(x.amount) ? x.amount : 0), 0);
      awardsRecipients = [...new Set(found.map((x) => x.recipient).filter(Boolean))].slice(0, 5);
      log(
        "usaspending",
        "USAspending.gov — contratos y subvenciones federales",
        "api.usaspending.gov …/spending_by_award (POST directo, CORS verificado)",
        true,
        found.length,
        Date.now() - t0,
        found.length === 0 ? "sin premios federales para este nombre (normal en startups privadas)" : undefined
      );
    } catch (e) {
      log(
        "usaspending",
        "USAspending.gov — contratos y subvenciones federales",
        "api.usaspending.gov …/spending_by_award (POST directo)",
        false,
        0,
        Date.now() - t0,
        e instanceof Error ? e.message : "error"
      );
    }
  }

  return {
    ok: hits.length > 0 || companies.length > 0 || xbrl.length > 0 || awards.length > 0,
    name,
    edgar_hits: hits.slice(0, 40),
    edgar_companies: companies,
    xbrl,
    awards: awards.slice(0, 10),
    awards_total: awardsTotal,
    awards_recipients: awardsRecipients,
    log: LOG,
    total_sources: hits.length + companies.reduce((a, c) => a + c.filings.length, 0) + xbrl.length + awards.length,
  };
}

/* ── Señales estructurales .gov para el auditor heurístico ──────────────── */

import type { GovPayload, SynthesisSignal } from "@/lib/research";

/** ¿Dos hallazgos hablan del mismo hecho? (número ≥3 dígitos compartido o sustantivo clave). */
export function findingsOverlap(a: string, b: string): boolean {
  const numsA = a.match(/\d{1,3}(?:[.,]\d{3})+|\d+/g) ?? [];
  const numsB = b.match(/\d{1,3}(?:[.,]\d{3})+|\d+/g) ?? [];
  const chunksA = numsA.flatMap((n) => n.split(/[.,]/)).filter((c) => c.length >= 3 && c !== "000");
  const chunksB = new Set(numsB.flatMap((n) => n.split(/[.,]/)).filter((c) => c.length >= 3 && c !== "000"));
  if (chunksA.some((c) => chunksB.has(c))) return true;
  const KEYS = [/p[eé]rdida/i, /contrato/i, /subvenci/i, /ingreso/i, /revenue/i, /quiebra|bancarrota/i];
  return KEYS.some((k) => k.test(a) && k.test(b));
}

/** Fusibles objetivos extraídos de SEC XBRL (mismo criterio que el auditor LLM del Oracle). */
export function govStructuralSignalsStatic(gov: GovPayload | null | undefined): SynthesisSignal[] {
  if (!gov) return [];
  const out: SynthesisSignal[] = [];
  const revenue = gov.financials.find((f) => f.label.includes("Ingresos"));
  const net = gov.financials.find((f) => f.label.includes("Resultado neto"));
  if (revenue && revenue.value > 0) {
    out.push({
      finding: `Ingresos reales reportados a la SEC: ${revenue.value.toLocaleString("en-US")} USD (periodo ${revenue.end}, ${revenue.form})`,
      impact_magnitude: revenue.value >= 10_000_000 ? 1.8 : 0.8,
      polarity: "positive",
      source_urls: [],
    });
  }
  if (net && net.value < -10_000_000) {
    out.push({
      finding: `Pérdida neta real reportada a la SEC: ${net.value.toLocaleString("en-US")} USD (periodo ${net.end}, ${net.form}) — burn estructural severo`,
      impact_magnitude: net.value <= -500_000_000 ? -2.6 : -1.6,
      polarity: "negative",
      source_urls: [],
    });
  }
  const formD = gov.edgar_mentions.filter((m) => /^D\b|^FORM D/i.test(m.form)).length;
  if (formD > 0) {
    out.push({
      finding: `Registro Form D en SEC EDGAR: venta privada de valores (ronda de inversión) documentada (${formD} presentación/es)`,
      impact_magnitude: 1.4,
      polarity: "positive",
      source_urls: gov.edgar_mentions.filter((m) => /^D\b|^FORM D/i.test(m.form)).slice(0, 1).map((m) => m.url),
    });
  }
  return out;
}
