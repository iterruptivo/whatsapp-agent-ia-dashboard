# Guía de Ejecución: Migración 020 - Verificado → Validado

**Estado:** LISTO PARA EJECUTAR
**Impacto:** BAJO (solo renombra columnas, sin cambios de datos)
**Downtime:** NO REQUIERE
**Reversible:** SÍ

---

## Resumen Ejecutivo

Esta migración estandariza la terminología de "verificado" a "validado" en la tabla `depositos_ficha` para alinearse con:
- La terminología usada en `abonos_pago`
- El flujo de negocio de Finanzas
- Consistencia en todo el sistema

**Cambios:**
- 4 columnas renombradas en `depositos_ficha`
- 2 índices renombrados
- 0 datos modificados
- 0 downtime requerido

---

## Checklist Pre-Ejecución

- [ ] Backup de base de datos realizado
- [ ] Notificación al equipo de desarrollo enviada
- [ ] Verificar que no hay operaciones críticas de Finanzas en curso
- [ ] Revisar migración: `migrations/020_verificado_a_validado.sql`
- [ ] Revisar script de verificación: `migrations/verify-020-validado.sql`

---

## Ejecución en Staging

### Paso 1: Ejecutar Migración

```bash
# Via Supabase SQL Editor (RECOMENDADO)
# Copiar y pegar el contenido de: migrations/020_verificado_a_validado.sql
```

O vía CLI si tienes Supabase CLI configurado:

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
supabase db execute migrations/020_verificado_a_validado.sql
```

### Paso 2: Ejecutar Verificación

```bash
# Via Supabase SQL Editor
# Copiar y pegar el contenido de: migrations/verify-020-validado.sql
```

### Paso 3: Verificar Output

Todos los tests deben mostrar "OK":
- ✅ TEST 1: Columnas viejas removidas
- ✅ TEST 2: Columnas nuevas creadas
- ✅ TEST 3: Tipos de datos correctos
- ✅ TEST 4: Índices renombrados
- ✅ TEST 5: Índice parcial funciona
- ✅ TEST 6: Plan de ejecución usa índice
- ✅ TEST 7: Comentarios actualizados
- ✅ TEST 8: Datos preservados
- ✅ TEST 9: Foreign keys intactas
- ✅ TEST 10: Query funcional end-to-end

---

## Actualización de Código

### Archivos a Modificar

#### 1. `lib/actions-depositos-ficha.ts`

**Buscar y reemplazar:**

```
verificado_finanzas          → validado_finanzas
verificado_finanzas_por      → validado_finanzas_por
verificado_finanzas_at       → validado_finanzas_at
verificado_finanzas_nombre   → validado_finanzas_nombre
```

**Líneas afectadas:**
- Línea 292-295: Select de depósito
- Línea 356: Insert nuevo depósito
- Línea 450: Select para verificar estado
- Línea 458: Validación de estado
- Línea 472-475: Update al validar
- Línea 531-534: Update al validar múltiples
- Línea 537: Where para filtrar no validados
- Línea 569: Where para eliminar no validados
- Línea 692: Comentario
- Línea 708: Insert con validado false

#### 2. Types (si existen)

Buscar archivos que definan:
```typescript
interface DepositoFicha {
  // ...
  verificado_finanzas: boolean;
  // Cambiar a:
  validado_finanzas: boolean;
}
```

#### 3. Componentes UI

Buscar en:
- `components/depositos/`
- `app/**/depositos/`
- Cualquier componente que muestre estado de validación

---

## Ejecución en Producción

### Timing Recomendado

- **Mejor momento:** Horario de bajo tráfico (21:00 - 23:00 hora Perú)
- **Evitar:** Horario de Finanzas (9:00 - 18:00)

### Paso 1: Ejecutar Migración en Producción

```sql
-- En Supabase SQL Editor (Producción)
-- Copiar y pegar contenido de: migrations/020_verificado_a_validado.sql
```

**Tiempo estimado:** < 1 segundo (es solo renombrar metadatos)

### Paso 2: Ejecutar Verificación

```sql
-- Copiar y pegar contenido de: migrations/verify-020-validado.sql
```

### Paso 3: Desplegar Código Actualizado

```bash
# En tu terminal local
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard

# Hacer commit de cambios
git add lib/actions-depositos-ficha.ts
git commit -m "feat: update depositos to use validado terminology

- Rename verificado_finanzas → validado_finanzas
- Align with abonos_pago terminology
- Part of migration 020"

# Push y deploy automático via Vercel
git push origin main
```

### Paso 4: Monitoreo Post-Deploy

Monitorear por 1 hora:
- ✅ No hay errores en Vercel logs
- ✅ Finanzas puede ver depósitos pendientes
- ✅ Finanzas puede validar depósitos
- ✅ Queries de reportes funcionan

---

## Rollback (si es necesario)

Si algo sale mal, ejecutar:

```sql
-- 1. Renombrar columnas de vuelta
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas TO verificado_finanzas;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_por TO verificado_finanzas_por;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_at TO verificado_finanzas_at;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_nombre TO verificado_finanzas_nombre;

-- 2. Renombrar índice
ALTER INDEX idx_depositos_ficha_no_validados RENAME TO idx_depositos_ficha_pendientes;

-- 3. Recrear índice parcial
DROP INDEX IF EXISTS idx_depositos_ficha_no_validados;
CREATE INDEX idx_depositos_ficha_pendientes
  ON depositos_ficha(verificado_finanzas)
  WHERE verificado_finanzas = false;

-- 4. Revertir código
git revert <commit-hash>
git push origin main
```

**Tiempo de rollback:** < 2 minutos

---

## FAQ

### ¿Por qué renombrar a "validado" en lugar de "verificado"?

**Respuesta:** "Validar" es más preciso para el flujo de Finanzas:
- Finanzas **valida** que el voucher es legítimo
- Finanzas **valida** que los montos son correctos
- Finanzas **valida** que el depósito corresponde al local

"Verificado" sugiere un proceso técnico/automático (como OCR), mientras que "validado" refleja el proceso manual y crítico de Finanzas.

### ¿Se perderán datos?

**No.** `ALTER TABLE ... RENAME COLUMN` solo cambia el nombre de la columna, no los datos. Es una operación de metadatos que no toca los datos físicos.

### ¿Habrá downtime?

**No.** La migración toma menos de 1 segundo y no bloquea la tabla. Las queries en curso seguirán funcionando.

### ¿Qué pasa si hay queries en ejecución cuando se ejecuta la migración?

Las queries en curso:
- Si usan el nombre viejo: Fallarán con error claro "column does not exist"
- Si usan el nombre nuevo: Funcionarán normalmente

Por eso es importante desplegar el código actualizado inmediatamente después de la migración.

### ¿Afecta a `abonos_pago`?

**No.** La tabla `abonos_pago` ya usa "validado" desde el inicio, por lo que no requiere cambios.

---

## Contactos de Emergencia

Si algo sale mal:
1. **Database:** Alonso (CTO) - revisar logs de Supabase
2. **Frontend:** Equipo de desarrollo - revisar Vercel logs
3. **Finanzas:** Notificar si hay problemas de acceso

---

## Checklist Post-Ejecución

- [ ] Migración ejecutada en Producción
- [ ] Script de verificación ejecutado (todos los tests OK)
- [ ] Código actualizado desplegado
- [ ] Finanzas notificadas del cambio
- [ ] Monitoreo de errores por 1 hora (sin errores)
- [ ] Documentación actualizada
- [ ] Commit de migración marcado como ejecutado

---

**Preparado por:** DataDev (Database Architect)
**Fecha:** 2026-01-21
**Versión:** 1.0
