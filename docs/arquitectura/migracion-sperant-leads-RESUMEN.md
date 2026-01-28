# Resumen Ejecutivo: Migración Sperant Leads

**Fecha:** 27 Enero 2026
**Estado:** ANÁLISIS COMPLETADO - LISTO PARA EJECUCIÓN
**Prioridad:** Alta

---

## TL;DR (30 segundos)

- **9,370 leads** listos para migrar desde Sperant
- **Calidad de datos: 9/10** - Solo 2 registros problemáticos (0.02%)
- **Tiempo estimado: 3-5 minutos** de migración
- **Mapeo definido:** 58 campos origen → 27 campos destino
- **Validaciones críticas:** 3 queries obligatorias antes de ejecutar
- **Riesgo:** BAJO (con pre-validaciones)

---

## Documentación Generada

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| **Mapeo de Campos** | `docs/arquitectura/migracion-sperant-leads-mapping.md` | Transformaciones, SQL completo, rollback |
| **Análisis de Datos** | `docs/arquitectura/migracion-sperant-leads-analisis-datos.md` | Estadísticas, riesgos, validaciones |
| **Resumen Ejecutivo** | `docs/arquitectura/migracion-sperant-leads-RESUMEN.md` | Este documento |

---

## Métricas Clave

### Volumen
- **Total origen:** 9,370 registros
- **Migrables:** 9,368 registros (99.98%)
- **Rechazados:** 2 registros sin teléfono (0.02%)

### Distribución de Leads

| Estado Original | Cantidad | % | Estado Destino |
|----------------|----------|---|----------------|
| Bajo interés | 4,598 | 49% | `lead_frio` |
| Por contactar | 2,936 | 31% | `lead_nuevo` |
| Intermedio | 1,578 | 17% | `lead_calificado` |
| Otros | 258 | 3% | Varios |

### Top 3 Proyectos
1. **Eco Plaza Trujillo:** 2,238 leads (23.88%)
2. **Eco Plaza Faucett:** 1,036 leads (11.05%)
3. **Mercado Trapiche:** 1,027 leads (10.96%)

---

## Validaciones PRE-Migración (OBLIGATORIAS)

### ✅ PASO 1: Validar Proyectos Existen

```bash
node scripts/run-migration-generic.js --sql "SELECT DISTINCT s.proyecto_id, s.proyecto FROM sperant_migrations_leads s LEFT JOIN proyectos p ON s.proyecto_id = p.id WHERE p.id IS NULL;"
```

**Resultado esperado:** 0 filas
**Si retorna filas:** Crear proyectos faltantes antes de continuar

---

### ✅ PASO 2: Validar Vendedores Existen

```bash
node scripts/run-migration-generic.js --sql "SELECT DISTINCT s.usuario_asignado, COUNT(*) as leads FROM sperant_migrations_leads s LEFT JOIN vendedores v ON v.username = s.usuario_asignado WHERE v.id IS NULL GROUP BY s.usuario_asignado;"
```

**Si retorna filas:** Decidir estrategia:
- **Opción A:** Crear vendedores genéricos
- **Opción B:** Permitir NULL (asignar manualmente después)
- **Opción C:** Mapear a vendedor por defecto

---

### ✅ PASO 3: Analizar Duplicados

```bash
node scripts/run-migration-generic.js --sql "SELECT celular, COUNT(*) as veces FROM sperant_migrations_leads WHERE celular IS NOT NULL GROUP BY celular HAVING COUNT(*) > 1 ORDER BY veces DESC LIMIT 20;"
```

**Decidir estrategia:**
- ¿Permitir duplicados? (un lead puede estar en múltiples proyectos)
- ¿Consolidar? (unir en un solo registro)
- ¿Agregar constraint UNIQUE(telefono, proyecto_id)?

---

## Script de Migración

### Ubicación del SQL
📄 **Archivo:** `docs/arquitectura/migracion-sperant-leads-mapping.md`
📍 **Sección:** "SQL de Migración (Borrador)"

### Características
- ✅ Transaccional (BEGIN...COMMIT)
- ✅ Validación previa de teléfonos
- ✅ Transformaciones de campos
- ✅ Lookup de vendedores por username
- ✅ Conversión de fechas Excel → PostgreSQL
- ✅ Mapeo de estados
- ✅ Reporte de resultados

### Ejecución

