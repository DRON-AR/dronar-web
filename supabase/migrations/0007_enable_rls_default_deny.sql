-- ============================================================
-- 0007 — Activar RLS en las 16 tablas (deny-by-default)
--
-- Se activa RLS ahora mismo, sin políticas todavía, para que no
-- exista ninguna ventana en la que una tabla esté accesible sin
-- reglas explícitas. Sin políticas, solo el rol service_role
-- (usado por el backend, nunca expuesto al cliente) puede leer o
-- escribir. Las políticas por rol (ADMIN, JefePilotos, dueño de
-- fila, etc.) se agregan en el Bloque 3 junto con las pruebas
-- unitarias con JWT.
-- ============================================================

ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payloads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_prompts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records  ENABLE ROW LEVEL SECURITY;

-- También se fuerza RLS incluso para el propietario de la tabla,
-- por consistencia con el resto del hardening del proyecto.
ALTER TABLE public.roles            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.courses          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.certificates     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.missions         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shifts           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payloads         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.risk_cards       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.logs             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_prompts    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records  FORCE ROW LEVEL SECURITY;
