# 📄 Migración 011: Boletas Vinculadas a Comprobantes de Pago

## Resumen Ejecutivo

**Migración:** `011_boletas_vinculadas.sql`
**Fecha:** 20 Enero 2026
**Estado:** ✅ Ejecutada exitosamente
**Autor:** Database Architect

### Objetivo

Permitir al equipo de Finanzas vincular boletas y facturas emitidas a cada comprobante de pago (voucher) que sube un cliente. Esto facilita el control contable y la trazabilidad de documentos tributarios.

---

## Cambios Implementados

### 1. Nueva Columna `boletas_vinculadas`

```sql
ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS boletas_vinculadas JSONB DEFAULT '[]';
```

**Características:**
- Tipo: `JSONB` (flexible, permite búsquedas eficientes)
- Default: `'[]'` (array vacío)
- Nullable: `YES` (compatible con fichas existentes)

### 2. Índice GIN para Búsquedas Eficientes

```sql
CREATE INDEX IF NOT EXISTS idx_clientes_ficha_boletas_vinculadas
ON clientes_ficha USING GIN (boletas_vinculadas);
```

**Ventajas del índice GIN:**
- Búsquedas rápidas por número de boleta
- Búsquedas por tipo de documento (boleta/factura)
- Filtrado por rango de fechas
- Performance óptima con operadores JSONB (`@>`, `?`, `?&`)

### 3. Comentario Descriptivo

```sql
COMMENT ON COLUMN clientes_ficha.boletas_vinculadas IS
'Array JSON de boletas/facturas vinculadas a cada comprobante de pago (voucher)';
```

---

## Estructura de Datos

### Formato JSONB

Cada entrada en el array `boletas_vinculadas` representa una boleta o factura vinculada:

```json
[
  {
    "voucher_index": 0,
    "boleta_url": "https://qssefegfzxxurqbzndrs.supabase.co/storage/v1/object/public/boletas/B001-00123.pdf",
    "numero_boleta": "B001-00123",
    "tipo": "boleta",
    "uploaded_at": "2026-01-20T15:30:00.000Z",
    "uploaded_by_id": "uuid-del-usuario",
    "uploaded_by_nombre": "Rosa Quispe"
  },
  {
    "voucher_index": 0,
    "boleta_url": "https://qssefegfzxxurqbzndrs.supabase.co/storage/v1/object/public/boletas/F001-00045.pdf",
    "numero_boleta": "F001-00045",
    "tipo": "factura",
    "uploaded_at": "2026-01-20T16:00:00.000Z",
    "uploaded_by_id": "uuid-del-usuario",
    "uploaded_by_nombre": "Rosa Quispe"
  }
]
```

### Campos Detallados

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `voucher_index` | `number` | Índice del voucher en `comprobante_deposito_fotos` | `0`, `1`, `2` |
| `boleta_url` | `string` | URL del archivo PDF/imagen de la boleta | `"https://..."` |
| `numero_boleta` | `string` | Número de boleta/factura (formato SUNAT) | `"B001-00123"` |
| `tipo` | `string` | Tipo de documento | `"boleta"` o `"factura"` |
| `uploaded_at` | `string` | Timestamp ISO 8601 de carga | `"2026-01-20T15:30:00.000Z"` |
| `uploaded_by_id` | `string` | UUID del usuario que subió | `"uuid..."` |
| `uploaded_by_nombre` | `string` | Nombre del usuario | `"Rosa Quispe"` |

---

## Casos de Uso

### 1. Cliente Paga en 2 Cuotas

Un cliente paga la inicial en 2 partes:
- Voucher 1: $2,500 → Boleta B001-00100
- Voucher 2: $2,500 → Boleta B001-00101

```json
{
  "boletas_vinculadas": [
    {
      "voucher_index": 0,
      "numero_boleta": "B001-00100",
      "tipo": "boleta",
      "boleta_url": "https://.../B001-00100.pdf",
      "uploaded_at": "2026-01-15T10:00:00.000Z",
      "uploaded_by_id": "uuid-finanzas",
      "uploaded_by_nombre": "Rosa Quispe"
    },
    {
      "voucher_index": 1,
      "numero_boleta": "B001-00101",
      "tipo": "boleta",
      "boleta_url": "https://.../B001-00101.pdf",
      "uploaded_at": "2026-01-20T14:30:00.000Z",
      "uploaded_by_id": "uuid-finanzas",
      "uploaded_by_nombre": "Rosa Quispe"
    }
  ]
}
```

### 2. Cliente Solicita Factura

Cliente pagó con boleta pero solicita factura posteriormente:

