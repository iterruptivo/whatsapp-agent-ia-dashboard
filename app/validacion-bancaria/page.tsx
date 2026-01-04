'use client';

// ============================================================================
// PAGINA: Validacion Bancaria
// ============================================================================
// Importar estados de cuenta bancarios y hacer matching con abonos del sistema
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  Building2,
  Upload,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Eye,
  BarChart3,
} from 'lucide-react';
import {
  ConfigBanco,
  ImportacionBancaria,
  getBancosActivos,
  getImportaciones,
  getImportacionById,
  exportarConcard,
} from '@/lib/actions-validacion-bancaria';
import ImportarEstadoCuentaModal from '@/components/validacion-bancaria/ImportarEstadoCuentaModal';
import MatchingPanel from '@/components/validacion-bancaria/MatchingPanel';

export default function ValidacionBancariaPage() {
  const { user, selectedProyecto: proyecto, loading: authLoading } = useAuth();
  const [bancos, setBancos] = useState<ConfigBanco[]>([]);
  const [importaciones, setImportaciones] = useState<ImportacionBancaria[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalImportar, setModalImportar] = useState(false);
  const [importacionSeleccionada, setImportacionSeleccionada] = useState<ImportacionBancaria | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  // Cargar datos cuando el proyecto esté disponible
  useEffect(() => {
    // Si auth está cargando o no hay proyecto, esperar
    if (authLoading || !proyecto?.id || !user) {
      return;
    }

    // Cargar datos
    setLoadingData(true);
    Promise.all([
      getBancosActivos(),
      getImportaciones(proyecto.id),
    ])
      .then(([bancosData, importacionesData]) => {
        setBancos(bancosData);
        setImportaciones(importacionesData);
      })
      .catch((error) => {
        console.error('Error cargando datos:', error);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [proyecto?.id, authLoading, user]);

  // Función para recargar datos (para callbacks)
  const reloadData = useCallback(async () => {
    if (!proyecto?.id) return;
    setLoadingData(true);
    try {
      const [bancosData, importacionesData] = await Promise.all([
        getBancosActivos(),
        getImportaciones(proyecto.id),
      ]);
      setBancos(bancosData);
      setImportaciones(importacionesData);
    } catch (error) {
      console.error('Error recargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  }, [proyecto?.id]);

  // Recargar importacion seleccionada
  const reloadImportacion = async () => {
    if (importacionSeleccionada) {
      const updated = await getImportacionById(importacionSeleccionada.id);
      if (updated) {
        setImportacionSeleccionada(updated);
        // Actualizar en la lista
        setImportaciones((prev) =>
          prev.map((imp) => (imp.id === updated.id ? updated : imp))
        );
      }
    }
  };

  // Exportar a Concard
  const handleExportar = async (importacionId: string) => {
    setExportando(importacionId);
    const result = await exportarConcard(importacionId, true);

    if (result.success && result.data && result.filename) {
      // Crear y descargar el archivo
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
    setExportando(null);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatMonto = (monto: number, moneda: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: moneda === 'PEN' ? 'PEN' : 'USD',
    }).format(monto);
  };

  // Show loading while auth or data is loading (same pattern as operativo)
  if (authLoading || loadingData || !proyecto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1b967a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando validacion bancaria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <DashboardHeader title="Validacion Bancaria" subtitle="Conciliacion de transacciones bancarias" />

      <main className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="w-7 h-7 text-[#1b967a]" />
                Validacion Bancaria
              </h1>
              <p className="text-gray-500 mt-1">
                Importar estados de cuenta y hacer matching con abonos - {proyecto.nombre}
              </p>
            </div>
            <button
              onClick={() => setModalImportar(true)}
              className="px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Estado de Cuenta
            </button>
          </div>
        </div>

        {/* Vista principal */}
        {importacionSeleccionada ? (
          /* Panel de matching para importacion seleccionada */
          <div>
            {/* Header de la importacion */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <button
                    onClick={() => setImportacionSeleccionada(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                  >
                    &larr; Volver a lista
                  </button>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    {(importacionSeleccionada.banco as any)?.nombre_display || 'Banco'}
                    <span className="text-gray-400 font-normal">|</span>
                    <span className="text-gray-600">{importacionSeleccionada.moneda}</span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    {importacionSeleccionada.archivo_nombre} &bull;{' '}
                    {formatFecha(importacionSeleccionada.fecha_desde)} -{' '}
                    {formatFecha(importacionSeleccionada.fecha_hasta)}
                  </p>
                </div>

                {/* Estadisticas */}
                <div className="flex flex-wrap gap-4">
                  <StatBox
                    label="Total Abonos"
                    value={formatMonto(
                      importacionSeleccionada.monto_total_abonos,
                      importacionSeleccionada.moneda
                    )}
                    icon={<BarChart3 className="w-4 h-4" />}
                    color="blue"
                  />
                  <StatBox
                    label="Matched"
                    value={importacionSeleccionada.transacciones_matched.toString()}
                    icon={<CheckCircle className="w-4 h-4" />}
                    color="green"
                  />
                  <StatBox
                    label="Pendientes"
                    value={importacionSeleccionada.transacciones_pendientes.toString()}
                    icon={<Clock className="w-4 h-4" />}
                    color="yellow"
                  />
                </div>

                <button
                  onClick={() => handleExportar(importacionSeleccionada.id)}
                  disabled={exportando === importacionSeleccionada.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Exportar Concard
                </button>
              </div>
            </div>

            {/* Panel de matching */}
            <MatchingPanel
              importacionId={importacionSeleccionada.id}
              proyectoId={proyecto.id}
              userId={user?.id || ''}
              onUpdate={reloadImportacion}
            />
          </div>
        ) : (
          /* Lista de importaciones */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Importaciones Realizadas
              </h2>
            </div>

            {importaciones.length === 0 ? (
              <div className="p-12 text-center">
                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No hay importaciones
                </h3>
                <p className="text-gray-500 mb-4">
                  Importa tu primer estado de cuenta para comenzar
                </p>
                <button
                  onClick={() => setModalImportar(true)}
                  className="px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar Estado de Cuenta
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {importaciones.map((imp) => (
                  <div
                    key={imp.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Info principal */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {(imp.banco as any)?.nombre_display || 'Banco'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {imp.archivo_nombre}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {formatFecha(imp.fecha_desde)} - {formatFecha(imp.fecha_hasta)}
                          </span>
                          <span className="font-medium text-gray-700">
                            {imp.moneda}
                          </span>
                          <span className="text-gray-600">
                            {imp.total_transacciones} transacciones
                          </span>
                        </div>
                      </div>

                      {/* Estadisticas */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-bold">{imp.transacciones_matched}</span>
                          </div>
                          <span className="text-xs text-gray-500">Matched</span>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold">{imp.transacciones_pendientes}</span>
                          </div>
                          <span className="text-xs text-gray-500">Pendientes</span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setImportacionSeleccionada(imp)}
                          className="px-3 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Matching
                        </button>
                        <button
                          onClick={() => handleExportar(imp.id)}
                          disabled={exportando === imp.id}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>Progreso de matching</span>
                        <span className="font-medium">
                          {imp.transacciones_matched} / {imp.transacciones_pendientes + imp.transacciones_matched}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((imp.transacciones_matched) /
                                Math.max(imp.transacciones_pendientes + imp.transacciones_matched, 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de importar */}
      <ImportarEstadoCuentaModal
        isOpen={modalImportar}
        proyectoId={proyecto.id}
        userId={user?.id || ''}
        bancos={bancos}
        onClose={() => setModalImportar(false)}
        onSuccess={(importacionId) => {
          setModalImportar(false);
          reloadData();
        }}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`px-4 py-2 rounded-lg ${colors[color]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-bold">{value}</span>
      </div>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}
