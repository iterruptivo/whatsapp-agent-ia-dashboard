'use client';

/**
 * FichasInscripcionTab - Reporte de Fichas de Inscripción
 * Session 100 - Reportería de Fichas con Datos Consolidados
 *
 * Features:
 * - Filtro por proyecto
 * - Búsqueda por texto (local, titular, vendedor)
 * - Tabla con información consolidada de fichas
 * - Vista responsive (desktop/mobile)
 * - Botón para ver detalle de ficha
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  FileText,
  Eye,
  Bell,
  CheckCircle2,
  FlaskConical
} from 'lucide-react';
import {
  getFichasParaReporte,
  type FichaReporteRow
} from '@/lib/actions-fichas-reporte';
import { getProyectosConFichas } from '@/lib/actions-reporteria';
import type { Proyecto } from '@/lib/db';

// Tipo Usuario
interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'superadmin' | 'gerencia' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing' | 'corredor' | 'legal' | 'vendedor_externo' | 'postventa';
  vendedor_id: string | null;
  activo: boolean;
}

interface FichasInscripcionTabProps {
  user: Usuario;
  onVerFicha: (fichaId: string, localId: string) => void;
}

// Helper para formatear moneda USD
function formatMonto(monto: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Helper para formatear moneda PEN (Soles)
function formatMontoPEN(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Helper para formatear fecha
function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper para obtener label de rol
function getRolLabel(rol: string | null): string {
  if (!rol) return '-';
  switch (rol) {
    case 'vendedor':
      return 'Vendedor';
    case 'vendedor_caseta':
      return 'Vendedor Caseta';
    case 'coordinador':
      return 'Coordinador';
    default:
      return rol;
  }
}

export default function FichasInscripcionTab({ user: _user, onVerFicha }: FichasInscripcionTabProps) {
  // Estados de datos
  const [data, setData] = useState<FichaReporteRow[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirPruebas, setIncluirPruebas] = useState(false);

  // Cargar proyectos que tienen fichas al montar
  useEffect(() => {
    async function loadProyectos() {
      const proyectosData = await getProyectosConFichas();
      setProyectos(proyectosData);
    }
    loadProyectos();
  }, []);

  // Cargar fichas al montar y cuando cambien los filtros
  useEffect(() => {
    async function loadFichas() {
      setLoading(true);
      const fichasData = await getFichasParaReporte(proyectoId || undefined, incluirPruebas);
      setData(fichasData);
      setLoading(false);
    }
    loadFichas();
  }, [proyectoId, incluirPruebas]);

  // Filtrar datos por searchTerm (client-side, búsqueda en local, titular, vendedor)
  const filteredData = searchTerm
    ? data.filter(ficha => {
        const searchLower = searchTerm.toLowerCase();
        return (
          ficha.local_codigo.toLowerCase().includes(searchLower) ||
          ficha.titular_nombre.toLowerCase().includes(searchLower) ||
          (ficha.vendedor_nombre && ficha.vendedor_nombre.toLowerCase().includes(searchLower))
        );
      })
    : data;

  // Ordenar por fecha descendente (más recientes primero)
  const sortedData = [...filteredData].sort((a, b) => {
    return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#192c4d] flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#1b967a]" />
          Reporte de Fichas de Inscripción
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Consulta consolidada de fichas con datos de locales, vendedores y pagos
        </p>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtro Proyecto */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={proyectoId || ''}
                onChange={(e) => setProyectoId(e.target.value || null)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Búsqueda por texto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Local, titular o vendedor..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Info de registros + Toggle Pruebas */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-900">{sortedData.length}</span> fichas
          </div>

          {/* Toggle Incluir Pruebas - Discreto pero accesible */}
          <button
            onClick={() => setIncluirPruebas(!incluirPruebas)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${incluirPruebas
                ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 hover:text-gray-700'
              }
            `}
            title={incluirPruebas ? 'Click para excluir datos de prueba' : 'Click para incluir datos de prueba'}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{incluirPruebas ? 'Pruebas incluidas' : 'Sin pruebas'}</span>
            <div className={`
              w-8 h-4 rounded-full relative transition-colors duration-200
              ${incluirPruebas ? 'bg-amber-400' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200
                ${incluirPruebas ? 'left-4' : 'left-0.5'}
              `} />
            </div>
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1b967a]"></div>
              <p className="text-gray-600">Cargando fichas...</p>
            </div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fichas disponibles</h3>
            <p className="text-gray-600">Intenta ajustar los filtros para ver resultados</p>
          </div>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Local
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titular
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor/Asesor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jefe Ventas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caseta
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto USD
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto PEN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nuevo Abono
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((ficha, index) => (
                    <tr key={ficha.ficha_id} className="hover:bg-gray-50 transition-colors">
                      {/* # */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>

                      {/* Local */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ficha.local_codigo}
                      </td>

                      {/* Proyecto */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.proyecto_nombre}
                      </td>

                      {/* Titular */}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={ficha.titular_nombre}>
                          {ficha.titular_nombre}
                        </div>
                      </td>

                      {/* Vendedor/Asesor */}
                      <td className="px-4 py-3 text-sm">
                        {ficha.vendedor_nombre ? (
                          <div>
                            <div className="font-medium text-gray-900">{ficha.vendedor_nombre}</div>
                            <div className="text-xs text-gray-500">{getRolLabel(ficha.vendedor_rol)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Jefe Ventas */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.jefe_ventas_nombre || '-'}
                      </td>

                      {/* Caseta */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.vendedor_caseta_nombre || '-'}
                      </td>

                      {/* Monto USD (de vouchers OCR) */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {ficha.monto_voucher_usd > 0 ? formatMonto(ficha.monto_voucher_usd) : '-'}
                      </td>

                      {/* Monto PEN (de vouchers OCR) */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {ficha.monto_voucher_pen > 0 ? formatMontoPEN(ficha.monto_voucher_pen) : '-'}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatFecha(ficha.fecha_creacion)}
                      </td>

                      {/* Nuevo Abono */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {ficha.tiene_nuevo_abono ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b967a]/10 text-[#1b967a] rounded-full text-xs font-medium">
                            <Bell className="w-3 h-3" />
                            <span>Nuevo</span>
                          </div>
                        ) : ficha.abonos_count > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{ficha.abonos_count}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onVerFicha(ficha.ficha_id, ficha.local_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {sortedData.map((ficha, index) => (
                <div key={ficha.ficha_id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Header del card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{ficha.local_codigo}</span>
                      {ficha.tiene_nuevo_abono && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1b967a]/10 text-[#1b967a] rounded-full text-xs font-medium">
                          <Bell className="w-3 h-3" />
                          Nuevo
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatFecha(ficha.fecha_creacion)}</span>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Proyecto:</span>
                      <span className="ml-2 text-gray-900">{ficha.proyecto_nombre}</span>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Titular:</span>
                      <span className="ml-2 text-gray-900">{ficha.titular_nombre}</span>
                    </div>

                    {ficha.vendedor_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Vendedor:</span>
                        <div className="ml-2 mt-1">
                          <div className="text-gray-900">{ficha.vendedor_nombre}</div>
                          <div className="text-xs text-gray-500">{getRolLabel(ficha.vendedor_rol)}</div>
                        </div>
                      </div>
                    )}

                    {ficha.jefe_ventas_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Jefe Ventas:</span>
                        <span className="ml-2 text-gray-900">{ficha.jefe_ventas_nombre}</span>
                      </div>
                    )}

                    {ficha.vendedor_caseta_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Caseta:</span>
                        <span className="ml-2 text-gray-900">{ficha.vendedor_caseta_nombre}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex gap-4 text-sm">
                        {ficha.monto_voucher_usd > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">USD:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {formatMonto(ficha.monto_voucher_usd)}
                            </span>
                          </div>
                        )}
                        {ficha.monto_voucher_pen > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">PEN:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {formatMontoPEN(ficha.monto_voucher_pen)}
                            </span>
                          </div>
                        )}
                        {ficha.monto_voucher_usd === 0 && ficha.monto_voucher_pen === 0 && (
                          <span className="text-gray-400">Sin montos registrados</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón Ver Ficha */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => onVerFicha(ficha.ficha_id, ficha.local_id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contador de resultados */}
      {!loading && sortedData.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Mostrando {sortedData.length} {sortedData.length === 1 ? 'ficha' : 'fichas'}
        </div>
      )}
    </div>
  );
}
