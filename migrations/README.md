# 📁 Sistema de Migrations SQL

**Objetivo:** Mantener control de versiones de cambios en la base de datos

---

## 📋 ¿Qué es una Migration?

Una **migration** es un archivo SQL que documenta un cambio específico en la estructura de la base de datos (schema). Por ejemplo:
- Agregar una nueva columna
- Crear una nueva tabla
- Modificar un índice
- Cambiar un tipo de dato

---

## 🗂️ Estructura de Carpeta

```
migrations/
├── README.md                           ← Este archivo
├── 00_SCHEMA_COMPLETO_STAGING.sql      ← Schema completo inicial (para staging)
├── INSTRUCCIONES_SETUP_STAGING.md      ← Instrucciones setup entorno staging
├── 001_add_monto_separacion.sql        ← Ejemplo: Migration para monto_separacion
├── 002_add_utm_column.sql              ← Futuro: agregar columna UTM
├── 003_create_analytics_table.sql      ← Futuro: tabla analytics
└── ...                                 ← Migrations futuras
```

---

## ✍️ Nombrar Migrations

### Formato:
```
{número}_{descripción_corta}.sql

Ejemplos:
001_add_monto_separacion.sql
002_alter_historial_varchar.sql
003_add_utm_index.sql
004_create_analytics_table.sql
```

### Reglas:
1. **Número secuencial** (001, 002, 003, ...) - facilita orden cronológico
2. **Descripción en inglés** (snake_case) - describe QUÉ hace la migration
3. **Específico y corto** - máximo 40 caracteres en descripción
4. **Un cambio por archivo** - facilita rollback si es necesario

---

## 🚀 Workflow de Migrations

### Flujo Completo:
```
1. Identificas necesidad de cambio en BD
    ↓
2. Creas archivo migration (ej: 005_add_column_foo.sql)
    ↓
3. Pruebas la migration en LOCAL (opcional)
    ↓
4. Ejecutas en STAGING primero
    ↓
5. Pruebas que funciona correctamente
    ↓
6. Si todo OK → Ejecutas en PRODUCCIÓN
    ↓
7. Commiteas la migration a Git (rama dev)
```

### Paso a Paso:

#### 1. Crear nueva migration

```bash
# En tu editor, crea archivo:
migrations/005_add_analytics_column.sql
```

Contenido del archivo:
```sql
-- ============================================================================
-- MIGRATION 005: Add analytics_enabled column to proyectos
-- ============================================================================
-- Fecha: 20 Noviembre 2025
-- Descripción: Agregar flag analytics_enabled para controlar tracking
-- Autor: [Tu nombre]
-- ============================================================================

-- Add column
ALTER TABLE proyectos
ADD COLUMN analytics_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add index
CREATE INDEX idx_proyectos_analytics ON proyectos(analytics_enabled);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'proyectos'
  AND column_name = 'analytics_enabled';
-- Expected: 1 row

-- ============================================================================
-- ROLLBACK (ejecutar solo si necesitas revertir)
-- ============================================================================
/*
DROP INDEX IF EXISTS idx_proyectos_analytics;
ALTER TABLE proyectos DROP COLUMN analytics_enabled;
*/
```

#### 2. Probar en LOCAL (Opcional)

Si tienes Supabase corriendo localmente:
```bash
supabase db reset
supabase db push
```

#### 3. Ejecutar en STAGING

1. Abre Supabase STAGING → SQL Editor
2. Copia contenido de `005_add_analytics_column.sql`
3. Pega y ejecuta
4. Verifica resultado con query de verificación

#### 4. Verificar en app staging

1. Abre `https://ecoplaza-dashboard-staging.vercel.app`
2. Verifica que la feature funciona correctamente
3. Revisa consola (F12) - no debe haber errores

#### 5. Ejecutar en PRODUCCIÓN

**Solo si staging funciona OK:**

1. Abre Supabase PRODUCCIÓN → SQL Editor
2. Copia contenido de `005_add_analytics_column.sql`
3. Pega y ejecuta
4. Verifica resultado

#### 6. Commit a Git

```bash
git add migrations/005_add_analytics_column.sql
git commit -m "migration: Add analytics_enabled column to proyectos"
git push origin dev

# Cuando esté en producción:
git checkout main
git merge dev
git push origin main
```

---

## 📝 Template de Migration

Usa este template para crear nuevas migrations:

