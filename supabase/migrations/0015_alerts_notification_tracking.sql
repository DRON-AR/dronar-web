-- ============================================================
-- 0015 — Seguimiento de notificación en alerts + alerta automática NO_GO
-- ============================================================

-- Sin esta columna, el dispatcher del Bloque 7 no puede distinguir "alerta
-- abierta que ya se notificó" de "alerta abierta pendiente de notificar" —
-- reenviaría el mismo email/webhook en cada ciclo de escaneo.
ALTER TABLE public.alerts ADD COLUMN notified_at timestamptz;
CREATE INDEX idx_alerts_pending_notification ON public.alerts (status, notified_at)
  WHERE notified_at IS NULL;

-- ------------------------------------------------------------
-- Alerta automática cuando una tarjeta GO/NO-GO resulta en NO_GO.
-- Se dispara DESPUÉS de fn_evaluate_go_no_go (0006, un trigger BEFORE que
-- calcula NEW.resultado) — por orden de ejecución de Postgres, este
-- trigger AFTER ve el resultado ya calculado.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_alert_on_no_go()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resultado = 'NO_GO' AND (TG_OP = 'INSERT' OR OLD.resultado IS DISTINCT FROM 'NO_GO') THEN
    INSERT INTO public.alerts (type, severity, status, related_table, related_id, message, triggered_by)
    VALUES (
      'GO_NO_GO_BLOCKED',
      'CRITICA',
      'ABIERTA',
      'risk_cards',
      NEW.id,
      format(
        'Tarjeta GO/NO-GO en NO_GO para la misión %s (viento %s km/h, visibilidad %s km, índice KP %s).',
        NEW.mission_id, NEW.viento_kmh, NEW.visibilidad_km, NEW.indice_kp
      ),
      'trigger:fn_evaluate_go_no_go'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_alert_on_no_go
  AFTER INSERT OR UPDATE ON public.risk_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_alert_on_no_go();
