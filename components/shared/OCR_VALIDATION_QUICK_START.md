# OCR Validation Alert - Quick Start Guide

## 1 Minuto: Lo Esencial

### Qué hace
Compara datos del formulario vs DNI (OCR) y muestra un banner amarillo si hay diferencias.

### Dónde está
`FichaInscripcionModal.tsx` → Sección "Datos del Titular"

### Cómo funciona
1. Usuario sube DNI → OCR extrae datos → Autocompleta formulario
2. Si usuario modifica campos manualmente → Sistema detecta diferencia
3. Aparece banner amarillo → Usuario puede aplicar datos del DNI con 1 clic

---

## 5 Minutos: Cómo Probar

### Paso 1: Abrir Ficha
```
http://localhost:3000/locales → Buscar local DISPONIBLE → Abrir Ficha
```

### Paso 2: Subir DNI
```
DNI Titular:
- Frente: docs/test-assets/dni/dni-sintetico-01-frente.png
- Reverso: docs/test-assets/dni/dni-sintetico-01-reverso.png
```

### Paso 3: Crear Discrepancia
```
Modificar manualmente:
- Nombres: "JUAN CARLOS" → "JUAN"
- Dirección: "AV. HEROES 123" → (vacío)
```

### Paso 4: Ver Alerta
```
Scroll hasta "Datos del Titular" → Banner amarillo aparece
```

### Paso 5: Aplicar Corrección
```
Clic en "Usar todos los datos del DNI" → Campos se corrigen → Alerta desaparece
```

---

## 10 Minutos: Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                FichaInscripcionModal                    │
│                                                         │
│  const [dniPairs, setDniPairs] = useState<DNIPair[]>   │
│  const [formData, setFormData] = useState<FormData>    │
│                                                         │
│  // Hook de validación                                 │
│  const discrepancies = useOCRValidation(dniPairs, formData)
│         │                                               │
│         │ useMemo(() => {                              │
│         │   // Para cada persona (titular, cónyuge...)│
│         │   if (isDifferent(formData.nombres, ocr.nombres))
│         │     addDiscrepancy(...)                      │
│         │ })                                           │
│         │                                               │
│         ▼                                               │
│  {discrepancies.length > 0 && (                        │
│    <OCRValidationAlert                                 │
│      personDiscrepancies={discrepancies}               │
│      onApplyOCRData={(persona, field, value) => {      │
│        setFormData({ ...formData, [field]: value })   │
│      }}                                                │
│    />                                                  │
│  )}                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 15 Minutos: Componentes

### OCRValidationAlert.tsx
```tsx
interface PersonDiscrepancies {
  persona: 'Titular' | 'Cónyuge' | 'Copropietario 1';
  discrepancies: Array<{
    label: string;        // "Nombres"
    formValue: string;    // "JUAN"
    ocrValue: string;     // "JUAN CARLOS"
    fieldKey: string;     // "titular_nombres"
  }>;
}

Props:
- personDiscrepancies: PersonDiscrepancies[]
- onApplyOCRData: (persona, fieldKey, ocrValue) => void
- onDismiss: () => void
- defaultExpanded?: boolean
```

### useOCRValidation.ts
```tsx
function useOCRValidation(
  dniPairs: DNIPair[],
  formData: FormDataForValidation
): PersonDiscrepancies[] {

  // Normalizar: mayúsculas, sin acentos, trim
  normalizeString("MARÍA") === normalizeString("maria")

  // Comparar
  if (isDifferent(formData.nombres, ocr.nombres)) {
    addDiscrepancy('Titular', 'Nombres', 'titular_nombres', ...)
  }

  return discrepancies;
}
```

---

## 20 Minutos: Casos de Uso

### Caso 1: Happy Path
```
1. Usuario sube DNI
2. OCR autocompleta formulario
3. No hay discrepancias → Sin alerta
4. Usuario guarda ficha
```

### Caso 2: Corrección Manual
```
1. Usuario sube DNI
2. OCR autocompleta "JUAN CARLOS"
3. Usuario cambia a "JUAN"
4. Alerta aparece
5. Usuario clic "Usar" → Vuelve a "JUAN CARLOS"
6. Alerta desaparece
```

### Caso 3: Campo Faltante
```
1. Usuario sube DNI
2. OCR extrae "AV. HEROES 123" en dirección
3. Usuario no llenó dirección (vacío)
4. Alerta aparece: "Dirección: (vacío) → AV. HEROES 123"
5. Usuario clic "Usar" → Campo se completa
```

