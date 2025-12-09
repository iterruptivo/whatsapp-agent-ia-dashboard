// ============================================================================
// COMPONENT: ContratoTemplateUploader
// ============================================================================
// Descripción: Uploader para templates de contrato Word (.docx)
// Sesión: 66
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ContratoTemplateUploaderProps {
  currentTemplateUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  disabled?: boolean;
}

export default function ContratoTemplateUploader({
  currentTemplateUrl,
  onUpload,
  onDelete,
  disabled = false,
}: ContratoTemplateUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Solo se permiten archivos Word (.docx)');
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar 10MB');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      await onUpload(file);
      setSuccess('Template subido correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir template');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !currentTemplateUrl) return;

    if (!confirm('¿Eliminar template de contrato? Los contratos generados no se verán afectados.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeleting(true);

    try {
      await onDelete();
      setSuccess('Template eliminado');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar template');
    } finally {
      setIsDeleting(false);
    }
  };

  // currentTemplateUrl ahora es solo el nombre del archivo (no URL completa)
  const getFileName = (fileName: string) => {
    // Si por alguna razón viene una URL, extraer el nombre
    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      return parts[parts.length - 1];
    }
    return fileName;
  };

  return (
    <div className="space-y-3">
      {/* Template actual */}
      {currentTemplateUrl ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Template configurado</p>
              <p className="text-xs text-green-600 truncate max-w-[200px]">
                {getFileName(currentTemplateUrl)}
              </p>
            </div>
          </div>
          {/* Botón eliminar (descarga no disponible en bucket privado) */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={disabled || isDeleting}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              title="Eliminar template"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Sin template configurado</p>
              <p className="text-xs text-gray-400">Sube un archivo .docx con las variables</p>
            </div>
          </div>
        </div>
      )}

      {/* Botón de upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {currentTemplateUrl ? 'Reemplazar Template' : 'Subir Template (.docx)'}
            </>
          )}
        </button>
      </div>

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Ayuda con variables */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">
          Ver variables disponibles para el template
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2 font-mono text-[10px]">
          <p><strong>Representante:</strong> {'{representante_nombre}'}, {'{representante_dni}'}, {'{representante_cargo}'}</p>
          <p><strong>Titular:</strong> {'{titular_nombre_completo}'}, {'{titular_numero_documento}'}, {'{titular_direccion_completa}'}</p>
          <p><strong>Cónyuge:</strong> {'{#tiene_conyuge}'}...{'{/tiene_conyuge}'}</p>
          <p><strong>Montos:</strong> {'{monto_venta}'}, {'{monto_venta_texto}'}, {'{cuota_inicial}'}, {'{saldo_financiar}'}</p>
          <p><strong>Financiamiento:</strong> {'{numero_cuotas}'}, {'{cuota_mensual}'}, {'{tea}'}, {'{dia_pago}'}</p>
          <p><strong>Fechas:</strong> {'{fecha_inicio_pago_texto}'}, {'{fecha_ultima_cuota_texto}'}</p>
          <p><strong>Tablas:</strong> {'{#es_frances}'}tabla{'{/es_frances}'} o {'{#es_simple}'}tabla{'{/es_simple}'}</p>
        </div>
      </details>
    </div>
  );
}
