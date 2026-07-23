import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRecipients } from "../alertRecipients.js";
import { makeFakeSupabase, makeFakeTable } from "./testSupabaseFake.js";

test("MEDICAL_EXPIRING notifica al titular + ADMIN/JEFE_PILOTOS, sin duplicados", async () => {
  const supabase = makeFakeSupabase({
    medical_records: makeFakeTable({ selectResult: { data: { user_id: "u-owner" }, error: null } }),
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }, { id: 2 }], error: null } }),
    users: makeFakeTable({
      selectResult: {
        data: [
          { id: "u-owner", email: "owner@test.com" }, // el titular también es ADMIN, no debe duplicarse
          { id: "u-admin", email: "admin@test.com" },
        ],
        error: null,
      },
    }),
  });

  const recipients = await resolveRecipients(supabase, {
    type: "MEDICAL_EXPIRING",
    related_table: "medical_records",
    related_id: "mr-1",
  });

  const ids = recipients.map((r) => r.userId).sort();
  assert.deepEqual(ids, ["u-admin", "u-owner"]);
});

test("PRE_FLIGHT_PENDING notifica solo al piloto de la misión", async () => {
  const supabase = makeFakeSupabase({
    missions: makeFakeTable({ selectResult: { data: { pilot_id: "u-pilot" }, error: null } }),
    users: makeFakeTable({ selectResult: { data: { id: "u-pilot", email: "piloto@test.com" }, error: null } }),
  });

  const recipients = await resolveRecipients(supabase, {
    type: "PRE_FLIGHT_PENDING",
    related_table: "missions",
    related_id: "m-1",
  });

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]!.userId, "u-pilot");
});

test("GO_NO_GO_BLOCKED y MAINTENANCE_OVERDUE notifican solo a ADMIN/JEFE_PILOTOS", async () => {
  const supabase = makeFakeSupabase({
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }], error: null } }),
    users: makeFakeTable({ selectResult: { data: [{ id: "u-admin", email: "admin@test.com" }], error: null } }),
  });

  const goNoGo = await resolveRecipients(supabase, {
    type: "GO_NO_GO_BLOCKED",
    related_table: "risk_cards",
    related_id: "rc-1",
  });
  const maintenance = await resolveRecipients(supabase, {
    type: "MAINTENANCE_OVERDUE",
    related_table: "maintenance",
    related_id: "mnt-1",
  });

  assert.equal(goNoGo.length, 1);
  assert.equal(goNoGo[0]!.userId, "u-admin");
  assert.equal(maintenance.length, 1);
});

test("un tipo de alerta desconocido cae al default (ADMIN/JEFE_PILOTOS), nunca 'nadie'", async () => {
  const supabase = makeFakeSupabase({
    roles: makeFakeTable({ selectResult: { data: [{ id: 1 }], error: null } }),
    users: makeFakeTable({ selectResult: { data: [{ id: "u-admin", email: "admin@test.com" }], error: null } }),
  });

  const recipients = await resolveRecipients(supabase, {
    type: "TIPO_NO_CONTEMPLADO",
    related_table: "x",
    related_id: "y",
  });

  assert.equal(recipients.length, 1);
});
