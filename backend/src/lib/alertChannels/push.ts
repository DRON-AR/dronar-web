import webpush from "web-push";

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface AlertPushPayload {
  title: string;
  body: string;
}

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT no configuradas.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Las suscripciones vienen de public.push_subscriptions (Bloque 7, 0016).
 * No hay UI de captura de suscripción en el frontend todavía (fuera de
 * alcance de este bloque) — POST /api/push/subscribe ya existe para
 * cuando se conecte.
 */
export async function sendAlertPush(
  subscriptions: PushSubscriptionRecord[],
  payload: AlertPushPayload,
  sendImpl: typeof webpush.sendNotification = webpush.sendNotification
): Promise<void> {
  if (subscriptions.length === 0) return;
  ensureVapidConfigured();

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map((sub) =>
      sendImpl({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body).catch(() => {
        // Una suscripción caducada/inválida no debe tumbar el resto del envío.
      })
    )
  );
}
