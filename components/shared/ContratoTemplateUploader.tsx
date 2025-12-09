// ============================================================================
// COMPONENT: ContratoTemplateUploader
// ============================================================================
// Descripción: Uploader para templates de contrato Word (.docx)
// Sesión: 66
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

interface ContratoTemplateUploaderProps {
  currentTemplateUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  disabled?: boolean;
}

export default function ContratoTemplateUploader({
  currentTemplateUrl,
  onUpload,
  onDelete,
  disabled = false,
}: ContratoTemplateUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Solo se permiten archivos Word (.docx)');
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar 10MB');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      await onUpload(file);
      setSuccess('Template subido correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir template');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteClick = () => {
    if (!onDelete || !currentTemplateUrl) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;

    setShowDeleteConfirm(false);
    setError(null);
    setSuccess(null);
    setIsDeleting(true);

    try {
      await onDelete();
      setSuccess('Template eliminado');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar template');
    } finally {
      setIsDeleting(false);
    }
  };

  // currentTemplateUrl ahora es solo el nombre del archivo (no URL completa)
  const getFileName = (fileName: string) => {
    // Si por alguna razón viene una URL, extraer el nombre
    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      return parts[parts.length - 1];
    }
    return fileName;
  };

  return (
    <div className="space-y-3">
      {/* Template actual */}
      {currentTemplateUrl ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Template configurado</p>
              <p className="text-xs text-green-600 truncate max-w-[200px]">
                {getFileName(currentTemplateUrl)}
              </p>
            </div>
          </div>
          {/* Botón eliminar (descarga no disponible en bucket privado) */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={disabled || isDeleting}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              title="Eliminar template"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Sin template configurado</p>
              <p className="text-xs text-gray-400">Sube un archivo .docx con las variables</p>
            </div>
          </div>
        </div>
      )}

      {/* Botón de upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {currentTemplateUrl ? 'Reemplazar Template' : 'Subir Template (.docx)'}
            </>
          )}
        </button>
      </div>

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Botón para ver variables */}
      <button
        type="button"
        onClick={() => setShowVariablesModal(true)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Info className="w-4 h-4" />
        <span>Ver todas las variables disponibles para el template</span>
      </button>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-orange-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-700">Confirmar eliminación</h3>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700">
                ¿Eliminar template de contrato?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Los contratos generados previamente no se verán afectados.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de variables */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
              <h3 className="text-lg font-semibold">Variables Disponibles para Template de Contrato</h3>
              <button
                onClick={() => setShowVariablesModal(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-4 overflow-y-auto flex-1 space-y-6 text-sm">
              {/* Instrucciones */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  <strong>Sintaxis:</strong> Use <code className="bg-yellow-100 px-1 rounded">{'{variable}'}</code> para valores,
                  <code className="bg-yellow-100 px-1 rounded ml-1">{'{#condicion}...{/condicion}'}</code> para condicionales, y
                  <code className="bg-yellow-100 px-1 rounded ml-1">{'{#array}...{/array}'}</code> para listas/tablas.
                </p>
              </div>

              {/* Fecha del Contrato */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">📅 Fecha del Contrato</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{fecha_contrato}'}</code> - Fecha DD/MM/YYYY</div>
                  <div><code>{'{fecha_contrato_texto}'}</code> - Fecha en letras</div>
                </div>
              </section>

              {/* Proyecto */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">🏢 Datos del Proyecto</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{proyecto_nombre}'}</code></div>
                  <div><code>{'{razon_social}'}</code></div>
                  <div><code>{'{ruc}'}</code></div>
                  <div><code>{'{domicilio_fiscal}'}</code></div>
                  <div><code>{'{ubicacion_terreno}'}</code></div>
                  <div><code>{'{partida_electronica}'}</code></div>
                  <div><code>{'{zona_registral}'}</code></div>
                </div>
              </section>

              {/* Representante Legal */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">👔 Representante Legal</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{representante_nombre}'}</code></div>
                  <div><code>{'{representante_dni}'}</code></div>
                  <div><code>{'{representante_cargo}'}</code></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Para múltiples representantes use: <code className="bg-gray-100 px-1">{'{#representantes_legales}{nombre}, {dni}, {cargo}{/representantes_legales}'}</code>
                </p>
              </section>

              {/* Cuentas Bancarias */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">🏦 Cuentas Bancarias</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Para listar cuentas use: <code className="bg-gray-100 px-1">{'{#cuentas_bancarias}{banco} - {tipo} {moneda}: {numero}{/cuentas_bancarias}'}</code>
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{banco}'}</code> - Nombre del banco</div>
                  <div><code>{'{numero}'}</code> - Número de cuenta</div>
                  <div><code>{'{tipo}'}</code> - Corriente/Ahorros</div>
                  <div><code>{'{moneda}'}</code> - USD/PEN</div>
                </div>
              </section>

              {/* Titular */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">👤 Datos del Titular</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{titular_nombres}'}</code></div>
                  <div><code>{'{titular_apellido_paterno}'}</code></div>
                  <div><code>{'{titular_apellido_materno}'}</code></div>
                  <div><code>{'{titular_nombre_completo}'}</code></div>
                  <div><code>{'{titular_tipo_documento}'}</code></div>
                  <div><code>{'{titular_numero_documento}'}</code></div>
                  <div><code>{'{titular_fecha_nacimiento}'}</code></div>
                  <div><code>{'{titular_lugar_nacimiento}'}</code></div>
                  <div><code>{'{titular_estado_civil}'}</code></div>
                  <div><code>{'{titular_nacionalidad}'}</code></div>
                  <div><code>{'{titular_direccion}'}</code></div>
                  <div><code>{'{titular_distrito}'}</code></div>
                  <div><code>{'{titular_provincia}'}</code></div>
                  <div><code>{'{titular_departamento}'}</code></div>
                  <div><code>{'{titular_direccion_completa}'}</code></div>
                  <div><code>{'{titular_celular}'}</code></div>
                  <div><code>{'{titular_telefono_fijo}'}</code></div>
                  <div><code>{'{titular_email}'}</code></div>
                  <div><code>{'{titular_ocupacion}'}</code></div>
                  <div><code>{'{titular_centro_trabajo}'}</code></div>
                  <div><code>{'{titular_ruc}'}</code></div>
                </div>
              </section>

              {/* Cónyuge */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">👫 Datos del Cónyuge (Condicional)</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Use <code className="bg-gray-100 px-1">{'{#tiene_conyuge}...{/tiene_conyuge}'}</code> para mostrar solo si hay cónyuge
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{tiene_conyuge}'}</code> - true/false</div>
                  <div><code>{'{conyuge_nombres}'}</code></div>
                  <div><code>{'{conyuge_apellido_paterno}'}</code></div>
                  <div><code>{'{conyuge_apellido_materno}'}</code></div>
                  <div><code>{'{conyuge_nombre_completo}'}</code></div>
                  <div><code>{'{conyuge_tipo_documento}'}</code></div>
                  <div><code>{'{conyuge_numero_documento}'}</code></div>
                  <div><code>{'{conyuge_fecha_nacimiento}'}</code></div>
                  <div><code>{'{conyuge_lugar_nacimiento}'}</code></div>
                  <div><code>{'{conyuge_nacionalidad}'}</code></div>
                  <div><code>{'{conyuge_ocupacion}'}</code></div>
                  <div><code>{'{conyuge_celular}'}</code></div>
                  <div><code>{'{conyuge_email}'}</code></div>
                </div>
              </section>

              {/* Local */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">🏠 Datos del Local</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{codigo_local}'}</code></div>
                  <div><code>{'{metraje}'}</code> - Número</div>
                  <div><code>{'{metraje_texto}'}</code> - En letras</div>
                </div>
              </section>

              {/* Montos USD */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">💵 Montos en USD</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{monto_venta}'}</code> - Número</div>
                  <div><code>{'{monto_venta_texto}'}</code> - En letras</div>
                  <div><code>{'{monto_separacion}'}</code></div>
                  <div><code>{'{monto_separacion_texto}'}</code></div>
                  <div><code>{'{cuota_inicial}'}</code></div>
                  <div><code>{'{cuota_inicial_texto}'}</code></div>
                  <div><code>{'{saldo_financiar}'}</code></div>
                  <div><code>{'{saldo_financiar_texto}'}</code></div>
                </div>
              </section>

              {/* Montos PEN */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">💰 Montos en Soles (PEN)</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{monto_venta_pen}'}</code></div>
                  <div><code>{'{monto_venta_pen_texto}'}</code></div>
                  <div><code>{'{monto_separacion_pen}'}</code></div>
                  <div><code>{'{monto_separacion_pen_texto}'}</code></div>
                  <div><code>{'{cuota_inicial_pen}'}</code></div>
                  <div><code>{'{cuota_inicial_pen_texto}'}</code></div>
                  <div><code>{'{saldo_financiar_pen}'}</code></div>
                  <div><code>{'{saldo_financiar_pen_texto}'}</code></div>
                </div>
              </section>

              {/* Tipo de Cambio */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">💱 Tipo de Cambio</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{tipo_cambio}'}</code> - Número (ej: 3.80)</div>
                  <div><code>{'{tipo_cambio_texto}'}</code> - En letras</div>
                </div>
              </section>

              {/* Financiamiento */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">📊 Financiamiento</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{con_financiamiento}'}</code> - true/false</div>
                  <div><code>{'{porcentaje_inicial}'}</code></div>
                  <div><code>{'{porcentaje_inicial_texto}'}</code></div>
                  <div><code>{'{numero_cuotas}'}</code></div>
                  <div><code>{'{numero_cuotas_texto}'}</code></div>
                  <div><code>{'{cuota_mensual}'}</code> - USD</div>
                  <div><code>{'{cuota_mensual_texto}'}</code></div>
                  <div><code>{'{cuota_mensual_pen}'}</code> - PEN</div>
                  <div><code>{'{cuota_mensual_pen_texto}'}</code></div>
                  <div><code>{'{tea}'}</code> - Tasa efectiva anual</div>
                  <div><code>{'{dia_pago}'}</code> - Día del mes</div>
                  <div><code>{'{dia_pago_texto}'}</code></div>
                </div>
              </section>

              {/* Fechas de Pago */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">📆 Fechas de Pago</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{fecha_inicio_pago}'}</code> - DD/MM/YYYY</div>
                  <div><code>{'{fecha_inicio_pago_texto}'}</code></div>
                  <div><code>{'{fecha_ultima_cuota}'}</code></div>
                  <div><code>{'{fecha_ultima_cuota_texto}'}</code></div>
                </div>
              </section>

              {/* Penalidad y Plazos */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">⚠️ Penalidad y Plazos</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-gray-50 p-3 rounded">
                  <div><code>{'{plazo_firma_dias}'}</code></div>
                  <div><code>{'{plazo_firma_dias_texto}'}</code></div>
                  <div><code>{'{penalidad_porcentaje}'}</code></div>
                  <div><code>{'{penalidad_porcentaje_texto}'}</code></div>
                </div>
              </section>

              {/* Tablas Condicionales */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">📋 Tablas de Amortización (Condicionales)</h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-blue-800 mb-1">Sistema Francés (con interés):</p>
                    <code className="text-blue-700">{'{#es_frances}'}</code>
                    <p className="text-blue-600 mt-1">...tabla con columnas interes, amortizacion, saldo...</p>
                    <code className="text-blue-700">{'{/es_frances}'}</code>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold text-green-800 mb-1">Sistema Simple (sin interés):</p>
                    <code className="text-green-700">{'{#es_simple}'}</code>
                    <p className="text-green-600 mt-1">...tabla simple solo con cuota y fecha...</p>
                    <code className="text-green-700">{'{/es_simple}'}</code>
                  </div>
                </div>
              </section>

              {/* Calendario de Cuotas */}
              <section>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">📅 Calendario de Cuotas (Loop)</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Para generar la tabla de cuotas use:
                </p>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded font-mono text-xs">
                  <code className="text-purple-700">{'{#calendario_cuotas}'}</code>
                  <div className="pl-4 text-purple-600 my-1">
                    <div><code>{'{numero}'}</code> - Número de cuota (1, 2, 3...)</div>
                    <div><code>{'{fecha}'}</code> - Fecha DD/MM/YYYY</div>
                    <div><code>{'{cuota}'}</code> - Monto de la cuota</div>
                    <div><code>{'{interes}'}</code> - Interés (sistema francés)</div>
                    <div><code>{'{amortizacion}'}</code> - Amortización (sistema francés)</div>
                    <div><code>{'{saldo}'}</code> - Saldo restante</div>
                  </div>
                  <code className="text-purple-700">{'{/calendario_cuotas}'}</code>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowVariablesModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
