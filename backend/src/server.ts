import Fastify from "fastify";
import { registerSecurity } from "./plugins/security.js";
import { healthRoutes } from "./routes/health.js";
import { claudeRoutes } from "./routes/claude.js";
import { certificateRoutes } from "./routes/certificates.js";
import { alertRoutes } from "./routes/alerts.js";
import { evaluationContentRoutes } from "./routes/evaluationContent.js";

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

async function main() {
  await registerSecurity(app);
  await app.register(healthRoutes);
  await app.register(claudeRoutes);
  await app.register(certificateRoutes);
  await app.register(alertRoutes);
  await app.register(evaluationContentRoutes);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`dronar-backend escuchando en :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
