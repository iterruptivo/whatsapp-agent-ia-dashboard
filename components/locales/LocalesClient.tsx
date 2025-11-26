// ============================================================================
// COMPONENT: LocalesClient (Client Component con Realtime)
// ============================================================================
// Descripción: Wrapper cliente para gestión de locales con tiempo real
// Features: Supabase Realtime, filtros, paginación, importación CSV
// ============================================================================

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllVendedores } from '@/lib/db';
import type { Proyecto, Vendedor } from '@/lib/db';
import type { Local } from '@/lib/locales';
import LocalesTable from './LocalesTable';
import LocalesFilters from './LocalesFilters';
import LocalImportModal from './LocalImportModal';
import LocalHistorialPanel from './LocalHistorialPanel';
import VisitaSinLocalModal from './VisitaSinLocalModal';
import ConfirmModal from '../shared/ConfirmModal';
import { useAuth } from '@/lib/auth-context';
import { registrarVisitaSinLocal } from '@/lib/actions';
import { RefreshCw, Upload, Search, X, UserPlus } from 'lucide-react';

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
  const { user, selectedProyecto } = useAuth();

  // ====== STATE ======
  const [locales, setLocales] = useState<Local[]>(initialLocales);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVisitaSinLocalModalOpen, setIsVisitaSinLocalModalOpen] = useState(false);
  const [selectedLocalForHistorial, setSelectedLocalForHistorial] = useState<Local | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    variant: 'danger' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    variant: 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filtros
  const [proyectoFilter, setProyectoFilter] = useState<string>(selectedProyecto?.id || '');
  const [estadosFilter, setEstadosFilter] = useState<string[]>(['verde', 'amarillo', 'naranja']); // Array con defaults
  const [metrajeMin, setMetrajeMin] = useState<number | undefined>(undefined);
  const [metrajeMax, setMetrajeMax] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState<string>(''); // Lo que el usuario escribe
  const [searchCodigo, setSearchCodigo] = useState<string>(''); // Filtro aplicado al hacer clic en Buscar

  // Paginación REAL
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // OPT: 50 locales por página (antes 10000)

  // OPT: Cache en memoria para proyectos y vendedores (evita fetches bloqueantes en Realtime)
  const proyectosCache = useRef<Map<string, string>>(new Map());
  const vendedoresCache = useRef<Map<string, string>>(new Map());

  // ====== FETCH VENDEDORES ON MOUNT + POPULAR CACHE ======
  useEffect(() => {
    const fetchVendedores = async () => {
      const data = await getAllVendedores();
      setVendedores(data);

      // OPT: Popular cache de vendedores
      data.forEach((v) => {
        vendedoresCache.current.set(v.id, v.nombre);
      });
      console.log('[LocalesClient] Cache vendedores populated:', vendedoresCache.current.size);
    };
    fetchVendedores();
  }, []);

  // ====== POPULAR CACHE DE PROYECTOS ON MOUNT ======
  useEffect(() => {
    // OPT: Popular cache de proyectos desde prop
    proyectos.forEach((p) => {
      proyectosCache.current.set(p.id, p.nombre);
    });
    console.log('[LocalesClient] Cache proyectos populated:', proyectosCache.current.size);
  }, [proyectos]);

  // ====== SINCRONIZAR FILTRO PROYECTO CON SELECTED PROYECTO (después de reload) ======
  useEffect(() => {
    // Si el filtro está vacío y tenemos un proyecto seleccionado del login,
    // actualizar el filtro (fix para después de window.location.reload())
    if (!proyectoFilter && selectedProyecto?.id) {
      console.log('[LocalesClient] Sincronizando filtro con proyecto del login:', selectedProyecto.nombre);
      setProyectoFilter(selectedProyecto.id);
    }
    // CRITICAL: Solo depender de selectedProyecto.id, NO de proyectoFilter
    // Si incluimos proyectoFilter, se crea un loop que resetea el filtro cada vez que el usuario lo cambia
  }, [selectedProyecto?.id]);

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
            console.log('➕ INSERT detected - proyecto_id:', newLocal.proyecto_id);

            // OPT: Obtener nombre del proyecto desde cache (sin fetch bloqueante)
            let proyectoNombre = null;
            if (newLocal.proyecto_id) {
              proyectoNombre = proyectosCache.current.get(newLocal.proyecto_id) || null;

              // Fallback: Si no está en cache, fetch y agregar al cache
              if (!proyectoNombre) {
                console.log('⚠️ Proyecto no en cache, fetching:', newLocal.proyecto_id);
                const { data, error } = await supabase
                  .from('proyectos')
                  .select('nombre')
                  .eq('id', newLocal.proyecto_id)
                  .single();

                if (data) {
                  proyectoNombre = data.nombre;
                  proyectosCache.current.set(newLocal.proyecto_id, data.nombre); // Agregar al cache
                }
              } else {
                console.log('✅ Proyecto desde cache:', proyectoNombre);
              }
            }

            const newLocalWithJoins = {
              ...newLocal,
              proyecto_nombre: proyectoNombre,
              vendedor_actual_nombre: null, // Nuevo local sin vendedor asignado
            };

            console.log('📦 Nuevo local con JOINs:', newLocalWithJoins);
            setLocales((prev) => [newLocalWithJoins, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Actualizar local existente
            const updatedLocal = payload.new as Local;
            console.log('🔄 UPDATE detected - vendedor_actual_id:', updatedLocal.vendedor_actual_id);

            // OPT: Obtener nombre del vendedor desde cache (sin fetch bloqueante)
            let vendedorNombre = null;
            if (updatedLocal.vendedor_actual_id) {
              vendedorNombre = vendedoresCache.current.get(updatedLocal.vendedor_actual_id) || null;

              // Fallback: Si no está en cache, fetch y agregar al cache
              if (!vendedorNombre) {
                console.log('⚠️ Vendedor no en cache, fetching:', updatedLocal.vendedor_actual_id);
                const { data, error } = await supabase
                  .from('vendedores')
                  .select('nombre')
                  .eq('id', updatedLocal.vendedor_actual_id)
                  .single();

                if (data) {
                  vendedorNombre = data.nombre;
                  vendedoresCache.current.set(updatedLocal.vendedor_actual_id, data.nombre); // Agregar al cache
                }
              } else {
                console.log('✅ Vendedor desde cache:', vendedorNombre);
              }
            }

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

          // OPT: Stats se recalculan automáticamente con useMemo cuando locales cambia
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Sin dependencias - fetch directo desde Supabase

  // ====== OPTIMIZACIÓN: Calcular stats con useMemo (1 loop en vez de 4) ======
  const stats = useMemo(() => {
    // OPT: Usar reduce() para calcular todos los stats en UNA sola pasada
    const counts = locales.reduce(
      (acc, local) => {
        acc[local.estado] = (acc[local.estado] || 0) + 1;
        acc.total++;
        return acc;
      },
      { verde: 0, amarillo: 0, naranja: 0, rojo: 0, total: 0 } as {
        verde: number;
        amarillo: number;
        naranja: number;
        rojo: number;
        total: number;
      }
    );
    return counts;
  }, [locales]); // Solo recalcular cuando locales cambie

  // ====== FILTRADO ======

  const filteredLocales = useMemo(() => {
    let filtered = locales;

    // Filtro por búsqueda de código (match exacto, case-insensitive)
    if (searchCodigo) {
      filtered = filtered.filter((local) =>
        local.codigo.toLowerCase() === searchCodigo.toLowerCase()
      );
    }

    // Filtro por proyecto
    if (proyectoFilter) {
      filtered = filtered.filter((local) => local.proyecto_id === proyectoFilter);
    }

    // Filtro por estados (multiselect - mostrar solo los seleccionados)
    if (estadosFilter.length > 0) {
      filtered = filtered.filter((local) => estadosFilter.includes(local.estado));
    }

    // Filtro por metraje
    if (metrajeMin !== undefined) {
      filtered = filtered.filter((local) => local.metraje >= metrajeMin);
    }

    if (metrajeMax !== undefined) {
      filtered = filtered.filter((local) => local.metraje <= metrajeMax);
    }

    return filtered;
  }, [locales, searchCodigo, proyectoFilter, estadosFilter, metrajeMin, metrajeMax]);

  // ====== PAGINACIÓN ======

  const paginatedLocales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLocales.slice(start, end);
  }, [filteredLocales, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLocales.length / itemsPerPage);

  // ====== AUTO-RESET PAGE SI ESTÁ FUERA DE RANGO ======
  useEffect(() => {
    // Si currentPage está fuera del rango válido, resetear a página 1
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ====== SESIÓN 48: POLLING AUTO-LIBERACIÓN LOCALES EXPIRADOS (TIMER 120H) ======
  useEffect(() => {
    // Importar la función de auto-liberación
    const autoLiberar = async () => {
      try {
        const { autoLiberarLocalesExpirados } = await import('@/lib/actions-locales');
        const result = await autoLiberarLocalesExpirados();

        if (result.liberados > 0) {
          console.log(`[AUTO-LIBERACIÓN] ✅ ${result.liberados} locales liberados automáticamente`);
          // Realtime se encargará de actualizar la UI automáticamente
        }
      } catch (error) {
        console.error('[AUTO-LIBERACIÓN] ❌ Error en polling:', error);
      }
    };

    // Ejecutar inmediatamente al montar
    autoLiberar();

    // OPT: Luego ejecutar cada 180 segundos (3 min) - Reduce queries a DB
    const interval = setInterval(autoLiberar, 180000); // 180s = 3 min (antes 60s)

    // Cleanup al desmontar
    return () => clearInterval(interval);
  }, []); // Solo ejecutar una vez al montar

  // ====== HANDLERS ======

  const handleRefresh = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    window.location.reload();
  };

  const handleRegistrarVisita = async (telefono: string, nombre: string, proyectoId: string) => {
    // Solo validar vendedor_id para roles vendedor/vendedor_caseta
    // admin/jefe_ventas pueden crear leads sin vendedor asignado
    if (!user?.vendedor_id && (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta')) {
      setConfirmModal({
        isOpen: true,
        variant: 'danger',
        title: 'Error',
        message: 'No tienes un vendedor asignado',
        onConfirm: () => setConfirmModal({ ...confirmModal, isOpen: false }),
      });
      return;
    }

    const result = await registrarVisitaSinLocal(telefono, nombre, proyectoId, user?.vendedor_id || null);

    if (result.success) {
      setIsVisitaSinLocalModalOpen(false);
      setConfirmModal({
        isOpen: true,
        variant: 'success',
        title: 'Éxito',
        message: result.message,
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          window.location.reload();
        },
      });
    } else {
      setConfirmModal({
        isOpen: true,
        variant: 'danger',
        title: 'Error',
        message: result.message,
        onConfirm: () => setConfirmModal({ ...confirmModal, isOpen: false }),
      });
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchCodigo('');
    setProyectoFilter(selectedProyecto?.id || ''); // Volver al proyecto del login
    setEstadosFilter(['verde', 'amarillo', 'naranja']); // Resetear a defaults
    setMetrajeMin(undefined);
    setMetrajeMax(undefined);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setSearchCodigo(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchCodigo('');
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
          <div className="w-full max-w-md flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar código exacto (ej: P-1)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              title="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
            {searchCodigo && (
              <button
                onClick={handleClearSearch}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
              estadosFilter={estadosFilter}
              metrajeMin={metrajeMin}
              metrajeMax={metrajeMax}
              defaultProyectoId={selectedProyecto?.id}
              selectedProyectoNombre={selectedProyecto?.nombre}
              onProyectoChange={setProyectoFilter}
              onEstadosChange={setEstadosFilter}
              onMetrajeMinChange={setMetrajeMin}
              onMetrajeMaxChange={setMetrajeMax}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col gap-2">
            {/* Botón Importar - Solo Admin y Jefe Ventas (PRIMERO) */}
            {(user?.rol === 'admin' || user?.rol === 'jefe_ventas') && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors whitespace-nowrap"
                title="Importar locales desde CSV/Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Importar Locales</span>
              </button>
            )}

            {/* Botón Visita sin Local - Todos los roles (SEGUNDO) */}
            <button
              onClick={() => setIsVisitaSinLocalModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              title="Registrar visita sin local específico"
            >
              <UserPlus className="w-4 h-4" />
              <span>Visita sin Local</span>
            </button>

            {/* Botón Actualizar (TERCERO) */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {(() => {
          const defaults = ['verde', 'amarillo', 'naranja'];
          const isDefaultState =
            JSON.stringify([...estadosFilter].sort()) === JSON.stringify([...defaults].sort()) &&
            !proyectoFilter &&
            metrajeMin === undefined &&
            metrajeMax === undefined;

          const hasActiveFilters = !isDefaultState || searchCodigo;

          return hasActiveFilters ? (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {filteredLocales.length} de {locales.length} locales (filtrado)
            </div>
          ) : null;
        })()}
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
          selectedProyectoId={selectedProyecto?.id || ''}
          selectedProyectoNombre={selectedProyecto?.nombre || ''}
        />
      )}

      {/* Modal Visita sin Local */}
      <VisitaSinLocalModal
        isOpen={isVisitaSinLocalModalOpen}
        onClose={() => setIsVisitaSinLocalModalOpen(false)}
        onConfirm={handleRegistrarVisita}
        proyectos={proyectos}
      />

      {/* Panel Historial */}
      {selectedLocalForHistorial && (
        <LocalHistorialPanel
          local={selectedLocalForHistorial}
          isOpen={!!selectedLocalForHistorial}
          onClose={handleCloseHistorial}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="Aceptar"
        cancelText=""
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
