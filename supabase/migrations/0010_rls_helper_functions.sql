-- ============================================================
-- 0010 — Funciones auxiliares para políticas RLS (Opción B:
-- consulta directa a public.users, sin custom claims en el JWT)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_current_role_name()
RETURNS public.role_name
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.fn_current_role_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_current_role_name() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_is_admin_or_jefe()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.fn_current_role_name() IN ('ADMIN', 'JEFE_PILOTOS');
$$;
GRANT EXECUTE ON FUNCTION public.fn_is_admin_or_jefe() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.fn_current_role_name() = 'ADMIN';
$$;
GRANT EXECUTE ON FUNCTION public.fn_is_admin() TO authenticated;


-- Anti-escalación de privilegios: el policy de UPDATE en `users` permite
-- que un usuario edite SU PROPIA fila (nombre, teléfono, etc.), pero RLS
-- es a nivel de FILA, no de columna — sin este trigger, ese mismo permiso
-- le dejaría cambiarse su propio role_id o reactivarse si fue desactivado.
CREATE OR REPLACE FUNCTION public.fn_prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id AND NOT public.fn_is_admin_or_jefe() THEN
    RAISE EXCEPTION 'No autorizado: solo ADMIN o JEFE_PILOTOS puede cambiar el rol de un usuario.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.active IS DISTINCT FROM OLD.active AND NOT public.fn_is_admin_or_jefe() THEN
    RAISE EXCEPTION 'No autorizado: solo ADMIN o JEFE_PILOTOS puede activar/desactivar un usuario.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_self_privilege_escalation();
