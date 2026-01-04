'use client';

// ============================================================================
// COMPONENTE: VoucherOCRUploader
// ============================================================================
// Upload de vouchers con extraccion automatica de datos via OCR (GPT-4 Vision)
// Muestra preview y permite editar datos extraidos
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import DocumentoOCRCard, { DocumentoEstado, DocumentoOCRData } from './DocumentoOCRCard';

// ============================================================================
// INTERFACES
// ============================================================================

export interface VoucherData {
  monto: number;
  moneda: 'USD' | 'PEN';
  fecha: string;
  banco: string;
  numero_operacion: string;
  nombre_depositante: string;
  tipo_operacion: string;
  confianza: number;
}

export interface VoucherOCRUploaderProps {
  // Callback cuando se extraen datos exitosamente
  onDataExtracted?: (data: VoucherData, file: File, previewUrl: string) => void;

  // Callback cuando hay error
  onError?: (error: string) => void;

  // Datos iniciales (para edicion)
  initialData?: Partial<VoucherData>;

  // Preview inicial
  initialPreviewUrl?: string;

  // Estado disabled
  disabled?: boolean;

  // Clase CSS adicional
  className?: string;

  // Mostrar solo el uploader (sin card de datos)
  uploaderOnly?: boolean;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function VoucherOCRUploader({
  onDataExtracted,
  onError,
  initialData,
  initialPreviewUrl,
  disabled = false,
  className = '',
  uploaderOnly = false,
}: VoucherOCRUploaderProps) {
  // Estados
  const [estado, setEstado] = useState<DocumentoEstado>(
    initialData ? 'ok' : 'procesando'
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [fileName, setFileName] = useState<string>('');
  const [datos, setDatos] = useState<VoucherData | null>(
    initialData as VoucherData || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // HANDLERS
  // ========================================

  const processFile = useCallback(async (file: File) => {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = 'Solo se permiten imagenes (JPG, PNG, WEBP, GIF)';
      setError(errorMsg);
      setEstado('error');
      onError?.(errorMsg);
      return;
    }

    // Validar tamano (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'La imagen no puede superar 10MB';
      setError(errorMsg);
      setEstado('error');
      onError?.(errorMsg);
      return;
    }

    // Crear preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setCurrentFile(file);
    setEstado('procesando');
    setError(null);

    try {
      // Convertir a base64
      const base64 = await fileToBase64(file);

      // Llamar a la API de OCR
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

      const extractedData = result.data as VoucherData;
      setDatos(extractedData);

      // Determinar estado segun confianza
      if (extractedData.confianza >= 85) {
        setEstado('ok');
      } else if (extractedData.confianza >= 60) {
        setEstado('revision');
      } else {
        setEstado('revision');
      }

      // Notificar al padre
      onDataExtracted?.(extractedData, file, url);
    } catch (err) {
      console.error('Error processing voucher:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al procesar voucher';
      setError(errorMsg);
      setEstado('error');
      onError?.(errorMsg);
    }
  }, [onDataExtracted, onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [disabled, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleReescanear = useCallback(async () => {
    if (currentFile) {
      await processFile(currentFile);
    }
  }, [currentFile, processFile]);

  const handleEditar = useCallback((id: string, nuevosDatos: DocumentoOCRData) => {
    const updatedData = { ...datos, ...nuevosDatos } as VoucherData;
    setDatos(updatedData);
    if (currentFile && previewUrl) {
      onDataExtracted?.(updatedData, currentFile, previewUrl);
    }
  }, [datos, currentFile, previewUrl, onDataExtracted]);

  const handleEliminar = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName('');
    setDatos(null);
    setEstado('procesando');
    setError(null);
    setCurrentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // ========================================
  // RENDER
  // ========================================

  // Si hay datos y no es uploaderOnly, mostrar card
  if (datos && previewUrl && !uploaderOnly) {
    return (
      <div className={className}>
        <DocumentoOCRCard
          id="voucher-1"
          tipo="voucher"
          previewUrl={previewUrl}
          fileName={fileName}
          estado={estado}
          datos={datos as unknown as DocumentoOCRData}
          confianza={datos.confianza}
          onReescanear={handleReescanear}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
        />
      </div>
    );
  }

  // Dropzone para upload
  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        {estado === 'procesando' && previewUrl ? (
          // Procesando OCR
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Extrayendo datos del voucher...</p>
          </div>
        ) : error ? (
          // Error
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEliminar();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          // Estado inicial - dropzone
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Arrastra un voucher aqui
              </p>
              <p className="text-xs text-gray-500">
                o haz click para seleccionar
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, WEBP (max 10MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
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
