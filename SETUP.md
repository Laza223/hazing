# Hazing — Setup & Credenciales (paso a paso)

> Guía para dar de alta servicios y juntar credenciales. **Regla de oro de seguridad:** las claves secretas van solo en `.env.local` (gitignored) y en los secrets de Cloudflare (`wrangler secret put`). Nunca se pegan en el chat ni se suben a git.
>
> Todas las cuentas de este proyecto son **nuevas y a nombre de la dueña** — cero recursos compartidos con `glamify-makeup` (ver `docs/spec/00-handoff.md` §3.1).

---

## 0. Qué vamos a crear (orden)

1. **GitHub** → repo del proyecto.
2. **Supabase** → base de datos + auth + storage.
3. **Cloudflare** → hosting en Workers (se conecta al repo).
4. Cargar las variables de entorno.

> Con esto alcanza para arrancar Fases 1–5 (repo, juez, schema, infraestructura copiada, design system). Mercado Pago, Resend y dominio vienen después (ver §5).

---

## 1. GitHub (repo)

1. Crear la cuenta de GitHub de la dueña (si no existe).
2. **New repository** → nombre: `hazing` → **Private** → **NO** marcar "Add a README" (ya hay archivos locales) → **Create**.
3. Copiar la URL del repo (HTTPS).
4. Para pushear: `gh auth login` con esa cuenta (GitHub.com → HTTPS → login con browser), o Personal Access Token / SSH keys.

> El `git init` local ya está hecho (Fase 1) y el primer commit se hace al cerrar el juez de verificación (Fase 2). Falta agregar el remote y pushear cuando el repo de GitHub exista.

---

## 2. Supabase

### 2.1 Crear el proyecto

1. Entrar a **supabase.com** → **Sign in** (con la cuenta de GitHub de la dueña, o email propio).
2. **New project**:
   - **Organization:** crear una (ej. "Hazing").
   - **Name:** `hazing`.
   - **Database Password:** generar una fuerte y guardarla.
   - **Region:** **South America (São Paulo)** — menor latencia para Argentina.
   - **Plan:** Free.
3. **Create new project** y esperar ~2 min a que se provisione.

### 2.2 Credenciales de API

En el proyecto → ⚙️ **Project Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Clave **`anon` / `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pública, va al cliente)
- Clave **`service_role` / `secret`** → `SUPABASE_SERVICE_ROLE_KEY` (**SECRETA**, solo server)

### 2.3 Conexión a la base (para Prisma)

En ⚙️ **Project Settings → Database → Connection string → pestaña "Prisma" (ORM)**. Supabase da dos strings ya armados (solo reemplazar `[YOUR-PASSWORD]`):
- **Pooled** (Transaction, puerto **6543**) → `DATABASE_URL`
- **Direct** (puerto **5432**) → `DIRECT_URL` (Prisma la usa para migraciones)

### 2.4 Storage (imágenes de producto)

Bucket (`product-images`) se crea en Fase 4, sin acción manual acá.

### 2.5 Auth

Email ya viene activo. Google OAuth (opcional) se configura cuando haga falta.

---

## 3. Cloudflare (hosting)

### 3.1 Crear cuenta

1. Entrar a **dash.cloudflare.com** → **Sign up** (gratis, cuenta de la dueña).
2. Verificar el email.

### 3.2 Conectar repo (después de tener el código pusheado)

**Opción A — Dashboard:** Workers & Pages → Create → Pages → Connect to Git → seleccionar `hazing`. Build command: `npm run build:worker`. Build output: `.open-next`.

**Opción B — CLI:** `npm run build:worker && wrangler deploy`.

### 3.3 Secrets de Cloudflare (Fase 10, no ahora)

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put DATABASE_URL
wrangler secret put DIRECT_URL
wrangler secret put MP_ACCESS_TOKEN
wrangler secret put MP_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM
wrangler secret put RESEND_OWNER_EMAIL
```

### 3.4 Dominio custom

Cuando Lazar lo compre: Workers & Pages → tu worker → Custom Domains → agregar el dominio. Hasta entonces se usa el subdominio `.workers.dev`.

---

## 4. Variables de entorno (`.env.local`)

Ver `.env.example` para la lista completa. Solo lo de §2.2/§2.3 hace falta para Fases 1–5.

---

## 5. Cronograma de credenciales por fase

| Cuándo | Servicio | Qué hace falta |
|---|---|---|
| **Fase 1–3** | GitHub · Supabase | repo + URL/anon/service_role + `DATABASE_URL`/`DIRECT_URL` |
| **Fase 8** | Mercado Pago (sandbox) | `MP_ACCESS_TOKEN` (TEST) + `MP_WEBHOOK_SECRET` |
| **Fase 10 (launch)** | Cloudflare · Resend · MP (prod) · Dominio | cuenta Cloudflare + API token · Resend key + dominio verificado · token PROD MP · DNS |

---

## 6. Qué compartir y qué NO

- Claves **públicas** (`NEXT_PUBLIC_*`, anon key, Project URL): no hay drama si aparecen, igual mejor en env.
- Claves **secretas** (`service_role`, `DATABASE_URL`, `DIRECT_URL`, password, MP token, Resend): **nunca** en el chat ni en git.
