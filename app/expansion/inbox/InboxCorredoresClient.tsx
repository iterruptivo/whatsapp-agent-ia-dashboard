/**
 * InboxCorredoresClient Component
 *
 * Bandeja de solicitudes de corredores con filtros y acciones.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Users,
  Building2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { getAllRegistros, getInboxStats } from '@/lib/actions-expansion';
import type {
  RegistroListItem,
  EstadoRegistro,
  TipoPersona,
  InboxStats,
} from '@/lib/types/expansion';
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/types/expansion';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

// ============================================================================
// TYPES
// ============================================================================

interface InboxCorredoresClientProps {
  usuario: {
    id: string;
    nombre: string;
    rol: string;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function InboxCorredoresClient({
  usuario,
}: InboxCorredoresClientProps) {
  const [registros, setRegistros] = useState<RegistroListItem[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoRegistro | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<TipoPersona | ''>('');
  const [busqueda, setBusqueda] = useState('');

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [registrosResult, statsResult] = await Promise.all([
        getAllRegistros({
          estado: filtroEstado || undefined,
          tipo_persona: filtroTipo || undefined,
          busqueda: busqueda || undefined,
        }),
        getInboxStats(),
      ]);

      if (registrosResult.success) {
        setRegistros(registrosResult.data || []);
      }
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroEstado, filtroTipo]);

  // Buscar con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.length === 0 || busqueda.length >= 3) {
        loadData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <DashboardHeader
        title="Solicitudes de Corredores"
        subtitle="Revisa y gestiona registros de corredores"
      />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200">
              <p className="text-sm text-yellow-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.pendientes}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-200">
              <p className="text-sm text-orange-600">Observados</p>
              <p className="text-2xl font-bold text-orange-700">{stats.observados}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
              <p className="text-sm text-green-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-700">{stats.aprobados}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200">
              <p className="text-sm text-red-600">Rechazados</p>
              <p className="text-2xl font-bold text-red-700">{stats.rechazados}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, email, DNI, RUC..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Filtro Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoRegistro | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="observado">Observados</option>
              <option value="aprobado">Aprobados</option>
              <option value="rechazado">Rechazados</option>
              <option value="borrador">Borradores</option>
            </select>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoPersona | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Todos los tipos</option>
              <option value="natural">Persona Natural</option>
              <option value="juridica">Persona Jurídica</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros que mostrar</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Corredor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Docs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {registros.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {registro.tipo_persona === 'natural' ? (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {registro.nombre_completo}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          registro.tipo_persona === 'natural'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {registro.tipo_persona === 'natural' ? 'Natural' : 'Jurídica'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{registro.email}</p>
                      <p className="text-sm text-gray-500">{registro.telefono}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {registro.documentos_count} archivo(s)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          ESTADO_COLORS[registro.estado].bg
                        } ${ESTADO_COLORS[registro.estado].text}`}
                      >
                        {registro.estado === 'pendiente' && <Clock className="w-3 h-3" />}
                        {registro.estado === 'observado' && <AlertCircle className="w-3 h-3" />}
                        {registro.estado === 'aprobado' && <CheckCircle className="w-3 h-3" />}
                        {registro.estado === 'rechazado' && <XCircle className="w-3 h-3" />}
                        {ESTADO_LABELS[registro.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {formatDate(registro.enviado_at || registro.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/expansion/${registro.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
