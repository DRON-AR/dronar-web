import { z } from "zod";

/**
 * Forma externa del body de POST /api/claude. El contenido real enviado a
 * Claude NUNCA viene del cliente como texto libre — solo prompt_version +
 * input tipado; el servidor arma el prompt final desde promptTemplates.ts.
 */
export const claudeRequestSchema = z.object({
  prompt_version: z.string().min(1).max(20),
  input: z.unknown(),
});

export type ClaudeRequestBody = z.infer<typeof claudeRequestSchema>;
