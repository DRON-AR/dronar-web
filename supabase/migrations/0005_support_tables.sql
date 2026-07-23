-- ============================================================
-- 0005 — Tablas de soporte: logs, audit_prompts, alerts,
--         medical_records (13..16/16)
-- ============================================================

-- Bitácoras / logs generales del sistema (distintos de audit_prompts,
-- que es específicamente para trazabilidad de llamadas a Claude).
CREATE TABLE public.logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity      text,
  entity_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_entity ON public.logs(entity, entity_id);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);


-- Auditoría de IA obligatoria: cada llamada crítica al proxy /api/claude
-- (Bloque 4) debe insertar aquí prompt_version, user_id, timestamp y hash.
CREATE TABLE public.audit_prompts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES public.users(id) ON DELETE SET NULL,
  prompt_version          text NOT NULL,
  purpose                 text NOT NULL,
  expected_output_format  text NOT NULL,
  prompt_hash             text NOT NULL,   -- hash del prompt enviado (nunca el texto completo en claro)
  response_hash           text,            -- hash de la respuesta crítica recibida
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_prompts_user_id ON public.audit_prompts(user_id);
CREATE INDEX idx_audit_prompts_created_at ON public.audit_prompts(created_at DESC);


CREATE TABLE public.alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL,
  severity      public.alert_severity NOT NULL DEFAULT 'MEDIA',
  status        public.alert_status NOT NULL DEFAULT 'ABIERTA',
  related_table text,
  related_id    uuid,
  message       text NOT NULL,
  triggered_by  text NOT NULL DEFAULT 'system',
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_related ON public.alerts(related_table, related_id);


CREATE TABLE public.medical_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  estado_medico       public.estado_medico NOT NULL DEFAULT 'VIGENTE',
  exam_date           date NOT NULL,
  expiry_date         date,
  issuing_authority   text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_records_user_id ON public.medical_records(user_id);
CREATE INDEX idx_medical_records_exam_date ON public.medical_records(user_id, exam_date DESC);

CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
