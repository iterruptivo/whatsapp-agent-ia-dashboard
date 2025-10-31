// ============================================================================
// COMPONENT: LocalesClient (Client Component con Realtime)
// ============================================================================
// Descripción: Wrapper cliente para gestión de locales con tiempo real
// Features: Supabase Realtime, filtros, paginación, importación CSV
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllVendedores } from '@/lib/db';
import type { Proyecto, Vendedor } from '@/lib/db';
import type { Local } from '@/lib/locales';
import LocalesTable from './LocalesTable';
import LocalesFilters from './LocalesFilters';
import LocalImportModal from './LocalImportModal';
import LocalHistorialPanel from './LocalHistorialPanel';
import { useAuth } from '@/lib/auth-context';
import { RefreshCw, Upload } from 'lucide-react';

interface LocalesClientProps {
  initialLocales: Local[];
  totalLocales: number;
  proyectos: Proyecto[];
  initialStats: {
    verde: number;
    amarillo: number;
    naranja: number;
    rojo: number;
    total: number;
  };
}

export default function LocalesClient({
  initialLocales,
  totalLocales,
  proyectos,
  initialStats,
}: LocalesClientProps) {
  // ====== AUTH ======
  const { user } = useAuth();

  // ====== STATE ======
  const [locales, setLocales] = useState<Local[]>(initialLocales);
  const [stats, setStats] = useState(initialStats);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLocalForHistorial, setSelectedLocalForHistorial] = useState<Local | null>(null);

  // Filtros
  const [proyectoFilter, setProyectoFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [metrajeMin, setMetrajeMin] = useState<number | undefined>(undefined);
  const [metrajeMax, setMetrajeMax] = useState<number | undefined>(undefined);
  const [searchCodigo, setSearchCodigo] = useState<string>('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // ====== FETCH VENDEDORES ON MOUNT ======
  useEffect(() => {
    const fetchVendedores = async () => {
      const data = await getAllVendedores();
      setVendedores(data);
    };
    fetchVendedores();
  }, []);

  // ====== SUPABASE REALTIME SUBSCRIPTION ======
  useEffect(() => {
    // Crear canal de Realtime
    const channel = supabase
      .channel('locales-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'locales',
        },
        async (payload) => {
          console.log('Realtime change detected:', payload);

          if (payload.eventType === 'INSERT') {
            // Agregar nuevo local
            const newLocal = payload.new as Local;
            setLocales((prev) => [newLocal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Actualizar local existente
            const updatedLocal = payload.new as Local;
            console.log('🔄 UPDATE detected - vendedor_actual_id:', updatedLocal.vendedor_actual_id);

            // Fetch nombre del vendedor si cambió
            let vendedorNombre = null;
            if (updatedLocal.vendedor_actual_id) {
              const { data, error } = await supabase
                .from('vendedores')
                .select('nombre')
                .eq('id', updatedLocal.vendedor_actual_id)
                .single();

              console.log('👤 Vendedor fetch result:', { data, error });
              vendedorNombre = data?.nombre || null;
            }

            console.log('✅ Vendedor nombre final:', vendedorNombre);

            setLocales((prev) =>
              prev.map((local) => {
                if (local.id === updatedLocal.id) {
                  const updatedLocalWithJoins = {
                    ...updatedLocal,
                    proyecto_nombre: local.proyecto_nombre, // Preservar JOIN proyecto
                    vendedor_actual_nombre: vendedorNombre, // Actualizar vendedor
                  };
                  console.log('📦 Local actualizado:', updatedLocalWithJoins);
                  return updatedLocalWithJoins;
                }
                return local;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            // Eliminar local
            const deletedLocal = payload.old as Local;
            setLocales((prev) => prev.filter((local) => local.id !== deletedLocal.id));
          }

          // Recalcular stats
          recalculateStats();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Sin dependencias - fetch directo desde Supabase

  // ====== HELPER FUNCTIONS ======

  const recalculateStats = () => {
    const verde = locales.filter((l) => l.estado === 'verde').length;
    const amarillo = locales.filter((l) => l.estado === 'amarillo').length;
    const naranja = locales.filter((l) => l.estado === 'naranja').length;
    const rojo = locales.filter((l) => l.estado === 'rojo').length;

    setStats({
      verde,
      amarillo,
      naranja,
      rojo,
      total: locales.length,
    });
  };

  // ====== FILTRADO ======

  const filteredLocales = useMemo(() => {
    let filtered = locales;

    // Filtro por búsqueda de código
    if (searchCodigo) {
      filtered = filtered.filter((local) =>
        local.codigo.toLowerCase().includes(searchCodigo.toLowerCase())
      );
    }

    // Filtro por proyecto
    if (proyectoFilter) {
      filtered = filtered.filter((local) => local.proyecto_id === proyectoFilter);
    }

    // Filtro por estado
    if (estadoFilter) {
      filtered = filtered.filter((local) => local.estado === estadoFilter);
    }

    // Filtro por metraje
    if (metrajeMin !== undefined) {
      filtered = filtered.filter((local) => local.metraje >= metrajeMin);
    }

    if (metrajeMax !== undefined) {
      filtered = filtered.filter((local) => local.metraje <= metrajeMax);
    }

    return filtered;
  }, [locales, searchCodigo, proyectoFilter, estadoFilter, metrajeMin, metrajeMax]);

  // ====== PAGINACIÓN ======

  const paginatedLocales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLocales.slice(start, end);
  }, [filteredLocales, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLocales.length / itemsPerPage);

  // ====== HANDLERS ======

  const handleRefresh = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    window.location.reload();
  };

  const handleClearFilters = () => {
    setSearchCodigo('');
    setProyectoFilter('');
    setEstadoFilter('');
    setMetrajeMin(undefined);
    setMetrajeMax(undefined);
    setCurrentPage(1);
  };

  const handleShowHistorial = (local: Local) => {
    setSelectedLocalForHistorial(local);
  };

  const handleCloseHistorial = () => {
    setSelectedLocalForHistorial(null);
  };

  // ====== RENDER ======

  return (
    <div className="space-y-6">
      {/* Box de Búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Total Locales */}
          <div className="text-lg font-semibold text-gray-900">
            Total Locales: {stats.total}
          </div>

          {/* Buscador por Código */}
          <div className="w-full max-w-md">
            <input
              type="text"
              placeholder="Buscar por código de local"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filtros + Botones de Acción */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          {/* Filtros */}
          <div className="flex-1 w-full">
            <LocalesFilters
              proyectos={proyectos}
              proyectoFilter={proyectoFilter}
              estadoFilter={estadoFilter}
              metrajeMin={metrajeMin}
              metrajeMax={metrajeMax}
              onProyectoChange={setProyectoFilter}
              onEstadoChange={setEstadoFilter}
              onMetrajeMinChange={setMetrajeMin}
              onMetrajeMaxChange={setMetrajeMax}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3">
            {/* Botón Actualizar */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Botón Importar - Solo Admin y Jefe Ventas */}
            {(user?.rol === 'admin' || user?.rol === 'jefe_ventas') && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                title="Importar locales desde CSV/Excel"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importar CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {(searchCodigo || proyectoFilter || estadoFilter || metrajeMin !== undefined || metrajeMax !== undefined) && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredLocales.length} de {locales.length} locales (filtrado)
          </div>
        )}
      </div>

      {/* Tabla de Locales */}
      <LocalesTable
        locales={paginatedLocales}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalLocales={filteredLocales.length}
        onPageChange={setCurrentPage}
        onShowHistorial={handleShowHistorial}
      />

      {/* Modal Importar CSV */}
      {isImportModalOpen && (
        <LocalImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleImportSuccess}
          proyectos={proyectos}
        />
      )}

      {/* Panel Historial */}
      {selectedLocalForHistorial && (
        <LocalHistorialPanel
          local={selectedLocalForHistorial}
          isOpen={!!selectedLocalForHistorial}
          onClose={handleCloseHistorial}
        />
      )}
    </div>
  );
}
