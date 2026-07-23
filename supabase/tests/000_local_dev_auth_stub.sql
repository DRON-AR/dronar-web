-- ============================================================
-- SOLO PARA DESARROLLO: stub de Supabase Auth para Postgres "pelado"
--
-- NO ejecutar esto contra un proyecto Supabase real ni contra
-- `supabase start` — en ambos casos auth.uid(), los roles anon/
-- authenticated/service_role y auth.users YA EXISTEN de forma nativa,
-- y este script sobreescribiría/duplicaría infraestructura que Supabase
-- administra. Este archivo existe únicamente para poder correr las
-- pruebas de 001_rls_policies.test.sql contra un Postgres genérico
-- (por ejemplo, en un pipeline de CI que no levanta el stack completo).
--
-- ORDEN DE EJECUCIÓN (solo Postgres genérico):
--   1. este archivo (000)                       -- auth.users debe existir
--      antes de aplicar las migraciones, por la FK de 0002_core_tables.sql
--   2. supabase/migrations/0001 .. 0011 en orden
--   3. supabase/tests/001_rls_policies.test.sql  -- ya incluye los GRANT
--      sobre las tablas, porque esos solo pueden darse una vez que existen
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- auth.uid() real de Supabase castea el claim "sub" a uuid; replicamos eso:
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT anon, authenticated, service_role TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
-- Los GRANT sobre tablas de public.* van en 001_rls_policies.test.sql,
-- porque esas tablas todavía no existen en este punto (este stub corre
-- antes de aplicar las migraciones 0001..0011).

-- ------------------------------------------------------------
-- Stub mínimo de Supabase Storage (solo lo necesario para probar la
-- política de 0013 — NO replica el esquema real completo de storage.*,
-- que además ha cambiado entre versiones de Supabase).
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  name text NOT NULL
);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql STABLE
AS $$
  SELECT (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO authenticated, service_role;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- En Supabase real esto ya viene activado por defecto; en el stub hay que
-- activarlo a mano para que la política de 0013 tenga algo que aplicar.
