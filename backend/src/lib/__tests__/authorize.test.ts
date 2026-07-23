import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminOrJefe, isAdminOrJefeOrInstructor } from "../authorize.js";
import { makeFakeSupabase, makeFakeTable } from "./testSupabaseFake.js";

function supabaseWithRole(roleName: string | null) {
  return makeFakeSupabase({
    users: makeFakeTable({
      selectResult: roleName === null ? { data: null, error: null } : { data: { roles: { name: roleName } }, error: null },
    }),
  });
}

test("isAdminOrJefe: true para ADMIN y JEFE_PILOTOS", async () => {
  assert.equal(await isAdminOrJefe(supabaseWithRole("ADMIN"), "u-1"), true);
  assert.equal(await isAdminOrJefe(supabaseWithRole("JEFE_PILOTOS"), "u-1"), true);
});

test("isAdminOrJefe: false para INSTRUCTOR, PILOTO, ALUMNO", async () => {
  assert.equal(await isAdminOrJefe(supabaseWithRole("INSTRUCTOR"), "u-1"), false);
  assert.equal(await isAdminOrJefe(supabaseWithRole("PILOTO"), "u-1"), false);
  assert.equal(await isAdminOrJefe(supabaseWithRole("ALUMNO"), "u-1"), false);
});

test("isAdminOrJefe: false si el usuario no existe (falla cerrado, no abierto)", async () => {
  assert.equal(await isAdminOrJefe(supabaseWithRole(null), "u-inexistente"), false);
});

test("isAdminOrJefeOrInstructor: true para los 3 roles de contenido", async () => {
  assert.equal(await isAdminOrJefeOrInstructor(supabaseWithRole("ADMIN"), "u-1"), true);
  assert.equal(await isAdminOrJefeOrInstructor(supabaseWithRole("JEFE_PILOTOS"), "u-1"), true);
  assert.equal(await isAdminOrJefeOrInstructor(supabaseWithRole("INSTRUCTOR"), "u-1"), true);
});

test("isAdminOrJefeOrInstructor: false para PILOTO/ALUMNO", async () => {
  assert.equal(await isAdminOrJefeOrInstructor(supabaseWithRole("PILOTO"), "u-1"), false);
  assert.equal(await isAdminOrJefeOrInstructor(supabaseWithRole("ALUMNO"), "u-1"), false);
});
