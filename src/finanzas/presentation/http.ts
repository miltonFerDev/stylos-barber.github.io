/**
 * Serializa el body a JSON tolerando bigint (los reportes usan bigint para
 * centavos exactos; JSON.stringify no lo soporta y los convertimos a string).
 */
export function json(status: number, body: unknown): Response {
  return new Response(
    JSON.stringify(body, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    { status, headers: { 'content-type': 'application/json' } }
  );
}
