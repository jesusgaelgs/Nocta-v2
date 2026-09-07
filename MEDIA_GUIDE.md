# 🎨 GUÍA DE MEDIOS — cambia videos, fotos y diseños sin tocar código

Todo el material visual vive en carpetas de `public/`. Para personalizar la
plataforma de un tatuador/a, **reemplaza los archivos manteniendo el mismo
nombre** y listo: cero cambios de código.

> ⚠️ Nota honesta: los videos y fotos actuales son de muestra (Pexels, licencia
> gratuita para uso en proyectos). Para entregar/vender la plataforma a un
> tatuador, sustitúyelos por **su material real** (fotos de su trabajo, videos
> de su estudio). Así es como se convierte en un producto suyo.

---

## 📦 Inventario de medios

| Archivo | Qué es | Cuántos | Cómo reemplazar |
|---|---|---|---|
| `public/videos/hero-left.mp4` | Video del hero (se ve cuando el cursor va a la derecha) | 1 | Mismo nombre |
| `public/videos/hero-right.mp4` | Video del hero (cursor a la izquierda) | 1 | Mismo nombre |
| `public/images/gallery/g1.jpg` … `g10.jpg` | Las 10 fotos de la galería | 10 | Mismo nombre |
| `public/images/archivo-backdrop.jpg` | Fondo de respaldo del hero | 1 | Mismo nombre |
| `public/simulador/designs/design-*.jpg` | Los 6 diseños de la colección del simulador | 6 | Mismo nombre |

---

## 🎬 Videos del hero (especificaciones)

- **Formato:** MP4 (códec H.264) — el más compatible.
- **Proporción:** horizontal 16:9 (se recorta con `object-fit: cover`).
- **Resolución:** 720p o 1080p. Ideal que cada uno pese **menos de 10 MB**.
- **Duración:** entre 10 y 60 segundos. **Cualquier duración funciona**: el
  scrub del cursor se adapta automáticamente a la duración real del video.
- **Audio:** no hace falta (van en silencio).
- **Qué filmar:** primeros planos del artista tatuando, máquina sobre la piel,
  gestos del proceso, ambiente del estudio. Mejor oscuro/contrastado para que
  los textos blancos se lean encima.
- **Consejo de conversión:** `ffmpeg -i original.mp4 -vf scale=-2:720 -c:v
  libx264 -crf 29 -an -movflags +faststart hero-left.mp4`

> ¿Quieres solo UN video en vez de dos? Pon el mismo archivo en ambos nombres
> (`hero-left.mp4` y `hero-right.mp4`). ¿Quieres cambiar los nombres en el
> código? Las rutas están en `src/components/archivo/ArchivoExperience.tsx`
> (constantes `VIDEO_LEFT` y `VIDEO_RIGHT`).

## 🖼 Fotos de la galería (especificaciones)

- **Proporción:** vertical 2:3 (ej. 800×1200 o 1200×1800).
- **Formato:** JPG. Peso ideal 100–300 KB cada una.
- **Contenido:** piezas terminadas, trabajo en proceso, detalles de línea.
- Se colocan automáticamente en la retícula dispersa (2/3/4 columnas según
  pantalla). Con 10 fotos la retícula se ve bien; con más también funciona
  (añadir `g11.jpg`, `g12.jpg`… requiere agregar una línea en el array
  `GALLERY` de `ArchivoExperience.tsx`).

## ✒️ Diseños del simulador (especificaciones IMPORTANTES)

- **Fondo BLANCO puro y tinta negra** — es obligatorio para que el modo
  "Tinta negra" (blend multiply) se vea bien sobre la piel.
- Formato JPG o PNG, cuadrado o vertical, peso < 500 KB.
- Se guardan en `public/simulador/designs/design-*.jpg` con los nombres:
  `design-floral`, `design-mandala`, `design-serpent`, `design-moth`,
  `design-wave`, `design-celestial`.
- El nombre visible, las palabras clave del matcher y la ruta están en
  `src/lib/simulador/designs.ts` (archivo simple, una entrada por diseño).
- Si el cliente conecta una clave de OpenAI/Replicate, el botón "Generar
  diseño" crea diseños únicos a partir del prompt (estos 6 quedan como
  catálogo base).

---

## ✏️ Textos y marca (por cliente)

| Qué cambiar | Dónde |
|---|---|
| Nombre de marca (NOCTA®) | `ArchivoExperience.tsx` (logo + footer), `SimuladorExperience.tsx`, `AgendaForm.tsx` |
| Nombre de la artista (Valentina Ríos) | `ArchivoExperience.tsx` (bloque COLECCIÓN ARCHIVO) |
| Texto bajo el logo (caption) | `ArchivoExperience.tsx` (`CAPTION_TEXT`) |
| Horarios y ciudad del estudio | `AgendaForm.tsx` (`HORARIOS`) |
| Títulos de pestaña y SEO | `src/app/*/page.tsx` (campo `metadata.title`) |

---

## 🔁 Flujo de actualización (para ti o para el cliente)

1. Prepara los archivos nuevos con las especificaciones de arriba.
2. Reemplázalos en su carpeta de `public/` (mismo nombre).
3. Súbelos a GitHub → Vercel redeploya automáticamente (~2 minutos).
4. Listo. Si cambiaste textos, aplica lo mismo con los archivos de código.
