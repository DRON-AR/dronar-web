-- ============================================================
-- 0006 — Reglas de negocio aeronáuticas como triggers de base de datos
--
-- Estas reglas se implementan a nivel de DB (no solo en el backend)
-- para que ninguna vía de escritura -API, admin de Supabase, script-
-- pueda saltárselas.
-- ============================================================

-- ------------------------------------------------------------
-- RAC 100.510 — bloqueo automático si HorasServicioContinuo > 10
-- Regla tal como fue especificada: rechaza el INSERT/UPDATE en shifts
-- si horas_servicio_continuo supera 10.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_horas_servicio_continuo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.horas_servicio_continuo IS NOT NULL AND NEW.horas_servicio_continuo > 10 THEN
    RAISE EXCEPTION 'RAC 100.510: horas de servicio continuo (%) exceden el límite de 10 horas para el turno %.',
      NEW.horas_servicio_continuo, NEW.id
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_horas_servicio_continuo
  BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_horas_servicio_continuo();


-- ------------------------------------------------------------
-- RAC 120 — bloquear firma pre-vuelo si Estado_Medico = 'VENCIDO'
-- Se dispara solo cuando pre_flight_signed pasa a TRUE (no en cada
-- UPDATE de la misión), y valida contra el registro médico vigente
-- más reciente del piloto.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_estado_medico_pre_vuelo()
RETURNS TRIGGER AS $$
DECLARE
  v_estado public.estado_medico;
BEGIN
  IF NEW.pre_flight_signed IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.pre_flight_signed IS DISTINCT FROM TRUE) THEN

    SELECT mr.estado_medico INTO v_estado
    FROM public.medical_records mr
    WHERE mr.user_id = NEW.pilot_id
    ORDER BY mr.exam_date DESC
    LIMIT 1;

    IF v_estado IS NULL THEN
      RAISE EXCEPTION 'RAC 120: no existe registro médico para el piloto % — firma pre-vuelo bloqueada.',
        NEW.pilot_id
        USING ERRCODE = '23514';
    ELSIF v_estado = 'VENCIDO' THEN
      RAISE EXCEPTION 'RAC 120: estado médico VENCIDO para el piloto % — firma pre-vuelo bloqueada.',
        NEW.pilot_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_estado_medico_pre_vuelo
  BEFORE INSERT OR UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_estado_medico_pre_vuelo();


-- ------------------------------------------------------------
-- Tarjeta GO/NO-GO — cálculo automático a partir de KPIs
--
-- IMPORTANTE: los umbrales de abajo (viento, visibilidad, índice KP)
-- son PLACEHOLDERS de ingeniería, no valores regulatorios verificados.
-- Deben confirmarse contra el manual de operaciones de Camper
-- Aeronautical antes de usarse en producción. Se dejan como constantes
-- centralizadas en esta función para que ajustarlos sea un cambio de
-- una sola línea; si se prefiere que sean editables sin migración,
-- la opción B del bloque (ver más abajo) mueve esto a una tabla de
-- configuración.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_evaluate_go_no_go()
RETURNS TRIGGER AS $$
DECLARE
  v_max_viento_kmh      CONSTANT numeric := 40;  -- PLACEHOLDER — confirmar
  v_min_visibilidad_km  CONSTANT numeric := 5;   -- PLACEHOLDER — confirmar
  v_max_indice_kp       CONSTANT numeric := 6;   -- PLACEHOLDER — confirmar
BEGIN
  IF NEW.viento_kmh IS NULL OR NEW.visibilidad_km IS NULL OR NEW.indice_kp IS NULL THEN
    NEW.resultado := 'PENDIENTE';
  ELSIF NEW.viento_kmh > v_max_viento_kmh
     OR NEW.visibilidad_km < v_min_visibilidad_km
     OR NEW.indice_kp > v_max_indice_kp THEN
    NEW.resultado := 'NO_GO';
  ELSE
    NEW.resultado := 'GO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evaluate_go_no_go
  BEFORE INSERT OR UPDATE ON public.risk_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_evaluate_go_no_go();
