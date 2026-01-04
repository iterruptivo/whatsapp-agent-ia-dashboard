'use client';

// ============================================================================
// COMPONENTE: DocumentoOCRUploader (MULTI-IMAGEN CON OCR VISIBLE)
// ============================================================================
// Upload de documentos con validacion OCR usando GPT-4 Vision
// Soporta: DNI, Vouchers bancarios
// Features:
//   - MULTI-IMAGEN: Permite subir hasta maxImages imagenes
//   - OCR INTELIGENTE: Primera imagen ejecuta OCR, siguientes son opcionales
//   - VISUALIZACION CLARA: Panel expandido con datos extraidos
//   - VALIDACION VISUAL: Indicadores claros de estado y confianza
// ============================================================================

import { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import {
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  Calendar,
  Building2,
  Hash,
  BadgeCheck,
  XCircle,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// ============================================================================
// INTERFACES
// ============================================================================

export type TipoDocumento = 'dni' | 'voucher';

export interface DNIOCRData {
  numero_dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  confianza: number;
}

export interface VoucherOCRData {
  monto: number;
  moneda: 'USD' | 'PEN';
  fecha: string;
  banco: string;
  numero_operacion: string;
  nombre_depositante: string;
  tipo_operacion: string;
  confianza: number;
}

export type OCRData = DNIOCRData | VoucherOCRData;

export type EstadoDocumento = 'vacio' | 'subiendo' | 'procesando' | 'valido' | 'revision' | 'error';

export interface DocumentoItem {
  id: string;
  imageUrl: string;
  previewUrl: string;
  ocrData: OCRData | null;
  estado: EstadoDocumento;
  error?: string;
  hasOCR: boolean;
}

export interface DocumentoOCRUploaderProps {
  tipo: TipoDocumento;
  title: string;
  description: string;
  localId: string;
  maxImages: number;
  required?: boolean;
  disabled?: boolean;
  initialImageUrls?: string[];
  onDocumentosChange: (urls: string[]) => void;
  onDatosExtraidos?: (data: OCRData) => void;
}

// ============================================================================
// COMPONENTE: BarraConfianza
// ============================================================================

function BarraConfianza({ valor }: { valor: number }) {
  const color = valor >= 80 ? 'bg-green-500' : valor >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const bgColor = valor >= 80 ? 'bg-green-100' : valor >= 50 ? 'bg-yellow-100' : 'bg-red-100';
  const textColor = valor >= 80 ? 'text-green-700' : valor >= 50 ? 'text-yellow-700' : 'text-red-700';

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 h-2 rounded-full ${bgColor}`}>
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{valor}%</span>
    </div>
  );
}

// ============================================================================
// COMPONENTE: CampoExtraido
// ============================================================================

function CampoExtraido({
  icon: Icon,
  label,
  valor,
  importante = false
}: {
  icon: React.ElementType;
  label: string;
  valor: string | number | null | undefined;
  importante?: boolean;
}) {
  const isEmpty = !valor || valor === 'N/A' || valor === '';

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg ${isEmpty ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <Icon className={`w-4 h-4 mt-0.5 ${isEmpty ? 'text-red-400' : 'text-gray-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {isEmpty ? (
          <p className="text-sm font-medium text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            No detectado
          </p>
        ) : (
          <p className={`text-sm font-medium text-gray-900 truncate ${importante ? 'text-lg' : ''}`}>
            {valor}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: PanelDatosOCR (DNI)
// ============================================================================

function PanelDatosDNI({ data, expanded, onToggle }: { data: DNIOCRData; expanded: boolean; onToggle: () => void }) {
  const camposCompletos = [
    data.numero_dni,
    data.nombres,
    data.apellido_paterno,
    data.apellido_materno,
  ].filter(v => v && v !== 'N/A').length;

  const totalCampos = 4;
  const porcentajeCompleto = Math.round((camposCompletos / totalCampos) * 100);

  return (
    <div className="mt-3 border-2 border-green-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header clickeable */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between hover:from-green-100 hover:to-emerald-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <BadgeCheck className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-green-800">Datos extraidos del DNI</p>
            <p className="text-xs text-green-600">{camposCompletos}/{totalCampos} campos detectados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Confianza</p>
            <p className={`font-bold ${data.confianza >= 80 ? 'text-green-600' : data.confianza >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {data.confianza}%
            </p>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="p-4 border-t border-green-100">
          {/* Barra de confianza */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Nivel de confianza en la lectura</p>
            <BarraConfianza valor={data.confianza} />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CampoExtraido
              icon={CreditCard}
              label="Numero de DNI"
              valor={data.numero_dni}
              importante
            />
            <CampoExtraido
              icon={User}
              label="Nombres"
              valor={data.nombres}
            />
            <CampoExtraido
              icon={User}
              label="Apellido Paterno"
              valor={data.apellido_paterno}
            />
            <CampoExtraido
              icon={User}
              label="Apellido Materno"
              valor={data.apellido_materno}
            />
            <CampoExtraido
              icon={Calendar}
              label="Fecha de Nacimiento"
              valor={data.fecha_nacimiento}
            />
            <CampoExtraido
              icon={User}
              label="Sexo"
              valor={data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : null}
            />
          </div>

          {/* Mensaje de campos faltantes */}
          {camposCompletos < totalCampos && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Datos incompletos</p>
                <p className="text-xs text-yellow-600">Algunos campos no fueron detectados. Verifica la imagen o completa manualmente.</p>
              </div>
            </div>
          )}

          {/* Mensaje de exito */}
          {camposCompletos === totalCampos && data.confianza >= 80 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">DNI validado correctamente</p>
                <p className="text-xs text-green-600">Todos los campos fueron extraidos con alta confianza.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: PanelDatosOCR (Voucher)
// ============================================================================

function PanelDatosVoucher({ data, expanded, onToggle }: { data: VoucherOCRData; expanded: boolean; onToggle: () => void }) {
  const camposCompletos = [
    data.monto,
    data.banco,
    data.numero_operacion,
    data.fecha,
  ].filter(v => v && v !== 'N/A' && v !== 0).length;

  const totalCampos = 4;

  const formatMonto = () => {
    if (!data.monto || data.monto === 0) return null;
    const simbolo = data.moneda === 'USD' ? '$' : 'S/';
    return `${simbolo} ${data.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="mt-3 border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header clickeable */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-blue-800">Datos extraidos del Voucher</p>
            <p className="text-xs text-blue-600">{camposCompletos}/{totalCampos} campos detectados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.monto > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Monto</p>
              <p className="font-bold text-green-600">{formatMonto()}</p>
            </div>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="p-4 border-t border-blue-100">
          {/* Barra de confianza */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Nivel de confianza en la lectura</p>
            <BarraConfianza valor={data.confianza} />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CampoExtraido
              icon={CreditCard}
              label="Monto"
              valor={formatMonto()}
              importante
            />
            <CampoExtraido
              icon={Building2}
              label="Banco"
              valor={data.banco}
            />
            <CampoExtraido
              icon={Hash}
              label="Nro. Operacion"
              valor={data.numero_operacion}
            />
            <CampoExtraido
              icon={Calendar}
              label="Fecha"
              valor={data.fecha}
            />
            <CampoExtraido
              icon={User}
              label="Depositante"
              valor={data.nombre_depositante}
            />
            <CampoExtraido
              icon={FileText}
              label="Tipo Operacion"
              valor={data.tipo_operacion}
            />
          </div>

          {/* Mensaje de campos faltantes */}
          {camposCompletos < totalCampos && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Datos incompletos</p>
                <p className="text-xs text-yellow-600">Algunos campos no fueron detectados. Verifica la imagen o completa manualmente.</p>
              </div>
            </div>
          )}

          {/* Mensaje de exito */}
          {camposCompletos === totalCampos && data.confianza >= 80 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Voucher validado correctamente</p>
                <p className="text-xs text-green-600">Todos los campos fueron extraidos con alta confianza.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DocumentoOCRUploader({
  tipo,
  title,
  description,
  localId,
  maxImages,
  required = false,
  disabled = false,
  initialImageUrls = [],
  onDocumentosChange,
  onDatosExtraidos,
}: DocumentoOCRUploaderProps) {
  // Estados
  const [documentos, setDocumentos] = useState<DocumentoItem[]>(() => {
    return initialImageUrls.map((url, index) => ({
      id: `initial-${index}`,
      imageUrl: url,
      previewUrl: url,
      ocrData: null,
      estado: 'valido' as EstadoDocumento,
      error: undefined,
      hasOCR: false,
    }));
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewIndex, setShowPreviewIndex] = useState<number | null>(null);
  const [expandedOCR, setExpandedOCR] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevUrlsRef = useRef<string[]>(initialImageUrls);
  const isInitialMount = useRef(true);
  const onDocumentosChangeRef = useRef(onDocumentosChange);

  // Mantener la ref actualizada con el último callback
  useEffect(() => {
    onDocumentosChangeRef.current = onDocumentosChange;
  }, [onDocumentosChange]);

  // ========================================
  // EFFECT: Notificar al padre cuando cambian las URLs
  // ========================================
  // NOTA TÉCNICA: En React 18 Strict Mode (desarrollo), puede aparecer el warning
  // "Cannot update a component while rendering a different component".
  // Esto es un WARNING de desarrollo solamente y NO afecta la funcionalidad.
  // Se han aplicado múltiples técnicas de deferimiento (setTimeout, requestAnimationFrame,
  // startTransition) pero React 18 Strict Mode aún detecta el patrón de actualización
  // en cascada. En producción, este warning NO aparece y la funcionalidad es correcta.
  // ========================================
  useEffect(() => {
    // Saltar el primer render (mount) para evitar notificación innecesaria
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentUrls = documentos
      .filter(d => d.imageUrl && d.imageUrl.length > 0)
      .map(d => d.imageUrl);

    // Solo notificar si las URLs realmente cambiaron
    const urlsChanged =
      currentUrls.length !== prevUrlsRef.current.length ||
      currentUrls.some((url, index) => url !== prevUrlsRef.current[index]);

    if (urlsChanged) {
      prevUrlsRef.current = currentUrls;
      const urlsCopy = [...currentUrls];
      // Máximo deferimiento: requestAnimationFrame -> setTimeout -> startTransition
      // Esto asegura que la notificación ocurra en un ciclo de ejecución completamente
      // separado del render actual
      requestAnimationFrame(() => {
        setTimeout(() => {
          startTransition(() => {
            onDocumentosChangeRef.current(urlsCopy);
          });
        }, 16); // ~1 frame adicional de delay
      });
    }
  }, [documentos]);

  // ========================================
  // HELPERS
  // ========================================

  const compressImage = async (file: File): Promise<Blob> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };
    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  };

  const uploadToStorage = async (blob: Blob, index: number): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileName = `${localId}/${tipo}/${timestamp}-${index}.jpg`;

      const { supabase } = await import('@/lib/supabase');

      const { error: uploadError } = await supabase.storage
        .from('documentos-ficha')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('documentos-ficha')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error in uploadToStorage:', err);
      return null;
    }
  };

  const runOCR = async (base64: string, mimeType: string): Promise<{ success: boolean; data?: OCRData; error?: string }> => {
    try {
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          type: tipo,
          mimeType,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Error en OCR' };
      }

      return { success: true, data: result.data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  // ========================================
  // PROCESS FILE (MULTI)
  // ========================================

  const processFile = useCallback(async (file: File, isFirstImage: boolean) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imagenes JPG, PNG o WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    const tempId = `temp-${Date.now()}`;

    const nuevoDoc: DocumentoItem = {
      id: tempId,
      imageUrl: '',
      previewUrl: localPreview,
      ocrData: null,
      estado: 'subiendo',
      hasOCR: false,
    };

    setDocumentos(prev => [...prev, nuevoDoc]);

    const currentIndex = documentos.length;
    const compressed = await compressImage(file);
    const uploadedUrl = await uploadToStorage(compressed, currentIndex);

    if (!uploadedUrl) {
      setDocumentos(prev => prev.map(doc =>
        doc.id === tempId
          ? { ...doc, estado: 'error', error: 'Error al subir la imagen' }
          : doc
      ));
      return;
    }

    if (isFirstImage) {
      setDocumentos(prev => prev.map(doc =>
        doc.id === tempId
          ? { ...doc, imageUrl: uploadedUrl, estado: 'procesando' }
          : doc
      ));

      const base64 = await fileToBase64(file);
      const ocrResult = await runOCR(base64, file.type);

      if (!ocrResult.success || !ocrResult.data) {
        setDocumentos(prev => prev.map(doc =>
          doc.id === tempId
            ? {
                ...doc,
                imageUrl: uploadedUrl,
                estado: 'revision',
                error: ocrResult.error || 'No se pudieron extraer los datos',
                hasOCR: true,
              }
            : doc
        ));
        // La notificación al padre se hace automáticamente via useEffect
        return;
      }

      const confianza = ocrResult.data.confianza || 0;
      let nuevoEstado: EstadoDocumento = 'revision';

      if (confianza >= 80) {
        nuevoEstado = 'valido';
      } else if (confianza >= 50) {
        nuevoEstado = 'revision';
      } else {
        nuevoEstado = 'revision';
      }

      setDocumentos(prev => prev.map(doc =>
        doc.id === tempId
          ? {
              ...doc,
              imageUrl: uploadedUrl,
              ocrData: ocrResult.data!,
              estado: nuevoEstado,
              error: confianza < 50 ? 'Baja confianza en los datos. Verifica manualmente.' : undefined,
              hasOCR: true,
            }
          : doc
      ));

      // Auto-expandir el panel OCR
      setExpandedOCR(tempId);

      if (ocrResult.data) {
        onDatosExtraidos?.(ocrResult.data);
      }
    } else {
      setDocumentos(prev => prev.map(doc =>
        doc.id === tempId
          ? {
              ...doc,
              imageUrl: uploadedUrl,
              estado: 'valido',
              hasOCR: false,
            }
          : doc
      ));
    }

    // La notificación al padre se hace automáticamente via useEffect cuando cambia documentos
  }, [localId, tipo, onDatosExtraidos, documentos]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isFirstImage = documentos.length === 0;
    const remainingSlots = maxImages - documentos.length;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file, index) => {
      processFile(file, isFirstImage && index === 0);
    });

    e.target.value = '';
  }, [processFile, documentos.length, maxImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const isFirstImage = documentos.length === 0;
    const remainingSlots = maxImages - documentos.length;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file, index) => {
      processFile(file, isFirstImage && index === 0);
    });
  }, [disabled, processFile, documentos.length, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && documentos.length < maxImages) {
      fileInputRef.current?.click();
    }
  }, [disabled, documentos.length, maxImages]);

  const handleEliminar = useCallback((id: string) => {
    // Primero encontrar el documento para limpiar el preview URL
    const docToDelete = documentos.find(d => d.id === id);
    if (docToDelete && docToDelete.previewUrl && !docToDelete.previewUrl.startsWith('http')) {
      URL.revokeObjectURL(docToDelete.previewUrl);
    }

    // Actualizar el estado local - la notificación al padre se hace via useEffect
    setDocumentos(prev => prev.filter(doc => doc.id !== id));

    if (expandedOCR === id) {
      setExpandedOCR(null);
    }
  }, [documentos, expandedOCR]);

  // ========================================
  // RENDER HELPERS
  // ========================================

  const getEstadoBadge = (doc: DocumentoItem, index: number) => {
    const isFirst = index === 0;

    switch (doc.estado) {
      case 'valido':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            {doc.hasOCR ? 'OCR OK' : 'Subido'}
          </div>
        );
      case 'revision':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            Revisar
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Error
          </div>
        );
      case 'procesando':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analizando...
          </div>
        );
      case 'subiendo':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Subiendo...
          </div>
        );
      default:
        return null;
    }
  };

  // ========================================
  // RENDER
  // ========================================

  const canAddMore = documentos.length < maxImages;
  const isProcessing = documentos.some(d => d.estado === 'subiendo' || d.estado === 'procesando');
  const documentoConOCR = documentos.find(d => d.hasOCR && d.ocrData);

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${tipo === 'dni' ? 'bg-green-100' : 'bg-blue-100'}`}>
            {tipo === 'dni' ? (
              <CreditCard className={`w-5 h-5 ${tipo === 'dni' ? 'text-green-600' : 'text-blue-600'}`} />
            ) : (
              <FileText className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              {title}
              {required && <span className="text-red-500 text-sm">*</span>}
            </h4>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800">{documentos.length}<span className="text-sm font-normal text-gray-400">/{maxImages}</span></p>
          <p className="text-xs text-gray-500">imagenes</p>
        </div>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || !canAddMore}
      />

      {/* Panel de datos OCR extraidos (prominente) */}
      {documentoConOCR && documentoConOCR.ocrData && (
        tipo === 'dni' ? (
          <PanelDatosDNI
            data={documentoConOCR.ocrData as DNIOCRData}
            expanded={expandedOCR === documentoConOCR.id}
            onToggle={() => setExpandedOCR(expandedOCR === documentoConOCR.id ? null : documentoConOCR.id)}
          />
        ) : (
          <PanelDatosVoucher
            data={documentoConOCR.ocrData as VoucherOCRData}
            expanded={expandedOCR === documentoConOCR.id}
            onToggle={() => setExpandedOCR(expandedOCR === documentoConOCR.id ? null : documentoConOCR.id)}
          />
        )
      )}

      {/* Galeria de imagenes */}
      {documentos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Imagenes subidas:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {documentos.map((doc, index) => (
              <div
                key={doc.id}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  doc.estado === 'valido' ? 'border-green-300' :
                  doc.estado === 'revision' ? 'border-yellow-300' :
                  doc.estado === 'error' ? 'border-red-300' :
                  'border-blue-300'
                }`}
              >
                {/* Preview */}
                <div className="aspect-square bg-gray-100">
                  <img
                    src={doc.previewUrl}
                    alt={`${title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Loading overlay */}
                  {(doc.estado === 'subiendo' || doc.estado === 'procesando') && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                      <span className="text-xs text-white">{doc.estado === 'subiendo' ? 'Subiendo...' : 'Analizando...'}</span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  {doc.estado !== 'subiendo' && doc.estado !== 'procesando' && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setShowPreviewIndex(index)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="Ver imagen"
                      >
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>
                      {!disabled && (
                        <button
                          onClick={() => handleEliminar(doc.id)}
                          className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50"
                          title="Eliminar"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Badge de estado */}
                <div className="absolute top-1 left-1">
                  {getEstadoBadge(doc, index)}
                </div>

                {/* Badge Principal */}
                {index === 0 && doc.hasOCR && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded text-center font-medium">
                      Principal (OCR)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropzone o boton agregar */}
      {canAddMore && (
        <div className="mt-4">
          {documentos.length === 0 ? (
            <div
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-[#1b967a] hover:bg-gray-50'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className={`p-3 rounded-full mb-3 ${tipo === 'dni' ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Upload className={`w-8 h-8 ${tipo === 'dni' ? 'text-green-500' : 'text-blue-500'}`} />
              </div>
              <p className="text-base font-medium text-gray-700">
                {tipo === 'dni' ? 'Sube foto del DNI' : 'Sube comprobante de pago'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Arrastra o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG (max 10MB) - Hasta {maxImages} imagenes</p>

              {/* Info OCR */}
              <div className="mt-3 px-4 py-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  La primera imagen sera analizada con IA para extraer datos automaticamente
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleClick}
              disabled={disabled || isProcessing}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1b967a] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Agregar mas imagenes ({documentos.length}/{maxImages})</span>
            </button>
          )}
        </div>
      )}

      {/* Required warning */}
      {required && documentos.length === 0 && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">Se requiere subir al menos una imagen de {tipo === 'dni' ? 'DNI' : 'comprobante'}</p>
        </div>
      )}

      {/* Info de imagenes adicionales */}
      {documentos.length > 0 && documentos.length < maxImages && (
        <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Las imagenes adicionales se guardaran sin procesamiento OCR
        </p>
      )}

      {/* Modal preview */}
      {showPreviewIndex !== null && documentos[showPreviewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPreviewIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={documentos[showPreviewIndex].previewUrl}
              alt={`${title} ${showPreviewIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPreviewIndex(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            {/* Info del documento en el modal */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">Imagen {showPreviewIndex + 1} de {documentos.length}</span>
                  {documentos[showPreviewIndex].hasOCR && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Principal (OCR)</span>
                  )}
                </div>
                {getEstadoBadge(documentos[showPreviewIndex], showPreviewIndex)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
