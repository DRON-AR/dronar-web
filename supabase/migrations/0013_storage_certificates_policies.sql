-- ============================================================
-- 0013 — Políticas RLS del bucket de Storage "certificates"
--
-- El bucket EN SÍ no se crea aquí por SQL directo: la superficie de
-- storage.buckets ha cambiado entre versiones de Supabase y la vía
-- soportada/documentada es la CLI o el dashboard. Crear el bucket:
--
--   supabase storage create-bucket certificates --private
--   (o: Dashboard > Storage > New bucket > "certificates", Public = OFF)
--
-- Convención de rutas: {user_id}/{certificate_id}.pdf — así la política
-- de abajo puede restringir por dueño usando storage.foldername(name),
-- el helper estándar de Supabase Storage para RLS.
--
-- Igual que audit_prompts/logs/alerts (0011): SIN política de INSERT/
-- UPDATE/DELETE para `authenticated` — solo el backend con service_role
-- sube certificados. Un certificado emitido no se reemplaza in-place.
-- ============================================================

CREATE POLICY "certificates_bucket_select_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.fn_is_admin_or_jefe()
    )
  );

COMMENT ON POLICY "certificates_bucket_select_own_or_admin" ON storage.objects IS
  'Requiere que el bucket "certificates" exista (creado vía CLI/dashboard, no SQL) y que la carpeta raíz de cada objeto sea el user_id dueño del certificado.';
