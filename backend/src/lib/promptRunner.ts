import type { SupabaseClient } from "@supabase/supabase-js";
import { getPromptTemplate, type PromptTemplate } from "./promptTemplates.js";
import { callClaude, type ClaudeCallResult } from "./claudeClient.js";
import { sha256 } from "./hash.js";

export interface RunTemplateParams {
  promptVersion: string;
  input: unknown;
  userId: string;
}

export type RunTemplateResult =
  | { ok: true; output: unknown; rawText: string; template: PromptTemplate<any, any> }
  | { ok: false; status: number; error: string; details?: unknown };

type CallClaudeFn = (prompt: string, maxTokens?: number) => Promise<ClaudeCallResult>;

/**
 * Claude a veces envuelve JSON en fences de markdown pese a que el prompt
 * pide "sin markdown" — se limpia defensivamente antes de JSON.parse.
 */
function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function auditAttempt(
  supabase: SupabaseClient,
  template: PromptTemplate<any, any>,
  userId: string,
  promptHash: string,
  responseHash: string | null
): Promise<void> {
  const { error } = await supabase.from("audit_prompts").insert({
    user_id: userId,
    prompt_version: template.prompt_version,
    purpose: template.purpose,
    expected_output_format: template.expected_output_format,
    prompt_hash: promptHash,
    response_hash: responseHash,
  });
  // Un fallo de auditoría no debe tumbar la generación en sí — pero si el
  // caller quiere loguearlo (Fastify), puede inspeccionar el retorno.
  if (error) {
    throw new AuditWriteError(error.message);
  }
}

class AuditWriteError extends Error {}

/**
 * Punto único que corre una plantilla versionada: valida input, llama a
 * Claude, audita SIEMPRE (éxito o fallo), y si expected_output_format es
 * JSON con outputSchema definido, parsea y valida la respuesta antes de
 * devolverla. Usado por /api/claude y por /api/evaluations/generate-questions
 * — antes de este bloque cada ruta hubiera duplicado esta lógica.
 */
export async function runPromptTemplate(
  supabase: SupabaseClient,
  params: RunTemplateParams,
  onAuditError?: (err: unknown) => void,
  callClaudeImpl: CallClaudeFn = callClaude
): Promise<RunTemplateResult> {
  const template = getPromptTemplate(params.promptVersion);
  if (!template) {
    return { ok: false, status: 400, error: `prompt_version desconocida: ${params.promptVersion}` };
  }

  const parsedInput = template.inputSchema.safeParse(params.input);
  if (!parsedInput.success) {
    return {
      ok: false,
      status: 400,
      error: "Input inválido para esta plantilla.",
      details: parsedInput.error.flatten(),
    };
  }

  const prompt = template.buildPrompt(parsedInput.data);
  const promptHash = sha256(prompt);

  let rawText: string;
  try {
    const result = await callClaudeImpl(prompt, template.maxOutputTokens ?? 1000);
    rawText = result.text;
  } catch (err) {
    try {
      await auditAttempt(supabase, template, params.userId, promptHash, null);
    } catch (auditErr) {
      onAuditError?.(auditErr);
    }
    return { ok: false, status: 502, error: "Error al generar contenido con Claude." };
  }

  const responseHash = sha256(rawText);
  try {
    await auditAttempt(supabase, template, params.userId, promptHash, responseHash);
  } catch (auditErr) {
    onAuditError?.(auditErr);
  }

  if (template.expected_output_format === "JSON" && template.outputSchema) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripJsonFences(rawText));
    } catch {
      return { ok: false, status: 502, error: "Claude no devolvió un JSON válido." };
    }

    const validated = template.outputSchema.safeParse(parsedJson);
    if (!validated.success) {
      return {
        ok: false,
        status: 502,
        error: "El JSON generado no cumple el esquema esperado.",
        details: validated.error.flatten(),
      };
    }
    return { ok: true, output: validated.data, rawText, template };
  }

  return { ok: true, output: rawText, rawText, template };
}
