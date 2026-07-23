-- ============================================================
-- 0011 — Políticas RLS para las 16 tablas
--
-- Patrón general:
--   - Catálogo (roles, courses): lectura abierta a autenticados, escritura
--     ADMIN/JEFE_PILOTOS.
--   - Datos propios (enrollments, evaluations, missions, shifts,
--     medical_records, certificates, payloads, risk_cards, maintenance,
--     attachments): visibles para el dueño + ADMIN/JEFE_PILOTOS.
--   - Tablas de sistema (logs, audit_prompts, alerts): SIN política de
--     escritura para `authenticated` — solo el backend con service_role
--     (que bypassa RLS) escribe ahí, para que no sean falsificables.
--   - Datos sensibles de integridad regulatoria (medical_records,
--     risk_cards): el propio usuario nunca puede escribir su propio
--     registro, solo ADMIN/JEFE_PILOTOS.
-- ============================================================

-- ---------------- roles ----------------
CREATE POLICY "roles_select_all_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert_admin_only" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin());
CREATE POLICY "roles_update_admin_only" ON public.roles
  FOR UPDATE TO authenticated USING (public.fn_is_admin()) WITH CHECK (public.fn_is_admin());
CREATE POLICY "roles_delete_admin_only" ON public.roles
  FOR DELETE TO authenticated USING (public.fn_is_admin());

-- ---------------- users ----------------
CREATE POLICY "users_select_self_or_admin" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "users_insert_admin_or_jefe" ON public.users
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "users_update_self_or_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.fn_is_admin_or_jefe())
  WITH CHECK (id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- role_id / active protegidos por trigger trg_prevent_self_privilege_escalation (0010)
CREATE POLICY "users_delete_admin_only" ON public.users
  FOR DELETE TO authenticated USING (public.fn_is_admin());

-- ---------------- courses ----------------
CREATE POLICY "courses_select_all_authenticated" ON public.courses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_insert_admin_or_jefe" ON public.courses
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "courses_update_admin_or_jefe" ON public.courses
  FOR UPDATE TO authenticated USING (public.fn_is_admin_or_jefe()) WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "courses_delete_admin_only" ON public.courses
  FOR DELETE TO authenticated USING (public.fn_is_admin());

-- ---------------- enrollments ----------------
CREATE POLICY "enrollments_select_own_or_admin" ON public.enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "enrollments_insert_self_or_admin" ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "enrollments_update_admin_or_jefe" ON public.enrollments
  FOR UPDATE TO authenticated USING (public.fn_is_admin_or_jefe()) WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "enrollments_delete_admin_or_jefe" ON public.enrollments
  FOR DELETE TO authenticated USING (public.fn_is_admin_or_jefe());

-- ---------------- evaluations ----------------
CREATE POLICY "evaluations_select_related_or_admin" ON public.evaluations
  FOR SELECT TO authenticated
  USING (
    evaluator_id = auth.uid()
    OR public.fn_is_admin_or_jefe()
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = evaluations.enrollment_id AND e.user_id = auth.uid())
  );
CREATE POLICY "evaluations_insert_instructor_or_admin" ON public.evaluations
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin_or_jefe() OR (public.fn_current_role_name() = 'INSTRUCTOR' AND evaluator_id = auth.uid()));
CREATE POLICY "evaluations_update_instructor_or_admin" ON public.evaluations
  FOR UPDATE TO authenticated
  USING (public.fn_is_admin_or_jefe() OR (public.fn_current_role_name() = 'INSTRUCTOR' AND evaluator_id = auth.uid()))
  WITH CHECK (public.fn_is_admin_or_jefe() OR (public.fn_current_role_name() = 'INSTRUCTOR' AND evaluator_id = auth.uid()));
CREATE POLICY "evaluations_delete_admin_only" ON public.evaluations
  FOR DELETE TO authenticated USING (public.fn_is_admin());

-- ---------------- certificates (inmutables una vez emitidos) ----------------
CREATE POLICY "certificates_select_own_or_admin" ON public.certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "certificates_insert_admin_or_jefe" ON public.certificates
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "certificates_delete_admin_only" ON public.certificates
  FOR DELETE TO authenticated USING (public.fn_is_admin());
  -- Sin política de UPDATE para `authenticated`: un certificado emitido no
  -- se edita in-place: se anula (DELETE por ADMIN) y se reemite.

