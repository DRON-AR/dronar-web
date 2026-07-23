import type { FastifyRequest } from "fastify";

/**
 * Deriva la clave de rate limiting: user_id si hay un Bearer token con forma
 * de JWT, o IP si no. Cubre el requisito "rate limiting por usuario
 * autenticado y por IP anónima".
 *
 * IMPORTANTE — esto es SOLO para elegir el balde de rate limit, no para
 * autorizar nada: el hook de rate limit (@fastify/rate-limit) corre en
 * `onRequest`, ANTES que el preHandler `authenticate` que sí verifica la
 * firma del token contra Supabase Auth. Por eso aquí se decodifica el
 * payload del JWT SIN verificar firma — un token falsificado en el peor
 * caso cae en un balde de rate-limit distinto (impreciso, no inseguro);
 * la verificación real y el 401 en caso de token inválido ocurren después,
 * en `middleware/authenticate.ts`, antes de tocar cualquier dato o llamar
 * a Claude.
 */
export function deriveRateLimitKey(request: FastifyRequest): string {
  const sub = extractUnverifiedSub(request);
  return sub ? `user:${sub}` : `ip:${request.ip}`;
}

function extractUnverifiedSub(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);
  const parts = token.split(".");
  const payloadSegment = parts[1];
  if (parts.length !== 3 || !payloadSegment) return null;

  try {
    const payloadJson = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
