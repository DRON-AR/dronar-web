import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchPendingAlerts } from "../alertDispatcher.js";
import { makeFakeSupabase, makeFakeTable } from "./testSupabaseFake.js";

function pendingAlert(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "alert-1",
    type: "MAINTENANCE_OVERDUE",
    severity: "ALTA",
    message: "mantenimiento vencido",
    related_table: "maintenance",
    related_id: "mnt-1",
    created_at: "2026-07-22T00:00:00Z",
    ...overrides,
  };
}

test("despacha una alerta pendiente por los 3 canales y marca notified_at", async () => {
  const updatePayloads: any[] = [];
  const supabase = makeFakeSupabase({
    alerts: makeFakeTable({
      selectResult: { data: [pendingAlert()], error: null },
      onUpdate: (payload) => updatePayloads.push(payload),
    }),
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }], error: null } }),
    users: makeFakeTable({ selectResult: { data: [{ id: "u-admin", email: "admin@test.com" }], error: null } }),
    push_subscriptions: makeFakeTable({ selectResult: { data: [], error: null } }),
  });

  let emailCalled = false;
  let webhookCalled = false;
  let pushCalled = false;

  const result = await dispatchPendingAlerts(supabase, {
    sendEmail: async () => {
      emailCalled = true;
    },
    sendWebhook: async () => {
      webhookCalled = true;
    },
    sendPush: async () => {
      pushCalled = true;
    },
  });

  assert.equal(result.dispatched, 1);
  assert.equal(result.failed, 0);
  assert.equal(emailCalled, true);
  assert.equal(webhookCalled, true);
  assert.equal(pushCalled, true);
  assert.equal(updatePayloads.length, 1);
  assert.ok(updatePayloads[0].notified_at);
});

test("si un canal falla, la alerta cuenta como fallida y NO se marca notified_at (se reintenta luego)", async () => {
  const updatePayloads: any[] = [];
  const supabase = makeFakeSupabase({
    alerts: makeFakeTable({
      selectResult: { data: [pendingAlert()], error: null },
      onUpdate: (payload) => updatePayloads.push(payload),
    }),
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }], error: null } }),
    users: makeFakeTable({ selectResult: { data: [{ id: "u-admin", email: "admin@test.com" }], error: null } }),
    push_subscriptions: makeFakeTable({ selectResult: { data: [], error: null } }),
  });

  const result = await dispatchPendingAlerts(supabase, {
    sendEmail: async () => {
      throw new Error("SMTP caído");
    },
    sendWebhook: async () => {},
    sendPush: async () => {},
  });

  assert.equal(result.dispatched, 0);
  assert.equal(result.failed, 1);
  assert.equal(updatePayloads.length, 0);
});

test("procesa varias alertas independientemente: una fallida no bloquea a las demás", async () => {
  const alertsData = [
    pendingAlert({ id: "alert-fail", type: "MAINTENANCE_OVERDUE" }),
    pendingAlert({ id: "alert-ok", type: "GO_NO_GO_BLOCKED" }),
  ];
  const supabase = makeFakeSupabase({
    alerts: makeFakeTable({ selectResult: { data: alertsData, error: null } }),
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }], error: null } }),
    users: makeFakeTable({ selectResult: { data: [{ id: "u-admin", email: "admin@test.com" }], error: null } }),
    push_subscriptions: makeFakeTable({ selectResult: { data: [], error: null } }),
  });

  const result = await dispatchPendingAlerts(supabase, {
    sendEmail: async (_to, payload) => {
      if (payload.subject.includes("MAINTENANCE_OVERDUE")) throw new Error("fallo simulado");
    },
    sendWebhook: async () => {},
    sendPush: async () => {},
  });

  assert.equal(result.dispatched, 1);
  assert.equal(result.failed, 1);
});

test("sin alertas pendientes, no hace nada", async () => {
  const supabase = makeFakeSupabase({
    alerts: makeFakeTable({ selectResult: { data: [], error: null } }),
  });
  const result = await dispatchPendingAlerts(supabase, {
    sendEmail: async () => {},
    sendWebhook: async () => {},
    sendPush: async () => {},
  });
  assert.deepEqual(result, { dispatched: 0, failed: 0 });
});
