import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { isAdminOrJefe } from "../lib/authorize.js";
import { buildCertificateHtml, buildCertificateText } from "../lib/certificateHtml.js";
import { generateCertificateCode } from "../lib/certificateCode.js";
import { renderHtmlToPdf } from "../lib/pdfGenerator.js";
import {
  buildCertificateStoragePath,
  uploadCertificatePdf,
  createSignedCertificateUrl,
} from "../lib/certificateStorage.js";

const issueSchema = z.object({
  evaluationId: z.string().uuid(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

interface EvaluationRow {
  id: string;
  result: string;
  enrollments: {
    user_id: string;
    course_id: string;
    users: { full_name: string } | null;
    courses: { name: string } | null;
  } | null;
}

export async function certificateRoutes(app: FastifyInstance) {
  app.post("/api/certificates/issue", { preHandler: authenticate }, async (request, reply) => {
    const parsedBody = issueSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: "Solicitud inválida.", details: parsedBody.error.flatten() });
    }

    const supabase = getSupabaseAdmin();

    // Autorización a nivel de app — ver comentario en authorize.ts.
    if (!(await isAdminOrJefe(supabase, request.userId!))) {
      return reply.code(403).send({ error: "Solo ADMIN o JEFE_PILOTOS puede emitir certificados." });
    }

    const { data: evaluation, error: evalError } = await supabase
      .from("evaluations")
      .select("id, result, enrollments ( user_id, course_id, users ( full_name ), courses ( name ) )")
      .eq("id", parsedBody.data.evaluationId)
      .single<EvaluationRow>();

    if (evalError || !evaluation) {
      return reply.code(404).send({ error: "Evaluación no encontrada." });
    }
    if (evaluation.result !== "APROBADO") {
      return reply.code(409).send({ error: "Solo se emiten certificados para evaluaciones con resultado APROBADO." });
    }

    const { data: existing } = await supabase
      .from("certificates")
      .select("id")
      .eq("evaluation_id", evaluation.id)
      .maybeSingle();
    if (existing) {
      return reply.code(409).send({
        error: "Ya existe un certificado emitido para esta evaluación.",
        certificateId: existing.id,
      });
    }

    const fullName = evaluation.enrollments?.users?.full_name;
    const courseName = evaluation.enrollments?.courses?.name;
    const userId = evaluation.enrollments?.user_id;
    const courseId = evaluation.enrollments?.course_id;

    if (!fullName || !courseName || !userId || !courseId) {
      app.log.error({ evaluation }, "Datos incompletos para emitir certificado");
      return reply.code(500).send({ error: "Datos incompletos para emitir el certificado." });
    }

    const certificateId = randomUUID();
    const code = generateCertificateCode();
    const issuedAt = new Date();
    const html = buildCertificateHtml({ fullName, courseName, code, issuedAt });

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderHtmlToPdf(html);
    } catch (err) {
      app.log.error(err, "Fallo al generar el PDF del certificado");
      return reply.code(502).send({ error: "No se pudo generar el PDF del certificado." });
    }

    const storagePath = buildCertificateStoragePath(userId, certificateId);
    try {
      await uploadCertificatePdf(supabase, storagePath, pdfBuffer);
    } catch (err) {
      app.log.error(err, "Fallo al subir el certificado a Storage");
      return reply.code(502).send({ error: "No se pudo guardar el certificado generado." });
    }

    const { error: insertError } = await supabase.from("certificates").insert({
      id: certificateId,
      code,
      user_id: userId,
      course_id: courseId,
      evaluation_id: evaluation.id,
      certificate_text: buildCertificateText(fullName),
      pdf_url: storagePath, // path de Storage, no una URL pública — ver docs/DDL_NOTES.md
      issued_at: issuedAt.toISOString(),
    });

    if (insertError) {
      app.log.error({ insertError }, "Fallo al insertar el certificado en la base de datos");
      return reply.code(500).send({ error: "No se pudo registrar el certificado." });
    }

    const downloadUrl = await createSignedCertificateUrl(supabase, storagePath);
    return reply.code(201).send({ id: certificateId, code, downloadUrl });
  });

  app.get("/api/certificates/:id/download", { preHandler: authenticate }, async (request, reply) => {
    const parsedParams = idParamSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: "Id de certificado inválido." });
    }

    const supabase = getSupabaseAdmin();
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select("id, user_id, pdf_url")
      .eq("id", parsedParams.data.id)
      .single();

    if (error || !certificate) {
      return reply.code(404).send({ error: "Certificado no encontrado." });
    }

    const isOwner = certificate.user_id === request.userId;
    if (!isOwner && !(await isAdminOrJefe(supabase, request.userId!))) {
      return reply.code(403).send({ error: "No autorizado para descargar este certificado." });
    }

    if (!certificate.pdf_url) {
      return reply.code(409).send({ error: "Este certificado no tiene un PDF asociado." });
    }

    const downloadUrl = await createSignedCertificateUrl(supabase, certificate.pdf_url);
    return reply.send({ downloadUrl });
  });
}
