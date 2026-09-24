# Hazing — Setup & Credenciales (paso a paso)

> Guía para dar de alta servicios y juntar credenciales. **Regla de oro de seguridad:** las claves secretas van solo en `.env.local` (gitignored) y en las Environment Variables del proyecto de Vercel. Nunca se pegan en el chat ni se suben a git.
>
> Desde el 2026-09-24 ([ADR 0005](docs/decisions/0005-deploy-en-vercel.md)) todo vive en **cuentas de Lazar**, como glamify: GitHub `Laza223`, Vercel Pro y la organización de Supabase de Lazar. Lo que sigue separado de `glamify-makeup` es el **proyecto**: base, storage, auth, variables y credenciales propias de Hazing.

---

## 0. Qué vamos a crear (orden)

1. **Supabase** → proyecto nuevo `hazing` en tu organización (base + auth + storage). Es lo que destraba trabajar con datos reales.
2. **GitHub** → repo privado `hazing` en `Laza223`.
3. **Vercel** → proyecto nuevo `hazing` en tu cuenta Pro (Fase 10).
4. Cargar las variables de entorno.

---

## 1. Supabase

### 1.1 Crear el proyecto

1. **supabase.com** → tu organización (la de glamify/turnogol) → **New project**:
   - **Name:** `hazing`.
   - **Database Password:** generar una fuerte y guardarla.
   - **Region:** **South America (São Paulo)** — menor latencia para Argentina.
   - **Compute:** Micro.
2. **Create new project** y esperar ~2 min a que se provisione.

### 1.2 Credenciales de API

En el proyecto → **Project Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Clave **`anon` / `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pública, va al cliente)
- Clave **`service_role` / `secret`** → `SUPABASE_SERVICE_ROLE_KEY` (**SECRETA**, solo server)

### 1.3 Conexión a la base (para Prisma)

En **Project Settings → Database → Connection string → pestaña "Prisma" (ORM)**. Supabase da dos strings ya armados (solo reemplazar `[YOUR-PASSWORD]`):

- **Pooled** (Transaction, puerto **6543**) → `DATABASE_URL`
- **Direct** (puerto **5432**) → `DIRECT_URL` (Prisma la usa para migraciones)

Con esto en `.env.local` se corre la migración inicial (Fase 3) y el storefront empieza a mostrar datos reales.

### 1.4 Storage y Auth

El bucket de imágenes de producto se crea con la Fase 7 (admin), sin acción manual acá. Auth por email ya viene activo.

---

## 2. GitHub (repo)

1. En `Laza223`: **New repository** → nombre `hazing` → **Private** → **NO** marcar "Add a README" (ya hay historia local) → **Create**.
2. Avisar: se agrega el remote y se pushea `main`. El CI (`quality`) corre desde ese push.

---

## 3. Vercel (hosting, Fase 10)

1. En tu cuenta Pro: **Add New → Project**. El deploy sale de GitHub Actions con Vercel CLI + token (igual que glamify), para que solo se publique lo que pasó el CI.
2. Secrets del repo de GitHub (Settings → Secrets → Actions): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
3. Environment Variables del proyecto de Vercel (Production): todas las de `.env.example`, más **`CRON_SECRET`** (un string aleatorio largo: Vercel Cron lo manda solo en el header de `/api/cron`, y sin él la ruta responde 401 y los jobs no corren).
4. **Dominio:** cuando esté comprado, Project → Settings → Domains. Hasta entonces, el subdominio `.vercel.app`.

---

## 4. Variables de entorno (`.env.local`)

Ver `.env.example` para la lista completa. Para desarrollar alcanza con lo de §1.2 y §1.3. `CRON_SECRET` solo hace falta en local si se quiere probar `/api/cron` a mano (todavía no está en `.env.example`: agregarlo al completar ese archivo).

---

## 5. Cronograma de credenciales por fase

| Cuándo | Servicio | Qué hace falta |
|---|---|---|
| **Ya (Fase 3/6)** | Supabase | URL/anon/service_role + `DATABASE_URL`/`DIRECT_URL` |
| **Ya (CI)** | GitHub | repo `hazing` en `Laza223` |
| **Fase 8** | Mercado Pago (sandbox) | `MP_ACCESS_TOKEN` (TEST) + `MP_WEBHOOK_SECRET` de la cuenta de la dueña |
| **Fase 9** | MiCorreo | credenciales de la cotización en vivo (ADR 0004) |
| **Fase 10 (launch)** | Vercel · Resend · MP (prod) · Dominio | proyecto + token + `CRON_SECRET` · Resend key + dominio verificado · token PROD MP · DNS |

---

## 6. Qué compartir y qué NO

- Claves **públicas** (`NEXT_PUBLIC_*`, anon key, Project URL): no hay drama si aparecen, igual mejor en env.
- Claves **secretas** (`service_role`, `DATABASE_URL`, `DIRECT_URL`, password, MP token, Resend, `CRON_SECRET`, tokens de Vercel): **nunca** en el chat ni en git.
