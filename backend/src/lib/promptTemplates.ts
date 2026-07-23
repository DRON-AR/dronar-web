import { z } from "zod";

/**
 * Registro de plantillas de prompts versionadas (ver docs/PROMPTS.md).
 * Cada entrada corresponde 1:1 a una fila documentada allí. Añadir una
 * plantilla nueva SIEMPRE implica agregarla también a docs/PROMPTS.md con
 * su prompt_version, author, date, purpose y expected_output_format.
 */

export type ExpectedOutputFormat =
  | "JSON"
  | "HTML"
  | "React+Tailwind+FramerMotion"
  | "text";

export interface PromptTemplate<TInput = unknown, TOutput = unknown> {
  prompt_version: string;
  author: string;
  purpose: string;
  expected_output_format: ExpectedOutputFormat;
  inputSchema: z.ZodType<TInput>;
  buildPrompt: (input: TInput) => string;
  maxOutputTokens?: number;
  /**
   * Si expected_output_format === "JSON" y esto está presente, promptRunner
   * parsea y valida la respuesta de Claude contra este schema ANTES de
   * devolverla — Bloque 4 solo pasaba el texto crudo, lo cual no era
   * aceptable para contenido que define respuestas correctas de examen.
   */
  outputSchema?: z.ZodType<TOutput>;
}

// ------------------------------------------------------------
// v1.0 — Componente Hero del dashboard (Bloque 4)
// ------------------------------------------------------------
const heroComponentInputSchema = z.object({
  nombreCurso: z.string().trim().min(1).max(120),
  claim: z.string().trim().min(1).max(200),
});

const heroComponentTemplate: PromptTemplate<z.infer<typeof heroComponentInputSchema>> = {
  prompt_version: "v1.0",
  author: "Equipo DRONAR",
  purpose: "Generar componente Hero para el dashboard",
  expected_output_format: "React+Tailwind+FramerMotion",
  inputSchema: heroComponentInputSchema,
  maxOutputTokens: 2000,
  buildPrompt: (input) =>
    [
      "Genera un componente Hero en React + TypeScript usando Tailwind CSS y Framer Motion",
      "para la plataforma DRONAR de Camper Aeronautical (dashboard de piloto/alumno).",
      `Nombre del curso destacado: "${input.nombreCurso}"`,
      `Mensaje principal (claim): "${input.claim}"`,
      "Requisitos: export default de un componente funcional, tipado estricto (TypeScript),",
      "sin dependencias fuera de framer-motion y lucide-react, responsive, tema oscuro (fondo #050b14).",
      "Devuelve ÚNICAMENTE el código del componente, sin explicaciones ni markdown.",
    ].join("\n"),
};

// ------------------------------------------------------------
// v1.1 — Generación de preguntas de evaluación (Bloque 8)
// ------------------------------------------------------------
const generateQuestionsInputSchema = z.object({
  courseName: z.string().trim().min(1).max(160),
  topic: z.string().trim().min(1).max(200),
  numQuestions: z.number().int().min(1).max(20),
  difficulty: z.enum(["FACIL", "MEDIO", "DIFICIL"]),
});

const generateQuestionsOutputSchema = z
  .array(
    z
      .object({
        question: z.string().trim().min(1),
        options: z.array(z.string().trim().min(1)).min(2).max(6),
        correctOptionIndex: z.number().int().min(0),
      })
      .refine((q) => q.correctOptionIndex < q.options.length, {
        message: "correctOptionIndex debe apuntar a una opción existente",
        path: ["correctOptionIndex"],
      })
  )
  .min(1);

const generateQuestionsTemplate: PromptTemplate<
  z.infer<typeof generateQuestionsInputSchema>,
  z.infer<typeof generateQuestionsOutputSchema>
> = {
  prompt_version: "v1.1",
  author: "Equipo DRONAR",
  purpose: "Generar preguntas de opción múltiple para el banco de evaluaciones",
  expected_output_format: "JSON",
  inputSchema: generateQuestionsInputSchema,
  outputSchema: generateQuestionsOutputSchema,
  maxOutputTokens: 3000,
  buildPrompt: (input) =>
    [
      `Genera ${input.numQuestions} preguntas de opción múltiple en español sobre "${input.topic}"`,
      `para el curso "${input.courseName}" de Camper Aeronautical (Academia de RPAS/drones).`,
      `Nivel de dificultad: ${input.difficulty}.`,
      "",
      "Responde ÚNICAMENTE con un array JSON (sin markdown, sin texto adicional, sin explicaciones),",
      "donde cada elemento tiene EXACTAMENTE estas claves:",
      '- "question": string, el enunciado de la pregunta',
      '- "options": array de 4 strings, las opciones de respuesta',
      '- "correctOptionIndex": number, el índice (base 0) de la opción correcta',
      "",
      "El contenido debe ser técnicamente preciso y apropiado para formación aeronáutica.",
      "No inventes normativa específica que no puedas verificar; en ese caso formula la",
      "pregunta sobre principios generales de operación segura en vez de un número exacto.",
    ].join("\n"),
};

// ------------------------------------------------------------
// v1.2 — Descripción de curso (Bloque 8)
// ------------------------------------------------------------
const generateCourseDescriptionInputSchema = z.object({
  courseName: z.string().trim().min(1).max(160),
  objectives: z.string().trim().min(1).max(500),
  durationHours: z.number().positive().max(1000),
});

const generateCourseDescriptionTemplate: PromptTemplate<
  z.infer<typeof generateCourseDescriptionInputSchema>
> = {
  prompt_version: "v1.2",
  author: "Equipo DRONAR",
  purpose: "Generar la descripción pública de un curso",
  expected_output_format: "text",
  inputSchema: generateCourseDescriptionInputSchema,
  maxOutputTokens: 800,
  buildPrompt: (input) =>
    [
      `Escribe la descripción pública (2-3 párrafos, español, tono profesional pero cercano)`,
      `del curso "${input.courseName}" de Camper Aeronautical, con duración de ${input.durationHours} horas.`,
      `Objetivos del curso: ${input.objectives}`,
      "",
      "No inventes cifras de empleabilidad, tasas de aprobación ni afirmaciones regulatorias",
      "que no se puedan verificar. Devuelve solo el texto de la descripción, sin encabezados.",
    ].join("\n"),
};

export const promptTemplates: Readonly<Record<string, PromptTemplate<any, any>>> = Object.freeze({
  [heroComponentTemplate.prompt_version]: heroComponentTemplate,
  [generateQuestionsTemplate.prompt_version]: generateQuestionsTemplate,
  [generateCourseDescriptionTemplate.prompt_version]: generateCourseDescriptionTemplate,
});

export function getPromptTemplate(promptVersion: string): PromptTemplate<any, any> | undefined {
  return promptTemplates[promptVersion];
}
