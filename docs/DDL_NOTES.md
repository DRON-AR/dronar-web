# Notas de diseño — Esquema DDL (Bloque 2)

## Alcance
16 tablas mínimas solicitadas, todas creadas: `roles`, `users`, `courses`,
`enrollments`, `evaluations`, `certificates`, `missions`, `shifts`,
`payloads`, `risk_cards`, `maintenance`, `attachments`, `logs`,
`audit_prompts`, `alerts`, `medical_records`.

## Decisiones de diseño

- **`users` vs `auth.users`**: `public.users.id` referencia 1:1 a
  `auth.users.id` (Supabase Auth). No se duplica la autenticación; solo se
  extiende con datos funcionales (rol, licencia, etc.).
- **`aircraft_registration` como texto** en `missions` y `maintenance`: no
  se creó una tabla de flota (`aircraft`) porque no está en la lista de 16
  tablas mínimas. Si se necesita gestión de flota (mantenimiento programado
  por matrícula, horas de vuelo por aeronave), se recomienda añadirla como
  tabla 17 en un sub-bloque posterior — no se inventó aquí para no ampliar
  el alcance sin aprobación.
- **`attachments` es polimórfica** (`related_table` + `related_id`) en vez
  de una tabla de archivos por entidad, para no duplicar 5-6 tablas casi
  idénticas solo para adjuntos.
- **`audit_prompts` vs `logs`**: son tablas separadas a propósito.
  `audit_prompts` es específicamente la auditoría de IA exigida (hash de
  prompt/respuesta, versión, usuario). `logs` es bitácora general del
  sistema (acciones sobre cualquier entidad). Mezclarlas dificultaría
  cumplir el requisito de auditoría de IA de forma aislada y consultable.
- **RLS activado en las 16 tablas ya en este bloque** (`0007`), sin
  políticas todavía (deny-by-default salvo `service_role`). Las políticas
  específicas por rol llegan en el Bloque 3.

## Cláusula NIST obligatoria

El campo `certificates.certificate_text` debe almacenar siempre el texto
completo exigido:

> Camper Aeronautical certifica que [Nombre] completó la evaluación basada
> en métodos de prueba desarrollados por el National Institute of Standards
> and Technology (NIST). Este certificado no implica respaldo oficial de
> NIST.

Esto se aplica como plantilla fija en el generador de PDF (Bloque 6,
`backend/src/lib/certificateHtml.ts`), no como texto libre editable por el
usuario — hay una prueba unitaria que verifica el texto exacto.

## `certificates.pdf_url` guarda un PATH de Storage, no una URL pública

El bucket `certificates` es privado (ver `supabase/migrations/0013`). Esta
columna contiene la ruta del objeto (`{user_id}/{certificate_id}.pdf`), no
un enlace descargable directo — las URLs de descarga son firmadas
(`createSignedUrl`, expiran a los 5 minutos por defecto) y se generan bajo
demanda en `POST /api/certificates/issue` y `GET /api/certificates/:id/download`,
nunca se guardan permanentes.

## Umbrales GO/NO-GO — pendiente de confirmación

Los valores de viento, visibilidad e índice KP en
`0006_business_rules_triggers.sql` son **placeholders de ingeniería**, no
cifras regulatorias verificadas. Antes de ir a producción, Camper
Aeronautical debe confirmarlos contra su manual de operaciones vigente.

## Tabla 17: `push_subscriptions` (Bloque 7)

Más allá de las 16 mínimas — justificada porque el Bloque 7 pide
explícitamente el canal "push" en el motor de alertas, y sin una tabla que
guarde las suscripciones Web Push por usuario ese canal no puede
funcionar. Mismo criterio que la decisión de no crear una tabla `aircraft`
(arriba): se documenta el porqué en vez de ampliar el alcance en silencio.

## `alerts.notified_at` (Bloque 7)

Columna añadida en `0015` para separar "alerta abierta" (`status`) de
"alerta ya notificada" (`notified_at`) — sin esto, el dispatcher del motor
de alertas reenviaría el mismo email/webhook/push en cada ciclo de
escaneo.

## Tabla 18: `evaluation_questions` (Bloque 8)

Más allá de las 17 (16 mínimas + `push_subscriptions`) — banco de
preguntas generadas por Claude (o cargadas manualmente) para el módulo de
evaluaciones. Justificación igual que las anteriores: sin esta tabla,
"generación de evaluaciones" no tendría dónde persistir el contenido
generado, y el instructor tendría que regenerar cada vez.

**Decisión de seguridad importante**: RLS en esta tabla es MÁS estricta
que en la mayoría — ni siquiera PILOTO puede leerla, solo
ADMIN/JEFE_PILOTOS/INSTRUCTOR. Si un ALUMNO pudiera leer
`evaluation_questions`, vería las respuestas correctas antes de rendir la
evaluación. Todo contenido generado entra como `BORRADOR` y requiere
revisión humana explícita antes de usarse — ver `docs/PROMPTS.md` v1.1.

## Cómo aplicar estas migraciones

```bash
# Requiere Supabase CLI instalado (npm install -g supabase)
cd dronar
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase db push
```

O, para desarrollo 100% local (sin proyecto en la nube todavía):

```bash
supabase start        # levanta Postgres/Studio local vía Docker
supabase db reset      # aplica todas las migraciones desde cero
```
