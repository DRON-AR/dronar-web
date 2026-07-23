# Checklist de Go-Live (Bloque 10)

Orden sugerido. Lo marcado [Ejecutado] se verificó en este proyecto con
evidencia real (ver `SECURITY_AUDIT.md`); lo marcado [Pendiente] requiere
acceso a infraestructura real (Supabase/Vercel/Render/Anthropic) que este
entorno de desarrollo no tiene.

## Antes de abrir tráfico real

- [Ejecutado] `npm audit` limpio en backend (0 vulnerabilidades)
- [Ejecutado] Vulnerabilidades altas del frontend resueltas (Next 14→16);
  las 3 restantes evaluadas y aceptadas con justificación documentada
- [Ejecutado] Rate limiting verificado bajo carga real (no solo leído en código)
- [Ejecutado] Headers de seguridad y CORS verificados por request real
- [Ejecutado] `proxy.ts` (ex-middleware) verificado en runtime real
- [Ejecutado] Las 85 pruebas de backend + 6 suites SQL (52 pruebas) en verde
- [Pendiente] Login end-to-end contra el proyecto Supabase real de producción
- [Pendiente] Emisión de un certificado real (PDF) contra Chromium real en el
  Dockerfile ya construido en CI (Bloque 9)
- [Pendiente] Confirmar que `ALERTS_SCAN_SECRET` en GitHub Secrets coincide
  exactamente con el valor configurado en Render
- [Pendiente] Confirmar `FRONTEND_ORIGIN` en Render apunta al alias de rama
  estable de Vercel para producción, no a una URL de preview efímera

## Infraestructura

- [Pendiente] Dominio final comprado y verificado (ver sección "Dominio final" abajo)
- [Pendiente] TLS activo en el dominio final (automático en Vercel/Render una
  vez verificado el dominio — no requiere acción manual de certificados)
- [Pendiente] Snapshots diarios de Supabase confirmados activos (ver
  "Backups y rollback" abajo)
- [Pendiente] Todas las variables de `backend/.env.example` completadas con
  valores reales en Render (no placeholders)
- [Pendiente] Todas las variables `NEXT_PUBLIC_*` completadas en Vercel

## Datos y contenido

- [Pendiente] Al menos un usuario ADMIN real creado (vía Supabase Auth +
  el trigger de `0012` que le asigna perfil automáticamente, luego
  promovido a ADMIN manualmente en la base — ver `docs/DDL_NOTES.md`)
- [Pendiente] Umbrales GO/NO-GO (`0006`) confirmados contra el manual de
  operaciones real de Camper Aeronautical — siguen siendo placeholders de
  ingeniería, marcados así desde el Bloque 2
- [Pendiente] Deshabilitar signup público en Supabase Auth si el modelo de
  alta admin-iniciada (Bloque 5) es el que el equipo quiere en producción

## Después de abrir tráfico

- [Pendiente] Confirmar que el cron de `alerts-scan.yml` está corriendo
  (revisar Actions > alerts-scan en GitHub tras 15-30 min)
- [Pendiente] Revisar el primer certificado emitido en producción
  manualmente antes de confiar en el flujo sin supervisión
- [Pendiente] Configurar Sentry (`SENTRY_DSN` existe como variable desde
  el Bloque 1 pero nunca se conectó — observabilidad real queda como
  trabajo posterior a este roadmap de 10 bloques)

## Dominio final

Este proyecto usó dominios temporales (`*.vercel.app`, `*.onrender.com`)
en el Bloque 9. Para el dominio final de Camper Aeronautical:

1. **Frontend (Vercel)**: Project Settings > Domains > agregar el dominio
   (p. ej. `app.camperaeronautical.com`) → Vercel entrega los registros
   DNS a crear (típicamente un `CNAME` hacia `cname.vercel-dns.com`, o un
   registro `A` si es el dominio raíz). TLS se emite automáticamente
   (Let's Encrypt vía Vercel) una vez el DNS propaga — no hay paso manual
   de certificados.
2. **Backend (Render)**: Settings > Custom Domain → agregar un subdominio
   (p. ej. `api.camperaeronautical.com`) → Render entrega un `CNAME`.
   TLS también automático.
3. Actualizar `FRONTEND_ORIGIN` en Render y `NEXT_PUBLIC_API_BASE_URL` en
   Vercel para que apunten a los dominios finales, no a los temporales.
4. Actualizar `BACKEND_STAGING_URL`/equivalente de producción en GitHub
   Secrets si se separan entornos de staging y producción con dominios
   distintos.

## Backups y plan de rollback

Pendiente explícito desde el Bloque 9 (ver `infra/README.md`), cerrado
aquí con una decisión concreta:

### Backups de Supabase
Supabase realiza **backups diarios automáticos** en los planes Pro y
superiores (retención de 7 días); el plan Free no incluye backups
automáticos — si el proyecto de producción corre en el plan Free, hay que
subir de plan antes de go-live o configurar `pg_dump` programado como
alternativa manual. Point-in-Time Recovery (restauración a un segundo
específico, no solo al snapshot diario) requiere el add-on correspondiente
en el dashboard de Supabase — evaluarlo según cuán crítica sea la
tolerancia a pérdida de datos para Camper Aeronautical.

### Rollback de un deploy malo
- **Frontend (Vercel)**: Deployments > seleccionar el deploy anterior >
  "Promote to Production" — instantáneo, sin rebuild.
- **Backend (Render)**: Deploys > seleccionar el deploy anterior >
  "Rollback" — Render mantiene las imágenes de deploys previos.
- **Migraciones de base de datos**: este proyecto sigue una filosofía de
  migraciones solo hacia adelante (nunca se edita una migración ya
  aplicada — ver `docs/DDL_NOTES.md` y el propio historial de 0009→0014
  como ejemplo de "corregir con una migración nueva, no reescribiendo la
  vieja"). Si una migración nueva causa un problema en producción, el
  rollback es escribir y aplicar una migración adicional que revierta el
  cambio específico — no hay un mecanismo automático de "deshacer la
  última migración". Esto es una decisión consciente (más trazable que un
  rollback automático) que el equipo debe conocer antes de go-live.
