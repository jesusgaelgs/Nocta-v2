# CHANGELOG — NOCTA

Registro cronológico de todos los cambios de la plataforma NOCTA. Está pensado
como "el archivo maestro" de referencia: sirve para que cualquier persona (u
IA) se ponga al día en minutos y respete lo ya construido.

---

## v1.7 — IA real en el simulador: OpenAI + 3 variantes + cuota + métricas (2026-09-08)

**Decisiones tomadas con el propietario:**
- Motor principal: **OpenAI gpt-image-1** (el costo lo absorbe el artista).
- **3 variaciones por prompt** — el cliente elige su favorita.
- **Cuota de seguridad mensual** (`AI_MONTHLY_LIMIT`, default 100): si el sitio
  se vuelve viral, el costo nunca se dispara. El cliente NUNCA ve contadores.

**Backend (`POST /api/simulador/generate`):**
- Ahora devuelve `{ designs: [{data, name}], source, variantes }`.
- Motor: OpenAI (3 variantes en una llamada, fallback a n=1) → Replicate
  flux-schnell como respaldo → colección local (matcher léxico).
- **Mejorador de prompt** por plantilla + estilos: fine-line, blackwork,
  ornamental, old school, minimal, japonesa.
- Registro de uso en la tabla `generaciones` (prompt + nº variantes).
- Cuota mensual consultada antes de generar; si se supera, cae a colección
  en silencio (sin romper la magia para el usuario).

**Simulador (`SimuladorExperience.tsx`):**
- Chips de estilo bajo el prompt.
- Selector de **3 miniaturas "Elige tu favorita"**; la elegida se proyecta.

**Panel: nueva pestaña "Métricas":**
- Simulaciones IA del mes (vs tope), solicitudes, citas agendadas y
  simulaciones totales — la evidencia para el pitch del producto.
- Indicador "IA activa / no activa" y cómo encenderla.

**Nuevas APIs:** `GET /api/panel/metrics`.

---

## v1.6 — Panel: al ACEPTAR ahora eliges la fecha de la cita (2026-09-07)

**Motivo del cambio:** al aceptar una solicitud sin fecha prefierenlada, no se
creaba ninguna cita y el botón "Aceptar" no llevaba a la agenda.

**Qué se hizo en el Panel (`src/components/panel/PanelApp.tsx`):**
- El botón **ACEPTAR** ya NO crea la cita a ciegas. Ahora abre un **selector de
  fecha** ("Programar cita") donde el artista elige el día.
- La fecha propuesta es la preferida del cliente si existe, o el día de hoy.
- Al **Confirmar** → se crea la cita en la agenda, se marca la solicitud como
  aceptada, salta a la pestaña Agenda con el día señalado y abre el mensaje
  redactado (+ WhatsApp/copiar). Toast de confirmación.

**Backend simplificado:**
- `POST /api/panel/leads/:id` ahora solo marca aceptado/declinado + devuelve el
  mensaje (ya NO crea la cita). La cita se crea por separado vía
  `POST /api/panel/citas`.
- Evita solicitudes duplicadas al re-contactar.

