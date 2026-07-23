import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveRecipients } from "./alertRecipients.js";
import { sendAlertEmail } from "./alertChannels/email.js";
import { sendAlertWebhook } from "./alertChannels/webhook.js";
import { sendAlertPush } from "./alertChannels/push.js";

interface AlertRow {
  id: string;
  type: string;
  severity: string;
  message: string;
  related_table: string;
  related_id: string;
  created_at: string;
}

export interface DispatchDeps {
  sendEmail?: typeof sendAlertEmail;
  sendWebhook?: typeof sendAlertWebhook;
  sendPush?: typeof sendAlertPush;
}

export interface DispatchResult {
  dispatched: number;
  failed: number;
}

/**
 * Procesa alertas ABIERTA con notified_at IS NULL. Un canal caído en una
 * alerta no debe tumbar el resto — se captura el error, se cuenta como
 * fallo, y se sigue con la siguiente alerta (no se marca notified_at para
 * que un próximo ciclo la reintente).
 */
export async function dispatchPendingAlerts(
  supabase: SupabaseClient,
  deps: DispatchDeps = {}
): Promise<DispatchResult> {
  const sendEmail = deps.sendEmail ?? sendAlertEmail;
  const sendWebhook = deps.sendWebhook ?? sendAlertWebhook;
  const sendPush = deps.sendPush ?? sendAlertPush;

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("id, type, severity, message, related_table, related_id, created_at")
    .eq("status", "ABIERTA")
    .is("notified_at", null);

  if (error || !alerts) return { dispatched: 0, failed: 0 };

  let dispatched = 0;
  let failed = 0;

  for (const alert of alerts as AlertRow[]) {
    try {
      const recipients = await resolveRecipients(supabase, alert);
      const emails = recipients.map((r) => r.email).filter((e): e is string => Boolean(e));

      await sendEmail(emails, {
        subject: `[DRONAR] Alerta ${alert.severity}: ${alert.type}`,
        message: alert.message,
      });

      await sendWebhook({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        relatedTable: alert.related_table,
        relatedId: alert.related_id,
        createdAt: alert.created_at,
      });

      const userIds = recipients.map((r) => r.userId);
      const { data: subs } = userIds.length
        ? await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", userIds)
        : { data: [] as PushRow[] };

      await sendPush(subs ?? [], { title: `DRONAR — ${alert.type}`, body: alert.message });

      await supabase.from("alerts").update({ notified_at: new Date().toISOString() }).eq("id", alert.id);
      dispatched++;
    } catch {
      failed++;
    }
  }

  return { dispatched, failed };
}

interface PushRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}
