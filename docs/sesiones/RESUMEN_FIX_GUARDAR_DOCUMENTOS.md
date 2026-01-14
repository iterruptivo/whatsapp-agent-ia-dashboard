# RESUMEN EJECUTIVO - Fix: Error al Guardar Documentos

**Fecha:** 13 Enero 2026
**Prioridad:** CRÍTICA
**Estado:** ✅ RESUELTO

---

## PROBLEMA

Al guardar documentos en el formulario de registro de corredor, aparecía:

```
❌ "Error guardando algunos documentos"
```

Esto bloqueaba completamente el flujo de registro.

---

## CAUSA RAÍZ

1. **Estrategia incorrecta:** Se intentaba DELETE + INSERT
2. **RLS Policy faltante:** No existía política DELETE para `corredores_documentos`
3. **Validación deficiente:** Campo `ocr_confianza` no validaba constraint CHECK

---

## SOLUCIÓN

### 1. Cambio a UPSERT (Operación Atómica)

```typescript
// ❌ ANTES (DELETE + INSERT)
await supabase.from('corredores_documentos').delete()...
await supabase.from('corredores_documentos').insert()...

// ✅ DESPUÉS (UPSERT)
await supabase.from('corredores_documentos').upsert(docData, {
  onConflict: 'registro_id,tipo_documento'
})
```

**Ventajas:**
- No requiere política DELETE
- Más rápido (1 query vs 2)
- Usa constraint UNIQUE existente
- Atómico (no race conditions)

### 2. Validación de `ocr_confianza`

```typescript
// Solo agregar si es válido (0-100)
if (doc.ocrData?.confianza !== undefined) {
  const confianza = Number(doc.ocrData.confianza);
  if (!isNaN(confianza) && confianza >= 0 && confianza <= 100) {
    docData.ocr_confianza = Math.round(confianza);
  }
}
```

### 3. Logging Mejorado

Ahora muestra el error específico de Supabase:

```typescript
return {
  success: false,
  error: `Error guardando documentos: ${errorMsg}`
};
```

---

## ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `lib/actions-expansion.ts` | 813-870 | Reescritura completa de `saveDocumentosCorredor` |

---

## MIGRACIÓN OPCIONAL

**Archivo:** `migrations/003_fix_corredores_documentos_delete_policy.sql`

Agrega política DELETE (por si se necesita en el futuro):

```sql
CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos FOR DELETE
  USING (...);
```

**NOTA:** Con UPSERT, esta migración es opcional pero recomendada.

---

## TESTING REQUERIDO

### ✅ Verificar:

1. **Guardar borrador con documentos nuevos**
   - Subir DNI, recibo, declaración
   - Click "Guardar Borrador"
   - Debe mostrar: "Datos y documentos guardados correctamente"

2. **Actualizar documentos existentes**
   - Editar registro con documentos ya guardados
   - Cambiar un documento
   - Click "Guardar Borrador"
   - Debe reemplazar el documento anterior

3. **Sin OCR data**
   - Subir documento sin OCR
   - No debe fallar

---

## PRÓXIMOS PASOS

1. **Aplicar migración 003** (opcional) en Supabase SQL Editor
2. **Testing manual** con cuenta de corredor
3. **Validar flujo completo:** borrador → enviar → aprobar

---

## CONTACTO

Para dudas sobre este fix:
- Ver documentación completa: `docs/sesiones/SESION_90_Fix_Error_Guardar_Documentos.md`
- Migración: `migrations/003_fix_corredores_documentos_delete_policy.sql`
- Código: `lib/actions-expansion.ts` (función `saveDocumentosCorredor`)