**IMPORTANTE:** Ejecutar primero en ambiente de pruebas/staging.

```bash
# 1. Crear archivo SQL temporal
node scripts/run-migration-generic.js migration-sperant-to-leads.sql

# O ejecutar inline (no recomendado para migración grande)
# Ver archivo de mapeo para SQL completo
```

---

## Mapeo de Campos Críticos

### Teléfono (Requerido)
```sql
telefono = COALESCE(celular, telefono_principal)
```

### Nombre
```sql
nombre = TRIM(COALESCE(nombres, '') || ' ' || COALESCE(apellidos, ''))
-- Fallback: denominacion si nombres+apellidos es vacío
```

### Estado
```sql
estado = CASE nivel_interes_proyecto
    WHEN 'alto' THEN 'lead_caliente'
    WHEN 'intermedio' THEN 'lead_calificado'
    WHEN 'por contactar' THEN 'lead_nuevo'
    WHEN 'bajo' THEN 'lead_frio'
    WHEN 'desestimado' THEN 'descartado'
    ELSE 'lead_nuevo'
END
```

### Vendedor
```sql
vendedor_asignado_id = (
    SELECT id FROM vendedores WHERE username = usuario_asignado LIMIT 1
)
```

### Fecha Captura (Excel → PostgreSQL)
```sql
fecha_captura = TO_TIMESTAMP(
    CAST(fecha_creacion AS NUMERIC) * 24 * 60 * 60
) + '1899-12-30'::timestamp
```

---

## Campos NO Migrados (39 de 58)

### Campos Descartados
Datos que NO tienen equivalente o NO son necesarios en el nuevo sistema:

```
tipo_documento, nro_documento, denominacion, tipo_persona,
agrupacion_medios_captacion, medio_captacion_proyecto,
canal_entrada_proyecto, segmento, fecha_asignacion,
numero_interacciones_proyecto, estado_civil, genero, edad,
nacionalidad, domicilio, proceso_captacion,
autorizacion_uso_datos, alto_riesgo, conyuge...
```

**Recomendación:** Mantener `sperant_migrations_leads` como tabla de archivo para consultas históricas.

---

## Plan de Ejecución

### Fase 1: Pre-Validación (15 minutos)
- [ ] Ejecutar 3 queries de validación obligatorias
- [ ] Revisar resultados y tomar decisiones
- [ ] Crear proyectos/vendedores faltantes si es necesario
- [ ] Decidir estrategia para duplicados

### Fase 2: Backup (5 minutos)
```sql
-- Crear backup de tabla leads actual
CREATE TABLE leads_backup_20260127 AS SELECT * FROM leads;
```

### Fase 3: Migración (5 minutos)
- [ ] Coordinar ventana de mantenimiento (opcional)
- [ ] Ejecutar script SQL de migración
- [ ] Monitorear logs y tiempo de ejecución
- [ ] Verificar mensaje final de éxito

### Fase 4: Post-Validación (15 minutos)
- [ ] Verificar conteo: ~9,368 registros
- [ ] Comparar distribución de estados
- [ ] Verificar proyectos y vendedores
- [ ] Probar dashboard con datos migrados

### Fase 5: Limpieza (5 minutos)
```sql
-- Renombrar tabla origen para archivo
ALTER TABLE sperant_migrations_leads
RENAME TO sperant_migrations_leads_archive_20260127;

-- Ejecutar ANALYZE para actualizar estadísticas
ANALYZE leads;
```

**Tiempo total estimado:** 45 minutos (incluyendo validaciones y pruebas)

---

## Rollback Plan

### Si migración falla durante ejecución
```sql
-- Si transacción está abierta
ROLLBACK;
```

### Si migración ya hizo COMMIT
```sql
-- Eliminar registros migrados
DELETE FROM leads
WHERE created_at >= '2026-01-27 [HORA_INICIO]'
AND created_at <= '2026-01-27 [HORA_FIN]';

-- Restaurar backup si es necesario
-- (requiere DROP/RENAME de tabla leads)
```

---

## Queries de Validación Post-Migración

### 1. Conteo Total
```bash
node scripts/run-migration-generic.js --sql "SELECT COUNT(*) as total_migrados FROM leads WHERE created_at >= NOW() - INTERVAL '1 hour';"
```
**Esperado:** ~9,368

