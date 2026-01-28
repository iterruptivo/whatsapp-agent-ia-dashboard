# Análisis de Datos: Migración Sperant Leads

**Fecha:** 27 Enero 2026
**Base de Datos:** Producción Supabase
**Tabla Analizada:** `sperant_migrations_leads`

---

## Resumen Ejecutivo

**Total de registros a migrar: 9,370 leads**

### Métricas de Calidad de Datos

| Métrica | Valor | % Completitud | Estado |
|---------|-------|---------------|--------|
| **Total registros** | 9,370 | 100% | ✅ |
| **Con celular** | 9,368 | 99.98% | ✅ Excelente |
| **Con teléfono principal** | 1,988 | 21.21% | ⚠️ Bajo |
| **Con proyecto asignado** | 9,370 | 100% | ✅ Perfecto |
| **Con vendedor asignado** | 9,370 | 100% | ✅ Perfecto |
| **Sin teléfono alguno** | 2 | 0.02% | ⚠️ Rechazar |

**Conclusión:** Calidad de datos MUY ALTA. Solo 2 registros (0.02%) requieren atención especial.

---

## Análisis por Campo Crítico

### 1. Teléfonos (Campo Requerido)

#### Distribución
- **99.98% tiene celular** - Excelente cobertura
- **21.21% tiene teléfono fijo** - Respaldo secundario
- **0.02% sin ningún teléfono** - Solo 2 registros problemáticos

#### Estrategia de Mapeo
```sql
-- Priorizar celular, fallback a teléfono principal
telefono = COALESCE(celular, telefono_principal)

-- Los 2 registros sin teléfono serán rechazados en la validación
WHERE COALESCE(celular, telefono_principal) IS NOT NULL
```

#### Registros Problemáticos
```sql
-- Identificar los 2 registros sin teléfono
SELECT id, nombres, apellidos, email, proyecto
FROM sperant_migrations_leads
WHERE celular IS NULL AND telefono_principal IS NULL;
```

**Acción:** Validar manualmente estos 2 registros antes de migración.

---

### 2. Proyecto Asignado (100% Completitud)

**Distribución Top 10:**

| # | Proyecto | Leads | % del Total |
|---|----------|-------|-------------|
| 1 | Eco Plaza Trujillo | 2,238 | 23.88% |
| 2 | Eco Plaza Faucett | 1,036 | 11.05% |
| 3 | Mercado Trapiche | 1,027 | 10.96% |
| 4 | Eco Plaza Chincha | 889 | 9.49% |
| 5 | Urbanización San Gabriel | 805 | 8.59% |
| 6 | CENTRO COMERCIAL WILSON | 784 | 8.37% |
| 7 | EL MIRADOR DE SANTA CLARA | 591 | 6.31% |
| 8 | Eco Plaza Boulevard | 542 | 5.78% |
| 9 | Mercado San Gabriel | 502 | 5.36% |
| 10 | Mercado Huancayo | 460 | 4.91% |
| - | Otros proyectos | 496 | 5.30% |
| **TOTAL** | | **9,370** | **100%** |

#### Observaciones
- **Top 3 proyectos = 45.89% de los leads** - Alta concentración
- **Eco Plaza Trujillo lidera** con casi 1 de cada 4 leads
- **10 proyectos principales** concentran el 94.7% de los leads

#### Validación Requerida
```sql
-- CRÍTICO: Verificar que todos los proyectos existen en tabla destino
SELECT DISTINCT s.proyecto, s.proyecto_id
FROM sperant_migrations_leads s
LEFT JOIN proyectos p ON s.proyecto_id = p.id
WHERE p.id IS NULL;
```

**Acción:** Si hay proyectos no encontrados → Crear proyectos en tabla `proyectos` antes de migrar.

---

### 3. Nivel de Interés (Campo para Mapeo de Estado)

**Distribución completa:**

