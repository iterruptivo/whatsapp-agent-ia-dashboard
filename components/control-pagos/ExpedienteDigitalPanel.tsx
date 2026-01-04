// ============================================================================
// COMPONENT: ExpedienteDigitalPanel
// ============================================================================
// Descripcion: Panel con timeline del expediente digital
// Features: Vista timeline, checklist documentos, descarga PDF
// Fase: 6 - Expediente Digital
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  X,
  Loader2,
  FolderOpen,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  getExpedienteTimeline,
  getExpedienteParaPDF,
  type ExpedienteResumen,
  type ExpedienteEvento,
} from '@/lib/actions-expediente';
import { downloadExpedientePDF } from '@/lib/pdf-expediente';

interface ExpedienteDigitalPanelProps {
  controlPagoId: string;
  localCodigo: string;
  clienteNombre: string;
  onClose: () => void;
}

export default function ExpedienteDigitalPanel({
  controlPagoId,
  localCodigo,
  clienteNombre,
  onClose,
}: ExpedienteDigitalPanelProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [expediente, setExpediente] = useState<ExpedienteResumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'checklist'>('timeline');

  // Cargar expediente
  useEffect(() => {
    const loadExpediente = async () => {
      setLoading(true);
      setError(null);

      const result = await getExpedienteTimeline(controlPagoId);
      if (result.success && result.data) {
        setExpediente(result.data);
      } else {
        setError(result.error || 'Error cargando expediente');
      }

      setLoading(false);
    };

    loadExpediente();
  }, [controlPagoId]);

  // Descargar PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      const result = await getExpedienteParaPDF(controlPagoId);
      if (result.success && result.data) {
        downloadExpedientePDF(result.data);
      } else {
        alert('Error generando PDF: ' + (result.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error descargando PDF:', err);
      alert('Error descargando PDF');
    }

    setDownloading(false);
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Icono segun tipo de evento
  const getEventoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ficha_creada':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'documento_subido':
        return <FolderOpen className="w-4 h-4 text-purple-500" />;
      case 'pago_registrado':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'pago_verificado':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'constancia_generada':
        return <FileCheck className="w-4 h-4 text-teal-500" />;
      case 'contrato_generado':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'expediente_completo':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Label del tipo de evento
  const getEventoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      ficha_creada: 'Ficha Creada',
      documento_subido: 'Documento Subido',
      pago_registrado: 'Pago Registrado',
      pago_verificado: 'Pago Verificado',
      constancia_generada: 'Constancia Generada',
      contrato_generado: 'Contrato Generado',
      expediente_completo: 'Expediente Completo',
    };
    return labels[tipo] || tipo;
  };

  // Checklist items
  const checklistItems = [
    { key: 'dni_titular', label: 'DNI Titular', required: true },
    { key: 'dni_conyuge', label: 'DNI Conyuge', required: false },
    { key: 'voucher_separacion', label: 'Voucher Separacion', required: true },
    { key: 'constancia_separacion', label: 'Constancia Separacion', required: false },
    { key: 'voucher_inicial', label: 'Voucher Inicial', required: false },
    { key: 'contrato', label: 'Contrato', required: false },
    { key: 'constancia_cancelacion', label: 'Constancia Cancelacion', required: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1b967a] to-[#158f6e] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Expediente Digital</h2>
              <p className="text-white/80 text-sm">
                Local {localCodigo} - {clienteNombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-[#1b967a] text-[#1b967a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'checklist'
                  ? 'border-[#1b967a] text-[#1b967a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
              Checklist
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          ) : expediente ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {expediente.total_eventos}
                  </div>
                  <div className="text-sm text-blue-600">Eventos</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {expediente.total_documentos}
                  </div>
                  <div className="text-sm text-purple-600">Documentos</div>
                </div>
                <div
                  className={`${
                    expediente.expediente_completo
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  } border rounded-lg p-4 text-center`}
                >
                  <div
                    className={`text-2xl font-bold ${
                      expediente.expediente_completo ? 'text-green-700' : 'text-yellow-700'
                    }`}
                  >
                    {expediente.expediente_completo ? 'Completo' : 'Pendiente'}
                  </div>
                  <div
                    className={`text-sm ${
                      expediente.expediente_completo ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    Estado
                  </div>
                </div>
              </div>

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {expediente.eventos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>No hay eventos registrados</p>
                      <p className="text-sm">
                        Los eventos se registran automaticamente al realizar acciones
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                      {/* Events */}
                      {expediente.eventos.map((evento, index) => (
                        <TimelineEvent
                          key={evento.id}
                          evento={evento}
                          isFirst={index === 0}
                          isLast={index === expediente.eventos.length - 1}
                          formatDate={formatDate}
                          getEventoIcon={getEventoIcon}
                          getEventoLabel={getEventoLabel}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Checklist Tab */}
              {activeTab === 'checklist' && (
                <div className="space-y-3">
                  {checklistItems.map((item) => {
                    const isComplete = expediente.checklist[item.key] === true;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isComplete
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span
                          className={`flex-1 ${
                            isComplete ? 'text-green-700' : 'text-gray-600'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.required && !isComplete && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            Requerido
                          </span>
                        )}
                        {isComplete && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                            Completado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {expediente?.total_eventos || 0} eventos en el expediente
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158f6e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componente para evento del timeline
function TimelineEvent({
  evento,
  isFirst,
  isLast,
  formatDate,
  getEventoIcon,
  getEventoLabel,
}: {
  evento: ExpedienteEvento;
  isFirst: boolean;
  isLast: boolean;
  formatDate: (date: string) => string;
  getEventoIcon: (tipo: string) => React.ReactNode;
  getEventoLabel: (tipo: string) => string;
}) {
  return (
    <div className="relative pl-10 pb-6">
      {/* Dot */}
      <div className="absolute left-2 top-1 w-5 h-5 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center z-10">
        {getEventoIcon(evento.tipo_evento)}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-800">
              {getEventoLabel(evento.tipo_evento)}
            </h4>
            {evento.descripcion && (
              <p className="text-sm text-gray-600 mt-1">{evento.descripcion}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(evento.created_at)}
            </div>
            {evento.usuario_nombre && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <User className="w-3 h-3" />
                {evento.usuario_nombre}
              </div>
            )}
          </div>
        </div>

        {/* Documento link */}
        {evento.documento_url && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <a
              href={evento.documento_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#1b967a] hover:text-[#158f6e]"
            >
              <FileText className="w-4 h-4" />
              {evento.documento_nombre || 'Ver documento'}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
