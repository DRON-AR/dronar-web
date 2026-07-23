# Checklist de seguridad — Bloque 1

- [x] `.gitignore` excluye `.env*` reales (solo se versiona `.env.example`).
- [x] Ninguna clave (`CLAUDE_API_KEY`, `SUPABASE_SERVICE_ROLE`, `JWT_SECRET`) está
      hardcodeada en ningún archivo del repo — todas viven en `.env.example`
      como placeholders vacíos.
- [x] `FRONTEND_ORIGIN` es la única variable que controla CORS en el backend
      (`backend/src/plugins/security.ts`); el servidor falla al arrancar si
      no está definida, en vez de caer a un origin permisivo por defecto.
- [x] Rate limiting global registrado desde el arranque del servidor
      (`@fastify/rate-limit`), configurable vía `RATE_LIMIT_MAX` /
      `RATE_LIMIT_WINDOW`.
- [x] Cabeceras de seguridad activas en frontend (`next.config.mjs`) y
      backend (`@fastify/helmet`).
- [x] Ninguna variable `NEXT_PUBLIC_*` contiene un secreto — el frontend
      solo conoce `SUPABASE_ANON_KEY` (clave pública por diseño de Supabase).
- [x] Estructura preparada para que RLS (Bloque 3) y el proxy `/api/claude`
      con logging de auditoría (Bloque 4) no requieran reestructurar carpetas.

## Pendiente (bloques posteriores, no bloquea este entregable)
- [ ] Políticas RLS por tabla (Bloque 3).
- [ ] Sanitización Zod + logging con hash de auditoría en `/api/claude` (Bloque 4).
- [ ] Secretos reales cargados en GitHub Actions / Vercel / Render (Bloque 9).
- [ ] Snapshots diarios y plan de rollback documentado (Bloque 9-10).

## Bloque 4 — /api/claude
- [x] El cliente nunca envía texto libre a Claude: solo `prompt_version` +
      variables tipadas; el prompt final se arma en el servidor desde
      `promptTemplates.ts` (mitiga prompt injection y abuso de costo).
- [x] Autenticación obligatoria (401 sin JWT válido) — verificado vía
      Supabase Auth (`supabase.auth.getUser`), no decodificación local.
- [x] Rate limit propio de la ruta (`CLAUDE_RATE_LIMIT_MAX`/`_WINDOW`,
      default 10/min), separado y más estricto que el límite global.
- [x] Clave de rate limit por usuario autenticado o por IP anónima
      (requisito explícito de las reglas del proyecto), con documentación
      clara de que la extracción del `sub` para esto NO es autenticación
      real — la verificación real ocurre después en `authenticate.ts`.
- [x] Auditoría de IA: `audit_prompts` recibe `user_id`, `prompt_version`,
      `prompt_hash`, `response_hash` — nunca el texto en claro. Se registra
      también en llamadas fallidas (response_hash = NULL).
- [x] `SUPABASE_SERVICE_ROLE`/`CLAUDE_API_KEY` solo se leen desde
      `process.env` en el backend; cero referencias en el frontend.
- [x] 26 pruebas (unitarias + integración con Fastify `inject`) — todas
      verdes: hash, schemas, plantillas, derivación de clave de rate limit,
      cliente Claude (con `fetch` simulado) y guard de autenticación.
- [ ] Pendiente (fuera de alcance de "proxy mínimo"): pruebas de carga
      contra el rate limit real y hardening adicional contra prompt
      injection en el contenido generado — ver Bloque 10.

## Bloque 5 — Auth flow + Dashboard
- [x] `/dashboard` protegido en dos capas: `middleware.ts` (red) y
      `page.tsx` (revalida sesión server-side antes de leer datos).
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la única clave en el cliente —
      ninguna clave de servicio llega al navegador.
- [x] El perfil (`public.users`) se lee siempre server-side, respetando
      RLS (Bloque 3) — el cliente no puede pedir el perfil de otro usuario.
- [x] Errores de login genéricos ("no pudimos verificarte") — nunca se
      revela si el correo existe o si falló la contraseña específicamente
      (evita enumeración de usuarios).
- [x] Migración 0012 (auto-creación de perfil): probada con 3 casos,
      incluyendo que un intento de duplicar el id con rol ADMIN falla por
      constraint, no escala privilegios silenciosamente.
- [ ] Sin página de registro por diseño — alta de usuarios es admin-iniciada
      (ver 0012). Recomendado: deshabilitar signup público en el dashboard
      de Supabase Auth si el equipo no lo ha hecho ya.
