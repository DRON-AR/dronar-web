-- ============================================================
-- 0008 — Seed de roles base
-- Datos de referencia, no datos de usuarios reales.
-- ============================================================

INSERT INTO public.roles (name, description) VALUES
  ('ADMIN',        'Administrador del sistema — acceso total controlado por RLS'),
  ('JEFE_PILOTOS',  'Jefe de Pilotos — excepciones controladas sobre misiones y turnos'),
  ('INSTRUCTOR',    'Instructor de cursos y evaluador'),
  ('PILOTO',        'Piloto operativo'),
  ('ALUMNO',        'Alumno inscrito en cursos')
ON CONFLICT (name) DO NOTHING;
