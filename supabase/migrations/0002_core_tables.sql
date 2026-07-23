-- ============================================================
-- 0002 — Tablas núcleo: roles, users (1/16, 2/16)
-- ============================================================

CREATE TABLE public.roles (
  id            smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name          public.role_name NOT NULL UNIQUE,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Extiende auth.users de Supabase con datos funcionales del perfil.
-- El id es el MISMO uuid que auth.users.id (1:1), nunca se genera aparte.
CREATE TABLE public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  email             text NOT NULL UNIQUE,
  role_id           smallint NOT NULL REFERENCES public.roles(id),
  license_number    text,
  phone             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_id ON public.users(role_id);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();
