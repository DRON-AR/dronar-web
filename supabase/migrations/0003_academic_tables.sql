-- ============================================================
-- 0003 — Tablas académicas: courses, enrollments, evaluations,
--         certificates (3/16, 4/16, 5/16, 6/16)
-- ============================================================

CREATE TABLE public.courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  category        text,
  duration_hours  numeric(6,2) NOT NULL DEFAULT 0 CHECK (duration_hours >= 0),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


CREATE TABLE public.enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  status        public.enrollment_status NOT NULL DEFAULT 'INSCRITO',
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON public.enrollments(course_id);

CREATE TRIGGER trg_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


CREATE TABLE public.evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  evaluator_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  score           numeric(5,2) CHECK (score >= 0 AND score <= 100),
  result          public.evaluation_result NOT NULL DEFAULT 'PENDIENTE',
  evaluated_at    timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evaluations_enrollment_id ON public.evaluations(enrollment_id);


CREATE TABLE public.certificates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,          -- código público de verificación
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  evaluation_id     uuid REFERENCES public.evaluations(id) ON DELETE SET NULL,
  certificate_text  text NOT NULL,   -- incluye la cláusula NIST obligatoria (ver docs/DDL_NOTES.md)
  pdf_url           text,
  issued_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
