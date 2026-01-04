# GenerarConstanciaButton Component

## Descripción

Componente React que muestra botones contextuales para generar constancias (documentos .docx) según el estado del pago. Soporta tres tipos de constancias: Separación, Abono, y Cancelación.

## Ubicación

`components/control-pagos/GenerarConstanciaButton.tsx`

## Props

```typescript
interface GenerarConstanciaButtonProps {
  controlPagoId: string;      // ID del control de pago
  tipo: 'separacion' | 'abono' | 'cancelacion'; // Tipo de constancia
  abonoId?: string;           // ID del abono (solo para tipo 'abono')
  disabled?: boolean;         // Deshabilitar el botón
  className?: string;         // Clases CSS adicionales
}
```

## Tipos de Constancia

### 1. Separación
- **Cuándo mostrar**: `separacion_pagada === true`
- **Color**: Teal (teal-600/teal-700)
- **Server Action**: `generateConstanciaSeparacion(controlPagoId)`

### 2. Abono
- **Cuándo mostrar**: Para cada abono verificado que NO sea separación
- **Color**: Azul (blue-600/blue-700)
- **Server Action**: `generateConstanciaAbono(abonoId)`
- **Nota**: Requiere `abonoId` en props

### 3. Cancelación
- **Cuándo mostrar**: `saldo_pendiente === 0`
- **Color**: Verde oscuro (green-700/green-800)
- **Server Action**: `generateConstanciaCancelacion(controlPagoId)`

## Uso Básico

```tsx
import GenerarConstanciaButton from '@/components/control-pagos/GenerarConstanciaButton';

// Constancia de Separación
<GenerarConstanciaButton
  controlPagoId="ctrl-pago-123"
  tipo="separacion"
/>

// Constancia de Abono
<GenerarConstanciaButton
  controlPagoId="ctrl-pago-123"
  tipo="abono"
  abonoId="abono-456"
/>

// Constancia de Cancelación
<GenerarConstanciaButton
  controlPagoId="ctrl-pago-123"
  tipo="cancelacion"
/>

// Con estilos personalizados
<GenerarConstanciaButton
  controlPagoId="ctrl-pago-123"
  tipo="abono"
  abonoId="abono-789"
  className="w-full mt-2"
  disabled={false}
/>
```

## Integración en PagosPanel

Ver archivo `EXAMPLE_INTEGRATION.md` para ejemplos completos de cómo integrar en el componente `PagosPanel.tsx`.

### Ejemplo Rápido

```tsx
{/* Después de verificar un abono */}
{abono.verificado_finanzas && (
  <GenerarConstanciaButton
    controlPagoId={controlPago.id}
    tipo="abono"
    abonoId={abono.id}
    className="w-full mt-2"
  />
)}
```

## Funcionalidades

### Estados del Botón

- **Normal**: Muestra icono de documento + texto + icono de descarga
- **Loading**: Muestra spinner animado + texto "Generando..."
- **Disabled**: Opacidad reducida, cursor bloqueado

### Manejo de Errores

El componente muestra un modal `AlertModal` cuando:
- Ocurre un error al generar la constancia
- La generación es exitosa (confirmación)

### Descarga del Archivo

Al generar exitosamente:
1. Crea un Blob con el contenido del .docx
2. Genera una URL temporal
3. Crea un elemento `<a>` para descargar
4. Nombre del archivo: `constancia-{tipo}-{timestamp}.docx`
5. Limpia la URL temporal después de la descarga

## Server Actions Requeridas

El componente espera las siguientes funciones en `lib/actions-constancias.ts`:

```typescript
// lib/actions-constancias.ts
'use server';

export async function generateConstanciaSeparacion(
  controlPagoId: string
): Promise<ArrayBuffer> {
  // Implementación pendiente
}

export async function generateConstanciaAbono(
  abonoId: string
): Promise<ArrayBuffer> {
  // Implementación pendiente
}

export async function generateConstanciaCancelacion(
  controlPagoId: string
): Promise<ArrayBuffer> {
  // Implementación pendiente
}
```

## Accesibilidad

- Cada botón tiene `aria-label` descriptivo
- Estados disabled correctamente manejados
- Indicadores visuales de loading
- Focus states con `focus:ring`

## Estilos

### Variantes de Color

```tsx
// Separación
className="bg-teal-600 hover:bg-teal-700 focus:ring-teal-500"

// Abono
className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"

// Cancelación
className="bg-green-700 hover:bg-green-800 focus:ring-green-600"
```

### Responsive

El componente se adapta automáticamente al contenedor. Para hacerlo full-width:

```tsx
<GenerarConstanciaButton
  tipo="abono"
  abonoId="123"
  className="w-full"
/>
```

## Testing

Página de prueba disponible en: `/test-constancia-button`

```bash
# Navegar en el navegador
http://localhost:3000/test-constancia-button
```

La página de prueba muestra:
- Todos los tipos de botones
- Estados disabled
- Comparación visual lado a lado
- Paleta de colores utilizada
- Notas de implementación

## Dependencias

```json
{
  "lucide-react": "^0.x.x",  // Iconos: FileText, Download, Loader2
  "@/components/shared/AlertModal": "latest"  // Modal de alertas
}
```

## Estado Actual

**ESTADO**: Componente completo y funcional

**PENDIENTE**:
- Implementar server actions en `lib/actions-constancias.ts`
- Conectar con generación real de documentos .docx
- Integrar en `PagosPanel.tsx`

## Ejemplos Visuales

### Normal
![Botón Normal](docs/screenshots/constancia-button-normal.png) *(pendiente)*

### Loading
![Botón Loading](docs/screenshots/constancia-button-loading.png) *(pendiente)*

### Disabled
![Botón Disabled](docs/screenshots/constancia-button-disabled.png) *(pendiente)*

## Changelog

### v1.0.0 (2025-01-01)
- Componente inicial creado
- Soporte para 3 tipos de constancias
- Manejo de estados (normal, loading, disabled)
- Descarga automática de archivos
- Modal de alertas integrado
- Página de prueba creada
- Documentación completa

---

**Autor**: Claude Code
**Última actualización**: 2025-01-01
**Versión**: 1.0.0
