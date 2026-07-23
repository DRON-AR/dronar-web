-- ============================================================
-- 0016 — push_subscriptions (tabla 17, más allá de las 16 mínimas)
--
-- Justificación: el Bloque 7 pide explícitamente el canal "push" en el
-- motor de alertas. Sin una tabla que guarde las suscripciones Web Push
-- de cada usuario, ese canal no puede funcionar de verdad — no es
-- ampliar el alcance sin aprobación (como se documentó para la tabla de
-- flota en docs/DDL_NOTES.md), es una dependencia real de lo pedido en
-- este bloque.
-- ============================================================

CREATE TABLE public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Sin FORCE — ver 0014 para el razonamiento (aplica igual aquí).

CREATE POLICY "push_subscriptions_select_own_or_admin" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own_or_admin" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- Sin UPDATE: una suscripción se borra y se vuelve a crear, no se edita.
