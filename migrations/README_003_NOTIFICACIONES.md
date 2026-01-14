# Instrucciones: Migración 003 - Módulo de Notificaciones

**Fecha:** 13 Enero 2026
**Archivo:** `003_modulo_notificaciones.sql`
**Estado:** LISTO PARA EJECUTAR
**Tiempo estimado:** 5-10 minutos

---

## Pre-requisitos

Antes de ejecutar esta migración, verifica que:

- [x] Las tablas `usuarios` y `proyectos` existen
- [x] Tienes permisos de superadmin en Supabase
- [x] Estás en el proyecto correcto (Staging o Producción)
- [x] Tienes backup reciente de la base de datos

---

## ¿Qué hace esta migración?

Esta migración crea el sistema de notificaciones centralizado de ECOPLAZA con:

### 4 Tablas

1. **notifications** - Almacena todas las notificaciones
2. **notification_preferences** - Preferencias por usuario
3. **notification_templates** - Templates reutilizables
4. **notification_delivery_log** - Log de entregas multi-canal

### 9 Índices Optimizados

- Índice principal para listado (user_id, created_at)
- Índice para badge counter (unread)
- Índice GIN para metadata JSONB
- Índice por categoría
- Índice para cleanup automático
- Índice para threading
- Índice por prioridad

### 5 Funciones

1. `mark_all_as_read_batch` - Marca todas como leídas (batch de 10K)
2. `get_unread_notification_count` - Badge counter optimizado
3. `cleanup_old_notifications` - Cleanup automático (5 meses)
4. `mark_expired_notifications` - Marca expiradas
5. `create_default_notification_preferences` - Preferencias default

### RLS Policies

- Políticas completas por tabla y rol
- Usuarios solo ven sus notificaciones
- Admins pueden gestionar templates

### 8 Templates Seed

- `lead_assigned` - Lead asignado
- `lead_contacted` - Lead contactado
- `pr_created` - PR creada
- `pr_pending_approval` - PR pendiente
- `pr_approved` - PR aprobada
- `pr_rejected` - PR rechazada
- `payment_registered` - Pago registrado
- `payment_verified` - Pago verificado

---

## Cómo Ejecutar

### Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ir a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegar a **SQL Editor**
3. Abrir el archivo `003_modulo_notificaciones.sql`
4. Copiar TODO el contenido
5. Pegar en el SQL Editor
6. Hacer clic en **Run**
7. Verificar que dice "Success. No rows returned"

### Opción 2: Supabase CLI

```bash
# Asegurarte de estar en el directorio del proyecto
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard

# Conectar al proyecto correcto
supabase link --project-ref <project-id>

# Ejecutar migración
supabase db execute --file migrations/003_modulo_notificaciones.sql
```

### Opción 3: psql (Directo a PostgreSQL)

```bash
# Solo si tienes acceso directo a la base de datos
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/003_modulo_notificaciones.sql
```

---

## Verificación Post-Migración

Después de ejecutar la migración, verifica que todo está correcto:

### 1. Verificar Tablas Creadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'notifications',
    'notification_preferences',
    'notification_templates',
    'notification_delivery_log'
  );
```

**Resultado esperado:** 4 filas

### 2. Verificar Índices

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'notification_preferences', 'notification_templates');
```

**Resultado esperado:** ~15 índices (9 en notifications + otros)

### 3. Verificar Funciones

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%notification%';
```

**Resultado esperado:** 5 funciones

### 4. Verificar RLS Habilitado

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'notifications',
    'notification_preferences',
    'notification_templates',
    'notification_delivery_log'
  );
```

**Resultado esperado:** Todas con rowsecurity = true

### 5. Verificar Templates Seed

```sql
SELECT type, category, is_active
FROM notification_templates
WHERE is_active = TRUE;
```

**Resultado esperado:** 8 templates

### 6. Test Funcional: Crear Notificación

```sql
-- Reemplazar 'USER_UUID' con un UUID válido de tu tabla usuarios
INSERT INTO notifications (
  user_id,
  type,
  category,
  priority,
  title,
  message,
  metadata,
  action_url,
  action_label,
  actor_name
) VALUES (
  'USER_UUID',  -- <-- CAMBIAR ESTO
  'test_notification',
  'sistema',
  'normal',
  'Prueba de Migración',
  'Esta es una notificación de prueba del sistema',
  '{"test": true}'::jsonb,
  '/dashboard',
  'Ver Dashboard',
  'Sistema'
);

-- Verificar que se creó
SELECT id, title, message, is_read, created_at
FROM notifications
WHERE type = 'test_notification';
```

### 7. Test Funcional: Badge Counter

```sql
-- Obtener contador de no leídas (reemplazar USER_UUID)
SELECT get_unread_notification_count('USER_UUID');

-- Resultado esperado: 1 (la notificación de prueba)
```

### 8. Test Funcional: Mark as Read

```sql
-- Marcar la notificación de prueba como leída
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE type = 'test_notification';

-- Verificar contador nuevamente
SELECT get_unread_notification_count('USER_UUID');

-- Resultado esperado: 0
```

### 9. Limpiar Datos de Prueba

```sql
-- Eliminar notificación de prueba
DELETE FROM notifications
WHERE type = 'test_notification';
```

---

