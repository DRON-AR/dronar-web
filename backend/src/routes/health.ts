import type { FastifyInstance } from "fastify";

/**
 * Healthcheck simple, sin datos sensibles, usado por el pipeline de CI/CD
 * y por el balanceador de carga en Render/Fargate (Bloque 9).
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", service: "dronar-backend", timestamp: new Date().toISOString() };
  });
}
