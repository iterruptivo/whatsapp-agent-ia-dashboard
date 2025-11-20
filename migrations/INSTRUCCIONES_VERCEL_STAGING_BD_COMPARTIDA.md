# 🚀 Setup Vercel Staging con BD Compartida

**Duración:** 5-7 minutos
**Objetivo:** Crear entorno staging que use la misma BD de producción
**Costo:** $0 (usa plan gratuito Vercel + BD producción existente)

---

## 📋 PASO 1: Crear Proyecto Vercel Staging (3 min)

### Opción A: Desde Dashboard Vercel (Recomendado)

1. **Ir a Vercel Dashboard**
   - Ve a: https://vercel.com/dashboard
   - Asegúrate de estar en la organización/cuenta correcta

2. **Crear Nuevo Proyecto**
   - Click **"Add New..."** (botón arriba a la derecha)
   - Click **"Project"**

3. **Importar Repositorio**
   - Selecciona tu repositorio: `whatsapp-agent-ia-dashboard`
   - Click **"Import"**

4. **Configuración del Proyecto**
   - **Project Name:** `ecoplaza-dashboard-staging` (o el nombre que prefieras)
   - **Framework Preset:** Next.js (auto-detectado) ✅
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

   **⚠️ IMPORTANTE - Antes de hacer Deploy:**
   - Despliega la sección **"Build and Output Settings"**
   - NO hagas click en "Deploy" todavía

5. **Variables de Entorno**
   - En la misma pantalla, despliega **"Environment Variables"**
   - Agrega estas variables (mismas de producción):

   ```
   Variable Name: NEXT_PUBLIC_SUPABASE_URL
   Value: [copia de tu proyecto producción en Vercel]
   Environment: Production

   Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: [copia de tu proyecto producción en Vercel]
   Environment: Production

   Variable Name: SUPABASE_JWT_SECRET
   Value: [copia de tu proyecto producción en Vercel]
   Environment: Production

   Variable Name: NEXTAUTH_URL
   Value: https://ecoplaza-dashboard-staging.vercel.app
   Environment: Production

   Variable Name: NEXTAUTH_SECRET
   Value: [mismo que producción]
   Environment: Production
   ```

   **📝 Tip:** Para copiar las variables de producción:
   - Abre otra pestaña → Proyecto producción en Vercel
   - Settings → Environment Variables
   - Copia cada valor

6. **Deploy Inicial**
   - Una vez agregadas todas las variables
   - Click **"Deploy"**
   - Espera 2-3 minutos (compilación + deploy)
   - ✅ Verás "Congratulations! Your project has been deployed"

---

## 🔧 PASO 2: Configurar Rama "dev" como Production Branch (2 min)

**IMPORTANTE:** Por default, Vercel usa `main` como production branch. Necesitamos cambiar a `dev` para el proyecto staging.

1. **Ir a Settings**
   - En proyecto staging → Click **"Settings"** (tab superior)

2. **Git Configuration**
   - En menú lateral izquierdo → Click **"Git"**

3. **Cambiar Production Branch**
   - Busca sección **"Production Branch"**
   - Verás: `main` (default)
   - Click **"Edit"** o en el input
   - Cambia a: `dev`
   - Click **"Save"**

4. **Verificar**
   - La página debe mostrar: **Production Branch: dev** ✅
   - Ahora cada push a `dev` = auto-deploy staging
   - Push a `main` = NO afecta staging (solo producción)

---

## ✅ PASO 3: Verificar Deployment (1 min)

1. **Obtener URL**
   - Vercel Dashboard → Proyecto staging
   - Click en el último deployment (el inicial)
   - Verás URL generada: `https://ecoplaza-dashboard-staging.vercel.app`
   - Click **"Visit"**

2. **Probar Login**
   - Abre la URL staging
   - Intenta hacer login con credenciales normales
   - ✅ Debe funcionar correctamente (usa BD producción)

3. **Verificar Datos**
   - Dashboard debe mostrar leads, proyectos, locales
   - ✅ Todos los datos de producción deben estar presentes

4. **Consola del Navegador**
   - Abre DevTools (F12)
   - Tab **Console**
   - NO debe haber errores críticos
   - Deberías ver logs normales de autenticación

---

## 🎨 PASO 4 (OPCIONAL): Banner "Staging" para Diferenciar (5 min)

Para evitar confusión entre staging y producción, podemos agregar un banner visual en staging.

### 4.1 Detectar entorno

Vercel automáticamente inyecta estas variables:
- `process.env.VERCEL_ENV` = "production" | "preview" | "development"
- `process.env.VERCEL_URL` = URL del deployment

Podemos usarlas para detectar si estamos en staging.

### 4.2 Agregar Banner

**Archivo:** `components/StagingBanner.tsx` (crear nuevo)

```tsx
'use client';

export default function StagingBanner() {
  // Detectar si es staging (basado en URL)
  const isStaging =
    typeof window !== 'undefined' &&
    window.location.hostname.includes('staging');

  if (!isStaging) return null;

  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center font-bold text-sm sticky top-0 z-50">
      ⚠️ ENTORNO STAGING - Los cambios afectan la BD de producción
    </div>
  );
}
```

