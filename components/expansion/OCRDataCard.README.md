# OCRDataCard Component

Componente React para mostrar datos extraídos por OCR de documentos de corredores.

---

## Ubicación

```
components/expansion/OCRDataCard.tsx
```

## Uso

```tsx
import OCRDataCard from '@/components/expansion/OCRDataCard';
import type { DocumentoCorredor } from '@/lib/types/expansion';

// En tu componente
<OCRDataCard documento={documento} />
```

---

## Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `documento` | `DocumentoCorredor` | Documento con datos OCR (`ocr_data`, `ocr_confianza`) |

---

## Características

### 1. Visualización de Datos OCR

Muestra datos extraídos en formato legible:

```typescript
// Ejemplo de ocr_data
{
  nombres: 'JUAN CARLOS',
  apellido_paterno: 'PÉREZ',
  apellido_materno: 'GARCÍA',
  numero_documento: '12345678',
  fecha_nacimiento: '15/03/1985'
}
```

### 2. Badges de Confianza

Colores semánticos según nivel de confianza:

| Confianza | Color | Icono | Interpretación |
|-----------|-------|-------|----------------|
| ≥ 90% | Verde | ✓ CheckCircle | Excelente |
| 70-89% | Amarillo | ⚠ AlertTriangle | Revisar |
| < 70% | Rojo | ✗ XCircle | Verificar manualmente |

### 3. Configuración por Tipo de Documento

Cada tipo de documento tiene campos específicos:

#### DNI Frente
- Nombres
- Apellido Paterno
- Apellido Materno
- DNI
- Fecha Nacimiento

#### DNI Reverso
- Dirección
- Ubigeo
- Distrito
- Provincia
- Departamento

#### Recibo de Luz
- Empresa
- Dirección
- Número Suministro
- Período
- Total (formato: S/ XX.XX)

#### Declaración Jurada Dirección
- Nombre Completo
- DNI
- Dirección
- Distrito

#### Ficha RUC
- RUC
- Razón Social
- Dirección
- Estado

#### Vigencia de Poder
- RUC
- Razón Social
- Representante

#### Declaración PEP
- Nombre
- DNI
- Es PEP (Sí/No)

### 4. Iconos Emoji

Cada tipo de documento tiene su emoji representativo:

| Tipo | Emoji | Descripción |
|------|-------|-------------|
| `dni_frente` | 🪪 | Identificación |
| `dni_reverso` | 🪪 | Identificación |
| `recibo_luz` | 💡 | Electricidad |
| `declaracion_jurada_direccion` | 📄 | Documento |
| `ficha_ruc` | 🏢 | Empresa |
| `vigencia_poder` | ⚖️ | Legal |
| `declaracion_pep` | 📋 | Formulario |

---

## Diseño

### Colores

- **Primary:** `#1b967a` (EcoPlaza verde)
- **Bullets:** Círculos `#1b967a`
- **Gradiente Card:** `from-white to-gray-50`

### Estructura Visual

```
┌─────────────────────────────────────┐
│ 🪪  DNI (Frente)     [✓ 95% conf]  │
│ ─────────────────────────────────── │
│ • Nombres                           │
│   JUAN CARLOS                       │
│ • Apellido Paterno                  │
│   PÉREZ                             │
│ • DNI                               │
│   12345678                          │
└─────────────────────────────────────┘
```

### Responsive

- Mobile: 1 columna
- Desktop: 2 columnas (grid)

---

## Casos de Uso

### Caso 1: Documento con alta confianza

```tsx
const documento: DocumentoCorredor = {
  id: '123',
  tipo_documento: 'dni_frente',
  ocr_data: {
    nombres: 'JUAN',
    apellido_paterno: 'PÉREZ',
    numero_documento: '12345678'
  },
  ocr_confianza: 95,
  // ... otros campos
};

<OCRDataCard documento={documento} />
// Muestra: Badge verde "95% confianza", todos los datos extraídos
```

