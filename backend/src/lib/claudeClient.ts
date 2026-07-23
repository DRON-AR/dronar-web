export interface ClaudeCallResult {
  text: string;
  raw: unknown;
}

/**
 * Wrapper mínimo sobre la API de mensajes de Anthropic. No hay SDK como
 * dependencia extra a propósito ("proxy mínimo"): un fetch tipado es
 * suficiente y mantiene la superficie de auditoría (qué se envía, qué
 * se recibe) completamente explícita en este archivo.
 *
 * CLAUDE_MODEL es obligatorio (sin default hardcodeado): el modelo
 * disponible depende de la cuenta/consola de Anthropic del cliente y
 * cambia con el tiempo — mejor fallar rápido que asumir un modelo que
 * puede no estar disponible o haber quedado obsoleto.
 */
export async function callClaude(
  prompt: string,
  maxTokens = 1000,
  fetchImpl: typeof fetch = fetch
): Promise<ClaudeCallResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  const model = process.env.CLAUDE_MODEL;

  if (!apiKey) throw new Error("CLAUDE_API_KEY no configurada.");
  if (!model) throw new Error("CLAUDE_MODEL no configurada.");

  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Claude API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");

  return { text, raw: data };
}
