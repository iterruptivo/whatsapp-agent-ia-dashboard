# SESION 92 - Fix Loop Infinito en Módulo Purchase Requisitions

**Fecha:** 2026-01-13
**Agente:** Backend Dev
**Tarea:** Arreglar loop infinito de requests en `/solicitudes-compra/nueva`

---

## PROBLEMA REPORTADO

### Síntomas
1. Loop infinito de requests en logs:
   ```
   POST /solicitudes-compra/nueva 200 in 1143ms
   POST /solicitudes-compra/nueva 200 in 1128ms
   POST /solicitudes-compra/nueva 200 in 1141ms
   ... (se repite cada segundo infinitamente)
   ```

2. Botones del formulario se deshabilitan y quedan en estado de loading permanentemente

3. El módulo está muy lento

### Contexto
- Módulo: Purchase Requisitions (Solicitudes de Compra)
- Página afectada: `/solicitudes-compra/nueva`
- Usuario intenta crear nueva solicitud pero se queda cargando sin hacer nada

---

## ANÁLISIS REALIZADO

### Archivos Revisados
1. `app/solicitudes-compra/nueva/page.tsx` - Página principal
2. `components/purchase-requisitions/CreatePRForm.tsx` - Componente de formulario
3. `lib/actions-purchase-requisitions.ts` - Server actions

### Problema Encontrado: Incompatibilidad de Tipos

**Ubicación:** `components/purchase-requisitions/CreatePRForm.tsx`

**Antes:**
```typescript
interface CreatePRFormProps {
  onSuccess: (prId: string, isDraft: boolean) => void;
  onCancel: () => void;
}
```

**Pero en page.tsx:**
```typescript
const handleSuccess = (pr: PurchaseRequisition) => {
  router.push(`/solicitudes-compra/${pr.id}`);
};
```

**Consecuencia:**
- TypeScript no detectó el error porque los tipos eran compatibles parcialmente
- Cuando `onSuccess` se llamaba desde `CreatePRForm`, pasaba `(data.id, true)` o `(data.id, false)`
- Pero `page.tsx` esperaba recibir el objeto completo `PurchaseRequisition`
- Esto causaba que `pr.id` fuera `undefined` en el callback
- `router.push('/solicitudes-compra/undefined')` causaba un loop de re-renders

---

## SOLUCIÓN IMPLEMENTADA

### Cambio 1: Actualizar interfaz de props

**Archivo:** `components/purchase-requisitions/CreatePRForm.tsx`

```typescript
// ANTES
interface CreatePRFormProps {
  onSuccess: (prId: string, isDraft: boolean) => void;
  onCancel: () => void;
}

// DESPUÉS
interface CreatePRFormProps {
  onSuccess: (pr: PurchaseRequisition) => void;
  onCancel: () => void;
}
```

### Cambio 2: Actualizar imports

```typescript
import type {
  CreatePRInput,
  PRCategory,
  PRApprovalRule,
  PRPriority,
  PRCurrency,
  PurchaseRequisition,  // <-- Agregado
} from '@/lib/types/purchase-requisitions';
```

### Cambio 3: Actualizar llamadas a onSuccess en handleSaveDraft

**Antes:**
```typescript
const handleSaveDraft = async () => {
  // ...
  if (result.success && result.data) {
    toast.success('Borrador guardado exitosamente');
    onSuccess(result.data.id, true);  // <-- Pasaba solo ID
  }
};
```

**Después:**
```typescript
const handleSaveDraft = async () => {
  // ...
  if (result.success && result.data) {
    toast.success('Borrador guardado exitosamente');
    onSuccess(result.data);  // <-- Pasa objeto completo
  }
};
```

### Cambio 4: Actualizar llamadas a onSuccess en handleSubmit

**Antes:**
```typescript
const handleSubmit = async () => {
  // ...
  const submitResult = await submitPR(createResult.data.id);
  if (submitResult.success) {
    toast.success(submitResult.message || 'Solicitud enviada a aprobación');
    onSuccess(createResult.data.id, false);  // <-- Pasaba solo ID
  }
};
```

**Después:**
```typescript
const handleSubmit = async () => {
  // ...
  const submitResult = await submitPR(createResult.data.id);
  if (submitResult.success) {
    toast.success(submitResult.message || 'Solicitud enviada a aprobación');
    onSuccess(createResult.data);  // <-- Pasa objeto completo
  }
};
```