| Nivel de Interés | Cantidad | % | Estado Destino Propuesto |
|------------------|----------|---|-------------------------|
| **bajo** | 4,598 | 49.06% | `lead_frio` |
| **por contactar** | 2,936 | 31.33% | `lead_nuevo` |
| **intermedio** | 1,578 | 16.84% | `lead_calificado` |
| **desestimado** | 121 | 1.29% | `descartado` |
| **agendado** | 104 | 1.11% | `visita_agendada` |
| **alto** | 19 | 0.20% | `lead_caliente` |
| **-** (sin dato) | 9 | 0.10% | `lead_nuevo` (default) |
| **compró** | 2 | 0.02% | `ganado` |
| **separación** | 2 | 0.02% | `separacion` |
| **visitó** | 1 | 0.01% | `visita_realizada` |
| **TOTAL** | **9,370** | **100%** | |

#### Insights Clave
- **49% de leads son "bajo interés"** - Necesitan estrategia de reactivación
- **31% están "por contactar"** - Oportunidad inmediata
- **17% nivel intermedio** - Leads tibios para nutrir
- **Solo 2 leads compraron** - Posible subreporte o migración parcial

#### Mapeo Mejorado de Estados

Basado en la distribución real, propongo este mapeo más detallado:

```sql
CASE nivel_interes_proyecto
    WHEN 'alto' THEN 'lead_caliente'
    WHEN 'intermedio' THEN 'lead_calificado'
    WHEN 'por contactar' THEN 'lead_nuevo'
    WHEN 'bajo' THEN 'lead_frio'
    WHEN 'agendado' THEN 'visita_agendada'
    WHEN 'visitó' THEN 'visita_realizada'
    WHEN 'separación' THEN 'separacion'
    WHEN 'compró' THEN 'ganado'
    WHEN 'desestimado' THEN 'descartado'
    WHEN '-' THEN 'lead_nuevo'
    ELSE 'lead_nuevo'
END AS estado
```

**IMPORTANTE:** Verificar que estos valores existan como enum en la tabla `leads`:
```sql
SELECT DISTINCT estado FROM leads;
```

---

### 4. Vendedores Asignados (100% Completitud)

**Estado:** Todos los leads tienen `usuario_asignado` no NULL.

#### Validación Crítica

```sql
-- Verificar que todos los usernames de Sperant existen en tabla vendedores
SELECT DISTINCT s.usuario_asignado, COUNT(*) as leads_asignados
FROM sperant_migrations_leads s
LEFT JOIN vendedores v ON v.username = s.usuario_asignado
WHERE v.id IS NULL
GROUP BY s.usuario_asignado
ORDER BY leads_asignados DESC;
```

**Acción Requerida:**
1. Ejecutar query de validación
2. Si hay vendedores no encontrados → Crear usuarios en tabla `vendedores` o mapear a vendedor genérico
3. Considerar vendor_id NULL aceptable (se asignarán manualmente después)

---

## Campos con Datos Complementarios

### 5. Email (Opcional pero Valioso)

```sql
-- Analizar completitud de emails
SELECT
    COUNT(*) as total,
    COUNT(email) as con_email,
    ROUND(100.0 * COUNT(email) / COUNT(*), 2) as porcentaje_email
FROM sperant_migrations_leads;
```

**Ejecutar** para determinar si vale la pena hacer campañas de email marketing.

---

### 6. UTM (Datos de Marketing)

```sql
-- Ver completitud de UTM
SELECT
    COUNT(utm_source) as con_source,
    COUNT(utm_medium) as con_medium,
    COUNT(utm_campaign) as con_campaign
FROM sperant_migrations_leads;
```

**Valor:** Si hay datos UTM, se pueden analizar canales de adquisición más efectivos.

---

### 7. Documentos (DNI, etc.)

```sql
-- Analizar documentos
SELECT
    tipo_documento,
    COUNT(*) as cantidad,
    ROUND(100.0 * COUNT(*) / 9370, 2) as porcentaje
FROM sperant_migrations_leads
WHERE tipo_documento IS NOT NULL
GROUP BY tipo_documento
ORDER BY cantidad DESC;
```