```json
{
  "boletas_vinculadas": [
    {
      "voucher_index": 0,
      "numero_boleta": "B001-00200",
      "tipo": "boleta",
      "boleta_url": "https://.../B001-00200.pdf",
      "uploaded_at": "2026-01-10T09:00:00.000Z",
      "uploaded_by_id": "uuid-finanzas",
      "uploaded_by_nombre": "Rosa Quispe"
    },
    {
      "voucher_index": 0,
      "numero_boleta": "F001-00050",
      "tipo": "factura",
      "boleta_url": "https://.../F001-00050.pdf",
      "uploaded_at": "2026-01-15T11:00:00.000Z",
      "uploaded_by_id": "uuid-finanzas",
      "uploaded_by_nombre": "Rosa Quispe"
    }
  ]
}
```

---

## Queries de Ejemplo

### 1. Buscar Fichas con Boleta Específica

```sql
SELECT
  cf.id,
  l.codigo as local,
  cf.titular_nombres || ' ' || cf.titular_apellido_paterno as cliente,
  cf.boletas_vinculadas
FROM clientes_ficha cf
JOIN locales l ON cf.local_id = l.id
WHERE boletas_vinculadas @> '[{"numero_boleta": "B001-00123"}]'::jsonb;
```

### 2. Buscar Fichas con Facturas

```sql
SELECT
  cf.id,
  l.codigo as local,
  cf.boletas_vinculadas
FROM clientes_ficha cf
JOIN locales l ON cf.local_id = l.id
WHERE boletas_vinculadas @> '[{"tipo": "factura"}]'::jsonb;
```

### 3. Buscar Fichas con Boletas Subidas por Usuario Específico

```sql
SELECT
  cf.id,
  l.codigo as local,
  jsonb_array_elements(cf.boletas_vinculadas)->>'numero_boleta' as numero_boleta,
  jsonb_array_elements(cf.boletas_vinculadas)->>'uploaded_by_nombre' as subido_por
FROM clientes_ficha cf
JOIN locales l ON cf.local_id = l.id
WHERE boletas_vinculadas @> '[{"uploaded_by_nombre": "Rosa Quispe"}]'::jsonb;
```

### 4. Contar Fichas con Boletas Vinculadas

```sql
SELECT
  COUNT(*) FILTER (WHERE jsonb_array_length(boletas_vinculadas) > 0) as con_boletas,
  COUNT(*) FILTER (WHERE jsonb_array_length(boletas_vinculadas) = 0) as sin_boletas,
  COUNT(*) as total
FROM clientes_ficha;
```

### 5. Obtener Todas las Boletas de un Proyecto

```sql
SELECT
  p.nombre as proyecto,
  l.codigo as local,
  cf.titular_nombres || ' ' || cf.titular_apellido_paterno as cliente,
  jsonb_array_elements(cf.boletas_vinculadas)->>'numero_boleta' as numero_boleta,
  jsonb_array_elements(cf.boletas_vinculadas)->>'tipo' as tipo,
  jsonb_array_elements(cf.boletas_vinculadas)->>'uploaded_at' as fecha_subida
FROM clientes_ficha cf
JOIN locales l ON cf.local_id = l.id
JOIN proyectos p ON l.proyecto_id = p.id
WHERE jsonb_array_length(cf.boletas_vinculadas) > 0
  AND p.nombre = 'San Gabriel'
ORDER BY jsonb_array_elements(cf.boletas_vinculadas)->>'uploaded_at' DESC;
```

---

## Performance

### Índice GIN

El índice GIN permite búsquedas extremadamente rápidas en el campo JSONB:

**Sin índice:**
```
Seq Scan on clientes_ficha  (cost=0.00..2000.00 rows=100)
  Filter: (boletas_vinculadas @> '[{"numero_boleta": "B001-00123"}]'::jsonb)
```

**Con índice GIN:**
```
Bitmap Index Scan on idx_clientes_ficha_boletas_vinculadas  (cost=0.00..10.00 rows=100)
  Index Cond: (boletas_vinculadas @> '[{"numero_boleta": "B001-00123"}]'::jsonb)
```

**Mejora estimada:** ~200x más rápido con 10,000+ registros

---

## Migración de Datos Existentes

### Fichas Existentes

Todas las fichas existentes tienen automáticamente `boletas_vinculadas = '[]'` gracias al valor DEFAULT.

No se requiere migración de datos.

---

## Validación

### Script de Verificación

Ejecutar:
```bash
node scripts/verify-migration-011.js
```

**Salida esperada:**
```
✓ Columna encontrada
  - Tipo: jsonb
  - Default: '[]'::jsonb
  - Nullable: YES

✓ Índice encontrado
  - Nombre: idx_clientes_ficha_boletas_vinculadas
  - Tipo: GIN

✓ Búsqueda con índice GIN funciona
```

