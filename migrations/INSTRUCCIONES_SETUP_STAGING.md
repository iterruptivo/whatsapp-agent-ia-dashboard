# 🚀 INSTRUCCIONES: Setup Completo Entorno Staging

**Fecha:** 19 Noviembre 2025
**Objetivo:** Crear entorno staging con copia completa de producción
**Duración estimada:** 15-20 minutos

---

## 📋 RESUMEN DEL FLUJO

```
PASO 1: Crear nuevo proyecto Supabase Staging
    ↓
PASO 2: Ejecutar script SQL para crear estructura (schema)
    ↓
PASO 3: Exportar datos de producción (CSV)
    ↓
PASO 4: Importar datos en staging (CSV)
    ↓
PASO 5: Crear rama 'dev' en Git
    ↓
PASO 6: Configurar Vercel staging
    ↓
PASO 7: Deploy y prueba
```

---

## 🗄️ PASO 1: Crear Proyecto Supabase Staging (5 min)

### 1.1 Crear proyecto
1. Ve a https://supabase.com/dashboard
2. Click **"New Project"**
3. Configuración:
   - **Name:** `ecoplaza-dashboard-staging`
   - **Database Password:** [genera uno seguro y guárdalo]
   - **Region:** Same as production (Latam: South America)
   - **Pricing Plan:** Free (suficiente para staging)
4. Click **"Create new project"**
5. Espera 2-3 minutos mientras se provisiona

### 1.2 Obtener credenciales
Una vez creado el proyecto:

1. Ve a **Settings → API**
2. Copia y guarda estos valores:
   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbG...
   service_role key: eyJhbG... (NO exponer en frontend)
   ```

---

## 🏗️ PASO 2: Ejecutar Script SQL - Crear Estructura (3 min)

### 2.1 Abrir SQL Editor
1. En proyecto staging, ve a **SQL Editor** (menú lateral)
2. Click **"New query"**

### 2.2 Ejecutar script
1. Abre el archivo: `migrations/00_SCHEMA_COMPLETO_STAGING.sql`
2. Copia TODO el contenido
3. Pega en el SQL Editor de Supabase staging
4. Click **"Run"** (botón verde abajo a la derecha)
5. Debes ver: **"Success. No rows returned"**

### 2.3 Verificar creación
Ejecuta esta query de verificación:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('proyectos', 'vendedores', 'usuarios', 'leads', 'locales', 'locales_historial', 'locales_leads')
ORDER BY table_name;
```

**Expected:** 7 filas (las 7 tablas creadas)

---

## 📤 PASO 3: Exportar Datos de Producción (5 min)

### 3.1 Abrir proyecto producción
1. Ve a tu proyecto Supabase de **PRODUCCIÓN**
2. Ve a **Table Editor** (menú lateral)

### 3.2 Exportar cada tabla a CSV
**IMPORTANTE:** Exportar en este orden (por dependencias):

#### Tabla 1: proyectos
1. Click tabla **"proyectos"**
2. Click botón **"..."** (tres puntos arriba a la derecha)
3. Click **"Download as CSV"**
4. Guarda como: `proyectos_prod.csv`

#### Tabla 2: vendedores
1. Click tabla **"vendedores"**
2. **"..."** → **"Download as CSV"**
3. Guarda como: `vendedores_prod.csv`

#### Tabla 3: usuarios
1. Click tabla **"usuarios"**
2. **"..."** → **"Download as CSV"**
3. Guarda como: `usuarios_prod.csv`

#### Tabla 4: leads
1. Click tabla **"leads"**
2. **IMPORTANTE:** Si tienes muchos leads (>1000):
   - Supabase solo exporta 500 filas por default
   - Opción A: Exportar en batches usando filtros
   - Opción B: Usar comando CLI (ver sección avanzada abajo)
3. **"..."** → **"Download as CSV"**
4. Guarda como: `leads_prod.csv`

#### Tabla 5: locales
1. Click tabla **"locales"**
2. **"..."** → **"Download as CSV"**
3. Guarda como: `locales_prod.csv`

#### Tabla 6: locales_historial
1. Click tabla **"locales_historial"**
2. **"..."** → **"Download as CSV"**
3. Guarda como: `locales_historial_prod.csv`

#### Tabla 7: locales_leads
1. Click tabla **"locales_leads"**
2. **"..."** → **"Download as CSV"**
3. Guarda como: `locales_leads_prod.csv`

---

## 📥 PASO 4: Importar Datos en Staging (5 min)

### 4.1 Abrir proyecto staging
1. Ve a tu proyecto Supabase **STAGING**
2. Ve a **Table Editor**

