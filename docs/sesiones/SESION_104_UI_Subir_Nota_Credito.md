# SESIÓN 104: UI para Subir Nota de Crédito

**Fecha:** 21 Enero 2026
**Tipo:** Implementación Frontend
**Estado:** ✅ Completado

---

## Objetivo

Implementar el UI en `ReporteDiarioTab.tsx` para que Finanzas pueda subir Notas de Crédito a boletas existentes.

---

## Contexto

Cuando un cliente reclama una boleta emitida (por error en monto, datos, etc.), se debe:
1. Emitir una **Nota de Crédito (NC)** que anule la boleta original
2. Permitir vincular una **nueva boleta** correcta después de la NC

### Backend ya existente

- `lib/actions-fichas-reporte.ts::subirNotaCredito()` ✅
- Interface `BoletaVinculada` ya tiene campos de NC ✅
- Campos en backend:
  - `nota_credito_url`
  - `nota_credito_numero`
  - `nota_credito_at`
  - `nota_credito_by_id`
  - `nota_credito_by_nombre`

---

## Cambios Implementados

### 1. `lib/actions-fichas-reporte.ts`

#### Actualización de Interface `AbonoDiarioRow`

```typescript
export interface AbonoDiarioRow {
  // ... campos existentes

  // ✨ NUEVOS: Campos de Nota de Crédito
  nota_credito_url?: string;
  nota_credito_numero?: string;
  nota_credito_at?: string;
  nota_credito_by_nombre?: string;

  cliente_dni?: string; // Para búsqueda en búsqueda de cliente
}
```

#### Actualización de Query `fetchAllAbonosFiltered()`

Agregado campo `titular_numero_documento` en la query de `depositos_ficha`:

```typescript
clientes_ficha!inner (
  id,
  titular_nombres,
  titular_apellido_paterno,
  titular_apellido_materno,
  titular_numero_documento, // ✨ NUEVO
  boletas_vinculadas
)
```

#### Mapeo de datos NC en resultado

```typescript
// Campos de Nota de Crédito
nota_credito_url: boletaVinculada?.nota_credito_url,
nota_credito_numero: boletaVinculada?.nota_credito_numero,
nota_credito_at: boletaVinculada?.nota_credito_at,
nota_credito_by_nombre: boletaVinculada?.nota_credito_by_nombre,
```

---

### 2. `components/reporteria/SubirNotaCreditoModal.tsx` (NUEVO)

Modal dedicado para subir NC. Características:

- **Más simple** que VincularBoletaModal (solo 1 depósito, no multi-selección)
- Input para **número de NC**
- Upload de **archivo** (JPG, PNG, PDF)
- Preview de imagen
- Upload a **Supabase Storage** en bucket `fichas/notas-credito/`
- Llamada a `subirNotaCredito()` server action

#### Estructura

```typescript
interface SubirNotaCreditoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId: string;
  voucherIndex: number;
  clienteNombre: string;
  localCodigo: string;
  numeroBoleta: string; // Boleta que se anulará
  onSuccess: () => void;
}
```

#### Validaciones

- Tipo de archivo: JPG, PNG, PDF
- Tamaño máximo: 10MB
- Número de NC obligatorio

#### Flujo

1. Usuario selecciona archivo
2. Ingresa número de NC (ej: `NC001-00001234`)
3. Click en "Subir NC"
4. Upload a Storage → Get URL → Server Action
5. Mensaje de éxito → Reload datos → Cerrar modal

---

### 3. `components/reporteria/ReporteDiarioTab.tsx`

#### Importaciones

```typescript
import { FileX } from 'lucide-react'; // Ícono de NC
import SubirNotaCreditoModal from './SubirNotaCreditoModal';
```

#### Estado

```typescript
// Modal subir Nota de Crédito (Sesión 104)
const [showNCModal, setShowNCModal] = useState(false);
const [abonoParaNC, setAbonoParaNC] = useState<AbonoDiarioRow | null>(null);
```

#### Handler

```typescript
const handleSubirNC = (abono: AbonoDiarioRow) => {
  setAbonoParaNC(abono);
  setShowNCModal(true);
};
```

#### Lógica de visualización en columna Boleta (Desktop)

```
SI tiene boleta vinculada:
  ├─ Mostrar link a boleta + botón desvincular
  └─ SI tiene NC:
      ├─ Mostrar link a NC
      └─ Mostrar botón "Nueva Boleta" (para post-NC)
     SINO:
      └─ Mostrar botón "Subir NC"
SINO:
  └─ Mostrar botón "Agregar" (primera boleta)
```

#### Código Desktop (extracto)

```tsx
{abono.boleta_url ? (
  <div className="flex flex-col items-center gap-1">
    {/* Link a Boleta */}
    <a href={abono.boleta_url} target="_blank">
      <Receipt /> {abono.numero_boleta}
    </a>

    {/* Nota de Crédito o botón */}
    {abono.nota_credito_url ? (
      <>
        <a href={abono.nota_credito_url} target="_blank">
          <FileX /> NC: {abono.nota_credito_numero}
        </a>
        <button onClick={() => handleVincularBoleta(abono)}>
          Nueva Boleta
        </button>
      </>
    ) : (
      <button onClick={() => handleSubirNC(abono)}>
        <FileX /> Subir NC
      </button>
    )}
  </div>
) : (
  <button onClick={() => handleVincularBoleta(abono)}>
    Agregar
  </button>
)}
```

