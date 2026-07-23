-- ============================================================
-- 0004 — Tablas operativas: missions, shifts, payloads,
--         risk_cards, maintenance, attachments (7..12/16)
-- ============================================================

CREATE TABLE public.missions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  aircraft_registration text NOT NULL,   -- matrícula; tabla de flota queda fuera del alcance de las 16 mínimas
  objective           text,
  status              public.mission_status NOT NULL DEFAULT 'PLANIFICADA',
  scheduled_start     timestamptz,
  scheduled_end       timestamptz,
  actual_start        timestamptz,
  actual_end          timestamptz,
  pre_flight_signed   boolean NOT NULL DEFAULT false,  -- bloqueado por RAC 120 (ver 0006)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_missions_pilot_id ON public.missions(pilot_id);
CREATE INDEX idx_missions_status ON public.missions(status);

CREATE TRIGGER trg_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


CREATE TABLE public.shifts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id                  uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  start_time                  timestamptz NOT NULL,
  end_time                    timestamptz,
  horas_servicio_continuo     numeric(5,2),  -- bloqueado por RAC 100.510 si > 10 (ver 0006)
  status                      text NOT NULL DEFAULT 'ABIERTO',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX idx_shifts_user_id ON public.shifts(user_id);

CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


CREATE TABLE public.payloads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  description   text NOT NULL,
  weight_kg     numeric(6,2) CHECK (weight_kg >= 0),
  type          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payloads_mission_id ON public.payloads(mission_id);


CREATE TABLE public.risk_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  viento_kmh      numeric(5,2),
  visibilidad_km  numeric(5,2),
  indice_kp       numeric(3,1),
  resultado       public.go_no_go_result NOT NULL DEFAULT 'PENDIENTE',  -- calculado por trigger (ver 0006)
  evaluated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluated_at    timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_cards_mission_id ON public.risk_cards(mission_id);


CREATE TABLE public.maintenance (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_registration   text NOT NULL,
  description             text NOT NULL,
  status                  public.maintenance_status NOT NULL DEFAULT 'PROGRAMADO',
  scheduled_at            timestamptz,
  completed_at            timestamptz,
  performed_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_aircraft ON public.maintenance(aircraft_registration);

CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- Tabla polimórfica de adjuntos: sirve a certificados, evaluaciones,
-- mantenimiento, bitácoras, etc. sin crear una tabla de archivos por entidad.
CREATE TABLE public.attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_table   text NOT NULL,   -- p. ej. 'missions', 'maintenance', 'certificates'
  related_id      uuid NOT NULL,
  file_url        text NOT NULL,
  file_name       text,
  uploaded_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_related ON public.attachments(related_table, related_id);
