# SESIÓN 90 - Fix: Error al Guardar Documentos de Corredor

**Fecha:** 13 Enero 2026
**Tipo:** Bug Fix - Crítico
**Módulo:** Expansión - Registro de Corredores

---

## PROBLEMA REPORTADO

Al intentar guardar borrador en el formulario de registro de corredor, aparecía el error:

```
"Error guardando algunos documentos"
```

**Stack trace:**
```
[handleSave] Error guardando documentos: "Error guardando algunos documentos"
app/expansion/registro/RegistroCorredorClient.tsx (443:21) @ handleSave
```

---

## ANÁLISIS DEL BUG

### 1. Identificación de la Causa Raíz

La función `saveDocumentosCorredor` en `lib/actions-expansion.ts` intentaba:

1. **DELETE** del documento anterior (si existía)
2. **INSERT** del nuevo documento

**Problema:** Faltaba la política RLS de DELETE en la tabla `corredores_documentos`.

### 2. Políticas RLS Existentes (Migración 001)

```sql
-- ✅ SELECT
CREATE POLICY "Corredor ve sus documentos" ...

-- ✅ INSERT
CREATE POLICY "Corredor sube documentos" ...

-- ❌ DELETE - FALTABA!
```

### 3. Schema de la Tabla

```sql
CREATE TABLE corredores_documentos (
  id UUID,
  registro_id UUID NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  ocr_data JSONB,
  ocr_confianza INTEGER CHECK (ocr_confianza >= 0 AND ocr_confianza <= 100),
  nombre_original VARCHAR(255),
  content_type VARCHAR(100),
  size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: un tipo de documento por registro
  CONSTRAINT unique_documento_tipo UNIQUE (registro_id, tipo_documento)
);
```

---

## SOLUCIÓN IMPLEMENTADA

### 1. Cambio de Estrategia: DELETE+INSERT → UPSERT

**Antes (con DELETE):**
```typescript
// Eliminar documento anterior
await supabase
  .from('corredores_documentos')
  .delete()
  .eq('registro_id', registroId)
  .eq('tipo_documento', doc.tipo);

// Insertar nuevo
await supabase
  .from('corredores_documentos')
  .insert(docData)
  .select()
  .single();
```

**Después (con UPSERT):**
```typescript
// Upsert usa el constraint unique_documento_tipo para detectar conflictos
return supabase
  .from('corredores_documentos')
  .upsert(docData, {
    onConflict: 'registro_id,tipo_documento',
    ignoreDuplicates: false, // Actualizar si existe
  })
  .select()
  .single();
```

**Ventajas del UPSERT:**
- No requiere política DELETE
- Operación atómica (más rápido)
- Usa el constraint UNIQUE existente
- Menos llamadas a la BD

### 2. Fix en Validación de `ocr_confianza`

**Problema:** Se intentaba insertar `null` directamente en `ocr_confianza`, que tiene constraint `CHECK (ocr_confianza >= 0 AND ocr_confianza <= 100)`.

**Solución:** Solo incluir el campo si tiene un valor válido.

```typescript
const docData: any = {
  registro_id: registroId,
  tipo_documento: doc.tipo,
  storage_path: doc.storagePath,
  public_url: doc.url,
  nombre_original: null,
  content_type: null,
};

// Solo agregar ocr_confianza si es válido
if (doc.ocrData) {
  docData.ocr_data = doc.ocrData;

  if (doc.ocrData.confianza !== undefined && doc.ocrData.confianza !== null) {
    const confianza = Number(doc.ocrData.confianza);
    if (!isNaN(confianza) && confianza >= 0 && confianza <= 100) {
      docData.ocr_confianza = Math.round(confianza);
    }
  }
}
```

### 3. Mejora de Logging de Errores

**Antes:**
```typescript
if (errors.length > 0) {
  console.error('[saveDocumentosCorredor] Errores al guardar:', errors);
  return { success: false, error: 'Error guardando algunos documentos' };
}
```

**Después:**
```typescript
if (errors.length > 0) {
  console.error('[saveDocumentosCorredor] Errores al guardar:', errors);
  const firstError = errors[0].error;
  const errorMsg = firstError?.message || firstError?.code || 'Error guardando algunos documentos';
  console.error('[saveDocumentosCorredor] Primer error:', errorMsg);
  return { success: false, error: `Error guardando documentos: ${errorMsg}` };
}
```

Ahora el mensaje de error incluye detalles del error de Supabase.

---

## MIGRACIÓN CREADA (Opcional)

**Archivo:** `migrations/003_fix_corredores_documentos_delete_policy.sql`

Agrega la política DELETE faltante (por si en el futuro se necesita):

```sql
CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );
```

**NOTA:** Con el cambio a UPSERT, esta migración es opcional. Pero es buena práctica aplicarla para tener la política completa.

---

## ARCHIVOS MODIFICADOS

1. **`lib/actions-expansion.ts`**
   - Líneas 813-850: Reescritura de `saveDocumentosCorredor`
   - Uso de `.upsert()` en lugar de DELETE+INSERT
   - Validación de `ocr_confianza`
   - Mejora de logging de errores

2. **`migrations/003_fix_corredores_documentos_delete_policy.sql`** (NUEVO)
   - Política DELETE para `corredores_documentos`

3. **`migrations/README_APLICAR_MIGRACIONES.md`** (NUEVO)
   - Guía para aplicar migraciones en Supabase
   - Lista de migraciones aplicadas vs pendientes

---

## TESTING

### Caso de Prueba 1: Guardar Documentos Nuevos
1. Login como corredor
2. Subir documentos (DNI frente/reverso, recibo, declaración)
3. Click en "Guardar Borrador"
4. **Resultado Esperado:** ✅ "Datos y documentos guardados correctamente"

### Caso de Prueba 2: Actualizar Documentos Existentes
1. Editar registro existente en borrador
2. Cambiar un documento (subir nuevo)
3. Click en "Guardar Borrador"
4. **Resultado Esperado:** ✅ El documento anterior se reemplaza correctamente

### Caso de Prueba 3: OCR Data Opcional
1. Subir documento sin OCR data
2. Guardar borrador
3. **Resultado Esperado:** ✅ Se guarda sin error (ocr_confianza no se incluye)

---

## LECCIONES APRENDIDAS

### 1. **Políticas RLS Completas**
Siempre definir políticas para TODAS las operaciones (SELECT, INSERT, UPDATE, DELETE).

### 2. **UPSERT > DELETE+INSERT**
Usar UPSERT cuando hay constraint UNIQUE es más eficiente y evita race conditions.

### 3. **Validación de Constraints**
Antes de insertar, validar que los valores cumplan con los constraints de la BD.

### 4. **Logging Detallado**
En Server Actions, loggear errores de Supabase completos para debugging.

### 5. **Campos Opcionales**
En PostgreSQL, si un campo tiene constraint CHECK, es mejor NO incluirlo en el INSERT si es NULL (aunque el constraint permita NULL).

---

## PRÓXIMOS PASOS

1. ✅ Aplicar migración 003 en Supabase (opcional pero recomendado)
2. ✅ Testing manual con cuenta de corredor
3. ⏳ Validar que documentos persistan correctamente
4. ⏳ Verificar que el flujo completo funciona (borrador → enviar → aprobar)

---

## REFERENCIAS

- Schema: `migrations/001_modulo_expansion_corredores.sql`
- Server Action: `lib/actions-expansion.ts`
- Cliente: `app/expansion/registro/RegistroCorredorClient.tsx`
- Supabase Docs: https://supabase.com/docs/guides/database/postgres/row-level-security