### 2. Verificar Proyectos
```bash
node scripts/run-migration-generic.js --sql "SELECT p.nombre, COUNT(l.id) as leads FROM leads l JOIN proyectos p ON l.proyecto_id = p.id WHERE l.created_at >= NOW() - INTERVAL '1 hour' GROUP BY p.nombre ORDER BY leads DESC LIMIT 10;"
```

### 3. Verificar Estados
```bash
node scripts/run-migration-generic.js --sql "SELECT estado, COUNT(*) as cantidad FROM leads WHERE created_at >= NOW() - INTERVAL '1 hour' GROUP BY estado ORDER BY cantidad DESC;"
```

### 4. Integridad Referencial
```bash
node scripts/run-migration-generic.js --sql "SELECT COUNT(*) as proyectos_invalidos FROM leads l LEFT JOIN proyectos p ON l.proyecto_id = p.id WHERE l.proyecto_id IS NOT NULL AND p.id IS NULL AND l.created_at >= NOW() - INTERVAL '1 hour';"
```
**Esperado:** 0

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Proyectos no existen | Media | Alto | Pre-validación obligatoria + crear antes |
| Vendedores no existen | Media | Medio | Pre-validación + decidir estrategia |
| Duplicados de teléfono | Alta | Medio | Análisis previo + constraint si se necesita |
| Estados no válidos | Baja | Alto | Verificar enum/constraint de tabla leads |
| Timeout de migración | Baja | Medio | Migración en lotes si es necesario |

---

## Decisiones Pendientes

### 1. Estrategia para Duplicados
**Opciones:**
- A) Permitir duplicados (lead en múltiples proyectos)
- B) Consolidar en un solo registro
- C) UNIQUE constraint (telefono, proyecto_id)

**Recomendación:** Opción A o C según regla de negocio.
**Decidir por:** Usuario/PM

---

### 2. Vendedores No Encontrados
**Si la pre-validación muestra vendedores faltantes:**
- A) Crear usuarios genéricos en tabla vendedores
- B) Permitir NULL y asignar manualmente después
- C) Mapear a vendedor por defecto (ej: "sistema")

**Recomendación:** Opción A o B.
**Decidir por:** Usuario/PM

---

### 3. Mapeo de Estados Extendido

**Estados adicionales detectados en Sperant:**
- `agendado` → ¿`visita_agendada`?
- `visitó` → ¿`visita_realizada`?
- `separación` → ¿`separacion`?
- `compró` → ¿`ganado`?

**Acción:** Verificar que estos estados existan en tabla `leads` o agregarlos.

---

## Próximos Pasos Inmediatos

### Para el Usuario/PM:
1. **Revisar documentación completa:**
   - Mapeo de campos: `migracion-sperant-leads-mapping.md`
   - Análisis de datos: `migracion-sperant-leads-analisis-datos.md`

2. **Tomar decisiones pendientes:**
   - Estrategia para duplicados
   - Estrategia para vendedores faltantes
   - Verificar mapeo de estados

3. **Aprobar ejecución:**
   - ¿Ejecutar en staging primero?
   - ¿Cuándo ejecutar en producción?
   - ¿Ventana de mantenimiento necesaria?

### Para DataDev (Database Architect):
1. **Ejecutar pre-validaciones** cuando el usuario apruebe
2. **Ajustar script SQL** según resultados de validaciones
3. **Crear archivo SQL final** listo para ejecutar
4. **Asistir en ejecución** y monitoreo

---

## Criterios de Éxito

✅ **Migración exitosa si:**
- ~9,368 registros insertados en `leads`
- 0 errores de integridad referencial
- Distribución de estados coherente con origen
- Dashboard funciona correctamente con datos migrados
- Todas las queries de post-validación pasan

❌ **Migración fallida si:**
- Diferencia > 1% entre registros origen y destino
- Errores de foreign key (proyectos/vendedores)
- Dashboard muestra errores o datos incorrectos
- Tiempo de ejecución > 15 minutos

---

## Contacto y Soporte

**Database Architect:** DataDev
**Documentación:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\docs\arquitectura\`
**Scripts:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\scripts\`

---

## Histórico de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-27 | 1.0 | Análisis inicial y documentación completa |

---

**CONCLUSIÓN: Sistema listo para migración. Pendiente aprobación de usuario/PM para ejecutar pre-validaciones y proceder.**
