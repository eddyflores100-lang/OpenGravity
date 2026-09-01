/**
 * verify.ts — Verificación de entidad (capa anti-alucinación).
 *
 * Problema que resuelve: los buscadores y APIs devuelven homónimos y ruido
 * ("Nikola" → Nikola Tesla; "Alice Labs LLC" → artículos genéricos de otras
 * "Alice"). Si esa evidencia entra al auditor, atribuye a la empresa hechos
 * que no existen. Regla del oráculo: NINGÚN hallazgo entra al análisis sin
 * demostrar que habla de LA entidad investigada.
 *
 * Niveles de relevancia:
 *   3 = identidad fuerte  → dominio declarado presente, o nombre completo como
 *                           frase exacta ("Alice Labs", "alicelabs.com")
 *   2 = identidad probable → todos los tokens significativos del nombre
 *   1 = mención débil      → mayoría de tokens (solo nombres multi-palabra)
 *   0 = sin asociación     → DESCARTADO (homónimo o ruido)
 *
 * El auditor aplica umbrales por severidad: señales negativas/fatales exigen
 * nivel 3 (la identidad completa); las positivas exigen nivel 2.
 */

export interface VerificationStats {
  /** hallazgos antes del filtro */
  raw: number;
  /** conservados (relevancia >= umbral) */
  kept: number;
  /** descartados por no corresponder a la entidad */
  dropped: number;
  /** ejemplos de descartes (para el informe: prueba del filtro) */
  droppedSamples: { host: string; title: string; url: string }[];
  /** distribución por nivel de los conservados */
  strong: number;
}

export const EMPTY_VERIFICATION: VerificationStats = {
  raw: 0,
  kept: 0,
  dropped: 0,
  droppedSamples: [],
  strong: 0,
};

/* ── Normalización ───────────────────────────────────────────────────────── */

/** Palabras de forma jurídica/genéricas: nunca identifican a la entidad. */
const LEGAL_WORDS = new Set([
  "llc", "inc", "corp", "corporation", "ltd", "limited", "co", "company",
  "gmbh", "sa", "sas", "srl", "plc", "nv", "ag", "kk", "oy", "ab", "aps",
  "pty", "pte", "llp", "lp", "pllc", "pc", "dba", "holdings", "holding",
  "group", "the", "and", "de", "del", "la", "el", "y", "e",
]);

const deaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Minúsculas, sin acentos, puntuación → espacio, sin forma jurídica. */
export function normalizeEntity(name: string): string {
  return deaccent(name.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && w.length >= 2 && !LEGAL_WORDS.has(w))
    .join(" ")
    .trim();
}

/** Tokens significativos del nombre (>=2 chars, ya sin forma jurídica). */
export function entityTokens(name: string): string[] {
  const n = normalizeEntity(name);
  return n ? n.split(" ").filter((w) => w.length >= 2) : [];
}