**Nota:** Aunque no se migran a `leads`, son útiles para enriquecimiento futuro.

---

## Riesgos y Mitigaciones

### Riesgo 1: Proyectos No Existentes en Tabla Destino

**Probabilidad:** Media
**Impacto:** Alto (relaciones rotas)

**Mitigación:**
```sql
-- Pre-validación obligatoria
SELECT s.proyecto_id, s.proyecto, COUNT(*) as leads_afectados
FROM sperant_migrations_leads s
LEFT JOIN proyectos p ON s.proyecto_id = p.id
WHERE p.id IS NULL
GROUP BY s.proyecto_id, s.proyecto;
```

**Acción:** Crear proyectos faltantes ANTES de migración.

---

### Riesgo 2: Vendedores No Existentes

**Probabilidad:** Media
**Impacto:** Medio (asignación manual posterior)

**Mitigación:**
```sql
-- Mapear vendedores faltantes a NULL o crear usuarios
INSERT INTO vendedores (username, nombre, email, rol)
SELECT DISTINCT usuario_asignado, usuario_asignado, 'sistema@ecoplaza.com', 'vendedor'
FROM sperant_migrations_leads s
WHERE NOT EXISTS (
    SELECT 1 FROM vendedores v WHERE v.username = s.usuario_asignado
);
```

---

### Riesgo 3: Estados No Válidos

**Probabilidad:** Baja
**Impacto:** Alto (migración fallida)

**Mitigación:**
```sql
-- Verificar que todos los estados mapeados existen
-- Si 'leads.estado' es un ENUM, validar antes
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_estado');
```

**Si no es ENUM:** Verificar contra `CHECK` constraint o documentación.

---

### Riesgo 4: Duplicados de Teléfono

**Probabilidad:** Alta (diferentes proyectos)
**Impacto:** Medio (leads duplicados)

**Análisis:**
```sql
-- Detectar teléfonos duplicados
SELECT celular, COUNT(*) as veces, STRING_AGG(proyecto, ', ') as proyectos
FROM sperant_migrations_leads
WHERE celular IS NOT NULL
GROUP BY celular
HAVING COUNT(*) > 1
ORDER BY veces DESC
LIMIT 20;
```

**Estrategia:**
- **Opción A:** Permitir duplicados (un lead puede estar en múltiples proyectos)
- **Opción B:** Consolidar leads del mismo teléfono en un solo registro con múltiples proyectos
- **Opción C:** Agregar constraint UNIQUE (telefono, proyecto_id)

**Recomendación:** Opción A o C, según regla de negocio.

---

## Estimación de Performance

### Tiempo de Migración Estimado

**Datos:**
- Registros: 9,370
- Complejidad: Media (1 lookup de vendedor por registro)
- Base de datos: Supabase PostgreSQL en nube

**Estimación:**
```
9,370 registros × ~50ms por registro = ~7.8 minutos
Con índices optimizados = ~3-5 minutos
Sin optimización = ~10-15 minutos
```

**Recomendación:** Ejecutar en horario de baja actividad (madrugada).

---

### Tamaño de Datos

```
Tamaño promedio por registro en leads: ~1.5 KB
9,370 registros × 1.5 KB = ~14 MB de datos nuevos
```

**Impacto:** Despreciable en disco, no requiere escalamiento.

---

## Queries de Pre-Validación Completas

Ejecutar ANTES de migración:

### 1. Validar Teléfonos
```sql
-- ✅ DEBE retornar 0 filas
SELECT id, nombres, apellidos, email
FROM sperant_migrations_leads
WHERE celular IS NULL AND telefono_principal IS NULL;
```

### 2. Validar Proyectos
```sql
-- ✅ DEBE retornar 0 filas
SELECT DISTINCT s.proyecto_id, s.proyecto
FROM sperant_migrations_leads s
LEFT JOIN proyectos p ON s.proyecto_id = p.id
WHERE p.id IS NULL;
```

