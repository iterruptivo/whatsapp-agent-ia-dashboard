# Ejemplo de Integración: GenerarConstanciaButton

## Cómo integrar el componente en PagosPanel.tsx

### 1. Import del componente

```tsx
import GenerarConstanciaButton from './GenerarConstanciaButton';
```

### 2. Botón de Constancia de Separación

Agregar después de la línea 270 (después del botón "Registrar Monto de Separación"):

```tsx
{pagoSeparacion.estado === 'completado' && (
  <div className="mt-3">
    <GenerarConstanciaButton
      controlPagoId={controlPago.id}
      tipo="separacion"
    />
  </div>
)}
```

### 3. Botón de Constancia de Abono

Agregar dentro del loop de abonos verificados (después de la línea 307, dentro del div de verificación):

```tsx
{abono.verificado_finanzas && (
  <div className="mt-2">
    <GenerarConstanciaButton
      controlPagoId={controlPago.id}
      tipo="abono"
      abonoId={abono.id}
      className="w-full"
    />
  </div>
)}
```

### 4. Botón de Constancia de Cancelación

Agregar en la sección de stats (después del banner de "Total abonado", línea 198):

```tsx
{stats && (stats.totalVenta + stats.totalIntereses - stats.totalAbonado) === 0 && (
  <div className="mt-4 flex justify-center">
    <GenerarConstanciaButton
      controlPagoId={controlPago.id}
      tipo="cancelacion"
    />
  </div>
)}
```

## Ejemplo Completo de Sección de Separación

```tsx
{pagoSeparacion && (
  <div className="p-6 bg-white border-b">
    <div className="flex items-center justify-between mb-3">
      <div className="font-semibold text-gray-900 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-gray-600" />
        Separación
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={pagoSeparacion.estado === 'completado'}
          onChange={(e) => handleToggleSeparacion(e.target.checked)}
          className="w-4 h-4 text-[#1b967a] border-gray-300 rounded focus:ring-[#1b967a]"
        />
        <span className="text-sm font-medium text-gray-700">Pagado</span>
      </label>
    </div>

    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Monto:</span>
        <span className="font-semibold">{formatMonto(pagoSeparacion.monto_esperado)}</span>
      </div>
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(pagoSeparacion.estado)}`}>
        {getEstadoIcon(pagoSeparacion.estado)}
        {pagoSeparacion.estado}
      </div>
    </div>

    {pagoSeparacion.estado !== 'completado' && (
      <button
        onClick={() => setAbonoModal({ isOpen: true, pago: pagoSeparacion })}
        className="mt-3 w-full bg-[#1b967a] text-white py-2 px-4 rounded-lg hover:bg-[#157a63] transition-colors font-medium text-sm"
      >
        + Registrar Monto de Separación
      </button>
    )}

    {/* NUEVO: Botón de Constancia de Separación */}
    {pagoSeparacion.estado === 'completado' && (
      <div className="mt-3">
        <GenerarConstanciaButton
          controlPagoId={controlPago.id}
          tipo="separacion"
        />
      </div>
    )}

    {pagoSeparacion.abonos.length > 0 && (
      <div className="mt-3">
        <div className="text-sm font-semibold text-gray-700 mb-2">Historial de abonos de Separación</div>
        <div className="space-y-2">
          {pagoSeparacion.abonos.map((abono) => (
            <div key={abono.id} className="bg-gray-50 border rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">{formatMonto(abono.monto)}</div>
                <div className="text-gray-600">{formatFecha(abono.fecha_abono)}</div>
              </div>
              {abono.notas && <div className="text-gray-500 text-xs mt-1">{abono.notas}</div>}

              {/* Verificación Finanzas */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                {isFinanzas && !abono.verificado_finanzas ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleConfirmVerificacion(abono)}
                      className="w-4 h-4 text-[#1b967a] border-gray-300 rounded focus:ring-[#1b967a]"
                    />
                    <span className="text-xs font-medium text-gray-700">Verificar abono</span>
                  </label>
                ) : abono.verificado_finanzas ? (
                  <div className="space-y-2">
                    <div className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verificado por {abono.verificado_finanzas_nombre} el {formatFechaVerificacion(abono.verificado_finanzas_at!)}
                    </div>
                    {/* NUEVO: Botón de Constancia de Abono */}
                    <GenerarConstanciaButton
                      controlPagoId={controlPago.id}
                      tipo="abono"
                      abonoId={abono.id}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Pendiente de verificación por Finanzas</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

## Notas Importantes

1. **Validación de estado**: Asegúrate de que los botones solo se muestren cuando corresponda:
   - Separación: cuando `estado === 'completado'`
   - Abono: cuando `verificado_finanzas === true`
   - Cancelación: cuando el saldo pendiente es 0

2. **Server Actions pendientes**: El componente está listo pero necesita las siguientes funciones en `lib/actions-constancias.ts`:
   - `generateConstanciaSeparacion(controlPagoId: string): Promise<ArrayBuffer>`
   - `generateConstanciaAbono(abonoId: string): Promise<ArrayBuffer>`
   - `generateConstanciaCancelacion(controlPagoId: string): Promise<ArrayBuffer>`

3. **Estilos responsive**: El componente se adapta automáticamente al ancho disponible. Usa `className="w-full"` para hacerlo ocupar todo el ancho del contenedor.

4. **Accesibilidad**: Todos los botones tienen `aria-label` apropiados para lectores de pantalla.
