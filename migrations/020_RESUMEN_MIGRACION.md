# Migración 020: Estandarización "Verificado" → "Validado"

**Fecha de creación:** 2026-01-21
**Estado:** LISTO PARA EJECUTAR
**Autor:** DataDev (Database Architect)
**Sesión:** 97

---

## Archivos Creados

### 1. Migración Principal
**Archivo:** `migrations/020_verificado_a_validado.sql`

Migración SQL completa que:
- Renombra 4 columnas en `depositos_ficha`
- Renombra 2 índices
- Actualiza comentarios
- Es idempotente (puede ejecutarse múltiples veces)
- Incluye manejo de triggers (si existen)

### 2. Script de Verificación
**Archivo:** `migrations/verify-020-validado.sql`

Script de verificación con 10 tests:
1. Columnas viejas removidas
2. Columnas nuevas creadas
3. Tipos de datos correctos
4. Índices renombrados
5. Índice parcial funciona
6. Plan de ejecución usa índice
7. Comentarios actualizados
8. Datos preservados
9. Foreign keys intactas
10. Query funcional end-to-end

### 3. Check Pre-Migración
**Archivo:** `migrations/check-020-pre-migration.sql`

Script para ejecutar ANTES de la migración que muestra:
- Estado actual de columnas
- Estadísticas de datos
- Índices existentes
- Foreign keys
- Triggers relacionados
- Recomendación de acción

### 4. Documentación Completa
**Archivo:** `migrations/README_020_VERIFICADO_A_VALIDADO.md`

Documentación completa con:
- Contexto de negocio
- Cambios realizados
- Características de la migración
- Impacto en el código
- Instrucciones de ejecución
- Verificación post-migración
- Plan de rollback
- Testing
- Notas importantes

### 5. Guía de Ejecución
**Archivo:** `migrations/EJECUTAR_020_VERIFICADO_A_VALIDADO.md`

Guía paso a paso para ejecutar la migración:
- Resumen ejecutivo
- Checklist pre-ejecución
- Ejecución en Staging
- Actualización de código
- Ejecución en Producción
- Plan de rollback
- FAQ
- Checklist post-ejecución

---

## Resumen de Cambios

### Tabla: `depositos_ficha`

| Antes | Después |
|-------|---------|
| `verificado_finanzas` | `validado_finanzas` |
| `verificado_finanzas_por` | `validado_finanzas_por` |
| `verificado_finanzas_at` | `validado_finanzas_at` |
| `verificado_finanzas_nombre` | `validado_finanzas_nombre` |
| `idx_depositos_ficha_pendientes` | `idx_depositos_ficha_no_validados` |

### Tabla: `abonos_pago`

**NO se modifica** - ya usa la terminología correcta (`validado_*`)

---

## Orden de Ejecución

### Fase 1: Pre-Checks (Staging)

```bash
# 1. Verificar estado actual
psql -f migrations/check-020-pre-migration.sql

# Revisar output y confirmar que es necesaria la migración
```

### Fase 2: Migración (Staging)

```bash
# 2. Ejecutar migración
psql -f migrations/020_verificado_a_validado.sql

# 3. Verificar migración
psql -f migrations/verify-020-validado.sql

# Todos los tests deben mostrar "OK"
```

### Fase 3: Actualización de Código

```bash
# 4. Actualizar lib/actions-depositos-ficha.ts
#    Buscar y reemplazar: verificado_finanzas → validado_finanzas

# 5. Commit y push
git add .
git commit -m "feat: update depositos to use validado terminology"
git push origin main
```

### Fase 4: Producción

```bash
# 6. Ejecutar en Producción (horario de bajo tráfico)
#    - migrations/020_verificado_a_validado.sql
#    - migrations/verify-020-validado.sql

# 7. Desplegar código actualizado
#    (Vercel auto-deploy desde main)

# 8. Monitorear por 1 hora
```

---

## Impacto Estimado

### Performance
- **Tiempo de ejecución:** < 1 segundo
- **Lock en tabla:** Mínimo (solo metadatos)
- **Downtime:** 0 segundos

### Datos
- **Registros afectados:** 0 (solo renombra columnas)
- **Pérdida de datos:** 0
- **Transformación de datos:** 0

### Código
- **Archivos a modificar:** 1 principal (`lib/actions-depositos-ficha.ts`)
- **Componentes afectados:** Posiblemente componentes UI de depósitos
- **Breaking changes:** Sí, si no se actualiza el código

---

## Criterios de Éxito

### Migración Exitosa Si:

1. ✅ Todos los tests de verificación muestran "OK"
2. ✅ No hay errores en Vercel logs después del deploy
3. ✅ Finanzas puede ver depósitos pendientes de validación
4. ✅ Finanzas puede validar depósitos exitosamente
5. ✅ Reportes de depósitos funcionan correctamente
6. ✅ No hay degradación de performance

### Rollback Necesario Si:

1. ❌ Algún test de verificación falla
2. ❌ Errores críticos en Vercel logs
3. ❌ Finanzas reporta problemas para validar
4. ❌ Performance degradada significativamente

---

## Próximos Pasos Después de Ejecutar

1. **Actualizar documentación técnica**
   - Actualizar diagramas de base de datos
   - Actualizar documentación de API

2. **Revisar código restante**
   - Buscar referencias a "verificado" en comentarios
   - Actualizar mensajes de usuario (si mencionan "verificado")

3. **Monitorear métricas**
   - Queries de Finanzas
   - Performance de índices
   - Errores en logs

4. **Comunicar cambio**
   - Notificar al equipo de Finanzas
   - Actualizar documentación de usuario (si existe)

---

## Contactos y Soporte

### Ejecución de Migración
- **DBA:** DataDev
- **CTO:** Alonso

### Código
- **Backend:** Equipo de desarrollo
- **Frontend:** Equipo de desarrollo

### Testing
- **QA:** Equipo de QA
- **Usuario final:** Finanzas

---

## Historial

| Fecha | Acción | Responsable | Notas |
|-------|--------|-------------|-------|
| 2026-01-21 | Migración creada | DataDev | Archivos: SQL, docs, verificación |
| _Pendiente_ | Ejecutada en Staging | _Pendiente_ | - |
| _Pendiente_ | Verificada en Staging | _Pendiente_ | - |
| _Pendiente_ | Código actualizado | _Pendiente_ | - |
| _Pendiente_ | Ejecutada en Producción | _Pendiente_ | - |
| _Pendiente_ | Verificada en Producción | _Pendiente_ | - |

---

## Referencias

### Código Relevante
- `lib/actions-depositos-ficha.ts` - Acciones de depósitos
- `lib/actions-pagos.ts` - Acciones de pagos (referencia `abonos_pago`)

### Migraciones Relacionadas
- `migrations/012_depositos_ficha.sql` - Creación original de tabla

### Documentación
- `README_020_VERIFICADO_A_VALIDADO.md` - Documentación completa
- `EJECUTAR_020_VERIFICADO_A_VALIDADO.md` - Guía de ejecución

### Contexto de Negocio
- Sesión 97 - Estandarización de terminología
- Flujo de validación de Finanzas

---

**Preparado por:** DataDev (Database Architect)
**Fecha:** 2026-01-21
**Versión:** 1.0