## Habilitar Supabase Realtime

Para que las notificaciones lleguen en tiempo real, habilitar Realtime:

### Opción 1: Supabase Dashboard

1. Ir a **Settings > Database > Publications**
2. Hacer clic en **supabase_realtime**
3. Hacer clic en **Add table**
4. Seleccionar **notifications**
5. Hacer clic en **Save**

### Opción 2: SQL

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Verificar Realtime Habilitado

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notifications';
```

**Resultado esperado:** 1 fila

---

## Configurar Cleanup Automático (Opcional)

Para ejecutar cleanup automático diariamente, configurar pg_cron:

### 1. Habilitar pg_cron en Supabase

Ir a **Dashboard > Database > Extensions** y habilitar **pg_cron**.

### 2. Configurar Jobs

```sql
-- Cleanup de notificaciones antiguas (5 meses)
-- Ejecutar diariamente a las 3:00 AM
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$SELECT cleanup_old_notifications(5);$$
);

-- Marcar notificaciones expiradas
-- Ejecutar diariamente a las 4:00 AM
SELECT cron.schedule(
  'mark-expired-notifications',
  '0 4 * * *',
  $$SELECT mark_expired_notifications();$$
);
```

### 3. Verificar Jobs Creados

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%notification%';
```

---

## Troubleshooting

### Error: "table usuarios does not exist"

**Causa:** Las tablas base del proyecto no existen.

**Solución:**
1. Verificar que estás en el proyecto correcto
2. Ejecutar primero las migraciones base (`00_SCHEMA_COMPLETO_STAGING.sql`)

### Error: "permission denied for table usuarios"

**Causa:** El usuario no tiene permisos suficientes.

**Solución:**
1. Conectarse con usuario `postgres` (superadmin)
2. O ejecutar desde el Dashboard de Supabase (tiene permisos completos)

### Error: "publication supabase_realtime does not exist"

**Causa:** El proyecto no tiene Realtime habilitado.

**Solución:**
1. Habilitar Realtime en **Settings > Database > Publications**
2. O crear la publicación manualmente:
   ```sql
   CREATE PUBLICATION supabase_realtime;
   ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
   ```

### Error: "function gen_random_uuid() does not exist"

**Causa:** La extensión `pgcrypto` no está habilitada.

**Solución:**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Warning: "idle in transaction"

**Causa:** La migración es larga y puede causar timeout.

**Solución:**
- Ejecutar en horario de bajo tráfico
- Aumentar statement_timeout:
  ```sql
  SET statement_timeout = '10min';
  ```

---

## Rollback (En caso de error)

Si algo sale mal y necesitas revertir la migración:

```sql
-- ADVERTENCIA: Esto eliminará TODOS los datos de notificaciones

-- Eliminar publicación Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;

-- Eliminar jobs de cron (si existen)
SELECT cron.unschedule('cleanup-old-notifications');
SELECT cron.unschedule('mark-expired-notifications');

-- Eliminar funciones
DROP FUNCTION IF EXISTS mark_all_as_read_batch CASCADE;
DROP FUNCTION IF EXISTS get_unread_notification_count CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_notifications CASCADE;
DROP FUNCTION IF EXISTS mark_expired_notifications CASCADE;
DROP FUNCTION IF EXISTS create_default_notification_preferences CASCADE;
DROP FUNCTION IF EXISTS update_notification_preferences_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_notification_templates_updated_at CASCADE;

-- Eliminar tablas (en orden inverso de dependencias)
DROP TABLE IF EXISTS notification_delivery_log CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Verificar que se eliminaron
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%notification%';

-- Resultado esperado: 0 filas
```

---

## Próximos Pasos

Después de ejecutar la migración exitosamente:

1. **Documentar:** Actualizar `context/CURRENT_STATE.md` con el progreso
2. **Backend:** Crear `lib/actions-notifications.ts`
3. **Frontend:** Crear componentes React
4. **Testing:** Validar con Playwright
5. **Integración:** Conectar con módulos existentes (Leads, PRs)

Ver plan completo en: `context/PLAN_MODULOS_NOTIFICACIONES_PR.md`

---

## Métricas de Performance Esperadas

Después de la migración y con datos reales:

| Query | Target | Índice |
|-------|--------|--------|
| Cargar 50 notificaciones | <200ms | idx_notifications_user_created |
| Badge counter | <50ms | idx_notifications_unread |
| Mark as read (single) | <100ms | PRIMARY KEY |
| Mark all (100) | <2s | idx_notifications_unread |
| Filtrar por categoría | <200ms | idx_notifications_category |

Si no se cumplen estas métricas, revisar que los índices estén siendo utilizados:

```sql
EXPLAIN ANALYZE
SELECT *
FROM notifications
WHERE user_id = 'USER_UUID'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

---

## Soporte

Si encuentras problemas durante la migración:

1. **Documentar el error:** Captura el mensaje completo
2. **Verificar logs:** Revisar logs de Supabase/PostgreSQL
3. **Consultar documentación:** `docs/modulos/notificaciones/DATABASE_SCHEMA.md`
4. **Rollback si es crítico:** Usar script de rollback arriba

---

**Última actualización:** 13 Enero 2026
**Autor:** Database Architect (DataDev)
**Revisado por:** PM
