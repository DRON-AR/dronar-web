-- ============================================================
-- 0001 — Extensiones y tipos enumerados
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- Roles funcionales de negocio (distintos de los roles de Postgres/Supabase)
CREATE TYPE public.role_name AS ENUM (
  'ADMIN',
  'JEFE_PILOTOS',
  'INSTRUCTOR',
  'PILOTO',
  'ALUMNO'
);

CREATE TYPE public.enrollment_status AS ENUM (
  'INSCRITO',
  'EN_CURSO',
  'COMPLETADO',
  'RETIRADO'
);

CREATE TYPE public.evaluation_result AS ENUM (
  'APROBADO',
  'REPROBADO',
  'PENDIENTE'
);

CREATE TYPE public.mission_status AS ENUM (
  'PLANIFICADA',
  'EN_CURSO',
  'COMPLETADA',
  'CANCELADA',
  'BLOQUEADA'
);

CREATE TYPE public.go_no_go_result AS ENUM (
  'GO',
  'NO_GO',
  'PENDIENTE'
);

CREATE TYPE public.maintenance_status AS ENUM (
  'PROGRAMADO',
  'EN_PROCESO',
  'COMPLETADO',
  'VENCIDO'
);

CREATE TYPE public.estado_medico AS ENUM (
  'VIGENTE',
  'VENCIDO',
  'SUSPENDIDO'
);

CREATE TYPE public.alert_severity AS ENUM (
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

CREATE TYPE public.alert_status AS ENUM (
  'ABIERTA',
  'EN_PROCESO',
  'RESUELTA',
  'DESCARTADA'
);

-- Función reutilizable para mantener updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
