# Changelog

## [Bloque 1] - 2026-07-22
### Added
- Estructura de monorepo: `frontend/`, `backend/`, `infra/`, `docs/`.
- Frontend: Next.js 14 App Router + TS + Tailwind + Framer Motion (configurado, sin lógica de negocio).
- Backend: Fastify + TS con CORS restringido, rate limiting y helmet ya activos; healthcheck `/health`.
- CI skeleton (lint + typecheck + build, sin secretos ni deploy).
- Checklist de seguridad y registro de prompts versionados.

## [Bloque 2] - 2026-07-22
### Added
- Esquema DDL completo: 16 tablas mínimas vía `supabase/migrations/0001..0008`.
- Enums de dominio (roles, estados de inscripción/evaluación/misión/mantenimiento/médico/alerta).
- Triggers de reglas de negocio aeronáuticas:
  - RAC 100.510 (bloqueo si horas de servicio continuo > 10) en `shifts`.
  - RAC 120 (bloqueo de firma pre-vuelo con estado médico VENCIDO) en `missions`.
  - Tarjeta GO/NO-GO calculada automáticamente en `risk_cards` (umbrales placeholder, pendientes de confirmar).
- RLS activado (`ENABLE` + `FORCE`) en las 16 tablas, deny-by-default hasta el Bloque 3.
- Seed de roles base.
- 9 pruebas manuales ejecutadas contra Postgres 16 real, todas verdes (ver `docs/DDL_NOTES.md`).

## [Bloque 3] - 2026-07-22
### Added
- `0009`: corrección de `FORCE ROW LEVEL SECURITY` en `users`/`roles` (necesaria para el helper de rol SECURITY DEFINER; no afecta al tráfico real, solo al dueño de tabla).
- `0010`: funciones auxiliares `fn_current_role_name()`, `fn_is_admin_or_jefe()`, `fn_is_admin()` (Opción B: consulta directa a `public.users`) + trigger `trg_prevent_self_privilege_escalation` (bloquea que un usuario se auto-asigne rol/reactivación).
- `0011`: políticas RLS completas para las 16 tablas — catálogo abierto a lectura, datos propios visibles para el dueño + ADMIN/JEFE_PILOTOS, tablas de sistema (`logs`, `audit_prompts`, `alerts`) sin escritura para `authenticated` (solo `service_role` del backend).
- `supabase/tests/000_local_dev_auth_stub.sql` + `001_rls_policies.test.sql`: suite de 11 pruebas con JWT simulado, ejecutadas contra Postgres 16 real — 11/11 verdes.

## [Bloque 4] - 2026-07-22
### Added
- `POST /api/claude`: proxy autenticado con plantillas de prompt versionadas
  server-side (`promptTemplates.ts`), Zod en dos capas (body externo + input
  de la plantilla), rate limit propio por ruta (usuario o IP), y auditoría
  de IA en `audit_prompts` (hash, nunca texto en claro).
- Middleware `authenticate.ts` (verifica JWT vía Supabase Auth).
- `rateLimitKey.ts`: derivación de clave de rate limit (usuario/IP) sin
  depender de que la autenticación ya haya corrido (ver comentarios sobre
  orden de hooks en Fastify).
- Cliente Claude mínimo (`claudeClient.ts`), sin SDK adicional.
- 26 pruebas (Node test runner nativo): unitarias de hash/schemas/plantillas/
  rate-limit-key/cliente Claude + integración con Fastify `inject`. Todas
  verdes. `npm run build` compila sin errores.
- CI actualizado para correr `npm run test` antes del build del backend.

## [Bloque 5] - 2026-07-22
### Added
- `supabase/migrations/0012`: auto-creación de `public.users` al registrarse
  en `auth.users` (rol ALUMNO por defecto) — 3 pruebas verdes.
- Auth flow: `/login` (Server Action `signInWithPassword`, mensajes de
  error genéricos), `/dashboard` protegido (middleware + revalidación
  server-side), logout vía Server Action.
