import { createHmac } from "node:crypto";

export interface WebhookAlertPayload {
  type: string;
  severity: string;
  message: string;
  relatedTable: string;
  relatedId: string;
  createdAt: string;
}

/**
 * Canal opcional: si ALERT_WEBHOOK_URL no está configurada, se omite en
 * silencio (no es un fallo del dispatcher) — a diferencia de email, que sí
 * es obligatorio para el motor de alertas.
 */
export async function sendAlertWebhook(
  payload: WebhookAlertPayload,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;

  const secret = process.env.ALERT_WEBHOOK_SECRET;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (secret) {
    headers["X-DRONAR-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }

  const response = await fetchImpl(url, { method: "POST", headers, body });
  if (!response.ok) {
    throw new Error(`Webhook de alertas respondió ${response.status}`);
  }
}