### Caso 4: Normalización
```
1. OCR: "MARÍA JOSÉ"
2. Usuario escribe: "maria jose"
3. Sistema normaliza ambos → Son iguales
4. NO aparece alerta (evita falsos positivos)
```

---

## 30 Minutos: Personalización

### Cambiar Colores
```tsx
// OCRValidationAlert.tsx

// Banner
className="bg-yellow-50 border-yellow-400"

// Botón Usar
className="bg-[#1b967a] hover:bg-[#156b5a]"

// Estado Aplicado
className="text-green-600"
```

### Agregar Nuevo Campo a Validar
```tsx
// hooks/useOCRValidation.ts

// Línea ~135
if (isDNIFrenteOCR(frenteData)) {
  addDiscrepancy('Titular', 'RUC', 'titular_ruc',
    formData.titular_ruc, frenteData.ruc);
}
```

### Cambiar Lógica de Normalización
```tsx
// hooks/useOCRValidation.ts

function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Acentos
    .replace(/\s+/g, ' ')             // Espacios
    .replace(/[^A-Z0-9\s]/g, '')      // Solo alfanuméricos (nuevo)
    .trim();
}
```

---

## 45 Minutos: Troubleshooting

### Alerta no aparece cuando debería

**Causa:** Hook no detecta diferencias
**Solución:**
```tsx
// Agregar console.log en useOCRValidation.ts
console.log('FormData:', formData.titular_nombres);
console.log('OCR:', frenteData.nombres);
console.log('Normalized Form:', normalizeString(formData.titular_nombres));
console.log('Normalized OCR:', normalizeString(frenteData.nombres));
```

### Alerta aparece cuando no debería (falso positivo)

**Causa:** Normalización insuficiente
**Solución:**
```tsx
// Mejorar normalizeString() para casos especiales
// Ejemplo: "O'CONNOR" vs "OCONNOR"
.replace(/'/g, '') // Eliminar apóstrofes
```

### Botón "Usar" no funciona

**Causa:** handleApplyOCRData no actualiza formData
**Solución:**
```tsx
// Verificar en DevTools Console
const handleApplyOCRData = (persona, fieldKey, ocrValue) => {
  console.log('Applying:', { persona, fieldKey, ocrValue });
  setFormData(prev => {
    const updated = { ...prev, [fieldKey]: ocrValue };
    console.log('Updated formData:', updated);
    return updated;
  });
};
```

### Performance lenta

**Causa:** useMemo no está optimizando
**Solución:**
```tsx
// Verificar dependencias del hook
const ocrDiscrepancies = useOCRValidation(dniPairs, formData);
// ↑ Se recalcula solo cuando cambian dniPairs o formData
```

---

## 60 Minutos: Extensiones Avanzadas

### 1. Validación con RENIEC API
```tsx
// Agregar validación oficial
const validarConRENIEC = async (dni: string) => {
  const response = await fetch(`/api/reniec/${dni}`);
  const oficial = await response.json();

  if (oficial.nombres !== formData.titular_nombres) {
    // Mostrar alerta de discrepancia con RENIEC
  }
};
```

### 2. Historial de Correcciones
```tsx
// Guardar en base de datos
interface CorreccionOCR {
  campo: string;
  valorOriginal: string;
  valorOCR: string;
  valorFinal: string;
  timestamp: Date;
  usuario_id: string;
}

// Al aplicar corrección
await insertCorreccionOCR({
  campo: 'titular_nombres',
  valorOriginal: formData.titular_nombres,
  valorOCR: ocrValue,
  valorFinal: ocrValue,
  ...
});
```

### 3. Alertas Inteligentes por Confianza OCR
```tsx
// Solo alertar si confianza OCR es alta
if (frenteData.confianza >= 90) {
  addDiscrepancy(...);
} else {
  // Confianza baja, no alertar
  console.warn('OCR confianza baja:', frenteData.confianza);
}
```

---

## Recursos

| Recurso | Archivo |
|---------|---------|
| Documentación técnica | `OCRValidationAlert.README.md` |
| Guía de testing | `TESTING_OCR_VALIDATION.md` |
| Checklist validación | `VALIDATION_CHECKLIST.md` |
| Resumen ejecutivo | `FEATURE_OCR_VALIDATION_SUMMARY.md` |
| Este documento | `OCR_VALIDATION_QUICK_START.md` |

---

## Stack

- React 19 + TypeScript
- Tailwind CSS
- Lucide React Icons
- Next.js 15.5

---

## Contacto

**Desarrollador:** Frontend Developer Agent
**Fecha:** 4 Enero 2026
**Versión:** 1.0

---

## Licencia

Parte del proyecto EcoPlaza Dashboard
Uso interno de ECOPLAZA
