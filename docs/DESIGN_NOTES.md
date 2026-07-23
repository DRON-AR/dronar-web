# Notas de diseño — Auth flow + Dashboard (Bloque 5)

## Por qué esta dirección

El brief pide explícitamente "glassmorphism y animación hero" — eso no es
negociable, viene dado. La pregunta de diseño real es: ¿glassmorphism
genérico (tarjetas translúcidas flotando sobre un fondo cualquiera), o
glassmorphism anclado en el propio dominio de la app?

DRONAR ya tiene, desde el Bloque 2, una "tarjeta GO/NO-GO" con viento,
visibilidad e índice KP — literalmente el vocabulario de un **horizonte
artificial** (el instrumento de cabina que muestra cielo/tierra divididos
por una línea de horizonte). Esa es la base de todo el sistema visual: en
vez de "glass card sobre fondo oscuro cualquiera", el panel de bienvenida
ES una cabina de vidrio (glass cockpit — el término real de aviónica para
displays digitales), con el horizonte artificial como elemento de firma que
se nivela al cargar la página (como un instrumento encendiéndose).

## Paleta (extiende, no reemplaza, los tokens del Bloque 1)

| Token | Hex | Uso |
|---|---|---|
| `aero-950` (ya existía) | `#050b14` | Fondo base ("void") |
| `aero-900` (ya existía) | `#0a1628` | Base de paneles de vidrio |
| `aero-700` (ya existía) | `#12345c` | Bordes, líneas divisorias |
| `aero-500` (ya existía) | `#1e6fb8` | Mitad "cielo" del horizonte |
| `aero-300` (ya existía) | `#7fc4ff` | Realces claros |
| `ground` (nuevo) | `#8a5a2b` | Mitad "tierra" del horizonte — el ámbar-marrón real de un attitude indicator |
| `signal` (nuevo) | `#e8b34a` | Ámbar de instrumento — CTAs, acentos, estado activo |
| `mist` (nuevo) | `#c9d9ec` | Texto principal (blanco frío, no blanco puro) |
| `nogo` (nuevo) | `#e2543f` | Errores/estados críticos — tomado del propio vocabulario GO/NO-GO de la app |

Deliberadamente NO se usó: cream+serif+terracota, negro+verde-neón/vermellón,
ni layout tipo periódico con hairlines — los tres "defaults" de IA que la
guía de diseño pide evitar quedan cubiertos por construcción, ya que la
dirección nace del vocabulario real del dominio (aviónica), no de una
plantilla genérica de "dashboard oscuro".

## Tipografía

- **Display** (titulares, Hero): Space Grotesk — geométrica, con carácter,
  legible a tamaños grandes.
- **Cuerpo/UI**: IBM Plex Sans — familia con pedigrí técnico/de ingeniería,
  evita el default de Inter.
- **Datos/mono** (horas, códigos de misión, timestamps): IBM Plex Mono —
  misma familia que el cuerpo, coherencia visual, y el monospace es
  literalmente cómo se muestran los datos en instrumentos digitales reales.

## Elemento de firma

El horizonte artificial animado (`AttitudeHorizon`): entra rotado ~8° y
desplazado, se "nivela" a 0° en ~1.4s con easing suave al cargar el Hero —
como un instrumento estabilizándose tras el encendido. Se reutiliza como
fondo ambiental (opacidad baja) detrás del panel de login. Respeta
`prefers-reduced-motion` (sin rotación de entrada, aparece ya nivelado).

## Qué NO se hizo en este bloque (a propósito)

- Sin numeración decorativa (01/02/03) en las tarjetas del dashboard: no
  hay una secuencia real que numerar todavía.
- Cursos y Misiones se muestran como "Próximamente" (dato real, no
  inventado) — sus datos reales llegan en bloques posteriores; no se
  fabricaron números falsos para rellenar el dashboard.
- Sin página de registro (signup): el modelo de negocio es alta
  admin-iniciada (ver comentario en `supabase/migrations/0012`).
