import { test } from "node:test";
import assert from "node:assert/strict";
import { scanMedicalExpiring, scanMaintenanceOverdue, scanPreFlightPending } from "../alertRules.js";
import { makeFakeSupabase, makeFakeTable } from "./testSupabaseFake.js";

test("scanMedicalExpiring crea una alerta por cada registro próximo a vencer sin alerta abierta ya", async () => {
  const inserted: any[] = [];
  const supabase = makeFakeSupabase({
    medical_records: makeFakeTable({
      selectResult: {
        data: [{ id: "mr-1", user_id: "u-1", expiry_date: "2026-08-01" }],
        error: null,
      },
    }),
    alerts: makeFakeTable({
      selectResult: { data: null, error: null }, // no hay alerta abierta ya
      onInsert: (payload) => inserted.push(payload),
    }),
  });

  const result = await scanMedicalExpiring(supabase, 30);

  assert.equal(result.created, 1);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].type, "MEDICAL_EXPIRING");
  assert.equal(inserted[0].related_id, "mr-1");
});

test("scanMedicalExpiring NO duplica si ya hay una alerta ABIERTA para ese registro", async () => {
  const inserted: any[] = [];
  const supabase = makeFakeSupabase({
    medical_records: makeFakeTable({
      selectResult: { data: [{ id: "mr-1", user_id: "u-1", expiry_date: "2026-08-01" }], error: null },
    }),
    alerts: makeFakeTable({
      selectResult: { data: { id: "existing-alert" }, error: null }, // ya existe
      onInsert: (payload) => inserted.push(payload),
    }),
  });

  const result = await scanMedicalExpiring(supabase, 30);

  assert.equal(result.created, 0);
  assert.equal(inserted.length, 0);
});

test("scanMedicalExpiring devuelve created=0 si la consulta falla, sin lanzar", async () => {
  const supabase = makeFakeSupabase({
    medical_records: makeFakeTable({ selectResult: { data: null, error: { message: "db down" } } }),
  });
  const result = await scanMedicalExpiring(supabase, 30);
  assert.equal(result.created, 0);
});

test("scanMaintenanceOverdue crea alerta ALTA para mantenimiento vencido", async () => {
  const inserted: any[] = [];
  const supabase = makeFakeSupabase({
    maintenance: makeFakeTable({
      selectResult: {
        data: [{ id: "mnt-1", aircraft_registration: "HK-1001", scheduled_at: "2026-01-01T00:00:00Z" }],
        error: null,
      },
    }),
    alerts: makeFakeTable({
      selectResult: { data: null, error: null },
      onInsert: (payload) => inserted.push(payload),
    }),
  });

  const result = await scanMaintenanceOverdue(supabase);

  assert.equal(result.created, 1);
  assert.equal(inserted[0].severity, "ALTA");
  assert.equal(inserted[0].related_table, "maintenance");
});

test("scanPreFlightPending crea alerta para misión próxima sin firma", async () => {
  const inserted: any[] = [];
  const supabase = makeFakeSupabase({
    missions: makeFakeTable({
      selectResult: {
        data: [{ id: "m-1", pilot_id: "u-1", scheduled_start: "2026-07-23T00:00:00Z" }],
        error: null,
      },
    }),
    alerts: makeFakeTable({
      selectResult: { data: null, error: null },
      onInsert: (payload) => inserted.push(payload),
    }),
  });

  const result = await scanPreFlightPending(supabase, 24);

  assert.equal(result.created, 1);
  assert.equal(inserted[0].type, "PRE_FLIGHT_PENDING");
  assert.equal(inserted[0].related_id, "m-1");
});