- Clientes Supabase para browser (`lib/supabase/client.ts`) y server
  (`lib/supabase/server.ts`), middleware de refresco de sesión.
- Sistema visual (ver `docs/DESIGN_NOTES.md`): paleta extendida
  (`ground`, `signal`, `mist`, `nogo`) sobre los tokens del Bloque 1,
  tipografía Space Grotesk / IBM Plex Sans / IBM Plex Mono, y el
  horizonte artificial animado (`AttitudeHorizon`) como elemento de firma
  — glassmorphism anclado en el vocabulario real de la app (GO/NO-GO),
  no genérico. Respeta `prefers-reduced-motion`.
- Dashboard básico: Hero de bienvenida con datos reales del perfil +
  tarjetas de Cursos/Misiones marcadas honestamente "Próximamente"
  (sin datos inventados) + Licencia con dato real.
- `tsc --noEmit` y `next lint` limpios; `next build` verificado sin
  errores aislando la carga de fuentes (ver nota de red en el checklist).

## [Bloque 6] - 2026-07-22
### Added
- `supabase/migrations/0013`: políticas RLS del bucket de Storage
  `certificates` (dueño o ADMIN/JEFE_PILOTOS puede leer; solo service_role
  escribe) — 3 pruebas verdes contra un stub de storage.objects.
- `certificateHtml.ts`: plantilla HTML autocontenida con el texto NIST
  exacto exigido por la spec, escapado contra inyección.
- `pdfGenerator.ts`: wrapper de puppeteer-core con lanzador de navegador
  inyectable (probado con un browser simulado, sin necesitar Chromium real
  en este entorno) — cierra el browser incluso si falla el renderizado.
- `certificateStorage.ts`: subida a Storage + generación de URLs firmadas
  de corta duración.
- `POST /api/certificates/issue` y `GET /api/certificates/:id/download`:
  autenticados, con verificación de rol a nivel de aplicación (el backend
  usa service_role y por lo tanto no hereda las restricciones de RLS).
- `backend/Dockerfile`: multi-stage, instala Chromium vía apt para
  puppeteer-core — no se pudo construir en este entorno (sin Docker),
  queda marcado como pendiente de verificar antes de producción.
- 17 pruebas nuevas (43 en total en el backend) + 3 de Storage (RLS).

## [Bloque 7] - 2026-07-22
### Added
- `supabase/migrations/0014`: se relajó `FORCE ROW LEVEL SECURITY` en las
  14 tablas restantes (mismo motivo que 0009) — consolidado en una sola
  migración documentada, no parches reactivos. Re-validado contra las 3
  suites de RLS anteriores sin regresiones.
- `0015`: `alerts.notified_at` + trigger automático `trg_alert_on_no_go`
  (crea una alerta CRITICA en cuanto una tarjeta GO/NO-GO da NO_GO).
- `0016`: tabla `push_subscriptions` (17ma, justificada — ver DDL_NOTES.md)
  con RLS.
- Motor de alertas: `alertRules.ts` (3 escaneos: médico por vencer,
  mantenimiento vencido, firma pre-vuelo pendiente), `alertRecipients.ts`
  (política de destinatarios por tipo), 3 canales
  (`alertChannels/{email,webhook,push}.ts`) y `alertDispatcher.ts`
  (orquesta los 3, resiliente a fallos parciales).
- `POST /api/alerts/scan` (secreto compartido, pensado para un scheduler)
  y `POST /api/push/subscribe` (autenticado).
- 60 pruebas de backend en total (17 nuevas de este bloque) + 4 pruebas
  SQL nuevas — todas verdes. `tsc --noEmit` y `npm run build` limpios.

## [Bloque 8] - 2026-07-22
### Added
- `supabase/migrations/0017`: tabla `evaluation_questions` (18va, ver
  DDL_NOTES.md) con RLS que excluye por completo a ALUMNO/PILOTO — 4
  pruebas verdes, incluido el caso crítico de que un alumno no vea
  respuestas correctas.