**Archivo:** `app/layout.tsx` (modificar)

```tsx
import StagingBanner from '@/components/StagingBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <StagingBanner />  {/* Agregar aquí */}
        {children}
      </body>
    </html>
  );
}
```

### 4.3 Deploy cambio

```bash
git add components/StagingBanner.tsx app/layout.tsx
git commit -m "feat: Add staging banner"
git push origin dev
# Auto-deploy a staging
```

---

## 📊 RESUMEN: Configuración Final

### Producción
```
URL: https://ecoplaza-dashboard.vercel.app
Git Branch: main
BD: Supabase Producción
Auto-deploy: ✅ (push a main)
```

### Staging
```
URL: https://ecoplaza-dashboard-staging.vercel.app
Git Branch: dev
BD: Supabase Producción (COMPARTIDA) ⚠️
Auto-deploy: ✅ (push a dev)
```

---

## 🔄 Workflow de Desarrollo

### Desarrollo Normal:

```bash
# 1. Trabajar en rama dev
git checkout dev
git pull origin dev

# 2. Hacer cambios
# ... editar archivos ...

# 3. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin dev

# ↓ Auto-deploy a Vercel Staging
# ↓ Vercel compila y despliega en ~2 min

# 4. Probar en staging
# Abrir: https://ecoplaza-dashboard-staging.vercel.app
# Verificar que funciona correctamente

# 5. Si todo OK → Merge a main (producción)
git checkout main
git pull origin main
git merge dev
git push origin main

# ↓ Auto-deploy a Vercel Production
```

### Cambios en Base de Datos (Migrations):

```bash
# 1. Crear migration
# migrations/002_nuevo_cambio.sql

# 2. Probar en localhost primero (opcional)

# 3. Ejecutar en BD producción (¡CUIDADO!)
# Supabase → SQL Editor → Run migration

# 4. Deploy staging para verificar
git add migrations/002_nuevo_cambio.sql
git commit -m "migration: descripción del cambio"
git push origin dev

# 5. Verificar en staging
# Si funciona OK → merge a main
```

---

## ⚠️ PRECAUCIONES (BD Compartida)

### ✅ SEGURO (Hacer en staging):
- Probar nuevas features visuales
- Probar nuevos componentes
- Verificar responsive design
- Probar flujos de usuario
- Agregar datos de prueba normales
- Probar imports de CSV

### ❌ PELIGROSO (NO hacer en staging):
- Truncar tablas (`TRUNCATE TABLE ...`)
- Borrar datos masivos (`DELETE FROM ...`)
- Modificar datos existentes masivamente
- Ejecutar migrations destructivas sin backup
- Desactivar usuarios reales
- Cambiar passwords de usuarios

### 💡 Buena Práctica:
- Siempre hacer backup manual antes de migrations importantes
- Usar queries con `LIMIT` cuando estés probando
- Verificar dos veces antes de ejecutar `DELETE` o `UPDATE`

---

## 🚨 Troubleshooting

### Error: "Failed to fetch" en staging
**Causa:** Variables de entorno no configuradas
**Fix:**
1. Vercel → Proyecto staging → Settings → Environment Variables
2. Verificar que todas las variables estén presentes
3. Click **Deployments** → Último deploy → "..." → **Redeploy**

### Staging no muestra últimos cambios
**Causa:** Push fue a `main` en vez de `dev`
**Fix:**
```bash
git checkout dev
git merge main  # Traer cambios de main a dev
git push origin dev  # Deploy a staging
```

### Cambios en BD no se reflejan en staging
**Causa:** Cache de Next.js o navegador
**Fix:**
1. Hard refresh: Ctrl + Shift + R
2. Limpiar cookies/localStorage
3. Abrir en ventana incógnita

---

## 🎯 Migración Futura a BD Separada

Cuando decidas crear BD staging separada ($10/mes):

1. Crear proyecto Supabase nuevo
2. Ejecutar `migrations/00_SCHEMA_COMPLETO_STAGING.sql`
3. Exportar datos producción (CSV)
4. Importar en staging
5. Cambiar variables en Vercel staging:
   - `NEXT_PUBLIC_SUPABASE_URL` → nueva URL staging
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → nueva key staging
6. Redeploy
7. ✅ Staging ahora usa BD separada

**Tiempo:** 20 minutos
**Archivos necesarios:** Ya los tienes en `migrations/`

---

## ✅ Verificación Final

### Checklist:

- [ ] Proyecto Vercel staging creado
- [ ] Variables de entorno configuradas (5 variables)
- [ ] Production branch = `dev`
- [ ] Deployment exitoso (verde ✓)
- [ ] URL staging accesible
- [ ] Login funciona correctamente
- [ ] Dashboard muestra datos de producción
- [ ] No hay errores en consola

Si todos los checks están ✅ → **¡Staging listo!** 🚀

---

**Última actualización:** 19 Noviembre 2025
**Configuración:** BD Compartida (Staging + Producción usan misma BD)
