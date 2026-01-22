'use client';

// ============================================================================
// MODAL: SubirNotaCreditoModal
// ============================================================================
// Permite a Finanzas subir una Nota de Crédito a una boleta existente.
// Cuando hay reclamos, se emite una NC que anula la boleta original.
// Después de subir NC, el usuario puede agregar una nueva boleta.
// ============================================================================

import { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileX,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { subirNotaCredito } from '@/lib/actions-fichas-reporte';

interface SubirNotaCreditoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId: string;
  voucherIndex: number;
  clienteNombre: string;
  localCodigo: string;
  numeroBoleta: string; // Número de la boleta que se anulará
  onSuccess: () => void;
}

export default function SubirNotaCreditoModal({
  isOpen,
  onClose,
  fichaId,
  voucherIndex,
  clienteNombre,
  localCodigo,
  numeroBoleta,
  onSuccess,
}: SubirNotaCreditoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numeroNC, setNumeroNC] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler para seleccionar archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de archivo (imagen o PDF)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Generar preview (solo para imágenes)
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handler para subir archivo
  const handleSubmit = async () => {
    if (!file) {
      setError('Debes seleccionar un archivo');
      return;
    }

    if (!numeroNC.trim()) {
      setError('Debes ingresar el número de Nota de Crédito');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `nc-${fichaId}-${voucherIndex}-${Date.now()}.${fileExt}`;
      const filePath = `notas-credito/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-ficha')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        throw new Error('Error al subir archivo');
      }

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos-ficha')
        .getPublicUrl(filePath);

      // 3. Vincular NC a la boleta
      const result = await subirNotaCredito({
        fichaId,
        voucherIndex,
        notaCreditoUrl: publicUrl,
        notaCreditoNumero: numeroNC.trim(),
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // 4. Éxito
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error subiendo NC:', err);
      setError(err.message || 'Error al subir Nota de Crédito');
    } finally {
      setLoading(false);
    }
  };

  // Handler para cerrar modal
  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setNumeroNC('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#192c4d] flex items-center gap-2">
              <FileX className="w-5 h-5 text-orange-600" />
              Subir Nota de Crédito
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Anular boleta {numeroBoleta}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Información del depósito */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cliente:</span>
              <span className="text-sm font-medium text-gray-900">{clienteNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Local:</span>
              <span className="text-sm font-medium text-gray-900">{localCodigo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Boleta a anular:</span>
              <span className="text-sm font-bold text-orange-700">{numeroBoleta}</span>
            </div>
          </div>

          {/* Input: Número de NC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Nota de Crédito *
            </label>
            <input
              type="text"
              value={numeroNC}
              onChange={(e) => setNumeroNC(e.target.value)}
              placeholder="Ej: NC001-00001234"
              disabled={loading || success}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>

          {/* Upload de archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo de Nota de Crédito *
            </label>
            <div
              onClick={() => !loading && !success && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${file ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/50'}
                ${loading || success ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                disabled={loading || success}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded"
                  />
                  <p className="text-sm text-gray-600">{file?.name}</p>
                </div>
              ) : file ? (
                <div className="space-y-2">
                  <FileX className="w-12 h-12 text-orange-600 mx-auto" />
                  <p className="text-sm text-gray-600">{file.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    Click para seleccionar archivo
                  </p>
                  <p className="text-xs text-gray-400">
                    JPG, PNG o PDF (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Nota de Crédito subida correctamente
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || success || !file || !numeroNC.trim()}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Listo
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir NC
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
