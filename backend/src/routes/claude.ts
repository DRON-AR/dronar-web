import type { FastifyInstance } from "fastify";
import { claudeRequestSchema } from "../lib/schemas.js";
import { runPromptTemplate } from "../lib/promptRunner.js";
import { authenticate } from "../middleware/authenticate.js";
import { deriveRateLimitKey } from "../lib/rateLimitKey.js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

export async function claudeRoutes(app: FastifyInstance) {
  app.post(
    "/api/claude",
    {
      preHandler: authenticate,
      config: {
        // Límite propio y más estricto que el global (Bloque 1): cada
        // llamada aquí cuesta dinero real en la cuenta de Anthropic.
        rateLimit: {
          max: Number(process.env.CLAUDE_RATE_LIMIT_MAX ?? 10),
          timeWindow: process.env.CLAUDE_RATE_LIMIT_WINDOW ?? "1 minute",
          keyGenerator: deriveRateLimitKey,
        },
      },
    },
    async (request, reply) => {
      const parsedBody = claudeRequestSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: "Solicitud inválida.",
          details: parsedBody.error.flatten(),
        });
      }

      const supabase = getSupabaseAdmin();
      const result = await runPromptTemplate(
        supabase,
        {
          promptVersion: parsedBody.data.prompt_version,
          input: parsedBody.data.input,
          userId: request.userId!,
        },
        (auditErr) => app.log.error({ auditErr }, "Fallo al insertar audit_prompts")
      );

      if (!result.ok) {
        return reply.code(result.status).send({
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        });
      }

      return reply.send({
        prompt_version: result.template.prompt_version,
        expected_output_format: result.template.expected_output_format,
        output: result.output,
      });
    }
  );
}