- [x] `npx tsc --noEmit`, `next lint` y `next build` (aislando la carga de
      fuentes) — todos limpios en este entorno; el build completo con
      `next/font` requiere acceso real a Google Fonts (bloqueado en este
      sandbox, no en el entorno real de desarrollo/CI).

## Bloque 6 — Certificados HTML → PDF
- [x] Texto de certificado EXACTO (incluida cláusula NIST) — probado
      carácter por carácter, no solo "contiene la palabra NIST".
- [x] HTML autocontenido: sin fuentes de Google ni CSS remoto — Puppeteer
      renderiza sin necesitar salida de red desde el proceso del backend.
- [x] Todo campo interpolado (nombre, curso) se escapa antes de insertarse
      en el HTML — probado explícitamente contra inyección de `<script>`.
- [x] `POST /api/certificates/issue` exige ADMIN/JEFE_PILOTOS a nivel de
      aplicación (el backend usa service_role, que bypassa RLS — sin este
      check, la ruta quedaría efectivamente abierta a cualquier usuario
      autenticado).
- [x] Solo se emiten certificados para evaluaciones con `result = APROBADO`;
      no se puede duplicar un certificado para la misma evaluación.
- [x] Bucket `certificates` privado, sin política de escritura para
      `authenticated` (mismo patrón que audit_prompts/logs/alerts).
- [x] URLs de descarga siempre firmadas y de corta duración (5 min
      default) — nunca una URL pública permanente.
- [x] `renderHtmlToPdf` cierra el browser incluso si falla la generación
      del PDF (probado) — evita procesos Chromium huérfanos en el server.
- [x] Puppeteer-core (no `puppeteer`) + Chromium instalado vía apt en
      `backend/Dockerfile` — sin descargas de binario en cada build.
- 43/43 pruebas verdes (unitarias + integración), `tsc --noEmit` y
  `npm run build` limpios.
- [ ] `backend/Dockerfile` no se pudo construir/verificar en este entorno
      (sin Docker disponible) — probarlo antes de confiar en él para
      producción, es el único artefacto de este bloque sin ejecución real.

## Bloque 7 — Motor de alertas
- [x] `FORCE ROW LEVEL SECURITY` relajado en las 14 tablas restantes
      (0014) — mismo razonamiento que 0009 (Bloque 3), consolidado en una
      sola migración en vez de parches reactivos tabla por tabla. Se
      confirmó que las 3 suites de RLS anteriores (001/002/003) siguen
      100% en verde después del cambio — no se perdió ninguna restricción
      real (solo se quitó fricción sobre el dueño de tabla, que nunca
      sirve tráfico de usuarios).
- [x] Alerta automática NO_GO a nivel de trigger de base de datos (0015)
      — no depende del backend para dispararse, ni de que el scan
      periódico la detecte a tiempo.
- [x] `alerts.notified_at` evita reenvíos duplicados en cada ciclo de
      escaneo — probado explícitamente.
- [x] `/api/alerts/scan` protegida con secreto compartido (falla CERRADO
      con 500 si `ALERTS_SCAN_SECRET` no está configurada, nunca abre el
      endpoint por accidente) — probado.
- [x] Webhook de alertas firmado con HMAC-SHA256 cuando hay secreto
      configurado — probado que la firma se calcula y se omite
      correctamente según configuración.
- [x] Un canal caído (email/webhook/push) no bloquea a los demás ni a
      otras alertas del mismo ciclo — probado con fallos inyectados.
- [x] `push_subscriptions`: cada usuario solo puede crear suscripciones a
      su propio nombre (probado) — ver Bloque 3 para el patrón RLS.
- 60/60 pruebas de backend + 4 pruebas SQL nuevas (16 migraciones × RLS,
  triggers y alertas automáticas), todas verdes.

## Bloque 8 — Integración avanzada Claude (evaluaciones y contenido)
- [x] `/api/claude` refactorizado sobre `promptRunner.ts` compartido —
      re-validado contra los 85 tests totales del backend, sin regresión.
- [x] Validación de salida JSON: si `expected_output_format` es JSON y hay
      `outputSchema`, la respuesta de Claude se parsea y valida con Zod
      ANTES de devolverse o guardarse — el Bloque 4 no hacía esto.
- [x] Contenido generado para evaluaciones (`v1.1`) SIEMPRE entra como
      `BORRADOR` — nunca se usa en un examen real sin revisión humana
      explícita (`PATCH .../review`).
- [x] `evaluation_questions`: RLS bloquea a ALUMNO/PILOTO por completo —
      probado como caso CRÍTICO explícito (ver `005_evaluation_questions_policy.test.sql`).
- [x] Prompts de v1.1/v1.2 instruyen a Claude a no inventar cifras
      regulatorias, de empleabilidad ni normativa no verificable —
      mitigación de alucinación a nivel de prompt, no solo de validación
      de esquema.
