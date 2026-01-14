# Cómo Aplicar Migraciones en Supabase

## Contexto

Las migraciones SQL en este directorio deben aplicarse manualmente en Supabase SQL Editor.

## Pasos para Aplicar Migración

### 1. Acceder a Supabase Dashboard
- Ir a https://supabase.com/dashboard
- Seleccionar el proyecto **EcoPlaza Dashboard**
- Click en **SQL Editor** en el menú lateral

### 2. Verificar Migraciones Aplicadas

Antes de aplicar una migración, verifica que no haya sido aplicada previamente:

```sql
-- Ver políticas RLS en corredores_documentos
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'corredores_documentos';
```

### 3. Aplicar Migración

- Abrir el archivo de migración (ej: `003_fix_corredores_documentos_delete_policy.sql`)
- Copiar todo el contenido
- Pegarlo en el SQL Editor de Supabase
- Click en **Run** (esquina inferior derecha)

### 4. Verificar Resultado

Debe mostrar:
```
Success. No rows returned
```

## Migraciones en este Proyecto

| # | Archivo | Fecha | Descripción | Estado |
|---|---------|-------|-------------|--------|
| 001 | `001_modulo_expansion_corredores.sql` | 12 Ene 2026 | Schema inicial del módulo Expansión | ✅ Aplicada |
| 002 | `002_roles_expansion_corredor_legal.sql` | 12 Ene 2026 | Roles `corredor` y `legal` | ✅ Aplicada |
| 003 | `003_fix_corredores_documentos_delete_policy.sql` | 13 Ene 2026 | **Política DELETE faltante** | ⚠️ Pendiente |

## Migración 003 - URGENTE

**Problema resuelto:** El usuario corredor no podía eliminar documentos anteriores al guardar nuevos.

**Causa:** Faltaba la política RLS de DELETE en `corredores_documentos`.

**Solución:** La migración 003 agrega la política faltante.

**IMPORTANTE:** Aplicar esta migración INMEDIATAMENTE para que el formulario de registro funcione correctamente.

## Troubleshooting

### Error: "policy already exists"
Si al aplicar la migración sale este error, significa que ya fue aplicada previamente. Verificar con:

```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'corredores_documentos'
AND policyname = 'Corredor elimina sus documentos';
```

### Error: "permission denied"
Verificar que estás usando el usuario con permisos de administrador en Supabase.
