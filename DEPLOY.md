# 🚀 Deploy a producción — guía para mi infraestructura

**Arquitectura objetivo:**

```
Lenovo (CachyOS)  ──SSH──▶  Dell (Pop!_OS, servidor)
   [control]                ├── nginx  → nocta.tecnosofia.xyz → 127.0.0.1:3000
                            ├── pm2    → proceso "nocta" (npm run start)
                            └── .env   → DATABASE_URL apuntando a Supabase

Cloudflare (DNS nocta.tecnosofia.xyz → IP del Dell o túnel)
Supabase (PostgreSQL para la agenda)
```

---

## 🌩️ VÍA RECOMENDADA: Vercel + subdominio en Cloudflare (10 minutos)

Es el mismo flujo de subdominios que ya usas en tecnosofia.xyz
(GitHub + Vercel). Vercel detecta Next.js automáticamente.

### 1. Bajar y descomprimir (en la Lenovo)

```bash
curl -L "https://URL_DEL_PREVIEW/downloads/nocta-completo.zip" -o nocta.zip
unzip nocta.zip -d nocta
```

### 2. Subir a GitHub (sin git, con drag & drop) — CLIC POR CLIC

**2.1** Abre github.com en la Lenovo y confirma que estás dentro de tu cuenta
(arríba a la derecha debe aparecer tu avatar).

**2.2** Crear el repositorio:
1. Arriba a la derecha hay un botón con un signo **"+"** → clic → en el menú
   elige **"New repository"** (también sirve entrar directo a
   `https://github.com/new`).
2. En el campo **"Repository name"** escribe: `nocta` (minúsculas, sin espacios).
3. **NO marques** las casillas "Add a README file", ".gitignore" ni "license"
   (déjalas vacías).
4. Clic en el botón **verde "Create repository"** (abajo).

**2.3** Llegas a la pantalla "Quick setup" con instrucciones de git. IGNÓRALAS.
Busca el enlace azul que dice **"uploading an existing file"** y haz clic.

**2.4** Ahora ves un rectángulo punteado con el texto "Drag files here…":
1. En la Lenovo, abre el administrador de archivos (Dolphin, Thunar o Nautilus)
   y **entra dentro** de la carpeta `nocta` (debes ver `package.json`, `src/`,
   `public/`, `README.md`…).
2. Clic en cualquier archivo y luego **Ctrl + A** (se selecciona todo).
3. **Arrastra la selección** hasta el rectángulo punteado de GitHub y suelta.
   GitHub sube las carpetas respetando su estructura (verás `src/`, `public/`…).
4. Espera a que **todas las barritas de progreso lleguen al 100%**.

> ⚠️ Si dentro de `nocta` existe una carpeta `node_modules` (solo pasa si ya
> corriste `npm install`), selecciona todo **excepto** esa carpeta.

**2.5** Abajo de la lista de archivos aparece el recuadro **"Commit changes"**:
deja el título o escribe "Subo NOCTA" y clic en el botón **verde
"Commit changes"**.

**2.6** Comprueba (10 segundos): en `github.com/TUUSUARIO/nocta` deben verse
`package.json`, `public/`, `src/`, `README.md` y `DEPLOY.md`.

> Si faltara `.env.example` u otro archivo oculto: no pasa nada, no es
> obligatorio — la clave de Supabase se agrega directamente en Vercel.

**Plan B (si el arrastre no funciona):** en la misma página de subida usa el
enlace "choose your files" y selecciona los archivos a mano. O usa git
(copia el bloque de comandos que GitHub muestra en "Quick setup", ya viene
con tu usuario pre-escrito).

### 3. Deploy en Vercel

1. vercel.com → **Add New → Project** → **Import** el repo `nocta`.
2. Framework: detecta **Next.js** solo. No toques nada.
3. **Environment Variables** → agregar:
   - `DATABASE_URL` = string de Supabase (Session pooler):
     `postgresql://postgres.PROYECTO:CLAVE@aws-0-REGION.pooler.supabase.com:5432/postgres`
   - (Opcional) `OPENAI_API_KEY` o `REPLICATE_API_TOKEN` para la IA real.
4. **Deploy** → en ~2 minutos tienes `https://nocta.vercel.app` (o el nombre
   que Vercel te asigne).

### 4. Subdominio nocta.tecnosofia.xyz

1. En Vercel: Proyecto nocta → **Settings → Domains** → **Add** →
   `nocta.tecnosofia.xyz`.
2. Vercel te muestra un destino CNAME tipo `cname.vercel-dns.com`.
3. En Cloudflare (tu zona `tecnosofia.xyz`): crear registro **CNAME**:
   - Nombre: `nocta` · Destino: `cname.vercel-dns.com` · Proxy: **gris
     (DNS only)**.
4. Espera 2–5 minutos → `https://nocta.tecnosofia.xyz` listo.

### 5. Base de datos (una sola vez)

Desde la Lenovo, dentro de la carpeta `nocta/`:

```bash
echo 'DATABASE_URL=postgresql://postgres.PROYECTO:CLAVE@aws-0-REGION.pooler.supabase.com:5432/postgres' > .env
npm install
npx drizzle-kit push
```

