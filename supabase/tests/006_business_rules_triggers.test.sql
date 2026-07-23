-- ============================================================
-- Pruebas de los triggers de reglas de negocio del Bloque 2
-- (RAC 100.510, RAC 120, GO/NO-GO) — corridas de forma interactiva
-- durante el desarrollo original pero nunca guardadas como archivo
-- permanente hasta el Bloque 9. Se agregan aquí para que el pipeline de
-- CI/CD (que sí necesita un conjunto de pruebas completo y repetible)
-- las cubra también.
-- ============================================================

BEGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES ('90000000-0000-0000-0000-0000000000a1', 'piloto.rac@test.com', '{"full_name":"Piloto RAC"}'::jsonb);
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE name = 'PILOTO')
  WHERE id = '90000000-0000-0000-0000-0000000000a1';

\echo '--- TEST 1: RAC 100.510 rechaza un turno de 11 horas de servicio continuo ---'
DO $$
BEGIN
  BEGIN
    INSERT INTO public.shifts (user_id, start_time, horas_servicio_continuo)
      VALUES ('90000000-0000-0000-0000-0000000000a1', now(), 11);
    RAISE NOTICE 'TEST 1 FALLÓ: se insertó un turno de 11h sin bloquear';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 1 OK: bloqueado -> %', SQLERRM;
  END;
END $$;

\echo '--- TEST 2: RAC 100.510 permite un turno de 8 horas ---'
INSERT INTO public.shifts (user_id, start_time, horas_servicio_continuo)
  VALUES ('90000000-0000-0000-0000-0000000000a1', now(), 8);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.shifts WHERE user_id = '90000000-0000-0000-0000-0000000000a1' AND horas_servicio_continuo = 8) THEN
    RAISE NOTICE 'TEST 2 OK: turno de 8h insertado sin error';
  ELSE
    RAISE NOTICE 'TEST 2 FALLÓ: no se encontró el turno de 8h';
  END IF;
END $$;

\echo '--- TEST 3: RAC 120 bloquea firma pre-vuelo sin registro médico ---'
DO $$
BEGIN
  BEGIN
    INSERT INTO public.missions (pilot_id, aircraft_registration, pre_flight_signed)
      VALUES ('90000000-0000-0000-0000-0000000000a1', 'HK-RAC1', true);
    RAISE NOTICE 'TEST 3 FALLÓ: se firmó sin registro médico';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 3 OK: bloqueado -> %', SQLERRM;
  END;
END $$;

\echo '--- TEST 4: RAC 120 bloquea firma pre-vuelo con médico VENCIDO ---'
INSERT INTO public.medical_records (user_id, estado_medico, exam_date)
  VALUES ('90000000-0000-0000-0000-0000000000a1', 'VENCIDO', '2020-01-01');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.missions (pilot_id, aircraft_registration, pre_flight_signed)
      VALUES ('90000000-0000-0000-0000-0000000000a1', 'HK-RAC1', true);
    RAISE NOTICE 'TEST 4 FALLÓ: se firmó con médico vencido';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 4 OK: bloqueado -> %', SQLERRM;
  END;
END $$;

\echo '--- TEST 5: RAC 120 permite firma pre-vuelo con médico VIGENTE reciente ---'
INSERT INTO public.medical_records (user_id, estado_medico, exam_date)
  VALUES ('90000000-0000-0000-0000-0000000000a1', 'VIGENTE', '2026-06-01');
INSERT INTO public.missions (id, pilot_id, aircraft_registration, pre_flight_signed)
  VALUES ('91000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1', 'HK-RAC1', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.missions WHERE id = '91000000-0000-0000-0000-0000000000a1' AND pre_flight_signed = true) THEN
    RAISE NOTICE 'TEST 5 OK: firma pre-vuelo aceptada con médico vigente';
  ELSE
    RAISE NOTICE 'TEST 5 FALLÓ: no se encontró la misión firmada';
  END IF;
END $$;

\echo '--- TEST 6: GO/NO-GO calcula NO_GO con viento alto ---'
INSERT INTO public.risk_cards (id, mission_id, viento_kmh, visibilidad_km, indice_kp)
  VALUES ('91100000-0000-0000-0000-0000000000a1', '91000000-0000-0000-0000-0000000000a1', 55, 10, 2);
DO $$
DECLARE v_resultado public.go_no_go_result;
BEGIN
  SELECT resultado INTO v_resultado FROM public.risk_cards WHERE id = '91100000-0000-0000-0000-0000000000a1';
  IF v_resultado = 'NO_GO' THEN
    RAISE NOTICE 'TEST 6 OK: viento alto calculó NO_GO';
  ELSE
    RAISE NOTICE 'TEST 6 FALLÓ: resultado fue %, esperaba NO_GO', v_resultado;
  END IF;
END $$;

\echo '--- TEST 7: GO/NO-GO calcula GO con condiciones buenas ---'
INSERT INTO public.risk_cards (id, mission_id, viento_kmh, visibilidad_km, indice_kp)
  VALUES ('91100000-0000-0000-0000-0000000000a2', '91000000-0000-0000-0000-0000000000a1', 10, 10, 2);
DO $$
DECLARE v_resultado public.go_no_go_result;
BEGIN
  SELECT resultado INTO v_resultado FROM public.risk_cards WHERE id = '91100000-0000-0000-0000-0000000000a2';
  IF v_resultado = 'GO' THEN
    RAISE NOTICE 'TEST 7 OK: condiciones buenas calcularon GO';
  ELSE
    RAISE NOTICE 'TEST 7 FALLÓ: resultado fue %, esperaba GO', v_resultado;
  END IF;
END $$;

\echo '--- TEST 8: GO/NO-GO sin datos completos calcula PENDIENTE ---'
INSERT INTO public.risk_cards (id, mission_id)
  VALUES ('91100000-0000-0000-0000-0000000000a3', '91000000-0000-0000-0000-0000000000a1');
DO $$
DECLARE v_resultado public.go_no_go_result;
BEGIN
  SELECT resultado INTO v_resultado FROM public.risk_cards WHERE id = '91100000-0000-0000-0000-0000000000a3';
  IF v_resultado = 'PENDIENTE' THEN
    RAISE NOTICE 'TEST 8 OK: datos incompletos calcularon PENDIENTE';
  ELSE
    RAISE NOTICE 'TEST 8 FALLÓ: resultado fue %, esperaba PENDIENTE', v_resultado;
  END IF;
END $$;

\echo '--- TEST 9: el NO_GO del TEST 6 generó una alerta automática CRITICA (Bloque 7) ---'
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.alerts
    WHERE type = 'GO_NO_GO_BLOCKED' AND related_table = 'risk_cards' AND severity = 'CRITICA';
  IF v_count >= 1 THEN
    RAISE NOTICE 'TEST 9 OK: la alerta automática se generó (% encontradas)', v_count;
  ELSE
    RAISE NOTICE 'TEST 9 FALLÓ: no se encontró ninguna alerta GO_NO_GO_BLOCKED';
  END IF;
END $$;

ROLLBACK;
\echo '=== Fin de la suite de triggers de negocio del Bloque 2 (ejecutada en Bloque 9) ==='
