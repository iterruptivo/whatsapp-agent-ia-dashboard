'use client';

// ============================================================================
// COMPONENTE: VoucherCardUploader
// ============================================================================
// Upload de multiples vouchers con OCR automatico por cada uno.
// Muestra cards individuales con preview, datos extraidos y barra de confianza.
// Resumen de totales por moneda. Diseño premium con colores corporativos.
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  DollarSign,
  Calendar,
  Building2,
  Hash,
  User,
  TrendingUp,
  Eye,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface VoucherOCRData {
  monto: number | null;
  moneda: 'PEN' | 'USD' | null;
  fecha: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;
  confianza: number;
}

export interface VoucherItem {
  id: string;
  file: File | null;
  url: string;
  previewUrl: string;
  ocrData: VoucherOCRData | null;
  estado: 'pendiente' | 'subiendo' | 'procesando' | 'valido' | 'revision' | 'error';
  error?: string;
}

interface VoucherCardUploaderProps {
  localId: string;
  onVouchersChange: (vouchers: VoucherItem[]) => void;
  initialVouchers?: VoucherItem[];
  disabled?: boolean;
  maxVouchers?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Error comprimiendo imagen'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function uploadToStorage(
  file: File,
  localId: string,
  supabaseClient: typeof supabase
): Promise<{ url: string; error?: string }> {
  try {
    // Comprimir imagen
    const compressed = await compressImage(file);
    const timestamp = Date.now();
    const fileName = `${localId}/voucher/${timestamp}.jpg`;

    // Upload a Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('documentos-ficha')
      .upload(fileName, compressed, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }

    // Obtener URL publica
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from('documentos-ficha').getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (err) {
    console.error('Upload exception:', err);
    return {
      url: '',
      error: err instanceof Error ? err.message : 'Error subiendo archivo',
    };
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function VoucherCardUploader({
  localId,
  onVouchersChange,
  initialVouchers = [],
  disabled = false,
  maxVouchers = 10,
}: VoucherCardUploaderProps) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>(initialVouchers);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // SINCRONIZAR initialVouchers cuando cambia (para persistencia al reabrir)
  // ========================================
  useEffect(() => {
    if (initialVouchers && initialVouchers.length > 0) {
      setVouchers(initialVouchers);
    }
  }, [initialVouchers]);

  // ========================================
  // PROCESAMIENTO DE ARCHIVOS
  // ========================================

  const processFile = useCallback(
    async (file: File) => {
      // Validar tipo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Solo se permiten imagenes JPG, PNG o WEBP');
        return;
      }

      // Validar tamano (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('La imagen no puede superar 10MB');
        return;
      }

      // Crear item temporal
      const previewUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      const newVoucher: VoucherItem = {
        id: tempId,
        file,
        url: '',
        previewUrl,
        ocrData: null,
        estado: 'subiendo',
      };

      // Agregar a lista
      const updatedVouchers = [...vouchers, newVoucher];
      setVouchers(updatedVouchers);
      onVouchersChange(updatedVouchers);

      try {
        // 1. Subir a storage
        const { url, error: uploadError } = await uploadToStorage(file, localId, supabase);

        if (uploadError) {
          throw new Error(uploadError);
        }

        // 2. Actualizar estado a "procesando OCR"
        const withUrl: VoucherItem = { ...newVoucher, url, estado: 'procesando' };
        const vouchersWithUrl = updatedVouchers.map((v) => (v.id === tempId ? withUrl : v));
        setVouchers(vouchersWithUrl);
        onVouchersChange(vouchersWithUrl);

        // 3. Procesar OCR
        const base64 = await fileToBase64(file);

        const response = await fetch('/api/ocr/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            type: 'voucher',
            mimeType: file.type,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Error en OCR');
        }

        // 4. Actualizar con datos OCR
        const ocrData: VoucherOCRData = {
          monto: result.data.monto || null,
          moneda: result.data.moneda || null,
          fecha: result.data.fecha || null,
          banco: result.data.banco || null,
          numero_operacion: result.data.numero_operacion || null,
          depositante: result.data.nombre_depositante || null,
          confianza: result.data.confianza || 0,
        };

        // Determinar estado segun confianza
        let estado: VoucherItem['estado'] = 'valido';
        if (ocrData.confianza < 80) {
          estado = 'revision';
        }

        const withOCR: VoucherItem = { ...withUrl, ocrData, estado };
        const finalVouchers = vouchersWithUrl.map((v) => (v.id === tempId ? withOCR : v));
        setVouchers(finalVouchers);
        onVouchersChange(finalVouchers);
      } catch (err) {
        console.error('Error processing voucher:', err);
        const errorMsg = err instanceof Error ? err.message : 'Error procesando voucher';
        const withError: VoucherItem = {
          ...newVoucher,
          estado: 'error',
          error: errorMsg,
        };
        const vouchersWithError = updatedVouchers.map((v) => (v.id === tempId ? withError : v));
        setVouchers(vouchersWithError);
        onVouchersChange(vouchersWithError);
      }
    },
    [vouchers, localId, supabase, onVouchersChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remaining = maxVouchers - vouchers.length;

      files.slice(0, remaining).forEach((file) => {
        processFile(file);
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile, vouchers.length, maxVouchers]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const remaining = maxVouchers - vouchers.length;

      files.slice(0, remaining).forEach((file) => {
        processFile(file);
      });
    },
    [disabled, processFile, vouchers.length, maxVouchers]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && vouchers.length < maxVouchers) {
        setIsDragging(true);
      }
    },
    [disabled, vouchers.length, maxVouchers]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const filtered = vouchers.filter((v) => v.id !== id);
      setVouchers(filtered);
      onVouchersChange(filtered);
    },
    [vouchers, onVouchersChange]
  );

  // ========================================
  // CALCULAR TOTALES
  // ========================================

  const totales = vouchers.reduce(
    (acc, v) => {
      if (v.ocrData && v.ocrData.monto) {
        if (v.ocrData.moneda === 'PEN') {
          acc.pen += v.ocrData.monto;
        } else if (v.ocrData.moneda === 'USD') {
          acc.usd += v.ocrData.monto;
        }
      }
      return acc;
    },
    { pen: 0, usd: 0 }
  );

  // ========================================
  // RENDER
  // ========================================

  const canAddMore = vouchers.length < maxVouchers;

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#1b967a]" />
          <h3 className="text-lg font-semibold text-[#192c4d]">Comprobantes de Pago</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Opcional
          </span>
        </div>
      </div>

      {/* Resumen de Totales */}
      {vouchers.length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-gray-700 mb-1">Resumen:</div>
          <div className="flex gap-4 text-sm">
            {totales.pen > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-green-700">S/ {totales.pen.toFixed(2)}</span>
              </div>
            )}
            {totales.usd > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-blue-700">USD {totales.usd.toFixed(2)}</span>
              </div>
            )}
            {totales.pen === 0 && totales.usd === 0 && (
              <span className="text-gray-500">Sin montos detectados</span>
            )}
          </div>
        </div>
      )}

      {/* Lista de Vouchers */}
      <div className="space-y-3 mb-4">
        {vouchers.map((voucher, index) => (
          <VoucherCard
            key={voucher.id}
            voucher={voucher}
            index={index}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Dropzone */}
      {canAddMore && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${isDragging ? 'border-[#1b967a] bg-green-50' : 'border-gray-300 hover:border-gray-400'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Arrastra un comprobante o haz clic
            </p>
            <p className="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, PDF</p>
          </div>
        </>
      )}

      {/* Contador */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Vouchers: {vouchers.length}/{maxVouchers}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: VoucherCard
// ============================================================================

interface VoucherCardProps {
  voucher: VoucherItem;
  index: number;
  onDelete: (id: string) => void;
}

function VoucherCard({ voucher, index, onDelete }: VoucherCardProps) {
  const { estado, previewUrl, ocrData, error } = voucher;
  const [showPreview, setShowPreview] = useState(false);

  // Colores segun estado
  const getBorderColor = () => {
    switch (estado) {
      case 'pendiente':
        return 'border-gray-300 border-dashed';
      case 'subiendo':
        return 'border-blue-400 border-solid';
      case 'procesando':
        return 'border-yellow-400 border-solid';
      case 'valido':
        return 'border-green-500 border-solid';
      case 'revision':
        return 'border-yellow-500 border-solid';
      case 'error':
        return 'border-red-500 border-solid';
      default:
        return 'border-gray-300';
    }
  };

  const getEstadoBadge = () => {
    switch (estado) {
      case 'subiendo':
        return (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Subiendo...
          </div>
        );
      case 'procesando':
        return (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Procesando OCR...
          </div>
        );
      case 'valido':
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Validado
          </div>
        );
      case 'revision':
        return (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <AlertTriangle className="w-3 h-3" />
            Revisar
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <XCircle className="w-3 h-3" />
            Error
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`border rounded-lg p-4 flex gap-4 ${getBorderColor()}`}>
      {/* Preview */}
      <div className="flex-shrink-0">
        <div className="relative w-24 h-28 bg-gray-200 rounded-lg overflow-hidden group">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt={`Voucher ${index + 1}`} className="w-full h-full object-cover" />

              {/* Hover overlay con botón Eye */}
              {(estado === 'valido' || estado === 'revision') && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                    title="Ver imagen completa"
                  >
                    <Eye className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="mt-1 text-center">{getEstadoBadge()}</div>
      </div>

      {/* Datos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-[#192c4d]">VOUCHER #{index + 1}</h4>
          <button
            onClick={() => onDelete(voucher.id)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {estado === 'error' ? (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error || 'Error procesando voucher'}
          </div>
        ) : estado === 'subiendo' || estado === 'procesando' ? (
          <div className="text-xs text-gray-500">Cargando datos...</div>
        ) : ocrData ? (
          <div className="space-y-1 text-xs">
            {/* Monto */}
            {ocrData.monto && ocrData.moneda && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#1b967a]" />
                <span className="text-gray-600">Monto:</span>
                <span className="font-semibold text-[#192c4d]">
                  {ocrData.moneda} {ocrData.monto.toFixed(2)}
                </span>
              </div>
            )}

            {/* Banco */}
            {ocrData.banco && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-500" />
                <span className="text-gray-600">Banco:</span>
                <span className="font-medium text-gray-900">{ocrData.banco}</span>
              </div>
            )}

            {/* Numero Operacion */}
            {ocrData.numero_operacion && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-purple-500" />
                <span className="text-gray-600">Operacion:</span>
                <span className="font-medium text-gray-900">{ocrData.numero_operacion}</span>
              </div>
            )}

            {/* Fecha */}
            {ocrData.fecha && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-500" />
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium text-gray-900">{ocrData.fecha}</span>
              </div>
            )}

            {/* Depositante */}
            {ocrData.depositante && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-500" />
                <span className="text-gray-600">Depositante:</span>
                <span className="font-medium text-gray-900">{ocrData.depositante}</span>
              </div>
            )}

            {/* Barra de Confianza */}
            <div className="mt-2">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600">Confianza: {ocrData.confianza}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    ocrData.confianza >= 80
                      ? 'bg-green-500'
                      : ocrData.confianza >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${ocrData.confianza}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">Sin datos</div>
        )}
      </div>

      {/* Modal preview fullscreen */}
      {showPreview && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl}
              alt={`Voucher ${index + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