-- ---------------- missions ----------------
CREATE POLICY "missions_select_own_or_admin" ON public.missions
  FOR SELECT TO authenticated
  USING (pilot_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "missions_insert_own_or_admin" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK (pilot_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "missions_update_own_or_admin" ON public.missions
  FOR UPDATE TO authenticated
  USING (pilot_id = auth.uid() OR public.fn_is_admin_or_jefe())
  WITH CHECK (pilot_id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- RAC 120 (0006) sigue aplicando aunque el propio piloto pueda hacer UPDATE:
  -- la RLS decide QUIÉN puede tocar la fila, el trigger decide SI la firma es válida.
CREATE POLICY "missions_delete_admin_or_jefe" ON public.missions
  FOR DELETE TO authenticated USING (public.fn_is_admin_or_jefe());

-- ---------------- shifts ----------------
CREATE POLICY "shifts_select_own_or_admin" ON public.shifts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "shifts_insert_own_or_admin" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "shifts_update_own_or_admin" ON public.shifts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe())
  WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- RAC 100.510 (0006) bloquea >10h sin importar quién escribe.
CREATE POLICY "shifts_delete_admin_or_jefe" ON public.shifts
  FOR DELETE TO authenticated USING (public.fn_is_admin_or_jefe());

-- ---------------- payloads (visibilidad heredada de la misión) ----------------
CREATE POLICY "payloads_select_via_mission_or_admin" ON public.payloads
  FOR SELECT TO authenticated
  USING (public.fn_is_admin_or_jefe() OR EXISTS (
    SELECT 1 FROM public.missions m WHERE m.id = payloads.mission_id AND m.pilot_id = auth.uid()));
CREATE POLICY "payloads_insert_via_mission_or_admin" ON public.payloads
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_admin_or_jefe() OR EXISTS (
    SELECT 1 FROM public.missions m WHERE m.id = payloads.mission_id AND m.pilot_id = auth.uid()));
CREATE POLICY "payloads_update_via_mission_or_admin" ON public.payloads
  FOR UPDATE TO authenticated
  USING (public.fn_is_admin_or_jefe() OR EXISTS (
    SELECT 1 FROM public.missions m WHERE m.id = payloads.mission_id AND m.pilot_id = auth.uid()))
  WITH CHECK (public.fn_is_admin_or_jefe() OR EXISTS (
    SELECT 1 FROM public.missions m WHERE m.id = payloads.mission_id AND m.pilot_id = auth.uid()));
CREATE POLICY "payloads_delete_admin_or_jefe" ON public.payloads
  FOR DELETE TO authenticated USING (public.fn_is_admin_or_jefe());

-- ---------------- risk_cards (decisión de seguridad GO/NO-GO) ----------------
CREATE POLICY "risk_cards_select_via_mission_or_admin" ON public.risk_cards
  FOR SELECT TO authenticated
  USING (
    public.fn_is_admin_or_jefe()
    OR evaluated_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.missions m WHERE m.id = risk_cards.mission_id AND m.pilot_id = auth.uid())
  );
CREATE POLICY "risk_cards_insert_admin_or_jefe" ON public.risk_cards
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "risk_cards_update_admin_or_jefe" ON public.risk_cards
  FOR UPDATE TO authenticated USING (public.fn_is_admin_or_jefe()) WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "risk_cards_delete_admin_only" ON public.risk_cards
  FOR DELETE TO authenticated USING (public.fn_is_admin());

-- ---------------- maintenance ----------------
CREATE POLICY "maintenance_select_own_or_admin" ON public.maintenance
  FOR SELECT TO authenticated
  USING (performed_by = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "maintenance_insert_admin_or_jefe" ON public.maintenance
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "maintenance_update_assigned_or_admin" ON public.maintenance
  FOR UPDATE TO authenticated
  USING (performed_by = auth.uid() OR public.fn_is_admin_or_jefe())
  WITH CHECK (performed_by = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "maintenance_delete_admin_or_jefe" ON public.maintenance
  FOR DELETE TO authenticated USING (public.fn_is_admin_or_jefe());

-- ---------------- attachments ----------------
CREATE POLICY "attachments_select_own_or_admin" ON public.attachments
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "attachments_insert_own_or_admin" ON public.attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "attachments_delete_own_or_admin" ON public.attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.fn_is_admin_or_jefe());
  -- Sin UPDATE: un adjunto se reemplaza (nuevo registro), no se edita in-place.

-- ---------------- logs (solo backend escribe, vía service_role) ----------------
CREATE POLICY "logs_select_own_or_admin" ON public.logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- Sin INSERT/UPDATE/DELETE para `authenticated`: evita bitácoras falsificadas.

-- ---------------- audit_prompts (auditoría de IA, solo backend escribe) ----------------
CREATE POLICY "audit_prompts_select_own_or_admin" ON public.audit_prompts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
  -- Sin INSERT/UPDATE/DELETE para `authenticated`: el proxy /api/claude
  -- (Bloque 4) siempre inserta con service_role, nunca a nombre del cliente.

-- ---------------- alerts (motor de alertas escribe vía service_role) ----------------
CREATE POLICY "alerts_select_admin_or_jefe" ON public.alerts
  FOR SELECT TO authenticated USING (public.fn_is_admin_or_jefe());
CREATE POLICY "alerts_update_admin_or_jefe" ON public.alerts
  FOR UPDATE TO authenticated USING (public.fn_is_admin_or_jefe()) WITH CHECK (public.fn_is_admin_or_jefe());
  -- Sin INSERT/DELETE para `authenticated`: las genera el motor (Bloque 7);
  -- Admin/Jefe solo puede actualizarlas (p. ej. marcarlas RESUELTA).

-- ---------------- medical_records (integridad regulatoria: nunca auto-editable) ----------------
CREATE POLICY "medical_records_select_own_or_admin" ON public.medical_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.fn_is_admin_or_jefe());
CREATE POLICY "medical_records_insert_admin_or_jefe" ON public.medical_records
  FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "medical_records_update_admin_or_jefe" ON public.medical_records
  FOR UPDATE TO authenticated USING (public.fn_is_admin_or_jefe()) WITH CHECK (public.fn_is_admin_or_jefe());
CREATE POLICY "medical_records_delete_admin_only" ON public.medical_records
  FOR DELETE TO authenticated USING (public.fn_is_admin());
