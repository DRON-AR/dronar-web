-- ============================================================
-- 0017 — Banco de preguntas de evaluación (tabla 18, más allá de las 16
-- mínimas — ver docs/DDL_NOTES.md para el razonamiento).
--
-- Contenido generado por Claude (Bloque 8) entra siempre como BORRADOR:
-- nunca se usa en una evaluación real hasta que ADMIN/JEFE_PILOTOS/
-- INSTRUCTOR lo revise y lo pase a APROBADA. Es la salvaguarda mínima
-- responsable para contenido generado por IA que define qué es una
-- respuesta correcta.
-- ============================================================

CREATE TYPE public.question_status AS ENUM ('BORRADOR', 'APROBADA', 'DESCARTADA');
CREATE TYPE public.question_difficulty AS ENUM ('FACIL', 'MEDIO', 'DIFICIL');

CREATE TABLE public.evaluation_questions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question              text NOT NULL,
  options               jsonb NOT NULL,
  correct_option_index  smallint NOT NULL CHECK (correct_option_index >= 0),
  difficulty            public.question_difficulty NOT NULL DEFAULT 'MEDIO',
  status                public.question_status NOT NULL DEFAULT 'BORRADOR',
  source_prompt_version text,
  created_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(options) = 'array')
);

CREATE INDEX idx_evaluation_questions_course_id ON public.evaluation_questions(course_id);
CREATE INDEX idx_evaluation_questions_status ON public.evaluation_questions(status);

CREATE TRIGGER trg_evaluation_questions_updated_at
  BEFORE UPDATE ON public.evaluation_questions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
-- Sin FORCE — ver 0014 para el razonamiento (aplica igual aquí).

-- CRÍTICO: ALUMNO/PILOTO nunca deben poder leer esta tabla — verían las
-- respuestas correctas antes de rendir la evaluación.
CREATE POLICY "evaluation_questions_select_staff_only" ON public.evaluation_questions
  FOR SELECT TO authenticated
  USING (public.fn_current_role_name() IN ('ADMIN', 'JEFE_PILOTOS', 'INSTRUCTOR'));

CREATE POLICY "evaluation_questions_insert_staff_only" ON public.evaluation_questions
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_current_role_name() IN ('ADMIN', 'JEFE_PILOTOS', 'INSTRUCTOR'));

CREATE POLICY "evaluation_questions_update_staff_only" ON public.evaluation_questions
  FOR UPDATE TO authenticated
  USING (public.fn_current_role_name() IN ('ADMIN', 'JEFE_PILOTOS', 'INSTRUCTOR'))
  WITH CHECK (public.fn_current_role_name() IN ('ADMIN', 'JEFE_PILOTOS', 'INSTRUCTOR'));

CREATE POLICY "evaluation_questions_delete_admin_only" ON public.evaluation_questions
  FOR DELETE TO authenticated
  USING (public.fn_is_admin());