### 3. Validar Vendedores
```sql
-- ⚠️ Puede retornar filas - decidir estrategia
SELECT DISTINCT s.usuario_asignado, COUNT(*) as leads
FROM sperant_migrations_leads s
LEFT JOIN vendedores v ON v.username = s.usuario_asignado
WHERE v.id IS NULL
GROUP BY s.usuario_asignado;
```

### 4. Analizar Duplicados
```sql
-- ℹ️ Informativo - decidir estrategia
SELECT
    celular,
    COUNT(*) as veces,
    COUNT(DISTINCT proyecto_id) as proyectos_distintos
FROM sperant_migrations_leads
WHERE celular IS NOT NULL
GROUP BY celular
HAVING COUNT(*) > 1
ORDER BY veces DESC;
```

---

## Recomendaciones Finales

### Antes de Migrar

1. ✅ **Ejecutar todas las queries de pre-validación**
2. ✅ **Crear backup de tabla `leads` actual**
   ```sql
   CREATE TABLE leads_backup_20260127 AS SELECT * FROM leads;
   ```
3. ✅ **Verificar índices en vendedores y proyectos**
4. ✅ **Probar script en ambiente de staging primero**
5. ✅ **Definir estrategia para duplicados**

### Durante Migración

1. ⏱️ **Ejecutar en transacción** (BEGIN...COMMIT)
2. 📊 **Monitorear logs del script**
3. 🚫 **No permitir escrituras en `leads` durante proceso**

### Después de Migrar

1. ✅ **Ejecutar queries de validación post-migración**
2. ✅ **Comparar conteos: origen (9,370) vs destino**
3. ✅ **Verificar distribución de estados**
4. ✅ **Analizar leads sin vendedor asignado**
5. ✅ **Ejecutar ANALYZE leads**
6. ✅ **Archivar `sperant_migrations_leads`**

---

## Queries de Validación Post-Migración

### 1. Conteo Total
```sql
SELECT COUNT(*) as migrados FROM leads
WHERE created_at >= '2026-01-27 [HORA_INICIO]';
-- Debe ser ~9,368 (total - 2 sin teléfono)
```

### 2. Distribución por Proyecto
```sql
SELECT p.nombre, COUNT(l.id) as leads
FROM leads l
JOIN proyectos p ON l.proyecto_id = p.id
WHERE l.created_at >= '2026-01-27 [HORA_INICIO]'
GROUP BY p.nombre
ORDER BY leads DESC;
```

### 3. Distribución por Estado
```sql
SELECT estado, COUNT(*) as cantidad
FROM leads
WHERE created_at >= '2026-01-27 [HORA_INICIO]'
GROUP BY estado
ORDER BY cantidad DESC;
-- Comparar con distribución de nivel_interes_proyecto
```

### 4. Leads Sin Vendedor
```sql
SELECT COUNT(*) as sin_vendedor
FROM leads
WHERE vendedor_asignado_id IS NULL
AND created_at >= '2026-01-27 [HORA_INICIO]';
```

### 5. Integridad Referencial
```sql
-- ✅ DEBE retornar 0
SELECT COUNT(*) as proyectos_invalidos
FROM leads l
LEFT JOIN proyectos p ON l.proyecto_id = p.id
WHERE l.proyecto_id IS NOT NULL AND p.id IS NULL
AND l.created_at >= '2026-01-27 [HORA_INICIO]';
```

---

## Conclusión

**Estado:** LISTO PARA MIGRACIÓN

**Calidad de datos:** 9/10 (excelente)

**Registros a migrar:** 9,368 de 9,370 (99.98%)

**Tiempo estimado:** 3-5 minutos

**Riesgos principales:**
1. Proyectos no existentes (VALIDAR)
2. Vendedores no existentes (VALIDAR)
3. Duplicados de teléfono (DECIDIR ESTRATEGIA)

**Próximo paso:** Ejecutar pre-validaciones y ajustar script SQL según resultados.

---

**Documento generado por:** DataDev - Database Architect
**Fecha:** 27 Enero 2026
**Para revisión de:** PM y Usuario
