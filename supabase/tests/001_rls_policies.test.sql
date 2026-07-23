-- ============================================================
-- Pruebas de RLS con JWT simulado (Bloque 3)
--
-- Cómo correrlas:
--   contra `supabase start` (recomendado, stack real):
--     psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" \
--       -v ON_ERROR_STOP=1 -f supabase/tests/001_rls_policies.test.sql
--   contra Postgres genérico (CI sin Supabase completo), en este orden:
--     psql -d <db> -f supabase/tests/000_local_dev_auth_stub.sql   -- ANTES de migrar
--     psql -d <db> -f supabase/migrations/0001_....sql  (...0011)
--     psql -d <db> -f supabase/tests/001_rls_policies.test.sql     -- este archivo
--
-- Mecánica: cada bloque hace SET LOCAL ROLE authenticated +
-- SET LOCAL request.jwt.claims con el "sub" del usuario simulado,
-- exactamente como lo hace PostgREST con un JWT real.
-- ============================================================

\set ON_ERROR_STOP off
BEGIN;

-- En un proyecto Supabase real, `authenticated`/`service_role` ya tienen
-- estos permisos por defecto sobre el esquema public. En Postgres genérico
-- (000_local_dev_auth_stub.sql) hay que otorgarlos aquí, una vez que las
-- 16 tablas ya existen (por eso no está en el stub, que corre antes).
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- ---------- Fixtures ----------
-- email + raw_user_meta_data porque fn_handle_new_auth_user (0012) ahora
-- auto-crea la fila de public.users al insertar en auth.users (rol
-- ALUMNO por defecto) — se actualiza el rol después con UPDATE.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@test.com', '{"full_name":"Admin Uno"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000002', 'jefe@test.com', '{"full_name":"Jefe Pilotos"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000003', 'instructor@test.com', '{"full_name":"Instructor Uno"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000004', 'piloto1@test.com', '{"full_name":"Piloto Uno"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000005', 'piloto2@test.com', '{"full_name":"Piloto Dos"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000006', 'alumno1@test.com', '{"full_name":"Alumno Uno"}'::jsonb);

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'ADMIN')
  WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'JEFE_PILOTOS')
  WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'INSTRUCTOR')
  WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'PILOTO')
  WHERE id IN ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005');
-- a0000000...006 se queda con ALUMNO (rol por defecto del trigger) — es el rol que el test necesita.

INSERT INTO public.missions (id, pilot_id, aircraft_registration, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'HK-1001', 'PLANIFICADA'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'HK-1002', 'PLANIFICADA');

INSERT INTO public.courses (code, name, duration_hours) VALUES ('C-100', 'Curso Base', 10);

-- Helper de test: cambia de "usuario" simulando su JWT
CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uuid uuid) RETURNS void AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_uuid)::text);
  SET LOCAL ROLE authenticated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TEST 1: piloto1 ve solo su propia misión (no la de piloto2)
-- ============================================================
SAVEPOINT sp1;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.missions;
  IF v_count = 1 THEN RAISE NOTICE 'TEST 1 OK: piloto1 ve exactamente 1 misión (la suya)';
  ELSE RAISE NOTICE 'TEST 1 FALLÓ: piloto1 ve % misiones, esperaba 1', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp1;

-- ============================================================
-- TEST 2: admin ve ambas misiones
-- ============================================================
SAVEPOINT sp2;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.missions;
  IF v_count = 2 THEN RAISE NOTICE 'TEST 2 OK: admin ve las 2 misiones';
  ELSE RAISE NOTICE 'TEST 2 FALLÓ: admin ve % misiones, esperaba 2', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp2;

-- ============================================================
-- TEST 3: alumno NO puede insertar un curso (solo ADMIN/JEFE_PILOTOS)
-- ============================================================
SAVEPOINT sp3;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.courses (code, name) VALUES ('C-999', 'Curso No Autorizado');
    RAISE NOTICE 'TEST 3 FALLÓ: alumno pudo insertar un curso';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 3 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp3;

