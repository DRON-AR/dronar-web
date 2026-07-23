# Registro de prompts versionados

Cada prompt usado para generación asistida (Claude) **desde la aplicación**
(vía `/api/claude`, Bloque 4) debe registrarse en la sección "Prompts de la
aplicación" con el formato:

```
prompt_version: <vX.Y>
author: <nombre>
date: <YYYY-MM-DD>
purpose: <objetivo del prompt>
expected_output_format: <JSON | HTML | React+Tailwind+FramerMotion | ...>
```

`prompt_version` es el identificador que el cliente manda a `/api/claude`
para seleccionar la plantilla — debe ser único dentro de
`backend/src/lib/promptTemplates.ts`. Los prompts de proceso (usados para
generar código/documentación de este propio proyecto, no por la app en
producción) se registran aparte, en su propia numeración, para no colisionar
con ese espacio de nombres.

## Prompts de la aplicación (`backend/src/lib/promptTemplates.ts`)

### v1.0 — Componente Hero del dashboard (Bloque 4)
```
prompt_version: v1.0
author: Equipo DRONAR
date: 2026-07-22
purpose: Generar componente Hero para el dashboard
expected_output_format: React+Tailwind+FramerMotion
```
Input aceptado desde el cliente: `{ nombreCurso, claim }` (validado con Zod,
longitud máxima acotada). El texto del prompt en sí se arma siempre en el
servidor — el cliente nunca envía texto libre a `/api/claude`.

*(Los prompts de generación de evaluaciones y contenido del Bloque 8 se
añaden aquí como v1.1, v1.2, etc. — nunca reutilizar "v1.0".)*

### v1.1 — Generación de preguntas de evaluación (Bloque 8)
```
prompt_version: v1.1
author: Equipo DRONAR
date: 2026-07-22
purpose: Generar preguntas de opción múltiple para el banco de evaluaciones
expected_output_format: JSON
```
Implementación: `backend/src/lib/promptTemplates.ts`. Input:
`{ courseName, topic, numQuestions (1-20), difficulty }`. La respuesta se
valida contra un `outputSchema` de Zod antes de devolverse (Bloque 4 no
validaba la forma de la salida; para contenido que define respuestas
correctas de examen eso ya no es aceptable). Toda pregunta generada entra
como `BORRADOR` en `evaluation_questions` — requiere revisión humana
(`PATCH /api/evaluations/questions/:id/review`) antes de poder usarse.

### v1.2 — Descripción de curso (Bloque 8)
```
prompt_version: v1.2
author: Equipo DRONAR
date: 2026-07-22
purpose: Generar la descripción pública de un curso
expected_output_format: text
```
Implementación: `backend/src/lib/promptTemplates.ts`. Input:
`{ courseName, objectives, durationHours }`. Sin `outputSchema` — es texto
libre para el catálogo público, no contenido que defina respuestas
correctas, por lo que no necesita el mismo nivel de validación estructural.

## Prompts de proceso (fuera del registro de la app)

### proceso-v1 — Bootstrap de estructura (Bloque 1)
```
prompt_version: proceso-v1
author: Ingeniero Principal (asistido por Claude)
date: 2026-07-22
purpose: Inicializar estructura de monorepo (frontend/backend/infra) para DRONAR
expected_output_format: archivos de configuración + código fuente TypeScript
```
