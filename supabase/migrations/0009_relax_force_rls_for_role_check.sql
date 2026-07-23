-- ============================================================
-- 0009 — Ajuste necesario para permitir el helper de rol (Bloque 3)
--
-- Motivo: las políticas RLS de las 15 tablas restantes necesitan saber
-- el rol del usuario actual, lo cual requiere una función que lea
-- public.users + public.roles. Esa función se define como
-- SECURITY DEFINER (0010) para poder leer esas dos tablas sin caer en
-- un ciclo (la política de SELECT de `users` volvería a invocar la
-- misma función). El mecanismo estándar de Postgres/Supabase para esto
-- es que el DUEÑO de la tabla (el rol de las migraciones, nunca usado
-- por tráfico real) haga bypass de RLS — lo cual FORCE ROW LEVEL
-- SECURITY, activado en el Bloque 2 "por consistencia", bloquea.
--
-- Este cambio SOLO afecta al dueño de la tabla (rol administrativo de
-- migraciones). Los roles reales de tráfico (`anon`, `authenticated`,
-- `service_role`) NUNCA pasan por el dueño de la tabla y siguen 100%
-- sujetos a las políticas definidas en 0010, sin excepción. No reduce
-- la seguridad de cara a usuarios finales.
-- ============================================================

ALTER TABLE public.users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles NO FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.users IS
  'RLS activo (ENABLE) para todo el tráfico real. NO FORCE únicamente para permitir que el helper SECURITY DEFINER fn_current_role_name() (owner-bypass) resuelva el rol sin ciclo. Ver 0009 y 0010.';
COMMENT ON TABLE public.roles IS
  'RLS activo (ENABLE) para todo el tráfico real. NO FORCE por el mismo motivo que public.users — ver 0009.';