**Regla de Hooks corregida (bug crítico #310):** movimiento de todos los
`useMemo` / derivados ANTES de los `return` condicionales del login. Antes, los
`useMemo` estaban después del `if (authed === false/null)`, violando las Reglas
de React → "Rendered more hooks than during the previous render" →
"This page couldn't load" al pasar del login al panel.

---

## v1.5 — Panel: login fallaba con "This page couldn't load" (2026-09-07)

**Bug:** tras escribir la clave y pulsar Entrar, la página moría con
"This page couldn't load" en producción.

**Causa:** era el error de React #310 producido por una violación de las Reglas
de los Hooks (los `useMemo` de la agenda estaban declarados después de los
`return` tempranos del login). Ver fix en v1.6.

---

## v1.4 — Base de datos conectada a Supabase en producción (2026-09-07)

- Se configuró `DATABASE_URL` (Supabase, connection pooler, puerto 6543) como
  variable de entorno en Vercel.
- La tabla `cita_solicitudes`, `citas` y `notas` se crean y ajustan
  automáticamente (auto-migración en `src/db/ensure-schema.ts`) sin correr
  `drizzle-kit push`.
- La clave del panel (`PANEL_KEY`) se definió en Vercel; el login del panel
  ya responde y las APIs leen/escriben en Supabase.

---

## v1.3 — Panel del estudio completo: Solicitudes + Agenda + Ideas (2026-09-07)

**Nuevo panel en `/panel`** — el mini-hub del artista:
- **Solicitudes:** tarjetas con miniatura de simulación, idea, zona y fecha de
  preferencia. Botones "Aceptar →" y "dejar pasar".
- **Agenda:** calendario mensual (semana en lunes), días con citas marcados con
  un punto, clic en un día lista sus citas, "Añadir" cita manual (fecha +
  título) y botón para borrar. Las solicitudes aceptadas con fecha se suman.
- **Ideas:** espacio de apuntes con marcar-hecha (✓) y borrar.
- Login por cookie con clave `PANEL_KEY`. Estética NOCTA (fondo negro,
  Inter Tight), sin videos ni imágenes pesadas (carga ligera).
- Aviso claro si falta `DATABASE_URL` en lugar de un error críptico.
- Enlace "ESTUDIO" (arriba en la portada) y "PANEL DEL ESTUDIO" en footers →
  `/panel`.

**Backend nuevo:** `POST /api/agenda` (guardar solicitud con simulación
opcional), `POST/GET /api/panel/leads`, `GET/DELETE /api/panel/citas`,
`POST/DELETE /api/panel/ideas`, `POST /api/panel/login`, `POST /api/panel/logout`.

**Flujo de simulación → solicitud:** en `/simulador`, el botón "Agendar" guarda
la composición (JPEG) en `localStorage`; en `/agenda` se ofrece "Incluir mi
simulación" (consentimiento) y viaja a la solicitud. Privacidad: la foto se
procesa localmente y jamás sube a un servidor sin ese consentimiento.

---

## v1.2 — Registro maestro de cambios (2026-09-07)

**Nuevo archivo `CHANGELOG.md`** que documenta todo el proyecto desde el inicio.
La documentación vive en varios archivos maestros:
- `README.md` → qué es cada ruta, stack, arranque y verificación.
- `DEPLOY.md` → cómo subirlo a producción (Vercel, Supabase, servidor propio).
- `MEDIA_GUIDE.md` → cómo cambiar videos, fotos y diseños sin tocar código.
- `CHANGELOG.md` → este registro histórico de cambios.
- `.env.example` → plantilla de variables de entorno.

---

## v1.1 — URL limpia en la portada (2026-09-07)

- La portada `/` ya NO hace redirect a `/archivo`: ahora renderiza la
  experiencia directamente (URL limpia). `/archivo` queda como ruta alternativa
  con la misma experiencia.
- Antes: `GET /` → 307 → `/archivo`. Ahora: `GET /` → 200 con la experiencia.

---

## v1.0 — Promoción a portada (2026-09-07)

- La página `/` (starter "Arena Next.js PostgreSQL Starter") se sustituyó por la
  experiencia NOCTA tras la aprobación del usuario.
  - Reversa documentada en `src/app/page.tsx` (código del starter comentado).
- El nombre de marca se cambió de AURA a **NOCTA** en todos los textos y
  metadata (README, title de páginas, wordmark, footers, docker, nombre del
  PNG descargado).

---

## v0.9 — Personalización lista para el cliente (2026-09-07)

- Guía `MEDIA_GUIDE.md`: cómo el tatuador cambia sus 2 videos, 10 fotos de
  galería y 6 diseños del simulador sin tocar código (mismo nombre de archivo).
- Se añadió `.gitignore` para evitar subir `node_modules`, `.next` y `.env`.

---

## v0.8 — Antes yapa fue este texto? (2026-09-07)

- Se añadió `.env.example`, `docker-compose.yml` y la BD se hizo tolerante
  (la experiencia y el simulador funcionan aunque no haya DATABASE_URL;
  la agenda avisa amable si no puede guardar). Docker + `drizzle.config.ts`
  (lee DATABASE_URL del env) para arranque local.
- Guía `DEPLOY.md` con el flujo detallado a producción (servidor propio + pm2 +
  nginx y también Vercel + Supabase + Cloudflare).

---

## v0.7 — Simulador con IA + agenda funcional (2026-09-07)

- **Simulador `/simulador`:** 3 pasos (sube foto → describe la idea o elige de
  la colección → proyección con arrastre, pellizco, escala, rotación, opacidad,
  modos de tinta negra/blanca). Descarga PNG.
- **Generación de IA:** `POST /api/simulador/generate` (Replicate flux-schnell
  → OpenAI gpt-image-1 → colección local con matcher léxico). Sin claves usa la
  colección; con `OPENAI_API_KEY`/`REPLICATE_API_TOKEN` genera único.
- **Agenda `/agenda`:** formulario que guarda la solicitud en PostgreSQL
  (tabla `cita_solicitudes`).

---

## v0.6 — Los medios de muestreo por defecto (2026-09-07)

- Se sustituyeron los placeholders de moda (que hacía "blanco en negro" y por
  eso "no se veía nada") por footage real de tatuaje (Pexels) y 10 fotos de
  galería; se descargaron a `public/` (locales) para que el zip fuera completo.
- Diseños del simulador generados localmente (6).

---

## v0.5 — NOCTA subió a producción (2026-09-07)

- Deploy en una cuenta Vercel por parte del usuario, apuntando el subdominio
  `nocta.tecnosofia.xyz` desde Cloudflare (registro CNAME, proxy gris/DNS only).

---

## v0.4 — CTA "simular" legible + visible (2026-09-07)

- Se corrigió el botón final del outro: antes usaba `mix-blend-mode: exclusion`
  y, sobre el overlay blanco, se veía negro ininteligible.
- Ahora: pastilla blanca con borde negro, texto negro, etiqueta
  "PRUEBA EL SIMULADOR ↘", anillo pulsante, flecha animada, hover con
  inversión y cursor custom agrandándose. Enlaza a `/simulador`.

---

## v0.3 — Fix móvil: el video del hero no se veía (2026-09-07)

- En móvil, el autoplay alternado elegía el video izquierdo pero el "estado
  inicial" posterior lo ocultaba y dejaba el otro congelado (primer frame
  negro). Se corrigió el orden de inicialización.
