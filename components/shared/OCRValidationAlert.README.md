# OCR Validation Alert - Documentación

## Descripción

Sistema inteligente de validación que compara automáticamente los datos del formulario con los datos extraídos por OCR de los documentos DNI.

## Componentes

### 1. OCRValidationAlert.tsx
Componente visual que muestra las discrepancias detectadas entre formulario y OCR.

**Features:**
- Banner elegante con colores corporativos (amarillo/warning)
- Tabla comparativa: Formulario vs DNI (OCR)
- Botón "Usar" por campo individual
- Botón "Usar todos los datos del DNI" por persona
- Estado "Aplicado" con checkmark verde
- Modo expandible/colapsable
- Normalización de strings (case-insensitive, sin acentos)

### 2. useOCRValidation.ts
Hook personalizado que realiza la comparación inteligente.

**Lógica de comparación:**
- Normaliza strings (mayúsculas, sin acentos, trim)
- Ignora diferencias insignificantes (espacios múltiples)
- No alerta si OCR no tiene datos (falta de datos != error)
- SÍ alerta si formulario está vacío pero OCR tiene datos (campo faltante)
- Compara: nombres, apellidos, número documento, dirección, distrito, provincia, departamento

**Soporte para:**
- Titular
- Cónyuge
- Copropietarios (múltiples)

## Integración en FichaInscripcionModal

### Paso 1: Imports
```tsx
import OCRValidationAlert, { PersonDiscrepancies } from '@/components/shared/OCRValidationAlert';
import { useOCRValidation } from '@/hooks/useOCRValidation';
```

### Paso 2: Estado y Hook
```tsx
// Estado para controlar visibilidad
const [showOCRValidation, setShowOCRValidation] = useState(true);

// Hook de validación
const ocrDiscrepancies = useOCRValidation(dniPairs, formData);
```

### Paso 3: Handler para aplicar datos
```tsx
const handleApplyOCRData = (persona: string, fieldKey: string, ocrValue: string) => {
  if (fieldKey.startsWith('copropietarios.')) {
    // Lógica para copropietarios
    const match = fieldKey.match(/copropietarios\.(\d+)\.(.+)/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];
      setFormData(prev => {
        const newCopropietarios = [...(prev.copropietarios || [])];
        if (newCopropietarios[index]) {
          newCopropietarios[index] = {
            ...newCopropietarios[index],
            [field]: ocrValue,
          };
        }
        return { ...prev, copropietarios: newCopropietarios };
      });
    }
  } else {
    // Campos directos (titular_*, conyuge_*)
    setFormData(prev => ({ ...prev, [fieldKey]: ocrValue }));
  }
};
```

### Paso 4: Renderizado
```tsx
{/* Alerta de validación OCR */}
{showOCRValidation && ocrDiscrepancies.length > 0 && (
  <OCRValidationAlert
    personDiscrepancies={ocrDiscrepancies}
    onApplyOCRData={handleApplyOCRData}
    onDismiss={() => setShowOCRValidation(false)}
    defaultExpanded={true}
  />
)}
```

## Flujo de Usuario

### Caso 1: Sin discrepancias
- No se muestra ninguna alerta
- El usuario completa el formulario normalmente

### Caso 2: Con discrepancias
1. **Se carga la ficha o cambian los DNI**
2. **El hook detecta automáticamente las diferencias**
3. **Se muestra el banner amarillo:**
   ```
   ⚠️ Discrepancia detectada entre formulario y DNI
   3 campos difieren de los datos OCR
   ```
4. **El usuario puede:**
   - Ver la tabla comparativa (expandir/contraer)
   - Aplicar campo por campo con botón "Usar"
   - Aplicar todos los datos de una persona con "Usar todos los datos del DNI"
   - Ignorar la alerta (botón X)

### Caso 3: Usuario aplica corrección
1. Hace clic en "Usar" en un campo
2. El campo del formulario se actualiza automáticamente
3. El botón cambia a "✓ Aplicado" (verde)
4. La discrepancia desaparece del hook en el siguiente render

## Ejemplo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Discrepancia detectada entre formulario y DNI          ▲  ✕  │
│                                                                  │
│ Titular                         [Usar todos los datos del DNI]  │
│                                                                  │
│ Campo          │ Formulario      │ DNI (OCR)           │ Acción  │
│ ─────────────────────────────────────────────────────────────── │
│ Nombres        │ MARIA ISABEL    │ MARÍA ISABEL        │ [Usar] │
│ Ap. Paterno    │ SIERRA          │ SIERRA MENDOZA      │ [Usar] │
│ Dirección      │ (vacío)         │ JR. LOS OLIVOS 123  │ [Usar] │
│                                                                  │
│ Nota: Los datos del DNI fueron extraídos por OCR...             │
└─────────────────────────────────────────────────────────────────┘
```

## Testing

### Caso de Prueba 1: Nombres con acentos
```
Formulario: "MARIA JOSE"
OCR: "MARÍA JOSÉ"
Resultado: ✅ No hay discrepancia (normalización)
```

### Caso de Prueba 2: Campo vacío en formulario
```
Formulario: ""
OCR: "JR. LOS OLIVOS 123"
Resultado: ⚠️ Discrepancia detectada (campo faltante)
```

### Caso de Prueba 3: Espacios múltiples
```
Formulario: "SIERRA    MENDOZA"
OCR: "SIERRA MENDOZA"
Resultado: ✅ No hay discrepancia (normalización de espacios)
```

### Caso de Prueba 4: Copropietario
```
Formulario: copropietarios[0].nombres = "JUAN"
OCR: "JUAN CARLOS"
Resultado: ⚠️ Discrepancia en Copropietario 1
```

## Archivos de Test

Ubicación: `docs/test-assets/dni/`

| Archivo | Uso |
|---------|-----|
| `dni-frente-01.jpg` | DNI titular frente (real) |
| `dni-reverso-01.png` | DNI titular reverso (real) |
| `dni-sintetico-01-frente.png` | DNI sintético frente |
| `dni-sintetico-01-reverso.png` | DNI sintético reverso |

**Cómo usar:**
1. Ir a Ficha de Inscripción
2. Subir DNI desde test-assets
3. Esperar extracción OCR
4. Modificar manualmente campos del formulario para crear discrepancias
5. Observar alerta de validación

## Colores Corporativos

```css
Fondo alerta: bg-yellow-50
Border: border-yellow-400
Texto warning: text-yellow-700
Botón usar: bg-[#1b967a] hover:bg-[#156b5a]
Aplicado: text-green-600
```

## Ventajas

1. **UX Premium**: Validación no invasiva, el usuario decide
2. **Inteligente**: Normalización automática, no alerta por diferencias insignificantes
3. **Reutilizable**: Componente + hook pueden usarse en otros formularios
4. **Performance**: Hook optimizado con useMemo
5. **Accesibilidad**: Tabla semántica, colores con buen contraste

## Mantenimiento

### Agregar nuevo campo a validar
Editar `hooks/useOCRValidation.ts`:
```tsx
// Ejemplo: agregar validación de RUC
if (frenteOcr) {
  addDiscrepancy('Titular', 'RUC', 'titular_ruc', formData.titular_ruc, frenteOcr.ruc);
}
```

### Modificar lógica de normalización
Editar función `normalizeString()` en `useOCRValidation.ts`

### Cambiar diseño visual
Editar `components/shared/OCRValidationAlert.tsx`

---

**Fecha:** 4 Enero 2026
**Autor:** Frontend Developer Agent
**Versión:** 1.0
