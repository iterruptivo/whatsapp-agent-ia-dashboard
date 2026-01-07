// ============================================================================
// COMPONENT: MisPendientesTable
// ============================================================================
// Descripcion: Tabla de action items asignados al usuario
// Features: Pendientes, completados recientemente, link a reunión
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Loader2,
  Calendar,
  AlertCircle,
  User,
  Video,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getUserActionItems } from '@/lib/actions-action-items';
import { ActionItemWithReunion } from '@/types/reuniones';
import PendienteCard from './PendienteCard';

export default function MisPendientesTable() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState<ActionItemWithReunion[]>([]);
  const [completadosRecientes, setCompletadosRecientes] = useState<ActionItemWithReunion[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);

    // Cargar pendientes
    const pendientesResult = await getUserActionItems(false);
    if (pendientesResult.success) {
      setPendientes(pendientesResult.actionItems);
    }

    // Cargar completados recientes (últimos 7 días)
    const completadosResult = await getUserActionItems(true);
    if (completadosResult.success) {
      const recientes = completadosResult.actionItems.filter((item) => {
        if (!item.completado_at) return false;
        const completadoDate = new Date(item.completado_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return completadoDate >= sevenDaysAgo;
      });
      setCompletadosRecientes(recientes);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Separar por prioridad
  const altaPrioridad = pendientes.filter((item) => item.prioridad === 'alta');
  const mediaPrioridad = pendientes.filter((item) => item.prioridad === 'media');
  const bajaPrioridad = pendientes.filter((item) => item.prioridad === 'baja');

  // Separar por deadline
  const vencidos = pendientes.filter((item) => {
    if (!item.deadline) return false;
    return new Date(item.deadline) < new Date();
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando pendientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-2xl font-bold text-gray-800">{pendientes.length}</div>
          <div className="text-sm text-gray-500">Total Pendientes</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-md p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-700">{vencidos.length}</div>
          <div className="text-sm text-red-600">Vencidos</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-md p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{altaPrioridad.length}</div>
          <div className="text-sm text-yellow-600">Alta Prioridad</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-md p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{completadosRecientes.length}</div>
          <div className="text-sm text-green-600">Completados (7d)</div>
        </div>
      </div>

      {/* Vencidos (si hay) */}
      {vencidos.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-700">
              Tareas Vencidas ({vencidos.length})
            </h2>
          </div>
          <div className="space-y-3">
            {vencidos.map((item) => (
              <PendienteCard key={item.id} actionItem={item} onUpdate={loadData} />
            ))}
          </div>
        </section>
      )}

      {/* Alta prioridad */}
      {altaPrioridad.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Alta Prioridad ({altaPrioridad.length})
            </h2>
          </div>
          <div className="space-y-3">
            {altaPrioridad.map((item) => (
              <PendienteCard key={item.id} actionItem={item} onUpdate={loadData} />
            ))}
          </div>
        </section>
      )}

      {/* Media prioridad */}
      {mediaPrioridad.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-5 h-5 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Media Prioridad ({mediaPrioridad.length})
            </h2>
          </div>
          <div className="space-y-3">
            {mediaPrioridad.map((item) => (
              <PendienteCard key={item.id} actionItem={item} onUpdate={loadData} />
            ))}
          </div>
        </section>
      )}

      {/* Baja prioridad */}
      {bajaPrioridad.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Baja Prioridad ({bajaPrioridad.length})
            </h2>
          </div>
          <div className="space-y-3">
            {bajaPrioridad.map((item) => (
              <PendienteCard key={item.id} actionItem={item} onUpdate={loadData} />
            ))}
          </div>
        </section>
      )}

      {/* Sin pendientes */}
      {pendientes.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <CheckSquare className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            ¡Todo completado!
          </h2>
          <p className="text-gray-500">
            No tienes action items pendientes en este momento
          </p>
        </div>
      )}

      {/* Completados recientemente (colapsable) */}
      {completadosRecientes.length > 0 && (
        <section className="bg-white rounded-lg shadow-md overflow-hidden">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showCompleted ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
              <h2 className="text-lg font-semibold text-gray-800">
                Completados Recientemente ({completadosRecientes.length})
              </h2>
            </div>
          </button>

          {showCompleted && (
            <div className="p-4 pt-0 space-y-3">
              {completadosRecientes.map((item) => (
                <PendienteCard key={item.id} actionItem={item} onUpdate={loadData} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
