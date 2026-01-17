'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Ruler,
  DollarSign,
  FileText,
  Image,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Calendar,
  Eye,
  Play,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getTerrenoById, cambiarEstadoTerreno } from '@/lib/actions-expansion';
import {
  TERRENO_ESTADO_LABELS,
  TERRENO_ESTADO_COLORS,
  TIPO_TERRENO_LABELS,
  TIPO_PROPIEDAD_LABELS,
  URGENCIA_LABELS,
} from '@/lib/types/expansion';
import type { Terreno, TerrenoEstado } from '@/lib/types/expansion';

// Transiciones de estado permitidas para admin
const TRANSICIONES_ESTADO: Record<TerrenoEstado, TerrenoEstado[]> = {
  borrador: [],
  enviado: ['en_revision', 'info_adicional', 'rechazado'],
  en_revision: ['evaluacion', 'info_adicional', 'rechazado'],
  info_adicional: ['en_revision'],
  evaluacion: ['visita_programada', 'rechazado', 'aprobado'],
  visita_programada: ['visitado'],
  visitado: ['negociacion', 'aprobado', 'rechazado'],
  negociacion: ['aprobado', 'rechazado'],
  aprobado: ['archivado'],
  rechazado: ['archivado'],
  archivado: [],
};

export default function TerrenoDetalleAdminPage() {
  const router = useRouter();
  const params = useParams();
  const terrenoId = params.id as string;
  const { user } = useAuth();

  const [terreno, setTerreno] = useState<Terreno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<TerrenoEstado | ''>('');
  const [notasEstado, setNotasEstado] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  // Verificar permisos
  const rolesPermitidos = ['superadmin', 'admin', 'gerencia', 'legal'];
  const tienePermiso = user && rolesPermitidos.includes(user.rol);

  const cargarTerreno = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTerrenoById(terrenoId);
      if (result.success && result.data) {
        setTerreno(result.data);
      } else {
        setError(result.error || 'Terreno no encontrado');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarTerreno();
    }
  }, [terrenoId, tienePermiso]);

  const handleCambiarEstado = async () => {
    if (!nuevoEstado || !terreno) return;

    setCambiandoEstado(true);
    try {
      const result = await cambiarEstadoTerreno(terreno.id, nuevoEstado, notasEstado);
      if (result.success) {
        setTerreno({ ...terreno, estado: nuevoEstado });
        setMostrarModal(false);
        setNuevoEstado('');
        setNotasEstado('');
      } else {
        alert(result.error || 'Error al cambiar estado');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setCambiandoEstado(false);
    }
  };

  if (!tienePermiso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b967a]"></div>
      </div>
    );
  }

  if (error || !terreno) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
          <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Terreno no encontrado'}
          </h2>
          <button
            onClick={() => router.push('/expansion/terrenos/inbox')}
            className="mt-4 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e]"
          >
            Volver a la bandeja
          </button>
        </div>
      </div>
    );
  }

  const estadoColors = TERRENO_ESTADO_COLORS[terreno.estado];
  const transicionesDisponibles = TRANSICIONES_ESTADO[terreno.estado] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/expansion/terrenos/inbox')}
                className="p-2 text-gray-600 hover:text-[#1b967a] hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[#192c4d]">{terreno.codigo}</h1>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors.bg} ${estadoColors.text}`}
                  >
                    {TERRENO_ESTADO_LABELS[terreno.estado]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {terreno.distrito}, {terreno.provincia}, {terreno.departamento}
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            {transicionesDisponibles.length > 0 && (
              <button
                onClick={() => setMostrarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e]"
              >
                <Play className="w-4 h-4" />
                Cambiar Estado
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ubicación */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#1b967a]" />
                Ubicación
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="font-medium">{terreno.direccion}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Departamento / Provincia / Distrito</p>
                  <p className="font-medium">
                    {terreno.departamento} / {terreno.provincia} / {terreno.distrito}
                  </p>
                </div>
                {terreno.referencia && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Referencia</p>
                    <p className="font-medium">{terreno.referencia}</p>
                  </div>
                )}
                {terreno.coordenadas_lat && terreno.coordenadas_lng && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Coordenadas</p>
                    <p className="font-medium">
                      {terreno.coordenadas_lat}, {terreno.coordenadas_lng}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Características */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <Ruler className="w-5 h-5 text-[#1b967a]" />
                Características
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Área Total</p>
                  <p className="text-lg font-bold text-[#192c4d]">
                    {terreno.area_total_m2?.toLocaleString()} m²
                  </p>
                </div>
                {terreno.area_construida_m2 > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Área Construida</p>
                    <p className="font-medium">{terreno.area_construida_m2?.toLocaleString()} m²</p>
                  </div>
                )}
                {terreno.frente_ml && (
                  <div>
                    <p className="text-sm text-gray-500">Frente</p>
                    <p className="font-medium">{terreno.frente_ml} ml</p>
                  </div>
                )}
                {terreno.fondo_ml && (
                  <div>
                    <p className="text-sm text-gray-500">Fondo</p>
                    <p className="font-medium">{terreno.fondo_ml} ml</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{TIPO_TERRENO_LABELS[terreno.tipo_terreno]}</p>
                </div>
                {terreno.zonificacion && (
                  <div>
                    <p className="text-sm text-gray-500">Zonificación</p>
                    <p className="font-medium">{terreno.zonificacion}</p>
                  </div>
                )}
              </div>

              {/* Servicios */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Servicios</p>
                <div className="flex flex-wrap gap-2">
                  {terreno.tiene_agua && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Agua</span>
                  )}
                  {terreno.tiene_luz && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                      Luz
                    </span>
                  )}
                  {terreno.tiene_desague && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Desagüe
                    </span>
                  )}
                  {terreno.tiene_internet && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      Internet
                    </span>
                  )}
                  {terreno.acceso_pavimentado && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      Acceso Pavimentado
                    </span>
                  )}
                  {!terreno.tiene_agua &&
                    !terreno.tiene_luz &&
                    !terreno.tiene_desague &&
                    !terreno.tiene_internet &&
                    !terreno.acceso_pavimentado && (
                      <span className="text-sm text-gray-400">Sin servicios registrados</span>
                    )}
                </div>
              </div>
            </div>

            {/* Documentación Legal */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#1b967a]" />
                Documentación Legal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {terreno.tipo_propiedad && (
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Propiedad</p>
                    <p className="font-medium">{TIPO_PROPIEDAD_LABELS[terreno.tipo_propiedad]}</p>
                  </div>
                )}
                {terreno.partida_registral && (
                  <div>
                    <p className="text-sm text-gray-500">Partida Registral</p>
                    <p className="font-medium">{terreno.partida_registral}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">¿Tiene Cargas?</p>
                  <p className="font-medium">{terreno.tiene_cargas ? 'Sí' : 'No'}</p>
                </div>
                {terreno.descripcion_cargas && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Descripción de Cargas</p>
                    <p className="font-medium">{terreno.descripcion_cargas}</p>
                  </div>
                )}
              </div>

              {/* Propietario */}
              {terreno.propietario_nombre && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Propietario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nombre</p>
                      <p className="font-medium">{terreno.propietario_nombre}</p>
                    </div>
                    {terreno.propietario_dni && (
                      <div>
                        <p className="text-sm text-gray-500">DNI</p>
                        <p className="font-medium">{terreno.propietario_dni}</p>
                      </div>
                    )}
                    {terreno.propietario_telefono && (
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="font-medium">{terreno.propietario_telefono}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Multimedia */}
            {((terreno.fotos_urls && terreno.fotos_urls.length > 0) ||
              (terreno.planos_urls && terreno.planos_urls.length > 0) ||
              (terreno.documentos_urls && terreno.documentos_urls.length > 0)) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-[#1b967a]" />
                  Multimedia
                </h2>

                {/* Fotos */}
                {terreno.fotos_urls && terreno.fotos_urls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Fotos ({terreno.fotos_urls.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {terreno.fotos_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Planos */}
                {terreno.planos_urls && terreno.planos_urls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Planos ({terreno.planos_urls.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {terreno.planos_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">Plano {index + 1}</span>
                          <Eye className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documentos */}
                {terreno.documentos_urls && terreno.documentos_urls.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Documentos ({terreno.documentos_urls.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {terreno.documentos_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">Documento {index + 1}</span>
                          <Eye className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Valorización */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#1b967a]" />
                Valorización
              </h2>
              {terreno.precio_solicitado ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Precio Solicitado</p>
                    <p className="text-2xl font-bold text-[#1b967a]">
                      {terreno.moneda} {terreno.precio_solicitado?.toLocaleString()}
                    </p>
                  </div>
                  {terreno.area_total_m2 && (
                    <div>
                      <p className="text-sm text-gray-500">Precio por m²</p>
                      <p className="font-medium">
                        {terreno.moneda}{' '}
                        {(terreno.precio_solicitado / terreno.area_total_m2).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">¿Negociable?</p>
                    <p className="font-medium">{terreno.precio_negociable ? 'Sí' : 'No'}</p>
                  </div>
                  {terreno.urgencia_venta && (
                    <div>
                      <p className="text-sm text-gray-500">Urgencia de Venta</p>
                      <p className="font-medium">{URGENCIA_LABELS[terreno.urgencia_venta]}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Sin información de precio</p>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#1b967a]" />
                Historial
              </h2>
              <div className="space-y-3">
                {terreno.enviado_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-500">Enviado:</span>
                    <span>{new Date(terreno.enviado_at).toLocaleDateString('es-PE')}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-500">Creado:</span>
                  <span>{new Date(terreno.created_at).toLocaleDateString('es-PE')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-500">Actualizado:</span>
                  <span>{new Date(terreno.updated_at).toLocaleDateString('es-PE')}</span>
                </div>
              </div>
            </div>

            {/* Estado Actual */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-[#1b967a]" />
                Estado Actual
              </h2>
              <div
                className={`p-4 rounded-lg ${estadoColors.bg} ${estadoColors.text} text-center`}
              >
                <p className="text-lg font-bold">{TERRENO_ESTADO_LABELS[terreno.estado]}</p>
              </div>
              {transicionesDisponibles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Transiciones disponibles:</p>
                  <div className="flex flex-wrap gap-2">
                    {transicionesDisponibles.map((estado) => (
                      <span
                        key={estado}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {TERRENO_ESTADO_LABELS[estado]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cambiar Estado */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#192c4d] mb-4">Cambiar Estado del Terreno</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Estado
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value as TerrenoEstado)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                >
                  <option value="">Seleccionar...</option>
                  {transicionesDisponibles.map((estado) => (
                    <option key={estado} value={estado}>
                      {TERRENO_ESTADO_LABELS[estado]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notasEstado}
                  onChange={(e) => setNotasEstado(e.target.value)}
                  rows={3}
                  placeholder="Agregar comentarios sobre el cambio de estado..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setNuevoEstado('');
                  setNotasEstado('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCambiarEstado}
                disabled={!nuevoEstado || cambiandoEstado}
                className="px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cambiandoEstado ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
