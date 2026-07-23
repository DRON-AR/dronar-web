-- ============================================================
-- 0012 — Auto-creación de perfil al registrarse en Supabase Auth
--
-- Sin esto, un usuario podría autenticarse (existir en auth.users) pero no
-- tener fila en public.users — y las políticas RLS de 0011 exigen que
-- public.users exista para resolver el rol (fn_current_role_name). El
-- dashboard (Bloque 5) fallaría al leer el perfil de cualquier usuario
-- recién creado.
--
-- Rol por defecto: ALUMNO (el más restringido). Promover a PILOTO,
-- INSTRUCTOR, JEFE_PILOTOS o ADMIN es una acción explícita de un
-- ADMIN/JEFE_PILOTOS después, vía UPDATE (protegido por
-- trg_prevent_self_privilege_escalation, 0010).
--
-- RECOMENDACIÓN OPERATIVA (fuera del alcance de SQL): en el dashboard de
-- Supabase, Authentication > Settings, deshabilitar "Allow new users to
-- sign up" si el alta de personal debe ser siempre admin-iniciada. Este
-- trigger no decide esa política de negocio, solo garantiza que, decida lo
-- que decida el equipo, nunca quede un usuario de Auth sin perfil.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_alumno_role_id smallint;
BEGIN
  SELECT id INTO v_alumno_role_id FROM public.roles WHERE name = 'ALUMNO';

  INSERT INTO public.users (id, full_name, email, role_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    v_alumno_role_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_new_auth_user();