- `promptRunner.ts`: runner compartido entre `/api/claude` y las rutas
  nuevas — valida input, llama a Claude, audita siempre (éxito o fallo),
  y AHORA valida la salida JSON contra `outputSchema` cuando aplica.
- `promptTemplates.ts`: plantillas `v1.1` (preguntas de evaluación, JSON
  validado) y `v1.2` (descripción de curso, texto) — documentadas en
  `docs/PROMPTS.md`.
- `POST /api/evaluations/generate-questions` y
  `PATCH /api/evaluations/questions/:id/review`: generación con revisión
  humana obligatoria antes de uso (contenido entra como BORRADOR).
- `authorize.ts`: refactor con `getUserRoleName` compartido +
  `isAdminOrJefeOrInstructor` (ADMIN/JEFE_PILOTOS/INSTRUCTOR).
- `routes/claude.ts` refactorizado sobre `promptRunner.ts` — 85/85 tests
  totales del backend en verde, incluidos todos los de bloques previos
  (confirma que el refactor no rompió nada).

## [Bloque 9] - 2026-07-22
### Added
- `render.yaml`: Blueprint del backend para Render (staging).
- `.github/workflows/ci.yml` extendido: build de Docker del backend +
  job `supabase-migrations` (Postgres real como service container,
  aplica las 17 migraciones y corre las 6 suites SQL como gate).
- `.github/workflows/deploy-staging.yml`: deploy a Vercel (frontend) y
  Render (backend), gateado detrás de que CI pase.
- `.github/workflows/alerts-scan.yml`: cron cada 15 min a
  `POST /api/alerts/scan` (cierra el pendiente del Bloque 7).
- `supabase/tests/006_business_rules_triggers.test.sql`: cobertura
  recuperada de los triggers RAC 100.510 / RAC 120 / GO-NO-GO del
  Bloque 2 (9 pruebas, incluida la integración con la alerta automática
  del Bloque 7) — se encontró y corrigió un bug de aserción en el test
  (ordenamiento por `created_at` sin desempate).
- `docs/DEPLOYMENT.md`: guía completa de despliegue (secretos, pasos de
  Vercel/Render, nota de CORS con dominios efímeros).
- `infra/README.md` actualizado: decisión de infraestructura ejecutada
  (Vercel + Render), ya no un comparativo abierto.
- Docker instalado en el entorno de desarrollo; Dockerfile validado
  sintácticamente ahí, build completo verificado vía GitHub Actions
  (Docker Hub estaba bloqueado en el entorno de desarrollo).

## [Bloque 10] - 2026-07-22
### Security
- Backend: `nodemailer` 6→9 (corrige 6 CVEs ALTAS), `fastify` 4→5 (corrige
  3 CVEs ALTAS en la cadena de dependencias) — **0 vulnerabilidades**,
  85/85 tests siguen verdes sin cambios de código en las rutas.
- Frontend: `next` 14→16 (corrige ~15 CVEs ALTAS sin backport a 14.x).
  Requirió: `cookies()` ahora async (4 call sites actualizados),
  `middleware.ts` → `proxy.ts` (Next 16 lo deprecó; verificado en runtime
  real que sigue protegiendo `/dashboard` y refrescando la sesión), y
  migración de ESLint a flat config (`next lint` fue eliminado en Next 16).
- 2 vulnerabilidades de bajo riesgo evaluadas y aceptadas con
  justificación (ver `docs/SECURITY_AUDIT.md`), no omitidas.

### Added
- `backend/loadtest/run.mjs`: script de carga reproducible, probado
  contra el backend real en este entorno — confirma el rate limiting con
  precisión exacta bajo tráfico concurrente.
- `docs/SECURITY_AUDIT.md`: auditoría consolidada con evidencia real de
  ejecución (no solo checklist leído).
- `docs/GO_LIVE_CHECKLIST.md`: separa lo verificado de lo pendiente de
  infraestructura real; incluye pasos de dominio final y plan de
  backups/rollback (cierra pendiente del Bloque 9).