/** Forma compacta alfanumérica del nombre normalizado ("Alice Labs" → "alicelabs"). */
export function entityCompact(name: string): string {
  return normalizeEntity(name).replace(/[^a-z0-9]/g, "");
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Contexto de empresa: si acompaña al nombre (una sola palabra), sube la
 * confianza — "Nikola Corporation", "Nikola founder", "ticker NASDAQ". */
const COMPANY_CONTEXT =
  /\b(company|corporation|inc|llc|ltd|limited|gmbh|corp|co|startup|manufacturer|manufactures|motor|motors|automaker|vehicles|truck|trucks|technology|tech|software|platform|fintech|bank|holding|holdings|group|founder|co-?founder|ceo|chief|headquarters|nasdaq|nyse|ipo|shares|stock|revenue|filings?|bankrupt\w*)\b/i;

/** Todos los tokens presentes en orden, con span máximo entre el primero y el último. */
function orderedSpan(hay: string, tokens: string[], maxSpan = 40): boolean {
  let pos = 0;
  let start = -1;
  for (const t of tokens) {
    const idx = hay.indexOf(t, pos);
    if (idx === -1) return false;
    if (start === -1) start = idx;
    pos = idx + t.length;
  }
  return pos - start <= maxSpan;
}

/* ── Relevancia de entidad ───────────────────────────────────────────────── */

/**
 * ¿De qué nivel es la asociación entre `text` y la entidad `name`?
 * `domain` (si el usuario lo declaró) es el disambiguador de homónimos:
 * cualquier texto que mencione el dominio es identidad fuerte por definición.
 *
 * Nombres multi-palabra: la frase exacta es identidad fuerte; los tokens en
 * orden y cercanos son identidad probable; los tokens dispersos, mención débil.
 * Nombres de UNA palabra: la palabra sola es identidad probable; solo alcanza
 * identidad fuerte si aparece junto a contexto de empresa ("Nikola Corporation",
 * "Nikola founder") — así "Nikola Tesla, inventor" queda fuera de nivel fuerte.
 */
export function entityRelevance(name: string, text: string, domain?: string | null): 0 | 1 | 2 | 3 {
  const hay = deaccent(text.toLowerCase());
  const tokens = entityTokens(name);
  const norm = normalizeEntity(name);
  const compact = entityCompact(name);

  // Nivel 3a: dominio declarado presente en el texto
  if (domain && domain.length >= 4 && hay.includes(domain.toLowerCase())) return 3;

  if (tokens.length >= 2) {
    // Nivel 3b (multi): frase exacta — tokens en orden con separadores cortos
    if (norm) {
      const words = norm.split(" ").map(escRe);
      const phrase = new RegExp(`\\b${words.join("[^a-z0-9]{1,12}")}\\b`, "i");
      if (phrase.test(hay)) return 3;
    }
    // Nivel 3c (multi): forma compacta >= 8 como palabra ("alicelabs")
    if (compact.length >= 8 && new RegExp(`\\b${escRe(compact)}\\b`, "i").test(hay)) return 3;

    // Nivel 2: todos los tokens en orden y cercanos
    if (tokens.every((t) => hay.includes(t)) && orderedSpan(hay, tokens)) return 2;
    // Nivel 1: todos los tokens presentes aunque dispersos
    if (tokens.every((t) => new RegExp(`\\b${escRe(t)}\\b`, "i").test(hay))) return 1;
    return 0;
  }

  // Un solo token significativo
  const token = tokens[0] ?? "";
  if (!token) return 0;
  if (new RegExp(`\\b${escRe(token)}\\b`, "i").test(hay) || (compact.length >= 5 && new RegExp(`\\b${escRe(compact)}\\b`, "i").test(hay))) {
    // Identidad fuerte solo con contexto de empresa cerca de la mención
    for (const m of hay.matchAll(new RegExp(`\\b${escRe(token)}\\b`, "gi"))) {
      const from = Math.max(0, m.index - 40);
      const to = Math.min(hay.length, m.index + token.length + 40);
      if (COMPANY_CONTEXT.test(hay.slice(from, to))) return 3;
    }
    return 2;
  }
  return 0;
}

/** Etiqueta legible del nivel (para el informe). */
export function relevanceLabel(level: 0 | 1 | 2 | 3): string {
  switch (level) {
    case 3: return "identidad fuerte (frase exacta o dominio)";
    case 2: return "identidad probable (todos los términos)";
    case 1: return "mención débil (términos parciales)";
    default: return "sin asociación con la entidad";
  }
}

/* ── Filtrado de evidencia ───────────────────────────────────────────────── */

interface FilterableItem {
  title: string;
  url: string;
  host: string;
  snippet: string;
}

/**
 * Filtra una lista de evidencia: conserva solo lo que menciona a la entidad
 * (relevancia >= minLevel) y devuelve estadísticas con muestras del descarte.
 */
export function filterRelevant<T extends FilterableItem>(
  name: string,
  items: T[],
  minLevel: 1 | 2 | 3 = 1,
  domain?: string | null,
  maxSamples = 6
): { items: T[]; stats: VerificationStats; levels: Map<T, 0 | 1 | 2 | 3> } {
  const levels = new Map<T, 0 | 1 | 2 | 3>();
  const kept: T[] = [];
  const droppedSamples: { host: string; title: string; url: string }[] = [];
  let strong = 0;

  for (const it of items) {
    const level = entityRelevance(name, `${it.title} ${it.snippet}`, domain);
    levels.set(it, level);
    if (level >= minLevel) {
      kept.push(it);
      if (level === 3) strong++;
    } else if (droppedSamples.length < maxSamples) {
      droppedSamples.push({ host: it.host, title: it.title, url: it.url });
    }
  }

  return {
    items: kept,
    levels,
    stats: {
      raw: items.length,
      kept: kept.length,
      dropped: items.length - kept.length,
      droppedSamples,
      strong,
    },
  };
}

/** Fusiona varias VerificationStats en una (para la misión completa). */
export function mergeStats(parts: VerificationStats[]): VerificationStats {
  const out = { ...EMPTY_VERIFICATION, droppedSamples: [] as VerificationStats["droppedSamples"] };
  for (const p of parts) {
    out.raw += p.raw;
    out.kept += p.kept;
    out.dropped += p.dropped;
    out.strong += p.strong;
    for (const s of p.droppedSamples) {
      if (out.droppedSamples.length < 6) out.droppedSamples.push(s);
    }
  }
  return out;
}

/* ── Guardas temáticas (Wikipedia/Wikidata/DDG devuelven personas, lugares…) ── */

/** Frases con las que Wikipedia define EMPRESAS en la primera oración. */
const COMPANY_DEF =
  /\b(company|corporation|manufacturer|startup|firm|business|platform|provider|brand|retailer|marketplace|agency|studio|bank|airline|publisher|developer|publisher|enterprise|vendor|operator|group)\b/i;
/** Frases con las que Wikipedia define PERSONAS u otros sujetos no-empresa. */
const NON_COMPANY_DEF =
  /\b(inventor|physicist|actor|actress|singer|musician|footballer|player|politician|writer|author|poet|painter|artist|scientist|professor|philosopher|composer|athlete|engineer|architect|economist|mathematician|engineer|scientist|novel|film|album|song|series|village|municipality|city|town|river|mountain|island|language)\b/i;

/**
 * ¿La primera oración del extracto define una empresa?
 * Elimina el clásico falso positivo "Nikola" → artículo de Nikola Tesla
 * ("was a Serbian-American inventor…") y artículos de lugares/obras.
 */
export function companySentence(text: string): boolean {
  const first = deaccent(text).split(/(?<=[.!?])\s+/)[0] ?? "";
  if (!first) return false;
  return COMPANY_DEF.test(first) && !NON_COMPANY_DEF.test(first);
}