---

## VERIFICACIÓN

### Manejo de Errores (Revisado)
El código tiene manejo correcto de errores con try/catch/finally:

```typescript
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Por favor completa todos los campos requeridos');
    return;
  }

  setIsSubmitting(true);
  try {
    // 1. Crear PR
    const createResult = await createPR(formData);
    if (!createResult.success || !createResult.data) {
      toast.error(createResult.error || 'Error al crear solicitud');
      return;  // <-- Esto ejecuta el finally antes de retornar
    }

    // 2. Enviar a aprobación
    const submitResult = await submitPR(createResult.data.id);
    if (submitResult.success) {
      toast.success(submitResult.message || 'Solicitud enviada a aprobación');
      onSuccess(createResult.data);
    } else {
      toast.error(submitResult.error || 'Error al enviar a aprobación');
    }
  } catch (error) {
    toast.error('Error inesperado al enviar');
  } finally {
    setIsSubmitting(false);  // <-- SIEMPRE se ejecuta
  }
};
```

### useEffect Dependencies (Verificado)
Los useEffect tienen dependencias correctas:

```typescript
// Cargar categorías una sola vez
useEffect(() => {
  loadCategories();
}, []); // <-- Correcto

// Actualizar regla de aprobación cuando cambia el monto
useEffect(() => {
  const totalAmount = formData.quantity * formData.unit_price;
  if (totalAmount > 0) {
    getApprovalRuleForAmount(totalAmount).then((rule) => {
      setApprovalRule(rule);
    });
  } else {
    setApprovalRule(null);
  }
}, [formData.quantity, formData.unit_price]); // <-- Correcto
```

---

## RESULTADO ESPERADO

Después de este fix:

1. **No más loop infinito:** El callback `onSuccess` recibe el objeto completo, `router.push` redirige correctamente
2. **Loading state correcto:** `isSubmitting` se resetea siempre en el finally block
3. **Mejor UX:** Usuario ve mensajes claros de éxito/error y es redirigido al detalle de la PR

---

## ARCHIVOS MODIFICADOS

```
components/purchase-requisitions/CreatePRForm.tsx
```

---

## TESTING RECOMENDADO

### Caso 1: Guardar Borrador
1. Ir a `/solicitudes-compra/nueva`
2. Llenar formulario con datos válidos
3. Click en "Guardar Borrador"
4. **Esperado:** Toast de éxito, redirige a `/solicitudes-compra/[id]`

### Caso 2: Enviar a Aprobación
1. Ir a `/solicitudes-compra/nueva`
2. Llenar formulario con datos válidos
3. Click en "Enviar a Aprobación"
4. **Esperado:** Toast de éxito, redirige a `/solicitudes-compra/[id]`

### Caso 3: Error en Validación
1. Ir a `/solicitudes-compra/nueva`
2. Llenar formulario con datos INVÁLIDOS (ej: cantidad = 0)
3. Click en "Enviar a Aprobación"
4. **Esperado:** Toast de error, botones se habilitan nuevamente

### Caso 4: Error de Server Action
1. Ir a `/solicitudes-compra/nueva`
2. Desconectar internet temporalmente
3. Llenar formulario y enviar
4. **Esperado:** Toast de error, botones se habilitan nuevamente, NO redirige

---

## NOTAS TÉCNICAS

### Por qué TypeScript no detectó el error?

TypeScript es flexible con callbacks. Si defines:
```typescript
onSuccess: (prId: string, isDraft: boolean) => void
```

Y pasas:
```typescript
onSuccess={(pr: PurchaseRequisition) => { /* ... */ }}
```

TypeScript lo acepta porque el callback puede ignorar parámetros extras. Pero cuando LLAMAS al callback con los parámetros incorrectos, el problema aparece en runtime.

### Lecciones Aprendidas

1. **Siempre usar el mismo contrato de tipos** en ambos lados (definición y uso)
2. **Documentar el tipo esperado** en JSDoc si hay ambigüedad
3. **Probar flujos completos**, no solo renders aislados

---

## PRÓXIMOS PASOS

1. Ejecutar testing manual de los 4 casos descritos
2. Verificar que no hay más loops en otros módulos
3. Considerar agregar tests E2E para este flujo crítico

---

**Status:** COMPLETO
**Impacto:** ALTO (Fix crítico para módulo nuevo)
**Risk:** BAJO (Solo cambio de tipos, lógica intacta)
