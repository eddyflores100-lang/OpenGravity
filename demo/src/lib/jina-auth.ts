/**
 * jina-auth.ts — clave opcional del usuario para r.jina.ai (Jina Reader).
 *
 * El lector CORS r.jina.ai es la vía keyless para páginas sin CORS (buscadores,
 * Yahoo Finance, RDAP, EDGAR…). Su capa anónima tiene límite por IP (y devuelve
 * 401 al agotarse). jina.ai regala 1M de tokens/mes con una clave gratuita:
 * si el usuario la pega, TODOS los lectores de la misión la usan — igual que
 * el opt-in de Tavily. La clave vive solo en el localStorage del navegador.
 */

let jinaKey = "";

export function setJinaKey(key: string): void {
  jinaKey = (key ?? "").trim();
}

export function hasJinaKey(): boolean {
  return jinaKey.length > 0;
}

/** Headers extra para cualquier fetch a r.jina.ai. */
export function jinaHeaders(): Record<string, string> {
  return jinaKey ? { Authorization: `Bearer ${jinaKey}` } : {};
}
