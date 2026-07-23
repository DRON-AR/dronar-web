# Despliegue a Staging (Bloque 9)

## Decisión de infraestructura

Del comparativo de `infra/README.md` (Bloque 1): **Vercel** para frontend
(recomendado ahí) y **Render** para backend (más simple que Fargate para
un entorno de staging — Fargate queda como opción para endurecer producción
más adelante si el compliance aeronáutico lo exige, tal como se dejó
anotado desde el Bloque 1).

## Cómo queda armado el pipeline

1. `ci.yml` corre en cada PR y en cada push a `main`/`staging`: lint +
   typecheck + build del frontend, typecheck + test + build del backend,
   build de la imagen Docker del backend (sin publicar), y las 6 suites
   SQL contra un Postgres real de GitHub Actions — **cualquier fallo
   bloquea el pipeline**, incluidas las pruebas SQL (ver nota abajo).
2. `deploy-staging.yml` se dispara SOLO cuando `CI` termina en éxito sobre
   la rama `staging` — nunca se despliega código que no pasó las pruebas.
   Despliega frontend a Vercel (entorno preview) y backend a Render (vía
   deploy hook).
3. `alerts-scan.yml` — cron cada 15 min que llama a `POST /api/alerts/scan`
   en el backend de staging (cierra el pendiente del Bloque 7).

### Nota sobre las pruebas SQL en CI

Las pruebas en `supabase/tests/*.test.sql` reportan resultado con
`RAISE NOTICE` (para lectura humana en `psql` local), no con
`RAISE EXCEPTION` — así que un fallo de aserción no hace que `psql` mismo
devuelva un código de salida distinto de cero. El job `supabase-migrations`
de `ci.yml` compensa esto: captura la salida completa y falla el step si
aparece la palabra `FALLÓ` en cualquier parte. Es más simple y menos
arriesgado que reescribir el control de flujo de PL/pgSQL en los ~25 casos
existentes, y logra exactamente el mismo efecto de bloquear el pipeline.

## Secretos de GitHub necesarios

Settings > Secrets and variables > Actions, en el repo:

| Secreto | Para qué |
|---|---|
| `VERCEL_TOKEN` | Deploy del frontend |
| `VERCEL_ORG_ID` | Deploy del frontend |
| `VERCEL_PROJECT_ID` | Deploy del frontend |
| `RENDER_DEPLOY_HOOK_URL` | Disparar el deploy del backend en Render |
| `BACKEND_STAGING_URL` | URL del backend en Render, para el cron de alertas |
| `ALERTS_SCAN_SECRET` | Debe ser el MISMO valor que `ALERTS_SCAN_SECRET` configurada en Render |

## Pasos manuales (una sola vez)

### Vercel (frontend)
1. `npm install -g vercel` localmente, `vercel login`, `vercel link` dentro
   de `frontend/` para crear el proyecto y obtener `VERCEL_ORG_ID` /
   `VERCEL_PROJECT_ID` (quedan en `frontend/.vercel/project.json`).
2. Generar un token en Vercel (Account Settings > Tokens) → `VERCEL_TOKEN`.
3. En el dashboard de Vercel, configurar las variables de entorno del
   proyecto para el entorno **Preview**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE_URL` (la URL de
   Render del paso siguiente).
4. **Importante — CORS**: por defecto cada deploy de Vercel genera una URL
   efímera distinta. Para que `FRONTEND_ORIGIN` del backend no tenga que
   cambiar en cada deploy, asignale un **alias de rama estable** a
   `staging` (Vercel > Project > Settings > Domains > agregar un dominio/
   alias apuntado a la rama `staging`) y usa ESE alias como
   `FRONTEND_ORIGIN` en Render, no la URL de un deploy individual.

### Render (backend)
1. Dashboard de Render > New > Blueprint > conectar este repo → detecta
   `render.yaml` automáticamente y crea el servicio `dronar-backend-staging`.
2. Completar en el dashboard todas las variables marcadas `sync: false`
   en `render.yaml` (usar los mismos valores que `backend/.env.example`
   documenta, con datos reales de tu proyecto Supabase/Anthropic/SMTP).
3. Settings > Deploy Hook → copiar la URL → `RENDER_DEPLOY_HOOK_URL` en
   GitHub Secrets.
4. La URL pública que Render asigna (`https://dronar-backend-staging.onrender.com`
   o similar) es el **dominio temporal** de staging para el backend →
   `BACKEND_STAGING_URL` en GitHub Secrets, y también lo que
   `NEXT_PUBLIC_API_BASE_URL` debe apuntar en Vercel.

### Supabase
Las migraciones (`supabase/migrations/`) se aplican al proyecto Supabase
de staging vía `supabase db push` (ver `docs/DDL_NOTES.md`) — esto NO
está automatizado en el pipeline todavía porque aplicar migraciones
automáticamente en cada deploy es una decisión que conviene tomar con
cuidado (¿antes o después del deploy del backend? ¿con qué rollback?).
Se deja como paso manual intencionalmente; se puede automatizar en un
bloque posterior si el equipo decide una estrategia de rollback primero.

## Qué es "dominio temporal" en este bloque

Ni Vercel ni Render requieren comprar un dominio para staging — ambos
asignan uno gratuito automáticamente (`*.vercel.app`, `*.onrender.com`).
Eso ES el dominio temporal de este bloque. El dominio final con DNS propio
de Camper Aeronautical es explícitamente el Bloque 10, no este.
