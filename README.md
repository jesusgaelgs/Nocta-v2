# NOCTA — Tattoo Studio Platform

Plataforma de **NOCTA Tattoo Studio** con la experiencia
scroll-driven **ARCHIVO** (motor de animación portado de *prmpt*), el
**SIMULADOR** de tatuaje y la **AGENDA** de citas.

> **¿Recibiste este proyecto en un zip?** Sigue la sección
> [⚡ Arranque rápido](#-arranque-rápido) — son 3 comandos. Todo el código y
> todos los medios (videos, fotos, diseños) están incluidos en el zip.

---

## 🧭 Qué es cada ruta

| Ruta | Qué se ve |
|---|---|
| `/` | La experiencia directamente (URL limpia). `/archivo` es la misma ruta alternativa |
| `/archivo` | Hero con video scrubbeado por cursor + galería scroll-driven + outro con CTA "simular" |
| `/simulador` | Sube foto, describe tu idea, proyéctala sobre la piel, descarga PNG |
| `/agenda` | Formulario de solicitud de cita (guarda en PostgreSQL) |
| `/panel` | **Panel del estudio** (con clave `PANEL_KEY`): solicitudes por aceptar, agenda de citas con calendario (las aceptadas se cargan solas) e ideas/pendientes. Ligero, sin videos |
| `/api/simulador/generate` | Genera el diseño (IA con clave, colección sin clave) |
| `/api/agenda` | Guarda las solicitudes de cita |

## 🛠 Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · CSS propio del motor (`src/components/archivo/archivo.css`)
- **PostgreSQL + Drizzle ORM** (solo para la agenda — el resto no toca BD)
- Fuente: **Inter Tight** local (`@fontsource/inter-tight`)

## 📁 Estructura importante

```
src/
  app/
    page.tsx                  # Portada → redirige a /archivo (reversa en comentarios)
    archivo/page.tsx          # Ruta de la experiencia
    simulador/page.tsx        # Simulador
    agenda/page.tsx           # Agenda
    api/simulador/generate/   # API de generación (OpenAI/Replicate/colección)
    api/agenda/               # API de citas (PostgreSQL)
  components/archivo/         # MOTOR de animación (intocable salvo contenido)
  components/simulador/       # Simulador
  components/agenda/          # Formulario de agenda
  db/                         # Esquema Drizzle (cita_solicitudes)
public/
  videos/                     # Videos del hero (locales)
  images/gallery/             # 10 fotos de la galería (locales)
  images/archivo-backdrop.jpg # Fondo del hero
  simulador/designs/          # 6 diseños de la colección
```

## ✅ Requisitos

- **Node.js 20+** (recomendado 22)
- Opcional para la agenda: **Docker** (o un PostgreSQL en cualquier nube)

## ⚡ Arranque rápido

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar entorno (copia el ejemplo; funciona incluso sin BD)
cp .env.example .env

# 3) (Opcional, solo si quieres la agenda funcionando) Levantar PostgreSQL
docker compose up -d
npx drizzle-kit push        # crea la tabla cita_solicitudes

# 4) Arrancar en desarrollo
npm run dev
# → abre http://localhost:3000
```

**Producción:**

```bash
npm run build
npm run start
```

### ¿No tienes PostgreSQL?
La experiencia `/archivo` y el `/simulador` funcionan **sin base de datos**.
Solo la agenda no guardará y mostrará un aviso amable. Con `docker compose up -d`
y `npx drizzle-kit push` queda todo completo.

## 🔑 Variables de entorno (`.env`)

| Variable | Obligatoria | Qué hace |
|---|---|---|
| `DATABASE_URL` | No (solo agenda) | `postgresql://usuario:clave@host:5432/app_db` |
| `OPENAI_API_KEY` | No | Activa IA real en el simulador (`gpt-image-1`) |
| `REPLICATE_API_TOKEN` | No | Activa IA real en el simulador (`flux-schnell`) |

El simulador funciona sin claves (usa la colección local de 6 diseños con un
matcher por palabras clave). Con una clave, genera diseños únicos a partir del
prompt del usuario automáticamente.

## 🌐 Deploy a producción (servidor propio + Cloudflare + Supabase)

Guía paso a paso pensada para esta infraestructura (Lenovo → SSH → Dell →
nginx + pm2 → Cloudflare → Supabase): **ver [DEPLOY.md](./DEPLOY.md)**.
Incluye también el ejemplo de nginx en `deploy/nginx-nocta.conf` y la config
de pm2 en `ecosystem.config.cjs`.

## 🚀 Pasar el proyecto a Google Antigravity

**Opción A — por terminal (recomendada, sin límite de peso):**
abre la terminal dentro de Antigravity y ejecuta:

```bash
cd ~
curl -L "URL_DEL_ZIP" -o nocta.zip
unzip nocta.zip -d nocta
cd nocta
npm install
cp .env.example .env
npm run dev
```

**Opción B — por interfaz:** sube `nocta-completo.zip` (≈5 MB, pasa cualquier
límite) con el botón de subir archivos y descomprímelo en la terminal con
`unzip`. Si el límite es aún más estricto, sube `nocta-codigo.zip` (≈96 KB):
funciona igual porque la app tiene respaldo automático por CDN para videos e
imágenes.

**Opcional (solo para que la agenda guarde):** `docker compose up -d` y
`npx drizzle-kit push` — o deja `DATABASE_URL` en blanco y la agenda avisará
que no hay BD (la experiencia y el simulador funcionan igual).

## 🤖 Instrucciones para Claude (o cualquier IA)

Pega este prompt junto con el zip:

> Tienes un proyecto Next.js 16 (App Router) con TypeScript, Tailwind y
> Drizzle/PostgreSQL. Descomprímelo, lee el README.md y ejecuta el arranque:
> `npm install`, copia `.env.example` a `.env`, opcionalmente `docker compose
> up -d` y `npx drizzle-kit push`, y arranca con `npm run dev`. Verifica que
> http://localhost:3000 redirija a /archivo y muestre la experiencia NOCTA
> (video de tatuaje, scroll con galería y botón "simular" al final), que
> /simulador cargue el simulador y /agenda el formulario. **No modifiques el
> motor de animación ni el diseño** — si algo falla, corrígelo preservando la
> experiencia tal cual está.

## ✔️ Verificación (checklist)

1. `npm run dev` compila sin errores.
2. `/` muestra la experiencia directamente (URL limpia, sin redirect).
3. `/archivo`: video del hero cargado y **reproduciéndose al centro** (dead
   zone); al mover el cursor a los lados, el scrub toma el control del tiempo
   fotograma a fotograma. El panel negro sube al hacer scroll, la galería
   escala al entrar/salir y al final aparece el outro blanco con el botón
   pulsante **"PRUEBA EL SIMULADOR → simular"**.
4. `/simulador`: subir foto → escribir prompt → "Generar diseño" → el diseño se
   proyecta y se puede mover/escalar/rotar → descargar PNG.
5. `/agenda`: enviar el formulario → respuesta "Solicitud recibida" y la fila
   aparece en `cita_solicitudes`.

## 🎨 Personalizar videos, fotos y textos

Todo el material visual se reemplaza **sin tocar código** (mismo nombre de
archivo en `public/`). Especificaciones exactas (formato, tamaño, duración),
cómo cambiar el nombre de la marca/artista y el flujo de actualización:
**ver [MEDIA_GUIDE.md](./MEDIA_GUIDE.md)**.

**Historial completo de cambios:** ver **[CHANGELOG.md](./CHANGELOG.md)** —
es el archivo maestro para ponerse al día con todo lo construido y por qué.

## 🧩 Notas

- **Reversa de portada:** `src/app/page.tsx` contiene comentado el contenido
  original del starter. Para volver atrás, se restaura ese código.
- **Assets:** los videos e imágenes están en `public/` (el zip los incluye).
  Si se quieren los finales de NOCTA, se reemplazan en esas carpetas sin tocar
  código (los CDN de Pexels/prmpt quedan como fallback automático).
- **Privacidad:** la foto del simulador se procesa 100% en el navegador del
  usuario y nunca se sube a un servidor.
- **Motor intocable:** `src/components/archivo/ArchivoExperience.tsx` y
  `archivo.css` son el motor portado de prmpt. Los cambios deben ser de
  contenido (textos, imágenes), no de lógica de animación.
