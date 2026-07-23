-- ============================================================
-- Pruebas de RLS de evaluation_questions (Bloque 8)
-- El caso crítico es el TEST 1: un ALUMNO jamás debe poder leer esto.
-- ============================================================

BEGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('90000000-0000-0000-0000-000000000091', 'alumno.eq@test.com', '{"full_name":"Alumno EQ"}'::jsonb),
  ('90000000-0000-0000-0000-000000000092', 'instructor.eq@test.com', '{"full_name":"Instructor EQ"}'::jsonb);
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'INSTRUCTOR')
  WHERE id = '90000000-0000-0000-0000-000000000092';
-- g0000000...001 se queda ALUMNO (rol por defecto del trigger de 0012)

INSERT INTO public.courses (id, code, name, duration_hours)
  VALUES ('91000000-0000-0000-0000-000000000091', 'C-EQ', 'Curso EQ', 5);

INSERT INTO public.evaluation_questions (course_id, question, options, correct_option_index, created_by)
  VALUES (
    '91000000-0000-0000-0000-000000000091',
    '¿Cuál es la altura máxima permitida?',
    '["50m","120m","300m","500m"]'::jsonb,
    1,
    '90000000-0000-0000-0000-000000000092'
  );

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uuid uuid) RETURNS void AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_uuid)::text);
  SET LOCAL ROLE authenticated;
END;
$$ LANGUAGE plpgsql;

\echo '--- TEST 1 (CRÍTICO): ALUMNO no puede leer el banco de preguntas ---'
SAVEPOINT sp1;
SELECT pg_temp.as_user('90000000-0000-0000-0000-000000000091');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.evaluation_questions;
  IF v_count = 0 THEN RAISE NOTICE 'TEST 1 OK: alumno ve 0 preguntas (correcto, protege las respuestas)';
  ELSE RAISE NOTICE 'TEST 1 FALLÓ — CRÍTICO: alumno ve % preguntas, filtraría respuestas correctas', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp1;

\echo '--- TEST 2: INSTRUCTOR sí puede leer el banco de preguntas ---'
SAVEPOINT sp2;
SELECT pg_temp.as_user('90000000-0000-0000-0000-000000000092');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.evaluation_questions;
  IF v_count = 1 THEN RAISE NOTICE 'TEST 2 OK: instructor ve la pregunta';
  ELSE RAISE NOTICE 'TEST 2 FALLÓ: instructor ve % preguntas, esperaba 1', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp2;

\echo '--- TEST 3: ALUMNO no puede insertar preguntas ---'
SAVEPOINT sp3;
SELECT pg_temp.as_user('90000000-0000-0000-0000-000000000091');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.evaluation_questions (course_id, question, options, correct_option_index)
      VALUES ('91000000-0000-0000-0000-000000000091', 'x', '["a","b"]'::jsonb, 0);
    RAISE NOTICE 'TEST 3 FALLÓ: alumno pudo insertar una pregunta';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 3 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp3;

\echo '--- TEST 4: INSTRUCTOR puede actualizar el status (revisión) ---'
SAVEPOINT sp4;
SELECT pg_temp.as_user('90000000-0000-0000-0000-000000000092');
DO $$
BEGIN
  UPDATE public.evaluation_questions SET status = 'APROBADA'
    WHERE course_id = '91000000-0000-0000-0000-000000000091';
  IF FOUND THEN RAISE NOTICE 'TEST 4 OK: instructor pudo aprobar la pregunta';
  ELSE RAISE NOTICE 'TEST 4 FALLÓ: no se aplicó el UPDATE'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp4;

ROLLBACK;
\echo '=== Fin de la suite de pruebas de evaluation_questions (Bloque 8) ==='
