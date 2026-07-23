-- ============================================================
-- Prueba de la política RLS del bucket "certificates" (0013)
-- Requiere el stub de storage (000_local_dev_auth_stub.sql) — ver notas
-- ahí sobre las limitaciones de fidelidad frente al esquema real.
-- ============================================================

BEGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

INSERT INTO auth.users (id, email) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'piloto.storage@test.com'),
  ('e0000000-0000-0000-0000-000000000002', 'admin.storage@test.com');

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'ADMIN')
  WHERE id = 'e0000000-0000-0000-0000-000000000002';

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('certificates', 'e0000000-0000-0000-0000-000000000001/cert-abc.pdf'),
  ('certificates', 'e0000000-0000-0000-0000-000000000002/cert-xyz.pdf');

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uuid uuid) RETURNS void AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_uuid)::text);
  SET LOCAL ROLE authenticated;
END;
$$ LANGUAGE plpgsql;

\echo '--- TEST 1: piloto ve solo su propio certificado en el bucket ---'
SAVEPOINT sp1;
SELECT pg_temp.as_user('e0000000-0000-0000-0000-000000000001');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'certificates';
  IF v_count = 1 THEN RAISE NOTICE 'TEST 1 OK: piloto ve exactamente 1 objeto (el suyo)';
  ELSE RAISE NOTICE 'TEST 1 FALLÓ: piloto ve % objetos, esperaba 1', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp1;

\echo '--- TEST 2: admin ve ambos certificados del bucket ---'
SAVEPOINT sp2;
SELECT pg_temp.as_user('e0000000-0000-0000-0000-000000000002');
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'certificates';
  IF v_count = 2 THEN RAISE NOTICE 'TEST 2 OK: admin ve los 2 objetos';
  ELSE RAISE NOTICE 'TEST 2 FALLÓ: admin ve % objetos, esperaba 2', v_count; END IF;
END $$;
RESET ROLE;
ROLLBACK TO sp2;

\echo '--- TEST 3: piloto NO puede insertar directamente en el bucket (solo service_role) ---'
SAVEPOINT sp3;
SELECT pg_temp.as_user('e0000000-0000-0000-0000-000000000001');
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('certificates', 'e0000000-0000-0000-0000-000000000001/falsificado.pdf');
    RAISE NOTICE 'TEST 3 FALLÓ: piloto pudo insertar directamente en el bucket';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 3 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp3;

ROLLBACK;
\echo '=== Fin de la suite de pruebas de storage (Bloque 6) ==='
