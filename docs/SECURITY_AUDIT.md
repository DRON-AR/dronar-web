# Auditoría de seguridad — Bloque 10 (pre go-live)

Consolida lo verificado en los Bloques 1-9 (ver `SECURITY_CHECKLIST.md` por
bloque) más lo que se probó de punta a punta en este bloque, con evidencia
real de ejecución, no solo enumeración de controles.

## 1. Dependencias — `npm audit`

| Paquete | Hallazgo | Acción |
|---|---|---|
| `nodemailer` (backend) | 6 vulnerabilidades ALTAS (inyección SMTP, SSRF, bypass de TLS) | Actualizado a `^9.0.3`. 85/85 tests siguen verdes. **0 vulnerabilidades backend.** |
| `fastify` + cadena `fast-uri` (backend) | 3 vulnerabilidades ALTAS (DoS, bypass de validación de Content-Type, spoofing de `X-Forwarded-*`) | Se verificó que el código no usa ninguna de las 3 superficies afectadas (sin `schema.body`, sin `request.protocol`/`hostname`, sin streams). Se actualizó igual a Fastify 5 por higiene — 85/85 tests verdes, 0 vulnerabilidades. |
| `next` (frontend) | ~15 vulnerabilidades ALTAS (DoS, SSRF, envenenamiento de caché, XSS) — sin backport a la línea 14.x | Actualizado a Next 16.2.11. Rompió `cookies()` (ahora async) y `middleware.ts` (deprecado a favor de `proxy.ts`) — ambos corregidos y verificados en runtime real (ver sección 3). |
| `sharp`/`postcss` anidados en `next` (frontend) | 1 alta + 1 moderada | El proyecto no usa `next/image` — superficie no alcanzable. Aceptado, documentado. |
| `cookie` en `@supabase/ssr` (frontend) | 1 baja | Fix requiere salto 0.4→0.12 de `@supabase/ssr`, sin forma de verificar el flujo de login end-to-end en este entorno (sin proyecto Supabase real). Severidad baja + riesgo de romper auth sin poder probarlo → **diferido deliberadamente**, no omitido en silencio. |
| `uuid` vía `hyperid` en `autocannon` (backend, solo devDependency) | 1 moderada | `autocannon` nunca se empaqueta en `dist/` (`npm ci --omit=dev` en el Dockerfile) ni corre en producción. Riesgo real nulo. Aceptado. |

**Resultado backend: 0 vulnerabilidades. Frontend: 3 restantes, las 3 con
superficie de ataque verificada como no alcanzable o riesgo de fix mayor
que el problema.**

## 2. Pruebas de carga — resultados reales (no proyectados)

Corridas contra una instancia real del backend en este entorno
(`backend/loadtest/run.mjs`, reproducible contra staging):

| Prueba | Resultado |
|---|---|
| `/health`, 20 conexiones concurrentes, límite global configurado a 20/10s | **Exactamente** 20 respuestas 200, 15,335 respuestas 429 sobre 15,355 peticiones |
| `/api/claude` sin auth, 10 conexiones concurrentes, límite de ruta a 5/10s | **Exactamente** 5 respuestas 401 (guard de auth corriendo tras el rate limit), 14,976 respuestas 429 |

Ambos resultados confirman que el rate limiting no es "aproximado" — corta
exactamente en el número configurado, y las dos capas (rate limit +
autenticación) están activas y en el orden correcto (rate limit primero,
según diseño del Bloque 4).

## 3. Verificación de runtime real (no solo build)

- Headers de seguridad (`helmet`) confirmados por request real:
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: no-referrer`, `Strict-Transport-Security`.
- CORS: un `Origin` no autorizado (`evil.example.com`) recibe
  `Access-Control-Allow-Origin: <FRONTEND_ORIGIN configurado>` — **nunca
  refleja el origen de la petición** (confirmado con curl comparando
  origen permitido vs. no permitido).
- `proxy.ts` (frontend, ex-`middleware.ts`) probado contra un `next start`
  real: `GET /dashboard` y `GET /` sin cookies de sesión devuelven `307`
  hacia `/login`; `GET /login` responde `200`.

## 4. Qué NO se pudo probar en este entorno (limitaciones honestas)

- **Login end-to-end real** contra un proyecto Supabase real — este
  entorno no tiene credenciales de un proyecto Supabase provisto. Los
  flujos de auth se verificaron por composición (RLS probado contra
  Postgres real en los Bloques 3-9; `proxy.ts`/`page.tsx` probados con
  redirecciones reales), pero no hay una corrida real de
  "usuario se loguea, ve su dashboard con datos reales".
- **Generación real de PDF con Puppeteer-core** — Chromium real no estuvo
  disponible en este entorno (ver Bloque 6); `pdfGenerator.ts` se probó
  con un navegador simulado.
- **`backend/Dockerfile`** — build completo verificado vía GitHub Actions
  (Bloque 9), no en este entorno (Docker Hub bloqueado acá).
- **Pruebas de carga contra Claude/Supabase reales** — las pruebas de
  carga de este bloque corrieron sin credenciales reales (validan el
  comportamiento de rate limit/auth, no el costo o latencia real de
  llamar a Claude o Supabase bajo carga — eso requiere staging real).

## 5. Recomendación de severidad para go-live

Ningún hallazgo de este bloque bloquea el go-live *técnicamente* (nada
alcanzable quedó sin corregir), pero el punto 4 sí son verificaciones que
alguien con acceso a Supabase/staging real debe correr antes de abrir el
tráfico a usuarios reales — ver `GO_LIVE_CHECKLIST.md`.
