'use client';

// ============================================================================
// MODAL: VincularBoletaModal
// ============================================================================
// Permite a Finanzas vincular una boleta/factura a un comprobante de pago
// ============================================================================

import { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Receipt,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { vincularBoleta } from '@/lib/actions-fichas-reporte';

interface VincularBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId: string;
  voucherIndex: number;
  clienteNombre: string;
  localCodigo: string;
  monto: string;
  onSuccess: () => void;
}

export default function VincularBoletaModal({
  isOpen,
  onClose,
  fichaId,
  voucherIndex,
  clienteNombre,
  localCodigo,
  monto,
  onSuccess,
}: VincularBoletaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [tipo, setTipo] = useState<'boleta' | 'factura'>('boleta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Formato no permitido. Use JPG, PNG, WEBP o PDF.');
      return;
    }

    // Validar tamaño
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Preview para imágenes
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Seleccione un archivo');
      return;
    }

    if (!numeroBoleta.trim()) {
      setError('Ingrese el número de boleta/factura');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // 2. Upload archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fichaId', fichaId);
      formData.append('voucherIndex', voucherIndex.toString());

      const uploadResponse = await fetch('/api/boletas/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Error al subir archivo');
      }

      // 3. Vincular boleta en DB
      const vincularResult = await vincularBoleta({
        fichaId,
        voucherIndex,
        boletaUrl: uploadResult.url,
        numeroBoleta: numeroBoleta.trim(),
        tipo,
      });

      if (!vincularResult.success) {
        throw new Error(vincularResult.message);
      }

      // Éxito
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error vinculando boleta:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setNumeroBoleta('');
    setTipo('boleta');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1b967a] to-[#156b58] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Vincular Boleta
                </h2>
                <p className="text-sm text-white/80">
                  {localCodigo} - {monto}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Info del cliente */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Cliente</p>
            <p className="text-sm font-medium text-gray-900">{clienteNombre}</p>
          </div>

          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('boleta')}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                  tipo === 'boleta'
                    ? 'border-[#1b967a] bg-[#1b967a]/10 text-[#1b967a]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Boleta</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('factura')}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                  tipo === 'factura'
                    ? 'border-[#1b967a] bg-[#1b967a]/10 text-[#1b967a]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Factura</span>
              </button>
            </div>
          </div>

          {/* Número de boleta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de {tipo === 'boleta' ? 'Boleta' : 'Factura'}
            </label>
            <input
              type="text"
              value={numeroBoleta}
              onChange={(e) => setNumeroBoleta(e.target.value)}
              placeholder="Ej: B001-00123"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a]/20 focus:border-[#1b967a] transition-colors"
            />
          </div>

          {/* Upload área */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {/* Preview o icono */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-red-500" />
                    </div>
                  )}

                  {/* Info del archivo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#1b967a] hover:bg-[#1b967a]/5 transition-all group"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#1b967a] transition-colors" />
                  <p className="mt-2 text-sm font-medium text-gray-600 group-hover:text-[#1b967a]">
                    Haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, PDF (máx 5MB)
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !file || !numeroBoleta.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1b967a] hover:bg-[#156b58] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Vincular Boleta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
