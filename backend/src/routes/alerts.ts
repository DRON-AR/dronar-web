import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { runAllScans } from "../lib/alertRules.js";
import { dispatchPendingAlerts } from "../lib/alertDispatcher.js";
import { authenticate } from "../middleware/authenticate.js";

/**
 * /api/alerts/scan lo llama un scheduler (cron de Render/GitHub Actions,
 * ver Bloque 9), no un usuario interactivo — de ahí el secreto compartido
 * en vez de un JWT de Supabase.
 */
async function verifyScanSecret(request: FastifyRequest, reply: FastifyReply) {
  const configured = process.env.ALERTS_SCAN_SECRET;
  if (!configured) {
    return reply.code(500).send({ error: "ALERTS_SCAN_SECRET no configurada en el servidor." });
  }
  const provided = request.headers["x-scan-secret"];
  if (provided !== configured) {
    return reply.code(401).send({ error: "Secreto de escaneo inválido." });
  }
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function alertRoutes(app: FastifyInstance) {
  app.post(
    "/api/alerts/scan",
    {
      preHandler: verifyScanSecret,
      config: { rateLimit: { max: 6, timeWindow: "1 minute" } },
    },
    async (_request, reply) => {
      const supabase = getSupabaseAdmin();
      const scan = await runAllScans(supabase);
      const dispatch = await dispatchPendingAlerts(supabase);
      return reply.send({ scan, dispatch });
    }
  );

  app.post("/api/push/subscribe", { preHandler: authenticate }, async (request, reply) => {
    const parsed = subscribeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Solicitud inválida.", details: parsed.error.flatten() });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: request.userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      app.log.error({ error }, "Fallo al registrar suscripción push");
      return reply.code(500).send({ error: "No se pudo registrar la suscripción." });
    }

    return reply.code(201).send({ ok: true });
  });
}