### Validación Manual en Supabase

```sql
-- 1. Verificar columna existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clientes_ficha'
  AND column_name = 'boletas_vinculadas';

-- 2. Verificar índice existe
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'clientes_ficha'
  AND indexname = 'idx_clientes_ficha_boletas_vinculadas';

-- 3. Verificar comentario
SELECT col_description('clientes_ficha'::regclass,
  (SELECT ordinal_position
   FROM information_schema.columns
   WHERE table_name = 'clientes_ficha'
   AND column_name = 'boletas_vinculadas'));
```

---

## Rollback

Si es necesario revertir la migración:

```sql
-- Eliminar índice
DROP INDEX IF EXISTS idx_clientes_ficha_boletas_vinculadas;

-- Eliminar columna
ALTER TABLE clientes_ficha DROP COLUMN IF EXISTS boletas_vinculadas;

-- Verificar
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'clientes_ficha'
  AND column_name = 'boletas_vinculadas';
-- Expected: 0 rows
```

**ADVERTENCIA:** El rollback eliminará TODOS los datos de boletas vinculadas. Hacer backup antes.

---

## Integración con Aplicación

### TypeScript Types

```typescript
// types/clientes-ficha.ts
export interface BoletaVinculada {
  voucher_index: number;
  boleta_url: string;
  numero_boleta: string;
  tipo: 'boleta' | 'factura';
  uploaded_at: string; // ISO 8601
  uploaded_by_id: string; // UUID
  uploaded_by_nombre: string;
}

export interface ClienteFicha {
  // ... otros campos
  boletas_vinculadas: BoletaVinculada[];
}
```

### Supabase Client

```typescript
// Agregar boleta
const { data, error } = await supabase
  .from('clientes_ficha')
  .update({
    boletas_vinculadas: [
      ...fichaActual.boletas_vinculadas,
      nuevaBoleta
    ]
  })
  .eq('id', fichaId);

// Buscar por número de boleta
const { data, error } = await supabase
  .from('clientes_ficha')
  .select('*')
  .contains('boletas_vinculadas', [{ numero_boleta: 'B001-00123' }]);
```

---

## Consideraciones de Seguridad

### Row Level Security (RLS)

La columna `boletas_vinculadas` hereda las políticas RLS existentes de `clientes_ficha`:

- **Lectura:** Vendedor asignado, jefe de ventas, finanzas, admin, superadmin
- **Escritura:** Solo finanzas, admin, superadmin

### Storage Policies

Los archivos de boletas deben almacenarse en Supabase Storage con políticas:

```sql
-- Bucket: boletas
-- Políticas:
-- 1. Upload: Solo finanzas, admin, superadmin
-- 2. Read: Vendedor asignado + roles superiores
-- 3. Delete: Solo admin, superadmin
```

---

## Testing

### Checklist de Pruebas

- [x] Columna se crea correctamente
- [x] Índice GIN funciona
- [x] Default value es `'[]'`
- [x] Se pueden insertar datos
- [x] Se pueden leer datos
- [x] Búsquedas con `@>` funcionan
- [x] Búsquedas con `jsonb_array_elements` funcionan
- [x] Performance es aceptable

### Casos de Prueba

1. **Ficha sin boletas:** `boletas_vinculadas = []`
2. **Ficha con 1 boleta:** `boletas_vinculadas = [boleta1]`
3. **Ficha con múltiples boletas:** `boletas_vinculadas = [boleta1, boleta2, ...]`
4. **Búsqueda por número:** Encuentra ficha correcta
5. **Búsqueda por tipo:** Filtra correctamente

---

## Próximos Pasos

### Implementación en UI

1. **Módulo Finanzas:**
   - Agregar sección "Boletas Vinculadas" en vista de ficha
   - Upload de archivos PDF de boletas
   - Input para número de boleta
   - Selector de tipo (boleta/factura)
   - Asociar a voucher específico

2. **Validaciones:**
   - Formato de número de boleta (SUNAT: XXXX-XXXXXXXX)
   - Tipo de archivo (PDF, PNG, JPG)
   - Tamaño máximo (5MB)

3. **Reportes:**
   - Listado de boletas por proyecto
   - Exportar a Excel
   - Dashboard de boletas pendientes

---

## Soporte

**Documentación:**
- Migración SQL: `migrations/011_boletas_vinculadas.sql`
- Script ejecución: `scripts/run-migration-011.js`
- Script verificación: `scripts/verify-migration-011.js`
- Este README: `migrations/README_011_BOLETAS_VINCULADAS.md`

**Contacto:**
- Database Architect: DataDev
- CTO: Alonso/ITERRUPTIVO

---

**Última actualización:** 20 Enero 2026
