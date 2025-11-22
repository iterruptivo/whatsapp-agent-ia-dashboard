// ============================================================================
// COMPONENT: FinanciamientoModal
// ============================================================================
// Descripción: Modal para registro de venta de locales en estado ROJO
// Features: Captura si hay financiamiento, muestra precio venta y monto separación
// SESIÓN 52: Feature inicial - Solo mostrar modal con título correcto
// SESIÓN 52B: Agregar campos financiamiento/separación (radio buttons + display values)
// SESIÓN 52D: Lead vinculado (nombre + teléfono) + Cuotas condicionales del proyecto
// SESIÓN 52E: Inicial (porcentaje + monto) + Inicial Restante (calculado)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Local } from '@/lib/locales';
import { getLocalLeads } from '@/lib/locales';
import { getProyectoConfiguracion } from '@/lib/proyecto-config';
import type { CuotaMeses } from '@/lib/actions-proyecto-config';

interface FinanciamientoModalProps {
  isOpen: boolean;
  local: Local | null;
  onClose: () => void;
}

export default function FinanciamientoModal({
  isOpen,
  local,
  onClose,
}: FinanciamientoModalProps) {
  const [conFinanciamiento, setConFinanciamiento] = useState<boolean>(true);
  const [leadNombre, setLeadNombre] = useState<string>('');
  const [leadTelefono, setLeadTelefono] = useState<string>('');
  const [cuotasSinInteres, setCuotasSinInteres] = useState<CuotaMeses[]>([]);
  const [cuotasConInteres, setCuotasConInteres] = useState<CuotaMeses[]>([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<number | null>(null);
  const [porcentajeInicial, setPorcentajeInicial] = useState<number | null>(null);
  const [teaProyecto, setTeaProyecto] = useState<number | null>(null);

  // Obtener nombre y teléfono del lead vinculado
  useEffect(() => {
    if (!isOpen || !local) return;

    async function fetchLeadData() {
      const localLeads = await getLocalLeads(local!.id);
      if (localLeads.length > 0) {
        setLeadNombre(localLeads[0].lead_nombre || 'N/A');
        setLeadTelefono(localLeads[0].lead_telefono || '');
      } else {
        setLeadNombre('N/A');
        setLeadTelefono('');
      }
    }

    fetchLeadData();
  }, [isOpen, local]);

  // Obtener configuración del proyecto (cuotas y porcentaje inicial)
  useEffect(() => {
    if (!isOpen || !local?.proyecto_id) return;

    async function fetchProyectoConfig() {
      const config = await getProyectoConfiguracion(local!.proyecto_id);
      if (config) {
        // TEA del proyecto
        if (config.tea !== null && config.tea !== undefined) {
          setTeaProyecto(config.tea);
        }

        // Configuraciones extra
        if (config.configuraciones_extra) {
          const cuotasSin = config.configuraciones_extra.cuotas_sin_interes || [];
          const cuotasCon = config.configuraciones_extra.cuotas_con_interes || [];
          const porcentajes = config.configuraciones_extra.porcentajes_inicial || [];

          // Ordenar por campo order
          setCuotasSinInteres(cuotasSin.sort((a: CuotaMeses, b: CuotaMeses) => a.order - b.order));
          setCuotasConInteres(cuotasCon.sort((a: CuotaMeses, b: CuotaMeses) => a.order - b.order));

          // Tomar el primer (y único) porcentaje de inicial
          if (porcentajes.length > 0) {
            setPorcentajeInicial(porcentajes[0].value);
          }
        }
      }
    }

    fetchProyectoConfig();
  }, [isOpen, local]);

  if (!isOpen || !local) return null;

  // Helper para formatear montos
  const formatMonto = (monto: number | null | undefined): string => {
    if (!monto) return 'N/A';
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Cálculos
  const montoInicial = porcentajeInicial && local.monto_venta
    ? (local.monto_venta * porcentajeInicial) / 100
    : null;

  const inicialRestante = montoInicial && local.monto_separacion
    ? montoInicial - local.monto_separacion
    : null;

  const montoRestante = montoInicial && local.monto_venta
    ? local.monto_venta - montoInicial
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Financiamiento de Local: {local.codigo} - {local.proyecto_nombre || 'N/A'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Información del Local */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Local</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Local:</span>
                <span className="ml-2 font-medium text-gray-900">{local.codigo}</span>
              </div>
              <div>
                <span className="text-gray-500">Proyecto:</span>
                <span className="ml-2 font-medium text-gray-900">{local.proyecto_nombre}</span>
              </div>
              <div>
                <span className="text-gray-500">Metraje:</span>
                <span className="ml-2 font-medium text-gray-900">{local.metraje} m²</span>
              </div>
              <div>
                <span className="text-gray-500">Lead Vinculado:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {leadNombre ? (
                    leadTelefono ? `${leadNombre} (${leadTelefono})` : leadNombre
                  ) : 'Cargando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Precio de Venta y Separación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta
              </label>
              <div className="text-2xl font-bold text-blue-900">
                {formatMonto(local.monto_venta)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Separó con
              </label>
              <div className="text-2xl font-bold text-green-900">
                {formatMonto(local.monto_separacion)}
              </div>
            </div>
          </div>

          {/* Inicial e Inicial Restante */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicial ({porcentajeInicial ? `${porcentajeInicial}%` : 'N/A'})
              </label>
              <div className="text-2xl font-bold text-orange-900">
                {formatMonto(montoInicial)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicial Restante
              </label>
              <div className="text-2xl font-bold text-purple-900">
                {formatMonto(inicialRestante)}
              </div>
            </div>
          </div>

          {/* Monto Restante destacado */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-indigo-900">
                Monto Restante:
              </span>
              <span className="text-3xl font-bold text-indigo-900">
                {formatMonto(montoRestante)}
              </span>
            </div>
          </div>

          {/* ¿Con financiamiento? */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ¿Con financiamiento?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="financiamiento"
                  checked={conFinanciamiento === true}
                  onChange={() => {
                    setConFinanciamiento(true);
                    setCuotaSeleccionada(null); // Reset cuota cuando cambia tipo
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">Sí</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="financiamiento"
                  checked={conFinanciamiento === false}
                  onChange={() => {
                    setConFinanciamiento(false);
                    setCuotaSeleccionada(null); // Reset cuota cuando cambia tipo
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">No</span>
              </label>
            </div>
          </div>

          {/* Cuotas (condicional según financiamiento) */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Cuotas {conFinanciamiento ? 'con intereses' : 'sin intereses'} (meses)
            </label>
            {conFinanciamiento ? (
              // Cuotas CON intereses
              <>
                {cuotasConInteres.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {cuotasConInteres.map((cuota) => (
                      <label key={cuota.order} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="cuotas"
                          checked={cuotaSeleccionada === cuota.value}
                          onChange={() => setCuotaSeleccionada(cuota.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {cuota.value} meses
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay cuotas con intereses configuradas para este proyecto.</p>
                )}

                {/* Badge TEA del proyecto */}
                {teaProyecto !== null && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-blue-100 border border-blue-300 rounded-full">
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-semibold text-blue-900">
                      TEA: {teaProyecto}% anual
                    </span>
                  </div>
                )}
              </>

            ) : (
              // Cuotas SIN intereses
              cuotasSinInteres.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {cuotasSinInteres.map((cuota) => (
                    <label key={cuota.order} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="cuotas"
                        checked={cuotaSeleccionada === cuota.value}
                        onChange={() => setCuotaSeleccionada(cuota.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {cuota.value} meses
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay cuotas sin intereses configuradas para este proyecto.</p>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
