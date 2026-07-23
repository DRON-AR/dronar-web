-- ============================================================
-- 0014 — Relajar FORCE ROW LEVEL SECURITY en las 14 tablas restantes
--
-- Contexto: 0009 ya quitó FORCE de users/roles porque un helper
-- SECURITY DEFINER necesitaba leerlas sin ciclo. En este bloque aparece
-- el mismo problema de nuevo: el trigger que genera alertas automáticas
-- al detectar NO_GO (0015) necesita escribir en `alerts` desde una
-- función SECURITY DEFINER, y `alerts` todavía tiene FORCE.
--
-- En vez de seguir parchando tabla por tabla cada vez que aparece un
-- caso nuevo, se corrige la causa: FORCE solo importa si no confías en
-- el DUEÑO de la tabla — en esta arquitectura ese rol (el de las
-- migraciones) nunca sirve tráfico real; todo el tráfico real pasa por
-- `anon`, `authenticated` o `service_role`, y esos tres siguen 100%
-- sujetos a las políticas de 0011/0013/0016 con o sin FORCE. Por eso
-- FORCE aquí no añadía seguridad real, solo fricción contra los helpers
-- SECURITY DEFINER que el propio sistema necesita para automatizar
-- reglas de negocio (verificación de rol, alertas automáticas, etc.).
--
-- ENABLE se mantiene en las 16 tablas (eso sí es lo que protege a
-- anon/authenticated de leer/escribir sin política) — esto solo quita
-- FORCE.
-- ============================================================

ALTER TABLE public.courses          NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.certificates     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.missions         NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shifts           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payloads         NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.risk_cards       NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.logs             NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_prompts    NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records  NO FORCE ROW LEVEL SECURITY;
