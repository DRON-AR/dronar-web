# Infraestructura

## Decisión tomada (Bloque 9)

| Componente | Elegido | Alternativa considerada |
|---|---|---|
| Frontend | **Vercel** (nativo para Next.js, preview deploys automáticos) | Render Static Site |
| Backend (staging) | **Render** (Docker, deploy hooks simples, gratis para staging) | AWS Fargate — se deja como opción para endurecer producción si el compliance aeronáutico lo exige (más control de red/VPC) |
| Base de datos / Auth / Storage | Supabase gestionado (obligatorio por stack) | — |

Ver `docs/DEPLOYMENT.md` para los pasos de configuración completos
(secretos de GitHub, variables de entorno por plataforma, notas de CORS).

## Estado
- [x] `render.yaml` (Blueprint del backend)
- [x] `.github/workflows/ci.yml` (tests + build + build de Docker + 6 suites SQL)
- [x] `.github/workflows/deploy-staging.yml` (gateado detrás de CI)
- [x] `.github/workflows/alerts-scan.yml` (cron, cierra el pendiente del Bloque 7)
- [ ] Dominio final propio + TLS — Bloque 10
- [ ] Automatizar `supabase db push` en el pipeline — decisión pendiente de estrategia de rollback (ver `docs/DEPLOYMENT.md`)
- [ ] Snapshots diarios de Supabase y plan de rollback documentado — Bloque 10