### 4.2 Importar cada CSV
**IMPORTANTE:** Importar en el MISMO orden (por foreign keys):

#### 1. proyectos
1. Click tabla **"proyectos"**
2. Click **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona archivo: `proyectos_prod.csv`
4. Click **"Import"**
5. Verifica: Debe mostrar N filas importadas

#### 2. vendedores
1. Click tabla **"vendedores"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `vendedores_prod.csv`
4. **"Import"**

#### 3. usuarios
1. Click tabla **"usuarios"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `usuarios_prod.csv`
4. **"Import"**

#### 4. leads
1. Click tabla **"leads"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `leads_prod.csv`
4. **"Import"**
5. **Nota:** Si tienes >1000 leads, importar en batches

#### 5. locales
1. Click tabla **"locales"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `locales_prod.csv`
4. **"Import"**

#### 6. locales_historial
1. Click tabla **"locales_historial"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `locales_historial_prod.csv`
4. **"Import"**

#### 7. locales_leads
1. Click tabla **"locales_leads"**
2. **"Insert"** → **"Import data from spreadsheet"**
3. Selecciona: `locales_leads_prod.csv`
4. **"Import"**

### 4.3 Verificar importación
Ejecuta queries de verificación:

```sql
-- Contar registros en cada tabla
SELECT
  'proyectos' as tabla,
  COUNT(*) as registros
FROM proyectos
UNION ALL
SELECT 'vendedores', COUNT(*) FROM vendedores
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'locales', COUNT(*) FROM locales
UNION ALL
SELECT 'locales_historial', COUNT(*) FROM locales_historial
UNION ALL
SELECT 'locales_leads', COUNT(*) FROM locales_leads
ORDER BY tabla;
```

**Expected:** Números deben coincidir con producción

---

## 🌿 PASO 5: Crear Rama 'dev' en Git (1 min)

### 5.1 En tu terminal local
```bash
# Asegurarte de estar en main y actualizado
cd E:\Iterruptivo\Proyectos-Clientes\EcoPlaza\AgenteIA-Whatsapp\dashboard
git checkout main
git pull origin main

# Crear rama dev desde main
git checkout -b dev

# Push rama dev a GitHub
git push -u origin dev
```

### 5.2 Verificar en GitHub
1. Ve a tu repositorio en GitHub
2. Debe aparecer rama **"dev"** en el dropdown de branches
3. ✅ Rama creada correctamente

---

## ☁️ PASO 6: Configurar Vercel Staging (3 min)

### 6.1 Crear nuevo proyecto Vercel staging
**Opción A: Desde dashboard Vercel**

1. Ve a https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Selecciona tu repositorio (mismo que producción)
4. Click **"Import"**
5. Configuración:
   - **Project Name:** `ecoplaza-dashboard-staging` (o el que prefieras)
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

**Opción B: Desde CLI (más rápido)**

```bash
# Instalar Vercel CLI si no la tienes
npm i -g vercel

# Deploy staging
cd E:\Iterruptivo\Proyectos-Clientes\EcoPlaza\AgenteIA-Whatsapp\dashboard
git checkout dev
vercel --prod

# Seguir el wizard:
# - Link to existing project? No
# - Project name: ecoplaza-dashboard-staging
# - Directory: ./ (press Enter)
# - Override settings? No
```

### 6.2 Configurar variables de entorno staging

#### En Vercel Dashboard:
1. Ve a tu proyecto **staging** en Vercel
2. **Settings** → **Environment Variables**
3. Agregar estas variables (todas para **Production** environment):

```env
# Supabase Staging Credentials
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto-staging].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-staging]

# JWT Secret (obtener de Supabase Staging: Settings → API → JWT Settings)
SUPABASE_JWT_SECRET=[jwt-secret-staging]

# NextAuth (puedes usar la misma que producción o generar nueva)
NEXTAUTH_URL=https://ecoplaza-dashboard-staging.vercel.app
NEXTAUTH_SECRET=[mismo-de-prod-o-nuevo]
```

4. Click **"Save"** para cada variable

### 6.3 Configurar Git Integration
1. En proyecto Vercel staging → **Settings** → **Git**
2. **Production Branch:** Cambiar de `main` a `dev`
3. ✅ Ahora cada push a `dev` = auto-deploy staging

---

## 🔄 PASO 7: Redeploy con Variables (1 min)

