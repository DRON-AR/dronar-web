# DRONAR — Migración AppSheet → Next.js + Supabase

Monorepo de la migración de "DRONAR" (Camper Aeronautical) desde AppSheet hacia:

- **frontend/** — Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion
- **backend/** — Node.js + Fastify + TypeScript (proxy seguro a Anthropic Claude, API REST, generación de PDFs)
- **infra/** — Definiciones de despliegue (Vercel, Render/Fargate), CI/CD, notas de Supabase
- **docs/** — Checklist de seguridad, versionado de prompts, changelog funcional

## Estado

**Los 10 bloques del roadmap original están completos.** Bloque 10: auditoría de seguridad con evidencia real de ejecución (no solo checklist) — se encontraron y corrigieron ~20 vulnerabilidades reales (nodemailer, Fastify, Next.js), con dos migraciones de breaking changes verificadas en runtime real (cookies async, middleware→proxy). Rate limiting probado bajo carga real con resultados exactos. Ver `docs/GO_LIVE_CHECKLIST.md` para lo que queda pendiente de infraestructura real (Supabase/Vercel/Render de producción) antes de abrir tráfico a usuarios.

## Orden de bloques (referencia)

1. ✅ Repos y estructura
2. ✅ Esquema DDL Supabase (16 tablas mínimas + triggers de negocio)
3. ✅ RLS policies (16 tablas) + pruebas con JWT simulado
4. ✅ Backend proxy `/api/claude` (plantillas versionadas, rate limit propio, auditoría de IA)
5. Frontend: auth flow + dashboard
6. Generador de certificados (HTML → PDF)
7. Motor de alertas (email, webhooks, push)
8. Integración avanzada Claude (evaluaciones, contenido versionado)
9. CI/CD + staging
10. Pruebas de carga/seguridad + go-live

## Requisitos locales

- Node.js 20+
- pnpm 9+ (recomendado) o npm
- Cuenta Supabase (para bloques posteriores)
- Docker (opcional, para levantar Postgres local antes de conectar Supabase)

## Quickstart

```bash
# Frontend
cd frontend && cp .env.example .env.local && pnpm install && pnpm dev

# Backend
cd backend && cp .env.example .env && pnpm install && pnpm dev
```
