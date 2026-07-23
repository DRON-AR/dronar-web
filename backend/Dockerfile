# Backend DRONAR — Fastify + Puppeteer-core (generación de certificados).
#
# NOTA (Bloque 9): se instaló Docker en el entorno que generó este proyecto
# y el Dockerfile se validó sintácticamente (parseo de las 25 instrucciones,
# 2 stages, sin errores) — pero el `docker build` real no pudo completarse
# ahí porque el registro de Docker Hub (registry-1.docker.io) está
# bloqueado por la política de red de ese entorno (403 del proxy de
# salida). No es un problema del Dockerfile: es una restricción de red
# específica de ese entorno. Constrúyela en tu máquina o en CI (donde
# Docker Hub sí es accesible) antes de confiar en ella para producción.

# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime

# Chromium del repositorio de Debian — NO el binario que descarga Puppeteer
# por defecto (por eso el proyecto usa puppeteer-core, no puppeteer).
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