### 7.1 Trigger nuevo deploy
1. Vercel Dashboard → Tu proyecto staging
2. **Deployments** tab
3. Click **"..."** en el último deployment
4. Click **"Redeploy"**
5. ✅ Check **"Use existing Build Cache"**
6. Click **"Redeploy"**
7. Espera 2-3 minutos

### 7.2 Verificar deployment
1. Cuando termine, click en el deployment
2. Click **"Visit"** para abrir la URL staging
3. Debes ver el dashboard cargando

---

## ✅ PASO 8: Pruebas Finales (3 min)

### 8.1 Test login staging
1. Abre URL staging: `https://ecoplaza-dashboard-staging.vercel.app`
2. Intenta hacer login con credenciales de producción
3. ✅ Debe funcionar correctamente

### 8.2 Test datos
1. Verifica que dashboard muestra leads de producción
2. Verifica proyectos en dropdown
3. Verifica tabla de locales
4. ✅ Todos los datos deben estar presentes

### 8.3 Test consola
1. Abre DevTools (F12)
2. Verifica que no haya errores en consola
3. Verifica logs de Supabase:
   ```
   [AUTH] User authenticated: ...
   [DB] getAllLeads() - FASE 2: Keyset pagination
   ```

---

## 📊 RESUMEN: URLs y Credenciales

### Producción
```
URL Dashboard: https://ecoplaza-dashboard.vercel.app
Supabase URL: [tu-url-prod]
Git Branch: main
```

### Staging
```
URL Dashboard: https://ecoplaza-dashboard-staging.vercel.app
Supabase URL: https://[tu-proyecto-staging].supabase.co
Git Branch: dev
```

### Workflow de Desarrollo
```
1. Desarrollas en localhost (usa staging DB o prod DB)
2. git add . && git commit -m "feature: ..."
3. git push origin dev
4. Auto-deploy a Vercel Staging
5. Pruebas en staging
6. Si todo OK: git checkout main && git merge dev && git push origin main
7. Auto-deploy a Vercel Production
```

---

## 🔧 COMANDOS ÚTILES

### Git workflow
```bash
# Trabajar en nueva feature
git checkout dev
git pull origin dev
# ... hacer cambios ...
git add .
git commit -m "feat: descripción del cambio"
git push origin dev  # ← Auto-deploy staging

# Cuando esté listo para producción
git checkout main
git pull origin main
git merge dev
git push origin main  # ← Auto-deploy production
```

### Vercel CLI
```bash
# Ver logs staging
vercel logs https://ecoplaza-dashboard-staging.vercel.app

# Ver env variables
vercel env ls

# Pull environment variables localmente
vercel env pull
```

### Supabase CLI (opcional - para migraciones futuras)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link a proyecto staging
supabase link --project-ref [staging-project-ref]

# Generar migration desde cambios locales
supabase db diff -f nombre_migracion

# Apply migration
supabase db push
```

---

## 🚨 TROUBLESHOOTING

### Error: "Failed to fetch" en staging
**Causa:** Variables de entorno incorrectas
**Fix:**
1. Vercel → Settings → Environment Variables
2. Verificar NEXT_PUBLIC_SUPABASE_URL y ANON_KEY
3. Redeploy

### Error: "Invalid JWT" en staging
**Causa:** JWT_SECRET incorrecto
**Fix:**
1. Supabase Staging → Settings → API → JWT Settings
2. Copiar el JWT Secret
3. Actualizar en Vercel → Environment Variables
4. Redeploy

### Error: "No rows found" en tablas
**Causa:** Datos no importados correctamente
**Fix:**
1. Verificar orden de importación (proyectos → vendedores → usuarios → leads → locales...)
2. Re-importar tablas faltantes

### Staging muestra datos de producción mezclados
**Causa:** Variables de entorno apuntan a BD producción
**Fix:**
1. Verificar que Vercel staging use SUPABASE_URL de staging
2. NO de producción

---

## 📝 PRÓXIMOS PASOS

1. ✅ **Entorno staging operativo**
2. ⏭️ **Sistema de migrations** (próxima sesión):
   - Archivo `migrations/001_nombre_cambio.sql`
   - Documentar cada cambio en BD
   - Ejecutar primero en staging, luego en prod

3. ⏭️ **Testing staging**:
   - Probar todas las features en staging antes de prod
   - Validar cambios de UI/UX
   - Validar cambios de BD

---

**🎯 OBJETIVO CUMPLIDO:**
- ✅ Entorno staging con copia completa de producción
- ✅ Git workflow con rama `dev`
- ✅ Auto-deploy staging desde rama `dev`
- ✅ Auto-deploy production desde rama `main`

**¡Staging listo para usar! 🚀**
