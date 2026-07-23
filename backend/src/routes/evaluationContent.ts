import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { isAdminOrJefeOrInstructor } from "../lib/authorize.js";
import { runPromptTemplate } from "../lib/promptRunner.js";

const generateQuestionsSchema = z.object({
  courseId: z.string().uuid(),
  topic: z.string().trim().min(1).max(200),
  numQuestions: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["FACIL", "MEDIO", "DIFICIL"]).default("MEDIO"),
});

const reviewParamsSchema = z.object({ id: z.string().uuid() });
const reviewBodySchema = z.object({ status: z.enum(["APROBADA", "DESCARTADA"]) });

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export async function evaluationContentRoutes(app: FastifyInstance) {
  /**
   * Genera preguntas vía Claude (plantilla v1.1) y las guarda SIEMPRE como
   * BORRADOR — nunca entran directo a una evaluación real. Requiere
   * revisión explícita vía PATCH .../review antes de usarse.
   */
  app.post("/api/evaluations/generate-questions", { preHandler: authenticate }, async (request, reply) => {
    const supabase = getSupabaseAdmin();

    if (!(await isAdminOrJefeOrInstructor(supabase, request.userId!))) {
      return reply.code(403).send({ error: "Solo ADMIN, JEFE_PILOTOS o INSTRUCTOR puede generar preguntas." });
    }

    const parsedBody = generateQuestionsSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Solicitud inválida.", details: parsedBody.error.flatten() });
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id, name")
      .eq("id", parsedBody.data.courseId)
      .maybeSingle();

    if (!course) {
      return reply.code(404).send({ error: "Curso no encontrado." });
    }

    const result = await runPromptTemplate(
      supabase,
      {
        promptVersion: "v1.1",
        input: {
          courseName: course.name,
          topic: parsedBody.data.topic,
          numQuestions: parsedBody.data.numQuestions,
          difficulty: parsedBody.data.difficulty,
        },
        userId: request.userId!,
      },
      (auditErr) => app.log.error({ auditErr }, "Fallo al insertar audit_prompts")
    );

    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error, ...(result.details ? { details: result.details } : {}) });
    }

    const questions = result.output as GeneratedQuestion[];
    const rows = questions.map((q) => ({
      id: randomUUID(),
      course_id: course.id,
      question: q.question,
      options: q.options,
      correct_option_index: q.correctOptionIndex,
      difficulty: parsedBody.data.difficulty,
      status: "BORRADOR",
      source_prompt_version: "v1.1",
      created_by: request.userId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("evaluation_questions")
      .insert(rows)
      .select("id");

    if (insertError) {
      app.log.error({ insertError }, "Fallo al guardar preguntas generadas");
      return reply.code(500).send({ error: "Las preguntas se generaron pero no se pudieron guardar." });
    }

    return reply.code(201).send({
      created: inserted?.length ?? 0,
      questionIds: (inserted ?? []).map((r) => r.id),
      status: "BORRADOR",
    });
  });

  /** Transición BORRADOR -> APROBADA | DESCARTADA. Ninguna pregunta se usa sin pasar por aquí. */
  app.patch("/api/evaluations/questions/:id/review", { preHandler: authenticate }, async (request, reply) => {
    const supabase = getSupabaseAdmin();

    if (!(await isAdminOrJefeOrInstructor(supabase, request.userId!))) {
      return reply.code(403).send({ error: "Solo ADMIN, JEFE_PILOTOS o INSTRUCTOR puede revisar preguntas." });
    }

    const parsedParams = reviewParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Id inválido." });
    }
    const parsedBody = reviewBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Solicitud inválida.", details: parsedBody.error.flatten() });
    }

    const { error, data } = await supabase
      .from("evaluation_questions")
      .update({ status: parsedBody.data.status })
      .eq("id", parsedParams.data.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "No se pudo actualizar la pregunta." });
    }
    if (!data) {
      return reply.code(404).send({ error: "Pregunta no encontrada." });
    }

    return reply.send({ ok: true, id: data.id, status: parsedBody.data.status });
  });
}
