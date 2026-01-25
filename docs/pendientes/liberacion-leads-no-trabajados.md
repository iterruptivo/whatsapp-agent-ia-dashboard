# Liberación de Leads No Trabajados

## Fecha: 2026-01-24
## Estado: ✅ COMPLETADO (2026-01-25 02:00 UTC)

---

## Objetivo

Quitar la asignación (`vendedor_asignado_id = NULL`) de leads que no han sido trabajados para que otros vendedores puedan tomarlos.

---

## Criterios de Selección

| # | Criterio | Condición SQL |
|---|----------|---------------|
| 1 | Fecha desde | `created_at >= '2025-12-01'` |
| 2 | Tiene asignación | `vendedor_asignado_id IS NOT NULL` |
| 3 | Sin tipificación nivel 1 | `tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = ''` |
| 4 | Sin tipificación nivel 2 | `tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = ''` |
| 5 | Sin tipificación nivel 3 | `tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = ''` |
| 6 | Sin observaciones | `observaciones_vendedor IS NULL OR observaciones_vendedor = ''` |
| 7 | NO vinculado a local | `NOT EXISTS (SELECT 1 FROM locales_leads ll WHERE ll.lead_id = leads.id)` |

**Lógica**: Condiciones 3-6 son AND (todas deben cumplirse = definitivamente no trabajado)

---

## Reporte Generado

### Resumen
- **Total leads a liberar**: 52,302
- **Vendedores afectados**: 57

### Por Rol
| Rol | Leads |
|-----|-------|
| vendedor | 36,364 |
| vendedor_caseta | 15,844 |
| jefe_ventas | 64 |
| coordinador | 30 |

### Top 10 Vendedores
| Vendedor | Rol | Leads |
|----------|-----|-------|
| Yesica Yasaida Nolasco Palacios | vendedor_caseta | 9,418 |
| Gabriel Mendoza | vendedor | 7,889 |
| Diego Bellido | vendedor | 6,856 |
| Shirley Mori Oré | vendedor | 6,824 |
| Efrain Llaro Cruz | vendedor | 6,766 |
| Anne Liu Ricsi | vendedor | 5,976 |
| Martin Belleza | vendedor | 1,338 |
| Judith Rocio Jorge Marcos | vendedor_caseta | 919 |
| Luz Milagros Pinedo Poma | vendedor_caseta | 803 |
| Andrea Bustamante Huaman | vendedor | 654 |

---

## Queries

### Query de Conteo
```sql
SELECT
  COUNT(*) as total_leads_a_liberar,
  COUNT(DISTINCT vendedor_asignado_id) as vendedores_afectados
FROM leads
WHERE
  created_at >= '2025-12-01'
  AND vendedor_asignado_id IS NOT NULL
  AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
  AND (tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = '')
  AND (tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = '')
  AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '')
  AND NOT EXISTS (
    SELECT 1 FROM locales_leads ll WHERE ll.lead_id = leads.id
  );
```

### Query de Detalle por Vendedor
```sql
SELECT
  v.nombre as vendedor,
  u.rol,
  COUNT(l.id) as leads_a_liberar
FROM leads l
JOIN vendedores v ON v.id = l.vendedor_asignado_id
LEFT JOIN usuarios u ON u.vendedor_id = v.id
WHERE
  l.created_at >= '2025-12-01'
  AND l.vendedor_asignado_id IS NOT NULL
  AND (l.tipificacion_nivel_1 IS NULL OR l.tipificacion_nivel_1 = '')
  AND (l.tipificacion_nivel_2 IS NULL OR l.tipificacion_nivel_2 = '')
  AND (l.tipificacion_nivel_3 IS NULL OR l.tipificacion_nivel_3 = '')
  AND (l.observaciones_vendedor IS NULL OR l.observaciones_vendedor = '')
  AND NOT EXISTS (
    SELECT 1 FROM locales_leads ll WHERE ll.lead_id = l.id
  )
GROUP BY v.nombre, u.rol
ORDER BY leads_a_liberar DESC;
```

### Query de Ejecución (CUANDO SE APRUEBE)
```sql
UPDATE leads
SET
  vendedor_asignado_id = NULL,
  updated_at = NOW()
WHERE
  created_at >= '2025-12-01'
  AND vendedor_asignado_id IS NOT NULL
  AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
  AND (tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = '')
  AND (tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = '')
  AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '')
  AND NOT EXISTS (
    SELECT 1 FROM locales_leads ll WHERE ll.lead_id = leads.id
  );
```

---

## Ejecución Completada

### Fecha de Ejecución
- **Fecha:** 2026-01-25 02:00 UTC
- **Sesión:** 107

### Resultados
| Métrica | Valor |
|---------|-------|
| Leads liberados | 52,302 |
| Registros historial | 52,302 |
| Origen | `liberacion_masiva` |
| Usuario | `Sistema - Liberación Masiva` |

### Archivos de Migración
- `migrations/026_leads_historial_audit.sql` - Sistema de auditoría
- `migrations/027_liberacion_leads_no_trabajados.sql` - Liberación masiva

### Cómo Verificar un Lead Liberado
1. Login como superadmin/admin
2. Ir a Dashboard Operativo
3. Abrir cualquier lead
4. Click en botón "Historial"
5. Ver registro con `valor_anterior` = nombre del vendedor que tenía asignado

---

## Notas

- ✅ Sistema de historial implementado y funcionando
- ✅ Liberación masiva ejecutada con trazabilidad completa
- ✅ Cada lead liberado tiene registro del vendedor anterior