- [x] `isAdminOrJefeOrInstructor` falla cerrado (false) si el usuario no
      existe o el rol no se puede resolver — probado.
- 85/85 pruebas de backend + 5 pruebas SQL nuevas (17 migraciones),
  todas verdes. `tsc --noEmit` y `npm run build` limpios.

## Bloque 9 — CI/CD y despliegue en staging
- [x] Se instaló Docker en el entorno de desarrollo y se validó la
      sintaxis/estructura de `backend/Dockerfile` (25 instrucciones, 2
      stages) — el build real no pudo completarse ahí porque Docker Hub
      está bloqueado por la política de red de ESE entorno específico
      (403 del proxy). Se agregó un job de CI (`backend-docker-build`)
      que sí construye la imagen completa en GitHub Actions, donde Docker
      Hub es accesible — cierra la verificación pendiente desde el Bloque 6.
- [x] Corregido un gap real: las pruebas SQL usaban `RAISE NOTICE` (nunca
      hacían fallar el script) — un CI que las corriera "pasaría" aunque
      algo estuviera roto. El job `supabase-migrations` ahora falla el
      pipeline si aparece "FALLÓ" en la salida de cualquier suite.
- [x] Se recuperó cobertura de pruebas perdida: los triggers de negocio
      del Bloque 2 (RAC 100.510, RAC 120, GO/NO-GO) nunca habían quedado
      como archivo de test permanente — se agregó `006_business_rules_triggers.test.sql`,
      que además prueba la integración con la alerta automática del
      Bloque 7 (que el NO_GO efectivamente disparó la alerta CRITICA).
      Se encontró y corrigió un bug en el test mismo (uso de
      `ORDER BY created_at` sin desempate, cuando `now()` es estable
      dentro de una transacción) — no era un bug del trigger real.
- [x] `deploy-staging.yml` NUNCA despliega si `CI` no terminó en éxito
      (trigger `workflow_run` filtrado por conclusion == success).
- [x] Ningún secreto real en el repo — `render.yaml` usa `sync: false`
      para todo valor sensible; deploy hooks y tokens viven en GitHub
      Secrets.
- [x] Nota de CORS documentada explícitamente: usar un alias de rama
      estable de Vercel para `FRONTEND_ORIGIN`, no la URL efímera de un
      deploy individual (rompería CORS en cada nuevo deploy si no).
- [ ] `supabase db push` sigue siendo un paso manual — automatizarlo
      requiere primero decidir una estrategia de rollback (documentado
      como pendiente explícito en `docs/DEPLOYMENT.md`, no una omisión
      silenciosa).

## Bloque 10 — Pruebas de carga, seguridad y go-live
- [x] `npm audit` backend: 6 ALTAS encontradas y corregidas (nodemailer,
      cadena fast-uri/fastify) → **0 vulnerabilidades**. Upgrade a
      Fastify 5 validado con 85/85 tests, sin cambios de código necesarios.
- [x] `npm audit` frontend: ~17 vulnerabilidades encontradas (15+ ALTAS en
      Next.js, sin backport a la línea 14.x) → Next 14→16. Dos breaking
      changes reales encontrados y corregidos: `cookies()` async, y
      `middleware.ts` deprecado en favor de `proxy.ts` — este segundo
      verificado en runtime real (curl contra `next start`), no solo
      "el build no truena".
- [x] 2 vulnerabilidades de bajo riesgo real (sharp/postcss no alcanzables
      sin `next/image`; `cookie` en `@supabase/ssr` de severidad baja)
      evaluadas y aceptadas con justificación explícita — no omitidas en
      silencio, documentadas en `docs/SECURITY_AUDIT.md`.
- [x] Rate limiting probado bajo carga real (`autocannon`), no solo
      revisado en código: 20/20 exacto en `/health`, 5/5 exacto en
      `/api/claude` (rate limit antes que auth, como diseñado en Bloque 4).
- [x] Headers de seguridad y comportamiento de CORS confirmados con
      requests HTTP reales contra el servidor corriendo — CORS nunca
      refleja un origen no autorizado.
- [x] `docs/GO_LIVE_CHECKLIST.md`: separa explícitamente lo verificado en
      este entorno de lo que requiere infraestructura real (Supabase/
      Vercel/Render de producción) — sin fingir haber probado lo que no
      se pudo probar.
- [x] Backups (Supabase daily backups, PITR opcional) y plan de rollback
      (Vercel/Render instant rollback; migraciones solo hacia adelante,
      documentado como decisión consciente) — cierra el pendiente del
      Bloque 9.
