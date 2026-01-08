// ============================================================================
// EJEMPLO DE INTEGRACIÓN - Componentes de Reuniones
// ============================================================================
// Este archivo muestra cómo usar los tres componentes creados en una página
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import ReunionFiltros from './ReunionFiltros';
import ReunionPagination from './ReunionPagination';
import EditarReunionModal from './EditarReunionModal';
import {
  ReunionEstado,
  ReunionListItem,
  Reunion,
  GetReunionesResponse,
  PaginationMetadata,
} from '@/types/reuniones';
import { createBrowserClient } from '@supabase/ssr';

export default function EjemploIntegracionReuniones() {
  // ========================================
  // STATE
  // ========================================

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estado, setEstado] = useState<ReunionEstado | 'todos'>('todos');

  // Paginación
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Datos
  const [reuniones, setReuniones] = useState<ReunionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal de edición
  const [modalOpen, setModalOpen] = useState(false);
  const [reunionSeleccionada, setReunionSeleccionada] = useState<{
    id: string;
    titulo: string;
    fecha_reunion: string | null;
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ========================================
  // FETCH REUNIONES
  // ========================================

  const fetchReuniones = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error('No hay sesión activa');
        return;
      }

      // Construir query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (estado !== 'todos') params.append('estado', estado);

      // Llamar a la API
      const response = await fetch(`/api/reuniones?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data: GetReunionesResponse = await response.json();

      if (data.success) {
        setReuniones(data.reuniones);
        setPagination(data.pagination);
      } else {
        console.error('Error al cargar reuniones:', data.error);
      }
    } catch (error) {
      console.error('Error al cargar reuniones:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // EFFECTS
  // ========================================

  // Cargar reuniones cuando cambien filtros o página
  useEffect(() => {
    fetchReuniones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fechaDesde, fechaHasta, estado]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleLimpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstado('todos');
    setPage(1); // Reset a página 1
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top (opcional)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditarReunion = (reunion: ReunionListItem) => {
    setReunionSeleccionada({
      id: reunion.id,
      titulo: reunion.titulo,
      fecha_reunion: reunion.fecha_reunion,
    });
    setModalOpen(true);
  };

  const handleReunionActualizada = (reunionActualizada: Reunion) => {
    // Refrescar la lista
    fetchReuniones();

    // Opcional: Mostrar toast de éxito
    console.log('Reunión actualizada:', reunionActualizada.titulo);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-[#192c4d]">Mis Reuniones</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus reuniones transcritas y sus action items
        </p>
      </div>

      {/* Filtros */}
      <ReunionFiltros
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        estado={estado}
        onFechaDesdeChange={(fecha) => {
          setFechaDesde(fecha);
          setPage(1); // Reset a página 1 cuando se filtra
        }}
        onFechaHastaChange={(fecha) => {
          setFechaHasta(fecha);
          setPage(1);
        }}
        onEstadoChange={(nuevoEstado) => {
          setEstado(nuevoEstado);
          setPage(1);
        }}
        onLimpiar={handleLimpiarFiltros}
        loading={loading}
      />

      {/* Lista de Reuniones */}
      <div className="bg-white rounded-lg shadow-md">
        {loading && reuniones.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#1b967a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando reuniones...</p>
            </div>
          </div>
        ) : reuniones.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-gray-600">No hay reuniones para mostrar</p>
              <p className="text-sm text-gray-500 mt-2">
                Ajusta los filtros o sube una nueva reunión
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reuniones.map((reunion) => (
              <div
                key={reunion.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#192c4d]">
                      {reunion.titulo}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      {reunion.fecha_reunion && (
                        <span>
                          {new Date(reunion.fecha_reunion).toLocaleDateString(
                            'es-PE',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      )}
                      <span className="capitalize">{reunion.estado}</span>
                      <span>{reunion.action_items_count} action items</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditarReunion(reunion)}
                    className="ml-4 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      <ReunionPagination
        pagination={pagination}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {/* Modal de Edición */}
      {reunionSeleccionada && (
        <EditarReunionModal
          reunion={reunionSeleccionada}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleReunionActualizada}
        />
      )}
    </div>
  );
}
