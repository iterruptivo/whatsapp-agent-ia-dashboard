// ============================================================================
// COMPONENT: GenerarContratoModal
// ============================================================================
// Descripcion: Modal para generar contrato con opcion de template personalizado
// Fase: 7 - Contratos Flexibles
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  DollarSign,
  User,
  MapPin,
  Building,
  Trash2,
} from 'lucide-react';
import {
  downloadProyectoTemplate,
  getProyectoTemplateInfo,
} from '@/lib/actions-contratos';
import type { ControlPago } from '@/lib/actions-control-pagos';

interface GenerarContratoModalProps {
  controlPago: ControlPago;
  proyectoId: string;
  onClose: () => void;
  onGenerate: (tipoCambio: number, templateBase64?: string, templateNombre?: string) => Promise<void>;
}

export default function GenerarContratoModal({
  controlPago,
  proyectoId,
  onClose,
  onGenerate,
}: GenerarContratoModalProps) {
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<{
    hasTemplate: boolean;
    templateName?: string;
  }>({ hasTemplate: false });
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario
  const [tipoCambio, setTipoCambio] = useState(3.80);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null);
  const [customTemplateBase64, setCustomTemplateBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar info del template al montar
  useEffect(() => {
    const loadTemplateInfo = async () => {
      setLoadingInfo(true);
      const result = await getProyectoTemplateInfo(proyectoId);
      if (result.success) {
        setTemplateInfo({
          hasTemplate: result.hasTemplate,
          templateName: result.templateName,
        });
      }
      setLoadingInfo(false);
    };
    loadTemplateInfo();
  }, [proyectoId]);

  // Handler para descargar template del proyecto
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setError(null);

    try {
      const result = await downloadProyectoTemplate(proyectoId);
      if (result.success && result.base64 && result.fileName) {
        // Convertir base64 a blob y descargar
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(result.error || 'Error al descargar template');
      }
    } catch (err) {
      setError('Error al descargar template');
    }

    setDownloadingTemplate(false);
  };

  // Handler para seleccionar archivo personalizado
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Solo se permiten archivos Word (.docx)');
      return;
    }

    // Validar tamanio (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar 10MB');
      return;
    }

    setError(null);
    setCustomTemplateFile(file);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setCustomTemplateBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handler para eliminar template personalizado
  const handleRemoveCustomTemplate = () => {
    setCustomTemplateFile(null);
    setCustomTemplateBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler para generar contrato
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      if (useCustomTemplate && customTemplateBase64) {
        await onGenerate(tipoCambio, customTemplateBase64, customTemplateFile?.name);
      } else {
        await onGenerate(tipoCambio);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar contrato');
    }

    setLoading(false);
  };

  // Formatear monto
  const formatMonto = (monto: number): string => {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generar Contrato</h2>
              <p className="text-white/80 text-sm">
                Local {controlPago.codigo_local}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preview de Datos */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Datos del Contrato
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">{controlPago.lead_nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Local</p>
                  <p className="font-medium text-gray-900">{controlPago.codigo_local} ({controlPago.metraje} m2)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Monto Venta</p>
                  <p className="font-medium text-gray-900">{formatMonto(controlPago.monto_venta)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Proyecto</p>
                  <p className="font-medium text-gray-900">{controlPago.proyecto_nombre}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tipo de Cambio */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Tipo de Cambio
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">1 USD =</span>
              <input
                type="number"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 3.80)}
                onWheel={(e) => e.currentTarget.blur()}
                step="0.01"
                min="0.01"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-600">PEN</span>
            </div>
          </section>

          {/* Seleccion de Template */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Template a Usar
            </h3>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Opcion 1: Template del Proyecto */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    !useCustomTemplate
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="templateType"
                    checked={!useCustomTemplate}
                    onChange={() => setUseCustomTemplate(false)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Usar template del proyecto
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Recomendado
                      </span>
                    </div>
                    {templateInfo.hasTemplate ? (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {templateInfo.templateName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDownloadTemplate();
                          }}
                          disabled={downloadingTemplate}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {downloadingTemplate ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Descargar para revisar
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        No hay template configurado para este proyecto
                      </p>
                    )}
                  </div>
                </label>

                {/* Opcion 2: Template Personalizado */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    useCustomTemplate
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="templateType"
                    checked={useCustomTemplate}
                    onChange={() => setUseCustomTemplate(true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">
                      Usar template personalizado
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Sube un archivo .docx modificado para este contrato especifico
                    </p>

                    {useCustomTemplate && (
                      <div className="mt-3">
                        {customTemplateFile ? (
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                {customTemplateFile.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveCustomTemplate();
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".docx"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                fileInputRef.current?.click();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                            >
                              <Upload className="w-4 h-4" />
                              Subir Template (.docx)
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            El contrato se generara con los datos actuales de la ficha
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                (!templateInfo.hasTemplate && !useCustomTemplate) ||
                (useCustomTemplate && !customTemplateBase64)
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Generar Contrato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