- Se añadió `poster` a los videos, revelado forzoso del canvas a los 2 s y
  reintento de reproducción al primer toque (política de autoplay / bajo
  consumo de iOS).

---

## v0.2 — Descarga del proyecto en zip + assets locales (2026)

Proyecto completo listo para transportar:
- ZIP autocontenido con código + medios (videos/fotos/diseños) en escala
  reducida (~5 MB vs 36 MB original): videos a 720p, diseños PNG→JPG.
- Links de descarga servidos desde el propio preview.

---

## v0.1 — Fundaciones del proyecto (2026)

Dadas las decisiones de la orden de trabajo AURA/"ARCHIVO" (la experiencia
scroll-driven portada de *prmpt*), que luego pasó a llamarse NOCTA:
- Experiencia `/archivo` (y luego `/`): motor de animación portado de prmpt —
  scrub de video por cursor X con dead zone, panel negro sube con scroll,
  cards que escalan por posición (transform-origin según mitad del grid),
  cursor custom con `mix-blend-mode: exclusion`, scroll 100% RAF, entrada
  escalonada, outro con overlay blanco + botón.
- Ruta aislada `/archivo` (Opción 2 segura) sin tocar la portada hasta la
  aprobación (factor de reversa).
- El contenido de AURA/NOCTA se monta ENCIMA de las animaciones, nunca al
  revés — "regla de oro" del motor.
- Recomprimir zips y mantener `README`, `DEPLOY`, `MEDIA_GUIDE` al día.

---

**Aviso de marca:** "NOCTA" es una marca registrada de Nike (línea de Drake).
Para un uso comercial a granel conviene renombrar antes del piloto B2B.
