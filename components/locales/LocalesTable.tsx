// ============================================================================
// COMPONENT: LocalesTable
// ============================================================================
// Descripción: Tabla de locales con semáforo interactivo y tiempo real
// Features: Estados (verde, amarillo, naranja, rojo), confirmación, tooltip
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateLocalEstado, desbloquearLocal, updateMontoVenta, autoLiberarLocalesExpirados } from '@/lib/actions-locales';
import type { Local, VendedorActivo } from '@/lib/locales';
import { getAllVendedoresActivos } from '@/lib/locales';
import { ChevronLeft, ChevronRight, History, Lock, Link2, Clock } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import LocalTrackingModal from './LocalTrackingModal';
import VendedorSelectModal from './VendedorSelectModal';
import ComentarioNaranjaModal from './ComentarioNaranjaModal';

interface LocalesTableProps {
  locales: Local[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalLocales: number;
  onPageChange: (page: number) => void;
  onShowHistorial: (local: Local) => void;
}

export default function LocalesTable({
  locales,
  currentPage,
  totalPages,
  itemsPerPage,
  totalLocales,
  onPageChange,
  onShowHistorial,
}: LocalesTableProps) {
  const { user } = useAuth();
  const [changingLocalId, setChangingLocalId] = useState<string | null>(null);

  // State para modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    local: Local | null;
    nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo' | null;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    local: null,
    nuevoEstado: null,
    title: '',
    message: '',
    variant: 'info',
  });

  // State para edición de monto
  const [editingMontoLocalId, setEditingMontoLocalId] = useState<string | null>(null);
  const [tempMonto, setTempMonto] = useState<string>('');

  // State para tracking modal
  const [trackingLocal, setTrackingLocal] = useState<Local | null>(null);

  // State para vendedores activos (admin assignment)
  const [vendedoresActivos, setVendedoresActivos] = useState<VendedorActivo[]>([]);

  // State para modal de selección de vendedor (admin)
  const [vendedorSelectModal, setVendedorSelectModal] = useState<{
    isOpen: boolean;
    local: Local | null;
    nuevoEstado: 'amarillo' | 'naranja' | null;
  }>({
    isOpen: false,
    local: null,
    nuevoEstado: null,
  });

  // SESIÓN 48C: State para modal de comentario NARANJA
  const [comentarioNaranjaModal, setComentarioNaranjaModal] = useState<{
    isOpen: boolean;
    local: Local | null;
  }>({
    isOpen: false,
    local: null,
  });

  // SESIÓN 48B: State para actualizar timer cada segundo (cuenta regresiva en tiempo real)
  const [, setCurrentTime] = useState(Date.now());

  // ====== EFFECT: Actualizar timer cada segundo para cuenta regresiva en tiempo real ======
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now()); // Forzar re-render cada segundo
    }, 1000); // Actualizar cada 1 segundo

    return () => clearInterval(interval);
  }, []);

  // ====== EFFECT: Cargar vendedores activos si es admin ======
  useEffect(() => {
    if (user?.rol === 'admin') {
      const loadVendedores = async () => {
        const vendedores = await getAllVendedoresActivos();
        setVendedoresActivos(vendedores);
        console.log('[LocalesTable] Vendedores activos cargados:', vendedores.length);
      };
      loadVendedores();
    }
  }, [user?.rol]);

  // ====== HELPER: Cambiar Estado con Confirmación ======
  const handleEstadoChange = (
    local: Local,
    nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo'
  ) => {
    // Validar que usuario esté autenticado
    if (!user) {
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Acceso Denegado',
        message: 'Debes estar autenticado para cambiar estados.',
        variant: 'info',
      });
      return;
    }

    // SESIÓN 48C: Si es vendedor/vendedor_caseta cambiando a NARANJA → mostrar modal comentario
    if (
      nuevoEstado === 'naranja' &&
      (user.rol === 'vendedor' || user.rol === 'vendedor_caseta')
    ) {
      // Abrir modal de comentario (NO cambiar estado todavía)
      setComentarioNaranjaModal({
        isOpen: true,
        local: local,
      });
      return; // Detener flujo - modal manejará el cambio
    }

    // ✅ NUEVO: Admin puede cambiar estados pero debe asignar vendedor para amarillo/naranja
    if (user.rol === 'admin') {
      // Caso especial: Admin cambia a amarillo o naranja → Mostrar modal de asignación
      if (nuevoEstado === 'amarillo' || nuevoEstado === 'naranja') {
        setVendedorSelectModal({
          isOpen: true,
          local,
          nuevoEstado,
        });
        return;
      }
      // Verde y Rojo siguen el flujo normal (verde = liberar, rojo = bloquear)
    }

    // 🚫 RESTRICCIÓN: Jefe Ventas solo puede bloquear (rojo) y desbloquear (rojo->verde)
    if (user.rol === 'jefe_ventas') {
      const esBloqueo = nuevoEstado === 'rojo';
      const esDesbloqueo = local.estado === 'rojo' && local.bloqueado && nuevoEstado === 'verde';

      // Permitir solo bloqueo (cambiar a rojo) o desbloqueo (rojo bloqueado -> verde)
      if (!esBloqueo && !esDesbloqueo) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Acción Restringida',
          message: 'Los jefes de ventas solo pueden:\n\n• Bloquear locales (cambiar a VENDIDO)\n• Desbloquear locales bloqueados\n\nLos cambios de estado intermedios son exclusivos de los vendedores.',
          variant: 'warning',
        });
        return;
      }

      // Si es desbloqueo, continuar con el flujo especial de desbloqueo abajo
    }

    // 🔓 CASO ESPECIAL: Admin o Jefe de Ventas desbloquea local en ROJO
    if (local.estado === 'rojo' && local.bloqueado && (user.rol === 'admin' || user.rol === 'jefe_ventas')) {
      setConfirmModal({
        isOpen: true,
        local,
        nuevoEstado: null, // null indica que es desbloqueo, no cambio de estado
        title: 'Desbloquear Local',
        message: `¿Deseas desbloquear este local?\n\nEl local volverá a estar disponible para cambios de estado.`,
        variant: 'warning',
      });
      return;
    }

    // Validar que local no esté bloqueado (solo admin y jefe_ventas pueden desbloquear)
    if (local.bloqueado && user.rol !== 'admin' && user.rol !== 'jefe_ventas') {
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Local Bloqueado',
        message: 'Este local está bloqueado. Solo los administradores y jefes de ventas pueden desbloquearlo.',
        variant: 'info',
      });
      return;
    }

    // Obtener vendedor_id del usuario actual
    const vendedorId = user.vendedor_id || undefined;

    // ⚠️ CONFIRMACIÓN CRÍTICA: Si el estado va a cambiar a ROJO
    if (nuevoEstado === 'rojo') {
      // Verificar si otro vendedor ya puso NARANJA
      if (local.estado === 'naranja' && local.vendedor_actual_id && local.vendedor_actual_id !== vendedorId) {
        setConfirmModal({
          isOpen: true,
          local,
          nuevoEstado,
          title: '⚠️ ADVERTENCIA',
          message: `Este local está en NARANJA por ${local.vendedor_actual_nombre || 'otro vendedor'}.\n\nSi continúas, lo cerrarás como VENDIDO y quedará bloqueado.\n\n¿Estás SEGURO de que quieres proceder?`,
          variant: 'danger',
        });
      } else {
        // Confirmación estándar para ROJO
        setConfirmModal({
          isOpen: true,
          local,
          nuevoEstado,
          title: 'Confirmar Venta',
          message: '¿Estás seguro de que deseas marcar este local como VENDIDO?\n\n⚠️ Esta acción BLOQUEARÁ el local permanentemente.\nSolo un administrador podrá desbloquearlo.',
          variant: 'danger',
        });
      }
    } else {
      // Para estados verde, amarillo, naranja - cambio directo sin confirmación
      executeEstadoChange(local, nuevoEstado);
    }
  };

  // ====== HELPER: Ejecutar Cambio de Estado ======
  const executeEstadoChange = async (
    local: Local,
    nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo'
  ) => {
    const vendedorId = user?.vendedor_id || undefined;

    // Loading state
    setChangingLocalId(local.id);

    try {
      // Llamar Server Action (pasar user.id para historial)
      const result = await updateLocalEstado(local.id, nuevoEstado, vendedorId, user?.id);

      if (!result.success) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error',
          message: result.message || 'Ocurrió un error al cambiar el estado.',
          variant: 'danger',
        });
      }
      // No mostrar modal de éxito, el cambio se ve en tiempo real
    } catch (error) {
      console.error('Error updating estado:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Ocurrió un error inesperado al cambiar el estado. Por favor, intenta de nuevo.',
        variant: 'danger',
      });
    } finally {
      setChangingLocalId(null);
    }
  };

  // ====== HELPER: Manejar Confirmación del Modal ======
  const handleConfirmModalAction = async () => {
    if (confirmModal.local) {
      // Si nuevoEstado es null, es un desbloqueo
      if (confirmModal.nuevoEstado === null) {
        await handleDesbloquearLocal(confirmModal.local);
      } else {
        // Si hay nuevoEstado, es un cambio de estado normal
        executeEstadoChange(confirmModal.local, confirmModal.nuevoEstado);
      }
    }
    // Cerrar modal
    setConfirmModal({
      isOpen: false,
      local: null,
      nuevoEstado: null,
      title: '',
      message: '',
      variant: 'info',
    });
  };

  // ====== HELPER: Desbloquear Local (solo admin) ======
  const handleDesbloquearLocal = async (local: Local) => {
    setChangingLocalId(local.id);

    try {
      const result = await desbloquearLocal(local.id, user?.id);

      if (!result.success) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error al Desbloquear',
          message: result.message || 'No se pudo desbloquear el local.',
          variant: 'danger',
        });
      }
      // No mostrar modal de éxito, el cambio se ve en tiempo real
    } catch (error) {
      console.error('Error desbloqueando local:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Ocurrió un error inesperado al desbloquear el local.',
        variant: 'danger',
      });
    } finally {
      setChangingLocalId(null);
    }
  };

  // ====== SESIÓN 48C: HELPER - Confirmar NARANJA con Comentario ======
  const handleConfirmarNaranjaConComentario = async (comentario: string) => {
    if (!comentarioNaranjaModal.local) return;

    const local = comentarioNaranjaModal.local;

    try {
      setChangingLocalId(local.id);

      const result = await updateLocalEstado(
        local.id,
        'naranja',
        user?.vendedor_id || undefined,
        user?.id || undefined,
        comentario // ✅ Pasar comentario
      );

      if (result.success) {
        // Cerrar modal
        setComentarioNaranjaModal({ isOpen: false, local: null });
      } else {
        alert(result.message || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error confirmando NARANJA:', error);
      alert('Error inesperado al confirmar el local');
    } finally {
      setChangingLocalId(null);
    }
  };

  // ====== SESIÓN 48C: HELPER - Cancelar Modal Comentario NARANJA ======
  const handleCancelarComentarioNaranja = () => {
    setComentarioNaranjaModal({ isOpen: false, local: null });
  };

  // ====== HELPER: Admin Asigna Vendedor (Amarillo/Naranja) ======
  const handleVendedorSelectConfirm = async (vendedorId: string) => {
    if (!vendedorSelectModal.local || !vendedorSelectModal.nuevoEstado) {
      console.error('[LocalesTable] Modal state invalid');
      return;
    }

    const local = vendedorSelectModal.local;
    const nuevoEstado = vendedorSelectModal.nuevoEstado;

    // Cerrar modal
    setVendedorSelectModal({ isOpen: false, local: null, nuevoEstado: null });

    // Ejecutar cambio de estado con vendedor asignado
    setChangingLocalId(local.id);

    try {
      const result = await updateLocalEstado(
        local.id,
        nuevoEstado,
        vendedorId, // ✅ Vendedor seleccionado por admin
        user?.id    // ✅ Admin que hace la acción
      );

      if (result.success) {
        console.log(`[LocalesTable] Admin asignó local ${local.codigo} a vendedor con estado ${nuevoEstado}`);
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Estado Actualizado',
          message: `Local ${local.codigo} asignado con estado ${nuevoEstado === 'amarillo' ? 'Amarillo' : 'Naranja'}.`,
          variant: 'info',
        });
      } else {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error al Actualizar',
          message: result.message || 'No se pudo cambiar el estado del local.',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error asignando vendedor:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Ocurrió un error inesperado al asignar el vendedor.',
        variant: 'danger',
      });
    } finally {
      setChangingLocalId(null);
    }
  };

  // ====== HELPER: Actualizar Monto de Venta ======
  const handleMontoBlur = async (local: Local) => {
    if (!tempMonto || tempMonto === '') {
      setEditingMontoLocalId(null);
      return;
    }

    const monto = parseFloat(tempMonto);
    if (isNaN(monto) || monto <= 0) {
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Monto Inválido',
        message: 'Por favor ingresa un monto válido mayor a 0.',
        variant: 'warning',
      });
      setEditingMontoLocalId(null);
      setTempMonto('');
      return;
    }

    try {
      const result = await updateMontoVenta(local.id, monto, user?.id);

      if (!result.success) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error al Actualizar Monto',
          message: result.message || 'No se pudo actualizar el monto. Verifica que la columna monto_venta exista en la base de datos.',
          variant: 'danger',
        });
      } else {
        // Éxito - mostrar confirmación
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Monto Actualizado',
          message: `Monto establecido: $ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          variant: 'info',
        });
      }
    } catch (error) {
      console.error('Error actualizando monto:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Ocurrió un error inesperado al actualizar el monto. Por favor intenta nuevamente.',
        variant: 'danger',
      });
    } finally {
      setEditingMontoLocalId(null);
      setTempMonto('');
    }
  };

  // ====== HELPER: Cancelar Modal ======
  const handleCancelModal = () => {
    setConfirmModal({
      isOpen: false,
      local: null,
      nuevoEstado: null,
      title: '',
      message: '',
      variant: 'info',
    });
  };

  // ====== SESIÓN 48: HELPER - Calcular Tiempo Restante Timer NARANJA ======
  const calcularTiempoRestante = (naranjaTimestamp: string | null) => {
    if (!naranjaTimestamp) return null;

    const inicio = new Date(naranjaTimestamp);
    const ahora = new Date();
    const fin = new Date(inicio.getTime() + 120 * 60 * 60 * 1000); // +120 horas

    const msRestantes = fin.getTime() - ahora.getTime();

    // Si ya expiró
    if (msRestantes <= 0) {
      return { expired: true, text: 'Expirado', percent: 0, dias: 0, horas: 0, minutos: 0, segundos: 0 };
    }

    // Calcular tiempo restante con segundos
    const segundosTotales = Math.floor(msRestantes / 1000);
    const minutosTotales = Math.floor(segundosTotales / 60);
    const horasTotales = Math.floor(minutosTotales / 60);

    const diasRestantes = Math.floor(horasTotales / 24);
    const horasRestantes = horasTotales % 24;
    const minutosRestantes = minutosTotales % 60;
    const segundosRestantes = segundosTotales % 60;

    // Porcentaje de timer (0-100%)
    const porcentaje = (horasTotales / 120) * 100;

    // Texto para badge con segundos
    let text = '';
    if (diasRestantes > 0) {
      text = `Quedan ${diasRestantes}d ${horasRestantes}h ${minutosRestantes}m ${segundosRestantes}s`;
    } else if (horasRestantes > 0) {
      text = `Quedan ${horasRestantes}h ${minutosRestantes}m ${segundosRestantes}s`;
    } else {
      text = `Quedan ${minutosRestantes}m ${segundosRestantes}s`;
    }

    return {
      expired: false,
      text,
      percent: porcentaje,
      dias: diasRestantes,
      horas: horasRestantes,
      minutos: minutosRestantes,
      segundos: segundosRestantes,
    };
  };

  // ====== SESIÓN 48: HELPER - Render Timer con Progress Bar ======
  const renderTimer = (local: Local) => {
    // Solo mostrar timer si estado === 'naranja' y hay timestamp
    if (local.estado !== 'naranja' || !local.naranja_timestamp) return null;

    const tiempo = calcularTiempoRestante(local.naranja_timestamp);
    if (!tiempo || tiempo.expired) return null;

    return (
      <div className="mt-2 space-y-1">
        {/* Progress Bar Azul */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full border border-blue-300">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${tiempo.percent}%` }}
          />
        </div>

        {/* Badge con tiempo restante */}
        <div className="flex items-center gap-1 text-xs text-blue-700">
          <Clock className="w-3 h-3" />
          <span className="font-medium">{tiempo.text}</span>
        </div>
      </div>
    );
  };

  // ====== HELPER: Render Semáforo ======
  const renderSemaforo = (local: Local) => {
    const isChanging = changingLocalId === local.id;
    const isBlocked = local.bloqueado;
    const canUnblock = user?.rol === 'admin' || user?.rol === 'jefe_ventas';

    // SESIÓN 48: Validación UI - Vendedor NO puede cambiar desde NARANJA
    const vendedorNoPuedeCambiarNaranja =
      local.estado === 'naranja' &&
      (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta');

    // SESIÓN 48D: Calcular cantidad de vendedores negociando
    const cantidadNegociando = (local.vendedores_negociando_ids || []).length;
    const mostrarContador = cantidadNegociando >= 2; // Solo si hay 2 o más

    return (
      <div className="flex items-center gap-2">
        {/* Círculo Verde */}
        <button
          onClick={() => handleEstadoChange(local, 'verde')}
          disabled={isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            local.estado === 'verde'
              ? 'bg-green-500 border-green-600 scale-110 shadow-lg'
              : 'bg-green-200 border-green-300 hover:scale-105 hover:bg-green-300'
          } ${isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={
            vendedorNoPuedeCambiarNaranja
              ? 'Solo jefes de ventas pueden cambiar locales confirmados'
              : local.estado === 'verde'
              ? 'Libre (actual)'
              : isBlocked && canUnblock
              ? 'Desbloquear local'
              : 'Cambiar a Libre'
          }
        />

        {/* Círculo Amarillo - CON CONTADOR */}
        <button
          onClick={() => handleEstadoChange(local, 'amarillo')}
          disabled={isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja}
          className={`w-8 h-8 rounded-full border-2 transition-all relative ${
            local.estado === 'amarillo'
              ? 'bg-yellow-500 border-yellow-600 scale-110 shadow-lg'
              : 'bg-yellow-200 border-yellow-300 hover:scale-105 hover:bg-yellow-300'
          } ${isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={
            vendedorNoPuedeCambiarNaranja
              ? 'Solo jefes de ventas pueden cambiar locales confirmados'
              : local.estado === 'amarillo'
              ? `Negociando (${local.vendedor_actual_nombre || 'actual'})`
              : 'Cambiar a Negociando'
          }
        >
          {/* SESIÓN 48D: Contador de vendedores negociando */}
          {mostrarContador && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
              {cantidadNegociando}
            </span>
          )}
        </button>

        {/* Círculo Naranja */}
        <button
          onClick={() => handleEstadoChange(local, 'naranja')}
          disabled={isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            local.estado === 'naranja'
              ? 'bg-orange-500 border-orange-600 scale-110 shadow-lg'
              : 'bg-orange-200 border-orange-300 hover:scale-105 hover:bg-orange-300'
          } ${isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={
            vendedorNoPuedeCambiarNaranja
              ? 'Solo jefes de ventas pueden cambiar locales confirmados'
              : local.estado === 'naranja'
              ? `Confirmado (${local.vendedor_actual_nombre || 'actual'})`
              : 'Cambiar a Confirmado'
          }
        />

        {/* Círculo Rojo - Solo Admin y Jefe de Ventas pueden bloquear */}
        {(user?.rol === 'admin' || user?.rol === 'jefe_ventas') && (
          <button
            onClick={() => handleEstadoChange(local, 'rojo')}
            disabled={isChanging || (isBlocked && !canUnblock)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              local.estado === 'rojo'
                ? 'bg-red-500 border-red-600 scale-110 shadow-lg'
                : 'bg-red-200 border-red-300 hover:scale-105 hover:bg-red-300'
            } ${isChanging || (isBlocked && !canUnblock) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={
              local.estado === 'rojo'
                ? `Vendido (${local.vendedor_cerro_venta_nombre || 'actual'})`
                : 'Cambiar a Vendido'
            }
          />
        )}

        {/* Icono de bloqueado */}
        {isBlocked && (
          <span title="Local bloqueado">
            <Lock className="w-4 h-4 text-red-600 ml-1" />
          </span>
        )}
      </div>
    );
  };

  // ====== HELPER: Paginación ======
  const renderPagination = () => {
    // Protección: Si no hay páginas válidas, no renderizar
    if (totalPages < 1) return null;

    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar: 1 ... actual-1 actual actual+1 ... último
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      if (currentPage > 2) pages.push(currentPage - 1);
      if (currentPage !== 1 && currentPage !== totalPages) pages.push(currentPage);
      if (currentPage < totalPages - 1) pages.push(currentPage + 1);
      if (currentPage < totalPages - 2) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }

    // Calcular rango de items mostrados
    const startItem = Math.max(1, (currentPage - 1) * itemsPerPage + 1);
    const endItem = Math.min(currentPage * itemsPerPage, totalLocales);
    const showingCount = Math.max(0, endItem - startItem + 1);

    return (
      <div className="flex items-center justify-between mt-4">
        {/* Info */}
        <p className="text-sm text-gray-600">
          {totalLocales > 0 ? (
            <>
              Mostrando {startItem}-{endItem} de {totalLocales} locales
            </>
          ) : (
            'No hay locales'
          )}
        </p>

        {/* Botones */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`px-3 py-1 rounded-lg ${
                page === currentPage
                  ? 'bg-primary text-white'
                  : page === '...'
                  ? 'cursor-default'
                  : 'hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ====== RENDER ======

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Paginación Superior - TEMPORALMENTE DESHABILITADA */}
      {/* {(totalPages > 1 || totalLocales > itemsPerPage) && (
        <div className="p-4 border-b bg-gray-50">
          {renderPagination()}
        </div>
      )} */}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Código</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Proyecto</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Metraje</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Estado</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Monto Venta</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Cell Cliente</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Vendedor Actual</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No hay locales para mostrar
                </td>
              </tr>
            ) : (
              locales.map((local) => {
                const canEditMonto = (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta') && local.estado === 'naranja';
                const isEditingMonto = editingMontoLocalId === local.id;

                return (
                  <tr key={local.id} className="border-b hover:bg-gray-50">
                    {/* Código */}
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">
                      {local.codigo}
                    </td>

                    {/* Proyecto */}
                    <td className="py-3 px-4 text-gray-700">
                      {local.proyecto_nombre || 'N/A'}
                    </td>

                    {/* Metraje */}
                    <td className="py-3 px-4 text-gray-700">{local.metraje} m²</td>

                    {/* Semáforo + Timer NARANJA */}
                    <td className="py-3 px-4">
                      {renderSemaforo(local)}
                      {renderTimer(local)}
                    </td>

                    {/* Monto Venta */}
                    <td className="py-3 px-4">
                      {canEditMonto ? (
                        isEditingMonto ? (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ingrese monto"
                            value={tempMonto}
                            onChange={(e) => setTempMonto(e.target.value)}
                            onBlur={() => handleMontoBlur(local)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleMontoBlur(local);
                              if (e.key === 'Escape') {
                                setEditingMontoLocalId(null);
                                setTempMonto('');
                              }
                            }}
                            autoFocus
                            className="w-32 px-2 py-1 border border-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingMontoLocalId(local.id);
                              setTempMonto(local.monto_venta ? local.monto_venta.toString() : '');
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            {local.monto_venta
                              ? `$ ${local.monto_venta.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              : 'Establecer monto'}
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-500">
                          {local.monto_venta
                            ? `$ ${local.monto_venta.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </span>
                      )}
                    </td>

                    {/* Tracking */}
                    <td className="py-3 px-4">
                      {(user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta') ? (
                        <button
                          onClick={() => setTrackingLocal(local)}
                          className="flex items-center gap-1 text-sm text-secondary hover:text-secondary/80"
                          title="Vincular lead"
                        >
                          <Link2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Vincular</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>

                    {/* Vendedor Actual */}
                    <td className="py-3 px-4 text-gray-700">
                      {local.vendedor_actual_nombre || '-'}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onShowHistorial(local)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                        title="Ver historial"
                      >
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">Historial</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación Inferior - TEMPORALMENTE DESHABILITADA */}
      {/* {(totalPages > 1 || totalLocales > itemsPerPage) && renderPagination()} */}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.nuevoEstado ? 'Confirmar' : 'Aceptar'}
        cancelText="Cancelar"
        onConfirm={handleConfirmModalAction}
        onCancel={handleCancelModal}
      />

      {/* Modal de Selección de Vendedor (Admin asigna amarillo/naranja) */}
      <VendedorSelectModal
        isOpen={vendedorSelectModal.isOpen}
        vendedores={vendedoresActivos}
        estadoDestino={vendedorSelectModal.nuevoEstado || 'amarillo'}
        localCodigo={vendedorSelectModal.local?.codigo || ''}
        vendedorActualId={vendedorSelectModal.local?.vendedor_actual_id || null}
        onConfirm={handleVendedorSelectConfirm}
        onCancel={() => setVendedorSelectModal({ isOpen: false, local: null, nuevoEstado: null })}
      />

      {/* Tracking Modal */}
      {trackingLocal && (
        <LocalTrackingModal
          local={trackingLocal}
          isOpen={!!trackingLocal}
          onClose={() => setTrackingLocal(null)}
          onSuccess={() => {
            // Opcional: Recargar o mostrar mensaje
            setTrackingLocal(null);
          }}
          usuarioId={user?.id}
        />
      )}

      {/* SESIÓN 48C: Modal Comentario NARANJA */}
      <ComentarioNaranjaModal
        isOpen={comentarioNaranjaModal.isOpen}
        local={comentarioNaranjaModal.local}
        onConfirm={handleConfirmarNaranjaConComentario}
        onCancel={handleCancelarComentarioNaranja}
      />
    </div>
  );
}