Esto crea la tabla `cita_solicitudes` en Supabase. Después de esto, la agenda
guarda las citas. (Si lo omites, la experiencia y el simulador funcionan
igual; la agenda solo avisará que no hay BD.)

### Notas Vercel

- **Panel del estudio:** en Vercel agrega la variable `PANEL_KEY` (la clave
  que el artista usará en `/panel`) y opcional `ARTIST_NAME` y `ARTIST_EMAIL`.
  Sin `PANEL_KEY`, el panel se bloquea por seguridad.
- **La base de datos se actualiza sola:** las APIs crean/ajustan la tabla
  `cita_solicitudes` automáticamente al primer uso. Ya no hace falta correr
  `npx drizzle-kit push` tras cada cambio de esquema.
- Cada `git push` (o cada commit arrastrado a GitHub) **redeploya
  automáticamente** — así actualizas el sitio.
- Las imágenes/videos van en `public/` y se sirven desde el CDN de Vercel.
- Si agregas clave de IA y la generación tarda >10 s en el plan gratis, la API
  cae al modo colección automáticamente (diseñado a prueba de fallos).

---

## Paso 0 — Bajar el proyecto al servidor

Desde la **Lenovo** (o desde el Dell directamente):

```bash
# 1) Descargar el zip (hacerlo pronto: la URL del sandbox caduca)
curl -L "https://URL_DEL_PREVIEW/downloads/nocta-completo.zip" -o nocta.zip

# 2) Copiarlo al servidor
scp nocta.zip USUARIO@IP_DEL_DELL:~/nocta.zip
```

> 💡 Alternativa: si ya tienes GitHub, también puedes crear un repo `nocta`,
> subir el contenido descomprimido y hacer `git clone` en el Dell.

## Paso 1 — Preparar la app en el Dell

```bash
ssh USUARIO@IP_DEL_DELL
mkdir -p ~/apps && cd ~/apps
unzip ~/nocta.zip -d nocta
cd nocta

# Node 20.9+ requerido (Next 16). Si no:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# nvm install 22
node -v

npm install
cp .env.example .env
```

## Paso 2 — Supabase (base de datos para la agenda)

1. En [supabase.com](https://supabase.com) usa tu proyecto de tecnosofia o crea
   uno nuevo ("nocta").
2. **Settings → Database → Connection string → Session pooler** → copia la URL.
   Tiene esta forma:
   `postgresql://postgres.PROYECTO:CLAVE@aws-0-REGION.pooler.supabase.com:5432/postgres`
3. Pégala en el `.env` del Dell:

```bash
nano .env
# DATABASE_URL=postgresql://postgres.PROYECTO:CLAVE@aws-0-REGION.pooler.supabase.com:5432/postgres
```

4. Crear la tabla:

```bash
npx drizzle-kit push
```

> Sin Supabase también funciona: la experiencia y el simulador no usan BD;
> solo la agenda no guardaría. (Docker local es otra opción: `docker compose up -d`.)

## Paso 3 — Build y proceso con pm2

```bash
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # sigue las instrucciones que imprime (systemd)
```

Verifica que responde en el Dell: `curl -I http://127.0.0.1:3000/archivo`

## Paso 4 — nginx (reverse proxy)

```bash
sudo cp deploy/nginx-nocta.conf /etc/nginx/sites-available/nocta
sudo ln -s /etc/nginx/sites-available/nocta /etc/nginx/sites-enabled/nocta
sudo nginx -t && sudo systemctl reload nginx
```

SSL (elige uno):
- `sudo certbot --nginx -d nocta.tecnosofia.xyz` (certificado propio), o
- Dejar Cloudflare en modo proxy (naranja) con SSL "Flexible/Full".

## Paso 5 — Cloudflare (DNS)

1. En tu zona `tecnosofia.xyz` añade un registro **A** (o **AAAA**):
   - Nombre: `nocta` → apunta a **la misma IP pública** que ya usa
     `tecnosofia.xyz` (o al mismo túnel de Cloudflare, si lo usas).
2. Activa el proxy naranja si tu tecnosofia.xyz ya lo usa.

## ✅ Verificación

1. `https://nocta.tecnosofia.xyz` muestra la experiencia directamente (URL limpia).
2. El cursor scrubbea el video; el panel sube con scroll; al final aparece el
   botón **"simular"**.
3. `/simulador` genera diseños (colección o IA si pusiste clave).
4. `/agenda` envía el formulario y la fila aparece en Supabase.

## 🔧 Troubleshooting

| Problema | Solución |
|---|---|
| `npm run build` falla | `node -v` debe ser ≥ 20.9; borrar `.next` y reintentar |
| La web no carga tras nginx | `pm2 logs nocta` y `sudo tail -f /var/log/nginx/error.log` |
| Agenda no guarda | Revisar `DATABASE_URL` en `.env` y `npx drizzle-kit push` |
| No abre el dominio | Verificar registro A en Cloudflare y puertos 80/443 abiertos |
| Tras reiniciar el Dell | `pm2 startup` + `pm2 save` ya configurados → arranca solo |

## 🔄 Actualizar el sitio (cada vez que cambie el código)

```bash
cd ~/apps/nocta
# (traer el código nuevo: scp del zip o git pull)
npm install && npm run build
pm2 restart nocta
```
