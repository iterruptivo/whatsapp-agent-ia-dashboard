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
  Pencil,
  Check,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface VoucherOCRData {
  monto: number | null;
  moneda: 'PEN' | 'USD' | null;
  fecha: string | null;
  hora: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;
  confianza: number;
  uploaded_at: string | null; // Fecha/hora en que se subió a la plataforma
}

export interface VoucherItem {
  id: string;
  file: File | null;
  url: string;
  previewUrl: string;
  ocrData: VoucherOCRData | null;
  estado: 'pendiente' | 'subiendo' | 'procesando' | 'valido' | 'revision' | 'error';
  error?: string;
  depositoId?: string; // ID del registro en depositos_ficha para persistencia
}

interface VoucherCardUploaderProps {
  localId: string;
  onVouchersChange: (vouchers: VoucherItem[]) => void;
  initialVouchers?: VoucherItem[];
  disabled?: boolean;
  maxVouchers?: number;
  onSaveToDatabase?: (voucherId: string, data: VoucherOCRData, depositoId?: string) => Promise<void>;
  onNewVoucherProcessed?: (params: {
    url: string;
    ocrData: VoucherOCRData;
  }) => Promise<string | null>; // Retorna depositoId o null si falla
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
  onSaveToDatabase,
  onNewVoucherProcessed,
}: VoucherCardUploaderProps) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>(initialVouchers);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // SINCRONIZAR initialVouchers cuando cambia (para persistencia al reabrir)
  // ========================================
  useEffect(() => {
    console.log('[VoucherCardUploader] initialVouchers changed:', {
      count: initialVouchers?.length,
      hasDepositoIds: initialVouchers?.map(v => ({ id: v.id, depositoId: v.depositoId }))
    });
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
          hora: result.data.hora || null,
          banco: result.data.banco || null,
          numero_operacion: result.data.numero_operacion || null,
          depositante: result.data.nombre_depositante || null,
          confianza: result.data.confianza || 0,
          uploaded_at: new Date().toISOString(), // Fecha de subida a la plataforma
        };

        // Determinar estado segun confianza
        let estado: VoucherItem['estado'] = 'valido';
        if (ocrData.confianza < 80) {
          estado = 'revision';
        }

        const withOCR: VoucherItem = { ...withUrl, ocrData, estado };

        // 5. Persistir en BD si la ficha ya existe
        let finalVoucher = withOCR;
        if (onNewVoucherProcessed && url) {
          try {
            const depositoId = await onNewVoucherProcessed({ url, ocrData });
            if (depositoId) {
              finalVoucher = { ...withOCR, depositoId };
            }
          } catch (err) {
            console.error('[VoucherCardUploader] Error creating deposit:', err);
          }
        }

        const finalVouchers = vouchersWithUrl.map((v) => (v.id === tempId ? finalVoucher : v));
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
    [vouchers, localId, supabase, onVouchersChange, onNewVoucherProcessed]
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
            onUpdate={(updatedOCR) => {
              const updatedVouchers = vouchers.map((v) =>
                v.id === voucher.id ? { ...v, ocrData: updatedOCR } : v
              );
              setVouchers(updatedVouchers);
              onVouchersChange(updatedVouchers);
            }}
            onSaveToDatabase={onSaveToDatabase}
            disabled={disabled}
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
// COMPONENTE: VoucherCard (con edición de datos OCR)
// ============================================================================

interface VoucherCardProps {
  voucher: VoucherItem;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (ocrData: VoucherOCRData) => void;
  onSaveToDatabase?: (voucherId: string, data: VoucherOCRData, depositoId?: string) => Promise<void>;
  disabled?: boolean;
}

function VoucherCard({ voucher, index, onDelete, onUpdate, onSaveToDatabase, disabled }: VoucherCardProps) {
  const { estado, previewUrl, ocrData, error } = voucher;
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estado local para edición
  const [editData, setEditData] = useState<VoucherOCRData>({
    monto: ocrData?.monto ?? null,
    moneda: ocrData?.moneda ?? null,
    fecha: ocrData?.fecha ?? null,
    hora: ocrData?.hora ?? null,
    banco: ocrData?.banco ?? null,
    numero_operacion: ocrData?.numero_operacion ?? null,
    depositante: ocrData?.depositante ?? null,
    confianza: ocrData?.confianza ?? 0,
    uploaded_at: ocrData?.uploaded_at ?? null,
  });

  // Sincronizar cuando cambia ocrData externo
  useEffect(() => {
    if (ocrData) {
      setEditData({
        monto: ocrData.monto,
        moneda: ocrData.moneda,
        fecha: ocrData.fecha,
        hora: ocrData.hora,
        banco: ocrData.banco,
        numero_operacion: ocrData.numero_operacion,
        depositante: ocrData.depositante,
        confianza: ocrData.confianza,
        uploaded_at: ocrData.uploaded_at,
      });
    }
  }, [ocrData]);

  const handleSaveEdit = async () => {
    console.log('[VoucherCard] handleSaveEdit called:', {
      voucherId: voucher.id,
      depositoId: voucher.depositoId,
      hasOnSaveToDatabase: !!onSaveToDatabase,
      editData
    });

    // 1. Actualizar estado local inmediatamente (UX responsive)
    onUpdate(editData);

    // 2. Persistir en BD si está disponible y hay depositoId
    if (onSaveToDatabase && voucher.depositoId) {
      console.log('[VoucherCard] Calling onSaveToDatabase...');
      try {
        await onSaveToDatabase(voucher.id, editData, voucher.depositoId);
        // Toast de éxito se muestra en el padre (FichaInscripcionModal)
      } catch (error) {
        console.error('Error al guardar en BD:', error);
        // Toast de error se muestra en el padre
      }
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (ocrData) {
      setEditData({
        monto: ocrData.monto,
        moneda: ocrData.moneda,
        fecha: ocrData.fecha,
        hora: ocrData.hora,
        banco: ocrData.banco,
        numero_operacion: ocrData.numero_operacion,
        depositante: ocrData.depositante,
        confianza: ocrData.confianza,
        uploaded_at: ocrData.uploaded_at,
      });
    }
    setIsEditing(false);
  };

  // Colores segun estado
  const getBorderColor = () => {
    if (isEditing) return 'border-blue-500 border-2 border-solid';
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

  // Formatear fecha de subida para mostrar
  const formatUploadedAt = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const canEdit = (estado === 'valido' || estado === 'revision' || estado === 'error') && !disabled;

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
          <div className="flex items-center gap-1">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                title="Editar datos"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="text-green-500 hover:text-green-700 transition-colors p-1"
                  title="Guardar cambios"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            {!isEditing && (
              <button
                onClick={() => onDelete(voucher.id)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {estado === 'error' && !isEditing ? (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
            {error || 'Error procesando voucher'}
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 text-blue-600 underline"
            >
              Ingresar datos manualmente
            </button>
          </div>
        ) : estado === 'subiendo' || estado === 'procesando' ? (
          <div className="text-xs text-gray-500">Cargando datos...</div>
        ) : isEditing ? (
          // ========================================
          // MODO EDICIÓN
          // ========================================
          <div className="space-y-2 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
              <p className="text-blue-700 font-medium">Modo edición activo</p>
              <p className="text-blue-600 text-[10px]">Corrige los datos si el OCR no los detectó correctamente</p>
            </div>

            {/* Monto y Moneda */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="flex items-center gap-1 text-gray-600 mb-1">
                  <DollarSign className="w-3 h-3 text-[#1b967a]" />
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.monto ?? ''}
                  onChange={(e) => setEditData({ ...editData, monto: e.target.value ? parseFloat(e.target.value) : null })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="w-20">
                <label className="text-gray-600 mb-1 block">Moneda</label>
                <select
                  value={editData.moneda ?? ''}
                  onChange={(e) => setEditData({ ...editData, moneda: e.target.value as 'PEN' | 'USD' | null || null })}
                  className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">--</option>
                  <option value="PEN">PEN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Banco */}
            <div>
              <label className="flex items-center gap-1 text-gray-600 mb-1">
                <Building2 className="w-3 h-3 text-blue-500" />
                Banco
              </label>
              <select
                value={editData.banco ?? ''}
                onChange={(e) => setEditData({ ...editData, banco: e.target.value || null })}
                className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar banco...</option>
                <option value="BCP">BCP</option>
                <option value="Interbank">Interbank</option>
                <option value="BBVA">BBVA</option>
                <option value="Scotiabank">Scotiabank</option>
                <option value="BanBif">BanBif</option>
                <option value="Banco de la Nación">Banco de la Nación</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Numero Operacion */}
            <div>
              <label className="flex items-center gap-1 text-gray-600 mb-1">
                <Hash className="w-3 h-3 text-purple-500" />
                N° Operación
              </label>
              <input
                type="text"
                value={editData.numero_operacion ?? ''}
                onChange={(e) => setEditData({ ...editData, numero_operacion: e.target.value || null })}
                className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 00012345678"
              />
            </div>

            {/* Fecha del depósito */}
            <div>
              <label className="flex items-center gap-1 text-gray-600 mb-1">
                <Calendar className="w-3 h-3 text-orange-500" />
                Fecha del depósito
              </label>
              <input
                type="text"
                value={editData.fecha ?? ''}
                onChange={(e) => setEditData({ ...editData, fecha: e.target.value || null })}
                className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 15/01/2026"
              />
            </div>

            {/* Hora del depósito */}
            <div>
              <label className="flex items-center gap-1 text-gray-600 mb-1">
                <Clock className="w-3 h-3 text-teal-500" />
                Hora del depósito
              </label>
              <input
                type="text"
                value={editData.hora ?? ''}
                onChange={(e) => setEditData({ ...editData, hora: e.target.value || null })}
                className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 14:30"
              />
            </div>

            {/* Depositante */}
            <div>
              <label className="flex items-center gap-1 text-gray-600 mb-1">
                <User className="w-3 h-3 text-indigo-500" />
                Depositante
              </label>
              <input
                type="text"
                value={editData.depositante ?? ''}
                onChange={(e) => setEditData({ ...editData, depositante: e.target.value || null })}
                className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del depositante"
              />
            </div>
          </div>
        ) : ocrData ? (
          // ========================================
          // MODO VISUALIZACIÓN
          // ========================================
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
                <span className="text-gray-600">Operación:</span>
                <span className="font-medium text-gray-900">{ocrData.numero_operacion}</span>
              </div>
            )}

            {/* Fecha del depósito */}
            {ocrData.fecha && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-500" />
                <span className="text-gray-600">Fecha depósito:</span>
                <span className="font-medium text-gray-900">
                  {ocrData.fecha}
                  {ocrData.hora && <span className="text-gray-500"> {ocrData.hora}</span>}
                </span>
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

            {/* Fecha de subida a la plataforma */}
            {ocrData.uploaded_at && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Subido:</span>
                <span className="text-gray-600">{formatUploadedAt(ocrData.uploaded_at)}</span>
              </div>
            )}

            {/* Barra de Confianza */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600">Confianza OCR: {ocrData.confianza}%</span>
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
              {ocrData.confianza < 80 && (
                <p className="text-[10px] text-yellow-600 mt-1">
                  Confianza baja - revise los datos y edite si es necesario
                </p>
              )}
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
