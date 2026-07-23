-- ============================================================
-- Pruebas del trigger de auto-creación de perfil (0012)
-- Mismo orden de ejecución que 001 (ver 000_local_dev_auth_stub.sql).
-- ============================================================

BEGIN;

\echo '--- TEST 1: nuevo auth.users crea public.users con rol ALUMNO ---'
INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES ('d0000000-0000-0000-0000-000000000099', 'nuevo@test.com', '{"full_name":"Nuevo Alumno"}'::jsonb);

DO $$
DECLARE v_full_name text; v_rol public.role_name;
BEGIN
  SELECT u.full_name, r.name INTO v_full_name, v_rol
  FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = 'd0000000-0000-0000-0000-000000000099';

  IF v_full_name = 'Nuevo Alumno' AND v_rol = 'ALUMNO' THEN
    RAISE NOTICE 'TEST 1 OK: perfil creado con nombre de metadata y rol ALUMNO';
  ELSE
    RAISE NOTICE 'TEST 1 FALLÓ: full_name=%, rol=%', v_full_name, v_rol;
  END IF;
END $$;

\echo '--- TEST 2: sin full_name en metadata, usa la parte local del email ---'
INSERT INTO auth.users (id, email)
  VALUES ('d0000000-0000-0000-0000-000000000098', 'piloto.jose@test.com');

DO $$
DECLARE v_full_name text;
BEGIN
  SELECT full_name INTO v_full_name FROM public.users WHERE id = 'd0000000-0000-0000-0000-000000000098';
  IF v_full_name = 'piloto.jose' THEN
    RAISE NOTICE 'TEST 2 OK: fallback a la parte local del email (%)', v_full_name;
  ELSE
    RAISE NOTICE 'TEST 2 FALLÓ: full_name=%', v_full_name;
  END IF;
END $$;

\echo '--- TEST 3: insertar dos veces el mismo id no falla (ON CONFLICT DO NOTHING) ---'
DO $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, full_name, email, role_id)
      SELECT 'd0000000-0000-0000-0000-000000000099', 'Duplicado', 'x@test.com', id
      FROM public.roles WHERE name = 'ADMIN';
    RAISE NOTICE 'TEST 3 esperado: el insert manual duplicado no debería promover a ADMIN silenciosamente';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3 info: %', SQLERRM;
  END;
END $$;

SELECT r.name AS rol_tras_intento_duplicado
FROM public.users u JOIN public.roles r ON r.id = u.role_id
WHERE u.id = 'd0000000-0000-0000-0000-000000000099';

ROLLBACK;
\echo '=== Fin de la suite de pruebas del trigger de nuevo usuario (Bloque 5) ==='