```sql
-- ============================================================================
-- MIGRATION XXX: [Título descriptivo]
-- ============================================================================
-- Fecha: [DD Mes YYYY]
-- Descripción: [Descripción detallada del cambio]
-- Autor: [Tu nombre]
-- Ticket/Issue: [# si aplica]
-- ============================================================================

-- ============================================================================
-- PASO 1: [Describir qué hace este paso]
-- ============================================================================

[SQL statements aquí]

-- ============================================================================
-- PASO 2: Verificación
-- ============================================================================

[Query de verificación]
-- Expected: [resultado esperado]

-- ============================================================================
-- ROLLBACK (ejecutar solo si necesitas revertir)
-- ============================================================================
/*
[SQL statements para revertir el cambio]
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
/*
1. [Nota importante sobre el cambio]
2. [Impacto en la aplicación]
3. [Consideraciones de performance]
*/
```

---

## ⚠️ Buenas Prácticas

### ✅ DO (Hacer):
1. **Siempre probar en staging primero**
2. **Incluir query de verificación** en cada migration
3. **Incluir sección ROLLBACK** (por si necesitas revertir)
4. **Documentar impacto** en comentarios
5. **Un cambio atómico** por migration
6. **Usar transacciones** cuando sea posible
7. **Hacer backup** antes de migrations grandes

### ❌ DON'T (No hacer):
1. **Nunca ejecutar directamente en producción** sin probar en staging
2. **No modificar migrations ya aplicadas** - crear nueva migration
3. **No mezclar cambios no relacionados** en una sola migration
4. **No olvidar índices** cuando agregas columnas con queries frecuentes
5. **No hacer cambios destructivos** sin backup (DROP, TRUNCATE, etc.)

---

## 🔧 Casos de Uso Comunes

### 1. Agregar columna
```sql
ALTER TABLE leads
ADD COLUMN fuente VARCHAR(50);
```

### 2. Modificar tipo de columna
```sql
ALTER TABLE locales_historial
ALTER COLUMN accion TYPE VARCHAR(2000);
```

### 3. Agregar índice
```sql
CREATE INDEX idx_leads_utm ON leads(utm);
```

### 4. Crear tabla nueva
```sql
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento VARCHAR(100) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Agregar constraint
```sql
ALTER TABLE leads
ADD CONSTRAINT check_telefono_length
CHECK (LENGTH(telefono) >= 10);
```

### 6. Modificar default value
```sql
ALTER TABLE leads
ALTER COLUMN utm SET DEFAULT 'victoria';
```

---

## 📊 Tracking de Migrations

### Ver historial en Supabase
```sql
SELECT schemaname, tablename, last_modified
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY last_modified DESC;
```

### Ver columnas agregadas
```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Ver índices
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## 🚨 Rollback de Migrations

### ¿Cuándo hacer rollback?

- Error en producción después de aplicar migration
- Feature requiere cambio diferente
- Impacto negativo en performance

### Cómo hacer rollback:

1. **Ejecutar sección ROLLBACK** de la migration
2. **Verificar** que cambio se revirtió correctamente
3. **Probar app** para confirmar que funciona
4. **Documentar** por qué se hizo rollback

### Ejemplo:
```sql
-- ROLLBACK de migration 005
DROP INDEX IF EXISTS idx_proyectos_analytics;
ALTER TABLE proyectos DROP COLUMN analytics_enabled;

-- Verify
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'proyectos'
  AND column_name = 'analytics_enabled';
-- Expected: 0 rows (columna eliminada)
```

---

## 📖 Migrations Existentes

### 00_SCHEMA_COMPLETO_STAGING.sql
- **Propósito:** Schema completo inicial para crear entorno staging
- **Incluye:** Todas las tablas, índices, triggers, RLS policies
- **Cuándo usar:** Solo al crear nuevo entorno staging desde cero

### 001_add_monto_separacion.sql (Ejemplo)
- **Fecha:** 19 Noviembre 2025
- **Cambio:** Agregar columna monto_separacion a tablas locales y locales_leads
- **Estado:** Ejemplo de referencia (no ejecutar si ya existe la columna)

---

## ❓ FAQs

**Q: ¿Debo crear migration para cambios en código TypeScript?**
A: No, solo para cambios en estructura de BD (schema). Cambios en código van directo a Git.

**Q: ¿Qué pasa si olvido ejecutar migration en staging?**
A: La app staging fallará. Ejecuta la migration pendiente inmediatamente.

**Q: ¿Puedo editar una migration después de aplicarla?**
A: No. Si hay error, crea nueva migration para corregir. Las migrations son inmutables.

**Q: ¿Cómo sincronizo migrations entre staging y producción?**
A: Ejecuta en orden secuencial en ambos entornos. No te saltes números.

**Q: ¿Necesito migrations para datos (INSERT)?**
A: Generalmente no. Usa migrations solo para cambios de estructura. Datos manuales en Table Editor.

---

**🎯 Objetivo del Sistema de Migrations:**

✅ Control de versiones de cambios en BD
✅ Facilita colaboración en equipo
✅ Permite rollback seguro
✅ Documentación automática de evolución del schema
✅ Testing en staging antes de producción

---

**Última actualización:** 19 Noviembre 2025
