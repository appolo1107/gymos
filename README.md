# GymOS — Guía de deploy paso a paso

## Lo que tenés en esta carpeta
- `src/` → Código de la app React
- `public/` → HTML base
- `supabase_schema.sql` → Base de datos completa
- `.env.example` → Plantilla de variables de entorno

---

## PASO 1 — Configurar Supabase (base de datos)

1. Entrá a https://supabase.com y abrí tu proyecto
2. En el menú izquierdo → **SQL Editor** → **New query**
3. Copiá todo el contenido de `supabase_schema.sql` y pegalo
4. Hacé click en **Run** (botón verde)
5. Vas a ver todas las tablas creadas ✓

6. Ahora andá a **Settings → API**
7. Copiá:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (la clave larga)

---

## PASO 2 — Subir el código a GitHub

1. Entrá a https://github.com → **New repository**
2. Nombre: `gymos` → **Create repository**
3. En tu computadora, abrí una terminal en esta carpeta y ejecutá:

```bash
git init
git add .
git commit -m "GymOS inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gymos.git
git push -u origin main
```

---

## PASO 3 — Deploy en Vercel

1. Entrá a https://vercel.com → **Add New Project**
2. Conectá tu repositorio de GitHub `gymos`
3. Vercel detecta React automáticamente → click en **Deploy**
4. Cuando termine, andá a **Settings → Environment Variables** y agregá:

```
REACT_APP_SUPABASE_URL     = https://TU-PROYECTO.supabase.co
REACT_APP_SUPABASE_ANON_KEY = TU-ANON-KEY
```

5. Hacé un **Redeploy** para que tome las variables
6. ¡Listo! Tu app está en vivo en `gymos.vercel.app`

---

## PASO 4 — Conectar tu dominio (opcional)

1. En Vercel → **Settings → Domains** → agregá `gymos.app` (o el que tengas)
2. Seguí las instrucciones para apuntar los DNS desde tu proveedor de dominio

---

## Stack técnico
- **Frontend**: React 18 + React Router
- **Backend/DB**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Hosting**: Vercel
- **Costo inicial**: $0/mes (hasta escalar)
