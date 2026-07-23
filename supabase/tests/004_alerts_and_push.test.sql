-- ============================================================
-- Pruebas del Bloque 7: alerta automática NO_GO + RLS de push_subscriptions
-- ============================================================

BEGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'piloto.alertas@test.com', '{"full_name":"Piloto Alertas"}'::jsonb);
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'PILOTO')
  WHERE id = 'f0000000-0000-0000-0000-000000000001';

INSERT INTO public.missions (id, pilot_id, aircraft_registration, status)
  VALUES ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'HK-9001', 'PLANIFICADA');

\echo '--- TEST 1: risk_card con viento alto (NO_GO) crea una alerta automáticamente ---'
INSERT INTO public.risk_cards (mission_id, viento_kmh, visibilidad_km, indice_kp)
  VALUES ('f1000000-0000-0000-0000-000000000001', 60, 10, 2);

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.alerts
  WHERE type = 'GO_NO_GO_BLOCKED' AND related_table = 'risk_cards' AND status = 'ABIERTA' AND notified_at IS NULL;
  IF v_count = 1 THEN RAISE NOTICE 'TEST 1 OK: se creó exactamente 1 alerta GO_NO_GO_BLOCKED sin notificar aún';
  ELSE RAISE NOTICE 'TEST 1 FALLÓ: % alertas encontradas, esperaba 1', v_count; END IF;
END $$;

\echo '--- TEST 2: risk_card con condiciones buenas (GO) NO crea alerta ---'
INSERT INTO public.risk_cards (mission_id, viento_kmh, visibilidad_km, indice_kp)
  VALUES ('f1000000-0000-0000-0000-000000000001', 10, 10, 2);

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.alerts WHERE type = 'GO_NO_GO_BLOCKED';
  IF v_count = 1 THEN RAISE NOTICE 'TEST 2 OK: sigue habiendo solo 1 alerta (la del GO no generó una nueva)';
  ELSE RAISE NOTICE 'TEST 2 FALLÓ: % alertas, esperaba 1', v_count; END IF;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uuid uuid) RETURNS void AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_uuid)::text);
  SET LOCAL ROLE authenticated;
END;
$$ LANGUAGE plpgsql;

\echo '--- TEST 3: piloto puede crear su propia suscripción push ---'
SAVEPOINT sp3;
SELECT pg_temp.as_user('f0000000-0000-0000-0000-000000000001');
DO $$
BEGIN
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES ('f0000000-0000-0000-0000-000000000001', 'https://push.example.com/abc', 'p256dh-key', 'auth-key');
  RAISE NOTICE 'TEST 3 OK: piloto pudo registrar su propia suscripción push';
END $$;
RESET ROLE;
ROLLBACK TO sp3;

\echo '--- TEST 4: piloto NO puede crear una suscripción a nombre de otro usuario ---'
SAVEPOINT sp4;
SELECT pg_temp.as_user('f0000000-0000-0000-0000-000000000001');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'https://push.example.com/ajeno', 'x', 'y');
    RAISE NOTICE 'TEST 4 FALLÓ: pudo registrar una suscripción a nombre de otro usuario';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    RAISE NOTICE 'TEST 4 OK: bloqueado -> %', SQLERRM;
  END;
END $$;
RESET ROLE;
ROLLBACK TO sp4;

ROLLBACK;
\echo '=== Fin de la suite de pruebas de alertas y push (Bloque 7) ==='