### Caso 2: Documento sin OCR

```tsx
const documento: DocumentoCorredor = {
  id: '456',
  tipo_documento: 'declaracion_pep',
  ocr_data: null,
  ocr_confianza: null,
  // ... otros campos
};

<OCRDataCard documento={documento} />
// No muestra nada (return null)
```

### Caso 3: Confianza baja

```tsx
const documento: DocumentoCorredor = {
  id: '789',
  tipo_documento: 'recibo_luz',
  ocr_data: {
    empresa: 'LUZ DEL SUR',
    direccion: 'AV BRASIL 123'
  },
  ocr_confianza: 65,
  // ... otros campos
};

<OCRDataCard documento={documento} />
// Muestra: Badge rojo "65% confianza" con icono ✗
```

---

## Formatters Personalizados

Puedes agregar formatters personalizados en `OCR_FIELDS_CONFIG`:

```typescript
recibo_luz: [
  { label: 'Total', key: 'total', format: (v) => `S/ ${v}` },
  { label: 'Período', key: 'periodo' }, // Sin formato
],
```

---

## Agregar Nuevo Tipo de Documento

1. Agregar configuración en `OCR_FIELDS_CONFIG`:

```typescript
nuevo_documento: [
  { label: 'Campo 1', key: 'campo1' },
  { label: 'Campo 2', key: 'campo2', format: (v) => `Formateado: ${v}` },
],
```

2. Agregar emoji en `DOCUMENTO_ICONS`:

```typescript
nuevo_documento: '📝',
```

3. (Opcional) Agregar a `DOCUMENTOS_CON_OCR` en `lib/types/expansion.ts`:

```typescript
export const DOCUMENTOS_CON_OCR: TipoDocumento[] = [
  // ... existentes
  'nuevo_documento',
];
```

---

## TypeScript

Componente completamente tipado:

```typescript
interface OCRDataCardProps {
  documento: DocumentoCorredor;
}

interface OCRFieldConfig {
  label: string;
  key: string;
  format?: (value: any) => string;
}
```

---

## Testing

### Manual (con Playwright MCP)

```typescript
// 1. Navegar a detalle de corredor
mcp__playwright__browser_navigate → http://localhost:3000/expansion/[id]

// 2. Verificar cards OCR
mcp__playwright__browser_snapshot

// 3. Screenshot
mcp__playwright__browser_take_screenshot
```

### Casos de Test

- [ ] Documento DNI frente con confianza 95% → Badge verde
- [ ] Documento recibo luz con confianza 75% → Badge amarillo
- [ ] Documento con confianza 60% → Badge rojo
- [ ] Documento sin ocr_data → No se renderiza
- [ ] Todos los campos configurados se muestran
- [ ] Campos ausentes no se muestran
- [ ] Formatter personalizado funciona (ej: S/ XX.XX)

---

## Limitaciones

1. **Sin OCR Data:** Si `ocr_data` es `null` o `{}`, el componente no se renderiza.
2. **Campos No Configurados:** Si un tipo de documento no tiene configuración, muestra JSON raw.
3. **Campos Faltantes:** Si un campo configurado no existe en `ocr_data`, se oculta (no muestra "N/A").

---

## Mejoras Futuras

- [ ] Edición inline de datos OCR
- [ ] Comparación lado a lado (OCR vs. Manual)
- [ ] Validación de consistencia entre documentos
- [ ] Histórico de cambios de OCR
- [ ] Export de datos OCR a CSV/Excel

---

## Versión

**v1.0** - 13 Enero 2026
- Primera versión estable
- Soporte para 7 tipos de documentos
- Badges de confianza con colores
- Formatters personalizables

---

## Ver También

- `app/expansion/[id]/SolicitudDetalleClient.tsx` - Uso del componente
- `lib/types/expansion.ts` - Tipos y constantes
- `docs/sesiones/SESION_91_Mejora_Vista_OCR_Corredor.md` - Documentación de sesión
