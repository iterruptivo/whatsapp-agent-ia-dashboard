// ============================================================================
// COMPONENT: LocalesTable
// ============================================================================
// Descripción: Tabla de locales con semáforo interactivo y tiempo real
// Features: Estados (verde, amarillo, naranja, rojo), confirmación, tooltip
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateLocalEstado, desbloquearLocal, updateMontoVenta, autoLiberarLocalesExpirados, salirDeNegociacion, updatePrecioBase } from '@/lib/actions-locales';
import type { Local, VendedorActivo } from '@/lib/locales';
import { getAllVendedoresActivos } from '@/lib/locales';
import { ChevronLeft, ChevronRight, History, Lock, Clock, Check } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';
import VendedorSelectModal from './VendedorSelectModal';
import ComentarioNaranjaModal from './ComentarioNaranjaModal';
import FinanciamientoModal from './FinanciamientoModal'; // SESIÓN 52: Modal para iniciar financiamiento
import DatosRegistroVentaModal from './DatosRegistroVentaModal'; // SESIÓN 52C: Modal previo para capturar datos faltantes
import TimerCountdown from './TimerCountdown'; // OPT: Componente separado para evitar re-render global

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
    actionType?: 'desbloquear' | 'salir_negociacion'; // SESIÓN 48E: Identificar tipo de acción
  }>({
    isOpen: false,
    local: null,
    nuevoEstado: null,
    title: '',
    message: '',
    variant: 'info',
  });

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

  // SESIÓN 52: State para modal de financiamiento
  const [financiamientoModal, setFinanciamientoModal] = useState<{
    isOpen: boolean;
    local: Local | null;
  }>({
    isOpen: false,
    local: null,
  });

  // SESIÓN 52C: State para modal de datos previos
  const [datosModal, setDatosModal] = useState<{
    isOpen: boolean;
    local: Local | null;
  }>({
    isOpen: false,
    local: null,
  });

  // SESIÓN 56: State para precio base inline editing
  const [precioBaseEditing, setPrecioBaseEditing] = useState<{ [localId: string]: string }>({});
  const [precioBaseUpdating, setPrecioBaseUpdating] = useState<string | null>(null);

  // SESIÓN 56: State para modal confirmación precio base
  const [precioBaseConfirmModal, setPrecioBaseConfirmModal] = useState<{
    isOpen: boolean;
    localId: string | null;
    localCodigo: string;
    nuevoPrecio: number | null;
  }>({
    isOpen: false,
    localId: null,
    localCodigo: '',
    nuevoPrecio: null,
  });

  // OPT: Timer ahora usa componente separado (TimerCountdown) que se re-renderiza solo

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

    // SESIÓN 48E: BLOQUEAR cambio directo a VERDE si hay 2+ vendedores negociando
    if (
      nuevoEstado === 'verde' &&
      local.estado === 'amarillo' &&
      (local.vendedores_negociando_ids || []).length >= 2
    ) {
      const vendedorId = user.vendedor_id || '';
      const estaEnNegociacion = (local.vendedores_negociando_ids || []).includes(vendedorId);

      if (estaEnNegociacion) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Acción Bloqueada',
          message: `Hay ${(local.vendedores_negociando_ids || []).length} vendedores negociando este local.\n\nUsa el enlace "Salir de la negociación" debajo del semáforo para abandonar tu negociación sin afectar a los demás.`,
          variant: 'warning',
        });
        return;
      }
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

    // 🚫 RESTRICCIÓN: Jefe Ventas y Coordinador solo pueden bloquear (rojo) y desbloquear (rojo->verde)
    if (user.rol === 'jefe_ventas' || user.rol === 'coordinador') {
      const esBloqueo = nuevoEstado === 'rojo';
      const esDesbloqueo = local.estado === 'rojo' && local.bloqueado && nuevoEstado === 'verde';

      // Permitir solo bloqueo (cambiar a rojo) o desbloqueo (rojo bloqueado -> verde)
      if (!esBloqueo && !esDesbloqueo) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Acción Restringida',
          message: 'Los jefes de ventas y coordinadores solo pueden:\n\n• Bloquear locales (cambiar a VENDIDO)\n• Desbloquear locales bloqueados\n\nLos cambios de estado intermedios son exclusivos de los vendedores.',
          variant: 'warning',
        });
        return;
      }

      // Si es desbloqueo, continuar con el flujo especial de desbloqueo abajo
    }

    // 🔓 CASO ESPECIAL: Admin, Jefe de Ventas o Coordinador desbloquea local en ROJO
    if (local.estado === 'rojo' && local.bloqueado && (user.rol === 'admin' || user.rol === 'jefe_ventas' || user.rol === 'coordinador')) {
      setConfirmModal({
        isOpen: true,
        local,
        nuevoEstado: null,
        actionType: 'desbloquear', // SESIÓN 48E: Identificar tipo de acción
        title: 'Desbloquear Local',
        message: `¿Deseas desbloquear este local?\n\nEl local volverá a estar disponible para cambios de estado.`,
        variant: 'warning',
      });
      return;
    }

    // Validar que local no esté bloqueado (solo admin, jefe_ventas y coordinador pueden desbloquear)
    if (local.bloqueado && user.rol !== 'admin' && user.rol !== 'jefe_ventas' && user.rol !== 'coordinador') {
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
    // SESIÓN 65: jefe_ventas y coordinador NO envían vendedorId cuando bloquean (ROJO)
    // Esto preserva el vendedor_actual_id del vendedor que hizo NARANJA
    // Solo vendedor y vendedor_caseta actualizan vendedor_actual_id
    const esRolQueNoActualizaVendedor = user?.rol === 'jefe_ventas' || user?.rol === 'coordinador';
    const vendedorId = (nuevoEstado === 'rojo' && esRolQueNoActualizaVendedor)
      ? undefined
      : (user?.vendedor_id || undefined);

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
      // SESIÓN 48E: Detectar tipo de acción
      if (confirmModal.actionType === 'salir_negociacion') {
        await executeSalirNegociacion(confirmModal.local);
      } else if (confirmModal.actionType === 'desbloquear' || confirmModal.nuevoEstado === null) {
        // Si actionType es 'desbloquear' o nuevoEstado es null (legacy), es un desbloqueo
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

  // ====== SESIÓN 48C: HELPER - Confirmar NARANJA con Comentario + Vinculación ======
  const handleConfirmarNaranjaConComentario = async (
    comentario: string,
    telefono: string,
    nombreCliente: string,
    montoSeparacion: number,
    montoVenta: number,
    leadId?: string,
    proyectoId?: string,
    agregarComoLead?: boolean
  ) => {
    if (!comentarioNaranjaModal.local) return;

    const local = comentarioNaranjaModal.local;

    try {
      setChangingLocalId(local.id);

      const result = await updateLocalEstado(
        local.id,
        'naranja',
        user?.vendedor_id || undefined,
        user?.id || undefined,
        comentario, // ✅ Comentario
        telefono,   // ✅ Teléfono para vinculación
        nombreCliente, // ✅ Nombre cliente
        montoSeparacion, // ✅ Monto de separación
        montoVenta, // ✅ Monto de venta
        leadId, // ✅ ID del lead si existe (para actualizar asistio='Si')
        proyectoId, // ✅ ID del proyecto (si se quiere crear lead manual)
        agregarComoLead // ✅ Flag para crear o no el lead manual
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

  // ====== SESIÓN 48E: HELPER - Salir de Negociación (Abrir Modal) ======
  const handleSalirNegociacion = (local: Local) => {
    if (!user || !user.vendedor_id) {
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error',
        message: 'No tienes un vendedor asignado',
        variant: 'danger',
      });
      return;
    }

    const cantidadNegociando = (local.vendedores_negociando_ids || []).length;
    const esUnico = cantidadNegociando === 1;

    // Abrir modal de confirmación
    setConfirmModal({
      isOpen: true,
      local,
      nuevoEstado: null,
      actionType: 'salir_negociacion',
      title: 'Salir de la Negociación',
      message: esUnico
        ? 'Como eres el único vendedor negociando, el local volverá a estado VERDE (libre).\n\n¿Deseas continuar?'
        : `Quedarán ${cantidadNegociando - 1} vendedor(es) negociando este local.\n\n¿Deseas salir de la negociación?`,
      variant: 'warning',
    });
  };

  // ====== SESIÓN 48E: HELPER - Ejecutar Salir de Negociación ======
  const executeSalirNegociacion = async (local: Local) => {
    if (!user?.vendedor_id) return;

    setChangingLocalId(local.id);

    try {
      const result = await salirDeNegociacion(
        local.id,
        user.vendedor_id,
        user.id || undefined
      );

      if (!result.success) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error',
          message: result.message || 'Error al salir de la negociación',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error saliendo de negociación:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Error inesperado al salir de la negociación',
        variant: 'danger',
      });
    } finally {
      setChangingLocalId(null);
    }
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

  // OPT: Funciones de timer movidas a componente TimerCountdown separado

  // ====== HELPER: Render Semáforo ======
  const renderSemaforo = (local: Local) => {
    // SESIÓN 54: Si local está en control de pagos, mostrar badge en vez de semáforo
    if (local.en_control_pagos) {
      return (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full inline-flex items-center gap-2">
            <span>🔒</span>
            En proceso de venta
          </div>
        </div>
      );
    }

    const isChanging = changingLocalId === local.id;
    const isBlocked = local.bloqueado;
    const canUnblock = user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'coordinador';

    // SESIÓN 48: Validación UI - Vendedor y Coordinador NO pueden cambiar desde NARANJA
    // (Coordinador tiene mismas restricciones que jefe_ventas para cambio de estados)
    const vendedorNoPuedeCambiarNaranja =
      local.estado === 'naranja' &&
      (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador');

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
              ? 'bg-yellow-200 border-yellow-600 scale-110 shadow-lg'
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
              ? 'bg-orange-400 border-orange-600 scale-110 shadow-lg'
              : 'bg-orange-200 border-orange-300 hover:scale-105 hover:bg-orange-300'
          } ${
            local.estado === 'naranja'
              ? 'cursor-pointer' // Si está activo (naranja), no aplicar opacity
              : (isChanging || (isBlocked && !canUnblock) || vendedorNoPuedeCambiarNaranja)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
          }`}
          title={
            vendedorNoPuedeCambiarNaranja
              ? 'Solo jefes de ventas pueden cambiar locales confirmados'
              : local.estado === 'naranja'
              ? `Confirmado (${local.vendedor_actual_nombre || 'actual'})`
              : 'Cambiar a Confirmado'
          }
        />

        {/* Círculo Rojo - Solo Admin, Jefe de Ventas y Coordinador pueden bloquear */}
        {(user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'coordinador') && (
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

  // ====== SESIÓN 48E: HELPER - Render Link "Salir de la negociación" ======
  const renderSalirNegociacion = (local: Local) => {
    // SESIÓN 54: No mostrar si local está en control de pagos
    if (local.en_control_pagos) {
      return null;
    }

    // Solo mostrar si:
    // 1. Local está en AMARILLO
    // 2. Usuario tiene vendedor_id
    // 3. Usuario está en el array vendedores_negociando_ids
    if (
      local.estado !== 'amarillo' ||
      !user?.vendedor_id ||
      !(local.vendedores_negociando_ids || []).includes(user.vendedor_id)
    ) {
      return null;
    }

    const isChanging = changingLocalId === local.id;

    return (
      <div className="mt-2">
        <button
          onClick={() => handleSalirNegociacion(local)}
          disabled={isChanging}
          className={`text-xs text-blue-600 hover:text-blue-800 hover:underline ${
            isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          Salir de la negociación
        </button>
      </div>
    );
  };

  // ====== SESIÓN 52C: HELPER - Render Link "Iniciar Registro de Venta" ======
  const handleIniciarRegistroVenta = (local: Local) => {
    // SESIÓN 52D: Verificar si faltan los datos necesarios
    // Si el vendedor pasó el local a NARANJA, estos 3 campos ya están completos
    // Solo si admin pasó directo a ROJO sin pasar por NARANJA faltarían datos
    const faltanDatos = !local.monto_venta || !local.monto_separacion || !local.vendedor_actual_id;

    if (faltanDatos) {
      // Faltan datos → Abrir modal de captura de datos previos
      setDatosModal({ isOpen: true, local });
    } else {
      // Datos completos → Abrir modal de financiamiento directamente
      setFinanciamientoModal({ isOpen: true, local });
    }
  };

  const renderIniciarFinanciamiento = (local: Local) => {
    // SESIÓN 54: No mostrar si local está en control de pagos
    if (local.en_control_pagos) {
      return null;
    }

    // Solo mostrar si local está en ROJO (vendido/bloqueado)
    if (local.estado !== 'rojo') {
      return null;
    }

    // Solo admin y jefe_ventas pueden iniciar registro de venta
    if (user?.rol !== 'admin' && user?.rol !== 'jefe_ventas') {
      return null;
    }

    return (
      <div className="mt-2">
        <button
          onClick={() => handleIniciarRegistroVenta(local)}
          className="text-xs text-green-600 hover:text-green-800 hover:underline cursor-pointer"
        >
          Iniciar Registro de Venta
        </button>
      </div>
    );
  };

  // ====== SESIÓN 52C: HANDLER - Callback onSuccess de DatosModal ======
  const handleDatosSuccess = (updatedLocal: Local) => {
    // Cerrar modal de datos
    setDatosModal({ isOpen: false, local: null });

    // Abrir modal de financiamiento con local actualizado
    setFinanciamientoModal({ isOpen: true, local: updatedLocal });

    // TODO: Refresh de la tabla se hará con revalidatePath en server action
  };

  // ====== SESIÓN 56: HELPERS - Precio Base ======
  const handlePrecioBaseChange = (localId: string, value: string) => {
    // Solo permitir números y punto decimal
    const cleanValue = value.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos decimales
    const parts = cleanValue.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;
    setPrecioBaseEditing(prev => ({ ...prev, [localId]: sanitized }));
  };

  const handlePrecioBaseSubmit = (local: Local) => {
    const inputValue = precioBaseEditing[local.id];

    // Si no hay valor en el input, usar el valor actual del local
    if (!inputValue && !local.precio_base) {
      return; // No hay nada que actualizar
    }

    const nuevoPrecio = parseFloat(inputValue || '0');

    // Validación: debe ser mayor a 0
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Valor Inválido',
        message: 'El precio base debe ser un número mayor a 0.',
        variant: 'warning',
      });
      return;
    }

    // Abrir modal de confirmación
    setPrecioBaseConfirmModal({
      isOpen: true,
      localId: local.id,
      localCodigo: local.codigo,
      nuevoPrecio: nuevoPrecio,
    });
  };

  const handlePrecioBaseConfirm = async () => {
    if (!precioBaseConfirmModal.localId || !precioBaseConfirmModal.nuevoPrecio) return;

    const localId = precioBaseConfirmModal.localId;
    const nuevoPrecio = precioBaseConfirmModal.nuevoPrecio;

    // Cerrar modal
    setPrecioBaseConfirmModal({
      isOpen: false,
      localId: null,
      localCodigo: '',
      nuevoPrecio: null,
    });

    // Loading state
    setPrecioBaseUpdating(localId);

    try {
      const result = await updatePrecioBase(localId, nuevoPrecio);

      if (!result.success) {
        setConfirmModal({
          isOpen: true,
          local: null,
          nuevoEstado: null,
          title: 'Error',
          message: result.message || 'Error al actualizar precio base.',
          variant: 'danger',
        });
      } else {
        // Limpiar input después de éxito
        setPrecioBaseEditing(prev => {
          const newState = { ...prev };
          delete newState[localId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error actualizando precio base:', error);
      setConfirmModal({
        isOpen: true,
        local: null,
        nuevoEstado: null,
        title: 'Error Inesperado',
        message: 'Error inesperado al actualizar precio base.',
        variant: 'danger',
      });
    } finally {
      setPrecioBaseUpdating(null);
    }
  };

  const handlePrecioBaseCancel = () => {
    setPrecioBaseConfirmModal({
      isOpen: false,
      localId: null,
      localCodigo: '',
      nuevoPrecio: null,
    });
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
      <div className="flex items-center justify-between mt-4 p-4">
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
      {/* Paginación Superior - HABILITADA */}
      {(totalPages > 1 || totalLocales > itemsPerPage) && (
        <div className="p-4 border-b bg-gray-50">
          {renderPagination()}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Código</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Precio Base</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Proyecto</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Metraje</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Estado</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">Monto Venta</th>
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
                return (
                  <tr key={local.id} className="border-b hover:bg-gray-50">
                    {/* Código */}
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">
                      {local.codigo}
                    </td>

                    {/* SESIÓN 56: Precio Base - Input + Botón actualizar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            precioBaseEditing[local.id] !== undefined
                              ? precioBaseEditing[local.id]
                              : local.precio_base?.toString() || ''
                          }
                          onChange={(e) => handlePrecioBaseChange(local.id, e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          disabled={precioBaseUpdating === local.id}
                        />
                        <button
                          onClick={() => handlePrecioBaseSubmit(local)}
                          disabled={precioBaseUpdating === local.id}
                          className={`p-1.5 rounded transition-colors ${
                            precioBaseUpdating === local.id
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title="Actualizar precio base"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                    {/* Proyecto */}
                    <td className="py-3 px-4 text-gray-700">
                      {local.proyecto_nombre || 'N/A'}
                    </td>

                    {/* Metraje */}
                    <td className="py-3 px-4 text-gray-700">{local.metraje} m²</td>

                    {/* Semáforo + Timer NARANJA + Link Salir Negociación + Link Iniciar Financiamiento */}
                    <td className="py-3 px-4">
                      {renderSemaforo(local)}
                      {renderSalirNegociacion(local)}
                      {renderIniciarFinanciamiento(local)}
                      {/* OPT: Componente separado para timer (solo se re-renderiza él, no toda la tabla) */}
                      {local.estado === 'naranja' && <TimerCountdown naranjaTimestamp={local.naranja_timestamp} />}
                    </td>

                    {/* Monto Venta - Solo lectura (se establece en modal NARANJA) */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">
                        {local.monto_venta && local.monto_venta > 0
                          ? `$ ${local.monto_venta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : ''}
                      </span>
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

      {/* Paginación Inferior - HABILITADA */}
      {(totalPages > 1 || totalLocales > itemsPerPage) && renderPagination()}

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

      {/* SESIÓN 48C: Modal Comentario NARANJA (con vinculación integrada) */}
      <ComentarioNaranjaModal
        isOpen={comentarioNaranjaModal.isOpen}
        local={comentarioNaranjaModal.local}
        onConfirm={handleConfirmarNaranjaConComentario}
        onCancel={handleCancelarComentarioNaranja}
      />

      {/* SESIÓN 52C: Modal Datos Previos para Registro de Venta */}
      <DatosRegistroVentaModal
        isOpen={datosModal.isOpen}
        local={datosModal.local}
        onClose={() => setDatosModal({ isOpen: false, local: null })}
        onSuccess={handleDatosSuccess}
        usuarioId={user?.id || ''}
      />

      {/* SESIÓN 52: Modal Financiamiento */}
      <FinanciamientoModal
        isOpen={financiamientoModal.isOpen}
        local={financiamientoModal.local}
        onClose={() => setFinanciamientoModal({ isOpen: false, local: null })}
      />

      {/* SESIÓN 56: Modal Confirmación Precio Base */}
      <ConfirmModal
        isOpen={precioBaseConfirmModal.isOpen}
        title="Confirmar Actualización"
        message={`¿Estás seguro de actualizar el precio base del local ${precioBaseConfirmModal.localCodigo}?\n\nNuevo precio base: $ ${precioBaseConfirmModal.nuevoPrecio?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
        variant="warning"
        confirmText="Actualizar"
        cancelText="Cancelar"
        onConfirm={handlePrecioBaseConfirm}
        onCancel={handlePrecioBaseCancel}
      />
    </div>
  );
}
