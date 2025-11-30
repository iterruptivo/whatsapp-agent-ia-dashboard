'use client';

import { useState, useEffect } from 'react';
import { X, Users, TrendingUp, DollarSign } from 'lucide-react';
import { getComisionesByLocalId, type ComisionConTrazabilidad } from '@/lib/actions-comisiones';

interface SplitComisionesModalProps {
  localId: string;
  localCodigo: string;
  montoVenta: number;
  userRole: string;
  onClose: () => void;
}

export default function SplitComisionesModal({
  localId,
  localCodigo,
  montoVenta,
  userRole,
  onClose
}: SplitComisionesModalProps) {
  const [comisiones, setComisiones] = useState<ComisionConTrazabilidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComisiones = async () => {
      setLoading(true);
      const data = await getComisionesByLocalId(localId);
      setComisiones(data);
      setLoading(false);
    };

    fetchComisiones();
  }, [localId]);

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(monto);
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente_inicial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente Inicial' },
      disponible: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disponible' },
      pagada: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Pagada' },
    };
    const badge = badges[estado as keyof typeof badges] || badges.pendiente_inicial;
    return (
      <span className={`${badge.bg} ${badge.text} text-xs font-medium px-2 py-1 rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const getFaseBadge = (fase: string) => {
    return fase === 'vendedor' ? (
      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
        Vendedor
      </span>
    ) : (
      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
        Gestión
      </span>
    );
  };

  // Filtrar comisiones según rol del usuario
  // Vendedor/vendedor_caseta solo ven comisiones de fase "vendedor"
  // Admin/jefe_ventas ven todas las comisiones
  const isVendedorRole = userRole === 'vendedor' || userRole === 'vendedor_caseta';
  const comisionesFiltradas = isVendedorRole
    ? comisiones.filter(c => c.fase === 'vendedor')
    : comisiones;

  const totalComisiones = comisionesFiltradas.reduce((sum, c) => sum + parseFloat(c.monto_comision.toString()), 0);
  const porcentajeTotal = ((totalComisiones / montoVenta) * 100).toFixed(2);

  // Detectar si hubo split (usando comisiones filtradas)
  const vendedorComisiones = comisionesFiltradas.filter(c => c.fase === 'vendedor');
  const gestionComisiones = comisionesFiltradas.filter(c => c.fase === 'gestion');
  const hubSplitVendedor = vendedorComisiones.length > 1;
  const hubSplitGestion = gestionComisiones.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[#16805f] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">Desglose de Comisiones</h2>
              <p className="text-sm text-white/90">Local: {localCodigo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : comisionesFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No se encontraron comisiones para este local</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Monto de Venta */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Monto de Venta:</span>
                  <span className="text-lg font-bold text-gray-900">{formatMonto(montoVenta)}</span>
                </div>
              </div>

              {/* Trazabilidad */}
              {comisionesFiltradas[0] && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Trazabilidad del Proceso
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Lead asignado a:</span>
                      <p className="text-blue-900">{comisionesFiltradas[0].vendedor_lead_nombre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Confirmó local (🟠):</span>
                      <p className="text-blue-900">{comisionesFiltradas[0].usuario_naranja_nombre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Bloqueó local (🔴):</span>
                      <p className="text-blue-900">{comisionesFiltradas[0].usuario_rojo_nombre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Procesó venta:</span>
                      <p className="text-blue-900">{comisionesFiltradas[0].usuario_procesado_nombre || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comisiones */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Distribución de Comisiones
                </h3>
                <div className="space-y-3">
                  {comisionesFiltradas.map((comision) => (
                    <div
                      key={comision.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{comision.usuario_nombre}</p>
                          <p className="text-xs text-gray-500">{comision.rol_usuario}</p>
                        </div>
                        <div className="flex gap-2">
                          {getFaseBadge(comision.fase)}
                          {getEstadoBadge(comision.estado)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-600">Porcentaje:</span>
                          <p className="font-medium text-gray-900">
                            {parseFloat(comision.porcentaje_comision.toString()).toFixed(2)}%
                            {((comision.fase === 'vendedor' && hubSplitVendedor) ||
                              (comision.fase === 'gestion' && hubSplitGestion)) && (
                              <span className="text-xs text-orange-600 ml-1">(Split 50/50)</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Comisión:</span>
                          <p className="font-bold text-green-600">{formatMonto(parseFloat(comision.monto_comision.toString()))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && comisionesFiltradas.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Comisiones:</span>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{formatMonto(totalComisiones)}</p>
                <p className="text-xs text-gray-600">{porcentajeTotal}% del monto de venta</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={onClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