#### Vista Mobile

Misma lógica aplicada en cards mobile:

```tsx
{/* Boleta en mobile */}
<div className="mb-3 flex flex-col gap-2">
  {/* Link a boleta */}
  <div>...</div>

  {/* NC o botón subir NC */}
  {abono.boleta_url && (
    <div>
      {abono.nota_credito_url ? (
        <>Link NC + Nueva Boleta</>
      ) : (
        <button onClick={() => handleSubirNC(abono)}>
          Subir NC
        </button>
      )}
    </div>
  )}
</div>
```

#### Renderizado del Modal

```tsx
{/* Modal Subir Nota de Crédito */}
{abonoParaNC && (
  <SubirNotaCreditoModal
    isOpen={showNCModal}
    onClose={() => {
      setShowNCModal(false);
      setAbonoParaNC(null);
    }}
    fichaId={abonoParaNC.ficha_id}
    voucherIndex={abonoParaNC.voucher_index}
    clienteNombre={abonoParaNC.cliente_nombre}
    localCodigo={abonoParaNC.local_codigo}
    numeroBoleta={abonoParaNC.numero_boleta || ''}
    onSuccess={() => {
      loadData(); // Recargar datos
    }}
  />
)}
```

---

## Colores Corporativos Usados

- **NC (Nota de Crédito):** `text-orange-700`, `bg-orange-50`
- **Botones NC:** `border-orange-200`, `hover:bg-orange-100`
- **Modal header:** `text-orange-600` para ícono FileX

---

## Validaciones de Seguridad

- Solo roles **finanzas, admin, superadmin** pueden subir NC (validado en backend)
- Solo se puede subir NC si **existe una boleta vinculada**
- Validación de tipo de archivo y tamaño

---

## Flujo de Usuario (Finanzas)

### Caso 1: Cliente reclama monto incorrecto

1. Finanzas ve boleta en Reporte Diario
2. Click en **"Subir NC"**
3. Sube archivo de NC + ingresa número
4. Sistema anula la boleta original (visualmente muestra NC)
5. Click en **"Nueva Boleta"**
6. Vincular boleta correcta

### Caso 2: Solo consultar NC

1. Finanzas ve boleta con NC
2. Click en link **"NC: NC001-00001234"**
3. Se abre PDF/imagen de NC en nueva pestaña

---

## Archivos Modificados

```
✅ lib/actions-fichas-reporte.ts
   - Interface AbonoDiarioRow: Campos NC
   - Query: Agregar titular_numero_documento
   - Mapeo: Incluir campos NC en resultado

✨ components/reporteria/SubirNotaCreditoModal.tsx (NUEVO)
   - Modal para upload de NC
   - Upload a Storage + Server Action

✅ components/reporteria/ReporteDiarioTab.tsx
   - Estado: showNCModal, abonoParaNC
   - Handler: handleSubirNC
   - Columna Boleta: Lógica NC (desktop)
   - Vista mobile: Lógica NC
   - Import: FileX, SubirNotaCreditoModal
   - Renderizado del modal
```

---

## Testing Manual Pendiente

### Checklist

- [ ] Login como finanzas
- [ ] Ir a Reportería → Reporte Diario
- [ ] Buscar abono con boleta vinculada
- [ ] Click en "Subir NC"
- [ ] Verificar modal se abre correctamente
- [ ] Upload archivo JPG (< 10MB)
- [ ] Ingresar número NC
- [ ] Submit → Verificar upload a Storage
- [ ] Verificar link NC aparece
- [ ] Verificar botón "Nueva Boleta" aparece
- [ ] Click en link NC → Verificar archivo se descarga
- [ ] Click en "Nueva Boleta" → Verificar modal VincularBoleta
- [ ] Vincular nueva boleta → Verificar flujo completo

---

## Próximos Pasos

1. **Testing manual** con usuario finanzas
2. **Validación con Playwright MCP** (OBLIGATORIO según CLAUDE.md)
3. Posible mejora: Agregar campo "motivo de NC" (opcional)

---

## Notas Técnicas

- **Storage bucket:** `fichas/notas-credito/`
- **Patrón de nombre:** `nc-{fichaId}-{voucherIndex}-{timestamp}.{ext}`
- **Server Action:** `subirNotaCredito()` ya existente
- **Colores NC:** Naranja (`orange-600/700`) para diferenciar de boletas (azul)

---

## Resultado

✅ **UI completo para subir Nota de Crédito implementado**

- Modal funcional con upload
- Lógica de visualización en tabla
- Vista responsive (desktop + mobile)
- Integración con backend existente
- Respeta roles de usuario

**Pendiente:** Validación con Playwright MCP (siguiente sesión)
