/**
 * SolicitudDetalleClient Component
 *
 * Vista detallada de solicitud con acciones de aprobación.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Check,
  X,
  MessageSquare,
  Loader2,
  History,
} from 'lucide-react';
import {
  aprobarRegistro,
  rechazarRegistro,
  observarRegistro,
} from '@/lib/actions-expansion';
import type { RegistroCorredor, DocumentoCorredor, HistorialCambio } from '@/lib/types/expansion';
import {
  DOCUMENTO_LABELS,
  ESTADO_COLORS,
  ESTADO_LABELS,
  ACCION_LABELS,
  DOCUMENTOS_CON_OCR,
} from '@/lib/types/expansion';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OCRDataCard from '@/components/expansion/OCRDataCard';

// ============================================================================
// TYPES
// ============================================================================

interface SolicitudDetalleClientProps {
  registro: RegistroCorredor & {
    usuario?: { nombre: string; email: string };
    documentos?: DocumentoCorredor[];
    historial?: (HistorialCambio & { usuario?: { nombre: string } })[];
  };
  usuario: {
    id: string;
    nombre: string;
    rol: string;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SolicitudDetalleClient({
  registro,
  usuario,
}: SolicitudDetalleClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAprobarModal, setShowAprobarModal] = useState(false);
  const [showObservarModal, setShowObservarModal] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canTakeAction = registro.estado === 'pendiente';

  // Handlers
  const handleAprobar = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await aprobarRegistro(registro.id);
      if (!result.success) {
        setError(result.error || 'Error al aprobar');
        return;
      }
      setShowAprobarModal(false);
      router.refresh();
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleObservar = async () => {
    if (!observaciones.trim()) {
      setError('Ingrese las observaciones');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await observarRegistro(registro.id, observaciones);
      if (!result.success) {
        setError(result.error || 'Error al observar');
        return;
      }
      setShowObservarModal(false);
      router.refresh();
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      setError('Ingrese el motivo del rechazo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await rechazarRegistro(registro.id, motivoRechazo);
      if (!result.success) {
        setError(result.error || 'Error al rechazar');
        return;
      }
      setShowRechazarModal(false);
      router.refresh();
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <DashboardHeader
        title="Detalle de Solicitud"
        subtitle={`Registro de ${registro.tipo_persona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/expansion/inbox"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inbox
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Info Principal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {registro.tipo_persona === 'natural' ? (
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-purple-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {registro.tipo_persona === 'natural'
                        ? `${registro.nombres} ${registro.apellido_paterno} ${registro.apellido_materno}`
                        : registro.razon_social}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                        ESTADO_COLORS[registro.estado].bg
                      } ${ESTADO_COLORS[registro.estado].text}`}
                    >
                      {registro.estado === 'pendiente' && <Clock className="w-4 h-4" />}
                      {registro.estado === 'observado' && <AlertCircle className="w-4 h-4" />}
                      {registro.estado === 'aprobado' && <CheckCircle className="w-4 h-4" />}
                      {registro.estado === 'rechazado' && <XCircle className="w-4 h-4" />}
                      {ESTADO_LABELS[registro.estado]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span>{registro.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span>{registro.telefono}</span>
                </div>
                <div className="flex items-start gap-3 text-gray-600 md:col-span-2">
                  <MapPin className="w-5 h-5 mt-0.5" />
                  <span>{registro.direccion_declarada}</span>
                </div>
              </div>

              {/* Datos Específicos */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {registro.tipo_persona === 'natural' ? 'Datos Personales' : 'Datos de la Empresa'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {registro.tipo_persona === 'natural' ? (
                    <>
                      <div>
                        <p className="text-gray-500">DNI</p>
                        <p className="font-medium">{registro.dni}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fecha de Nacimiento</p>
                        <p className="font-medium">{registro.fecha_nacimiento || 'No especificado'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-500">RUC</p>
                        <p className="font-medium">{registro.ruc}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Representante Legal</p>
                        <p className="font-medium">{registro.representante_legal}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">DNI Representante</p>
                        <p className="font-medium">{registro.dni_representante}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">PEP</p>
                        <p className="font-medium">{registro.es_pep ? 'Sí' : 'No'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Observaciones actuales */}
              {registro.observaciones && registro.estado === 'observado' && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800">Observaciones pendientes:</p>
                  <p className="text-sm text-orange-700 mt-1">{registro.observaciones}</p>
                </div>
              )}

              {registro.observaciones && registro.estado === 'rechazado' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Motivo del rechazo:</p>
                  <p className="text-sm text-red-700 mt-1">{registro.observaciones}</p>
                </div>
              )}
            </div>

            {/* Documentos Adjuntos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1b967a]" />
                Documentos Adjuntos ({registro.documentos?.length || 0})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {registro.documentos?.map((doc) => (
                  <div
                    key={doc.id}
                    className="relative group bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg p-4 hover:border-[#1b967a] transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 mb-2 bg-[#1b967a]/10 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#1b967a]" />
                      </div>
                      <p className="text-xs font-medium text-gray-900 mb-1">
                        {DOCUMENTO_LABELS[doc.tipo_documento].split(' (')[0]}
                      </p>
                      {doc.ocr_confianza && DOCUMENTOS_CON_OCR.includes(doc.tipo_documento) && (
                        <div className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.ocr_confianza >= 90
                            ? 'bg-green-100 text-green-700'
                            : doc.ocr_confianza >= 70
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          OCR {doc.ocr_confianza}%
                        </div>
                      )}
                      {doc.ocr_data && !doc.ocr_confianza && (
                        <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          OCR OK
                        </div>
                      )}
                    </div>
                    {doc.public_url && (
                      <a
                        href={doc.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/70 transition-all rounded-lg opacity-0 group-hover:opacity-100"
                      >
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Ver Documento
                        </span>
                      </a>
                    )}
                  </div>
                ))}
                {(!registro.documentos || registro.documentos.length === 0) && (
                  <div className="col-span-full text-gray-500 text-center py-8">
                    No hay documentos adjuntos
                  </div>
                )}
              </div>
            </div>

            {/* Datos Extraídos por OCR */}
            {registro.documentos && registro.documentos.some((doc) => doc.ocr_data) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#1b967a]" />
                  Datos Extraídos por OCR
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registro.documentos
                    .filter((doc) => doc.ocr_data)
                    .map((doc) => (
                      <OCRDataCard key={doc.id} documento={doc} />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Lateral */}
          <div className="space-y-6">
            {/* Acciones */}
            {canTakeAction && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => setShowAprobarModal(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowObservarModal(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Observar
                  </button>
                  <button
                    onClick={() => setShowRechazarModal(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            )}

            {/* Historial */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial
              </h3>
              <div className="space-y-4">
                {registro.historial?.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {ACCION_LABELS[item.accion]}
                      </p>
                      {item.comentario && (
                        <p className="text-xs text-gray-600 mt-1">{item.comentario}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {item.usuario?.nombre || 'Sistema'} - {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!registro.historial || registro.historial.length === 0) && (
                  <p className="text-gray-500 text-sm">Sin historial</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Creado</p>
                  <p className="font-medium">{formatDate(registro.created_at)}</p>
                </div>
                {registro.enviado_at && (
                  <div>
                    <p className="text-gray-500">Enviado</p>
                    <p className="font-medium">{formatDate(registro.enviado_at)}</p>
                  </div>
                )}
                {registro.aprobado_at && (
                  <div>
                    <p className="text-gray-500">Aprobado</p>
                    <p className="font-medium">{formatDate(registro.aprobado_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Usuario del Sistema</p>
                  <p className="font-medium">{registro.usuario?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Aprobar */}
      {showAprobarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aprobar Solicitud
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de aprobar esta solicitud de corredor?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900">
                Corredor: {registro.tipo_persona === 'natural'
                  ? `${registro.nombres} ${registro.apellido_paterno} ${registro.apellido_materno}`
                  : registro.razon_social}
              </p>
              <p className="text-xs text-gray-600 mt-1">{registro.email}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAprobarModal(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#156b5a] transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Observar */}
      {showObservarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Agregar Observaciones
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              El corredor recibirá estas observaciones y podrá corregir su registro.
            </p>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              placeholder="Describe las observaciones o correcciones necesarias..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowObservarModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleObservar}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar Observaciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showRechazarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rechazar Registro
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción es definitiva. El corredor no podrá modificar su registro.
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={4}
              placeholder="Indica el motivo del rechazo..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRechazarModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
