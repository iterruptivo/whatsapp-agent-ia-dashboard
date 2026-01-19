// ============================================================================
// COMPONENT: ControlPagosClient
// ============================================================================
// Descripción: Tabla de control de pagos de locales en proceso de venta
// Features: Lista completa de locales procesados con calendario de cuotas
// Sesión: 54
// ============================================================================

'use client';

import { useState } from 'react';
import type { ControlPago } from '@/lib/actions-control-pagos';
import { FileText, Calendar, Eye, Download, Loader2, AlertCircle, X, DollarSign, Users } from 'lucide-react';
import PagosPanel from './PagosPanel';
import PrecioComparativoModal from './PrecioComparativoModal';
import PagoConsolidadoModal from './PagoConsolidadoModal';
import GenerarContratoModal from './GenerarContratoModal';
import Tooltip from '@/components/shared/Tooltip';
import { useAuth } from '@/lib/auth-context';

interface ControlPagosClientProps {
  initialData: ControlPago[];
}

export default function ControlPagosClient({ initialData }: ControlPagosClientProps) {
  const { selectedProyecto } = useAuth();
  const [controlPagos] = useState<ControlPago[]>(initialData);
  const [pagosPanel, setPagosPanel] = useState<{
    isOpen: boolean;
    controlPago: ControlPago | null;
  }>({
    isOpen: false,
    controlPago: null,
  });
  const [precioModal, setPrecioModal] = useState<{
    isOpen: boolean;
    controlPago: ControlPago | null;
  }>({
    isOpen: false,
    controlPago: null,
  });
  const [pagoConsolidadoModal, setPagoConsolidadoModal] = useState(false);
  const [contratoModal, setContratoModal] = useState<{
    isOpen: boolean;
    controlPago: ControlPago | null;
  }>({
    isOpen: false,
    controlPago: null,
  });
  const [generatingContrato, setGeneratingContrato] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Handler para abrir modal de contrato
  const handleOpenContratoModal = (cp: ControlPago) => {
    setContratoModal({ isOpen: true, controlPago: cp });
  };

  // Handler para generar contrato Word (llamado desde el modal)
  const handleGenerarContrato = async (
    tipoCambio: number,
    templateBase64?: string,
    templateNombre?: string
  ) => {
    if (!contratoModal.controlPago) return;

    const cp = contratoModal.controlPago;
    setGeneratingContrato(cp.id);

    try {
      const response = await fetch('/api/contratos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlPagoId: cp.id,
          tipoCambio,
          templatePersonalizadoBase64: templateBase64,
          templatePersonalizadoNombre: templateNombre,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar contrato');
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CONTRATO_${cp.codigo_local}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generando contrato:', error);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Error al generar contrato',
      });
      throw error; // Re-throw para que el modal lo maneje
    } finally {
      setGeneratingContrato(null);
    }
  };

  // Helper para formatear montos
  const formatMonto = (monto: number): string => {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper para formatear fechas
  const formatFecha = (fecha: string): string => {
    // Agregar T00:00:00 para forzar interpretación como hora local (no UTC)
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-[#1b967a] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Locales en Control de Pagos
            </h2>
            <p className="text-sm text-green-100 mt-1">
              Total de locales procesados: {controlPagos.length}
            </p>
          </div>
          <button
            onClick={() => setPagoConsolidadoModal(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" />
            Pago Consolidado
          </button>
        </div>
      </div>

      {/* Tabla */}
      {controlPagos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No hay locales en control de pagos</p>
          <p className="text-gray-400 text-sm mt-2">
            Los locales procesados aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Código Local
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Precio Base
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Monto Venta
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Inicial (%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Restante
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cuotas
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Financiamiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {controlPagos.map((cp) => (
                <tr
                  key={cp.id}
                  className={`transition-colors ${
                    cp.tiene_vencidos
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Código Local */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="font-medium text-gray-900">{cp.codigo_local}</span>
                        <div className="text-xs text-gray-500">{cp.metraje} m²</div>
                      </div>
                      {cp.tiene_vencidos && cp.cuotas_vencidas && cp.cuotas_vencidas > 0 && (
                        <Tooltip text={`${cp.cuotas_vencidas} cuota${cp.cuotas_vencidas > 1 ? 's' : ''} vencida${cp.cuotas_vencidas > 1 ? 's' : ''} (${cp.dias_max_vencido} días)`}>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3" />
                            {cp.cuotas_vencidas}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </td>

                  {/* Proyecto */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{cp.proyecto_nombre}</span>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{cp.lead_nombre}</div>
                    <div className="text-xs text-gray-500">{cp.lead_telefono}</div>
                  </td>

                  {/* Precio Base */}
                  <td className="px-4 py-3 text-right">
                    <Tooltip text="Ver comparativo de precios">
                      <button
                        onClick={() => setPrecioModal({ isOpen: true, controlPago: cp })}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      >
                        {cp.precio_base ? formatMonto(cp.precio_base) : '-'}
                      </button>
                    </Tooltip>
                  </td>

                  {/* Monto Total */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMonto(cp.monto_venta)}
                    </span>
                  </td>

                  {/* Inicial (%) */}
                  <td className="px-4 py-3 text-right">
                    {cp.porcentaje_inicial ? (
                      <>
                        <div className="text-sm font-medium text-blue-600">
                          {cp.porcentaje_inicial}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatMonto(cp.monto_inicial)}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>

                  {/* Restante */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-green-600">
                      {formatMonto(cp.monto_restante)}
                    </span>
                  </td>

                  {/* Cuotas */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {cp.numero_cuotas} cuotas
                    </span>
                    {cp.tea && (
                      <div className="text-xs text-gray-500 mt-1">TEA: {cp.tea}%</div>
                    )}
                  </td>

                  {/* Financiamiento */}
                  <td className="px-4 py-3 text-center">
                    {cp.con_financiamiento ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>

                  {/* Próximo Pago */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatFecha(cp.fecha_primer_pago)}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPagosPanel({ isOpen: true, controlPago: cp })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <Tooltip text="Generar Contrato Word">
                        <button
                          onClick={() => handleOpenContratoModal(cp)}
                          disabled={generatingContrato === cp.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingContrato === cp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Contrato
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PagosPanel
        isOpen={pagosPanel.isOpen}
        controlPago={pagosPanel.controlPago}
        onClose={() => setPagosPanel({ isOpen: false, controlPago: null })}
      />

      {precioModal.controlPago && (
        <PrecioComparativoModal
          isOpen={precioModal.isOpen}
          onClose={() => setPrecioModal({ isOpen: false, controlPago: null })}
          codigoLocal={precioModal.controlPago.codigo_local}
          metraje={precioModal.controlPago.metraje}
          cliente={precioModal.controlPago.lead_nombre}
          precioBase={precioModal.controlPago.precio_base}
          montoVenta={precioModal.controlPago.monto_venta}
        />
      )}

      {/* Modal de Error */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-red-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-700">
                  Error al generar contrato
                </h3>
              </div>
              <button
                onClick={() => setErrorModal({ isOpen: false, message: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700">{errorModal.message}</p>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setErrorModal({ isOpen: false, message: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago Consolidado */}
      {selectedProyecto?.id && (
        <PagoConsolidadoModal
          isOpen={pagoConsolidadoModal}
          proyectoId={selectedProyecto.id}
          onClose={() => setPagoConsolidadoModal(false)}
          onSuccess={() => {
            setPagoConsolidadoModal(false);
            // Recargar la página para ver cambios
            window.location.reload();
          }}
        />
      )}

      {/* Modal Generar Contrato */}
      {contratoModal.isOpen && contratoModal.controlPago && selectedProyecto?.id && (
        <GenerarContratoModal
          controlPago={contratoModal.controlPago}
          proyectoId={selectedProyecto.id}
          onClose={() => setContratoModal({ isOpen: false, controlPago: null })}
          onGenerate={handleGenerarContrato}
        />
      )}
    </div>
  );
}