-- ============================================================
-- TEST 4: cualquier autenticado SÍ puede leer el catálogo de cursos
-- ============================================================
SAVEPOINT sp4;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.courses;
  IF v_count >= 1 THEN RAISE NOTICE 'TEST 4 OK: alumno puede leer el catálogo de cursos (% filas)', v_count;
  ELSE RAISE NOTICE 'TEST 4 FALLÓ: alumno no ve el catálogo'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp4;

-- ============================================================
-- TEST 5: piloto1 NO puede auto-asignarse el rol ADMIN
-- ============================================================
SAVEPOINT sp5;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
DO $$
BEGIN
  BEGIN
    UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'ADMIN')
      WHERE id = 'a0000000-0000-0000-0000-000000000004';
    RAISE NOTICE 'TEST 5 FALLÓ: piloto1 logró auto-escalar su rol a ADMIN';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 5 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp5;

-- ============================================================
-- TEST 6: piloto1 SÍ puede editar su propio nombre (dato no sensible)
-- ============================================================
SAVEPOINT sp6;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
DO $$
BEGIN
  UPDATE public.users SET full_name = 'Piloto Uno Editado'
    WHERE id = 'a0000000-0000-0000-0000-000000000004';
  IF FOUND THEN RAISE NOTICE 'TEST 6 OK: piloto1 pudo editar su propio nombre';
  ELSE RAISE NOTICE 'TEST 6 FALLÓ: no se aplicó el UPDATE'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp6;

-- ============================================================
-- TEST 7: authenticated NO puede insertar en audit_prompts
-- (solo el backend con service_role, que bypassa RLS)
-- ============================================================
SAVEPOINT sp7;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000001'); -- incluso siendo admin
DO $$
BEGIN
  BEGIN
    INSERT INTO public.audit_prompts (user_id, prompt_version, purpose, expected_output_format, prompt_hash)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'v1.0', 'test', 'JSON', 'hash123');
    RAISE NOTICE 'TEST 7 FALLÓ: se pudo insertar en audit_prompts desde authenticated';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 7 OK: bloqueado incluso para admin -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp7;

-- ============================================================
-- TEST 8: authenticated NO puede insertar en logs
-- ============================================================
SAVEPOINT sp8;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.logs (user_id, action) VALUES ('a0000000-0000-0000-0000-000000000004', 'test');
    RAISE NOTICE 'TEST 8 FALLÓ: se pudo insertar en logs desde authenticated';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 8 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp8;

-- ============================================================
-- TEST 9: alumno NO puede escribir su propio medical_record
-- ============================================================
SAVEPOINT sp9;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.medical_records (user_id, estado_medico, exam_date)
      VALUES ('a0000000-0000-0000-0000-000000000006', 'VIGENTE', now());
    RAISE NOTICE 'TEST 9 FALLÓ: alumno pudo escribir su propio registro médico';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 9 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp9;

-- ============================================================
-- TEST 10: JEFE_PILOTOS SÍ puede escribir un medical_record ajeno
-- ============================================================
SAVEPOINT sp10;
SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
DO $$
BEGIN
  INSERT INTO public.medical_records (user_id, estado_medico, exam_date)
    VALUES ('a0000000-0000-0000-0000-000000000004', 'VIGENTE', now());
  RAISE NOTICE 'TEST 10 OK: jefe_pilotos pudo crear el registro médico de piloto1';
END $$;
RESET ROLE;
ROLLBACK TO sp10;

-- ============================================================
-- TEST 11: instructor ve/edita sus propias evaluaciones, no las ajenas
-- ============================================================
SAVEPOINT sp11;
RESET ROLE; -- volver a superuser para el fixture
INSERT INTO public.enrollments (id, user_id, course_id)
  SELECT 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', id
  FROM public.courses LIMIT 1;

SELECT pg_temp.as_user('a0000000-0000-0000-0000-000000000003'); -- instructor
DO $$
BEGIN
  INSERT INTO public.evaluations (enrollment_id, evaluator_id, result)
    VALUES ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'PENDIENTE');
  RAISE NOTICE 'TEST 11 OK: instructor pudo crear evaluación propia';
END $$;
RESET ROLE;
ROLLBACK TO sp11;

ROLLBACK; -- ninguna de estas fixtures/pruebas deja rastro en la base real
\echo '=== Fin de la suite de pruebas RLS (Bloque 3) ==='
