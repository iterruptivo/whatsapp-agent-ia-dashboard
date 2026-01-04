'use client';

// ============================================================================
// COMPONENTE: DNIPairUploader (DNI EN PARES CON OCR FRENTE + REVERSO)
// ============================================================================
// Upload de DNI en pares obligatorios (frente + reverso) con OCR completo
// Features:
//   - PARES OBLIGATORIOS: Frente y reverso SIEMPRE juntos
//   - OCR DUAL: GPT-4 Vision extrae datos de ambas caras
//   - MULTIPERSONAS: Soporta titular, conyuge, copropietarios
//   - UX PREMIUM: Cards elegantes, indicadores visuales claros
// ============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Home,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  XCircle,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DNIOCRData {
  numero_dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  confianza: number;
}

export interface DNIReversoOCRData {
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccion: string | null;
  ubigeo: string | null;
  confianza: number;
}

export type EstadoDNI = 'vacio' | 'subiendo' | 'procesando' | 'listo' | 'error';

export type TipoPersona = 'titular' | 'conyuge' | 'copropietario';

export interface DNISide {
  url: string;
  previewUrl: string;
  ocrData: DNIOCRData | DNIReversoOCRData | null;
  estado: EstadoDNI;
  error?: string;
}

export interface DNIPair {
  id: string;
  persona: TipoPersona;
  personaIndex?: number; // Para copropietarios: 1, 2, 3...
  frente: DNISide | null;
  reverso: DNISide | null;
}

export interface DNIPairUploaderProps {
  localId: string;
  onPairsChange: (pairs: DNIPair[]) => void;
  onDatosExtraidos?: (datos: {
    frente: DNIOCRData;
    reverso: DNIReversoOCRData;
    persona: string;
  }) => void;
  initialPairs?: DNIPair[];
  disabled?: boolean;
  tieneConyuge?: boolean;
  numeroCopropietarios?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

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

const uploadToStorage = async (
  blob: Blob,
  localId: string,
  persona: string,
  lado: 'frente' | 'reverso'
): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const fileName = `${localId}/dni/${persona}-${lado}-${timestamp}.jpg`;

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

const runOCR = async (
  base64: string,
  mimeType: string,
  lado: 'frente' | 'reverso'
): Promise<{ success: boolean; data?: DNIOCRData | DNIReversoOCRData; error?: string }> => {
  try {
    const type = lado === 'frente' ? 'dni' : 'dni_reverso';

    const response = await fetch('/api/ocr/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        type,
        mimeType,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || 'Error en OCR' };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
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

// ============================================================================
// COMPONENTE: BarraConfianza
// ============================================================================

function BarraConfianza({ valor }: { valor: number }) {
  const color =
    valor >= 80 ? 'bg-green-500' : valor >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const bgColor =
    valor >= 80
      ? 'bg-green-100'
      : valor >= 50
        ? 'bg-yellow-100'
        : 'bg-red-100';
  const textColor =
    valor >= 80
      ? 'text-green-700'
      : valor >= 50
        ? 'text-yellow-700'
        : 'text-red-700';

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
}: {
  icon: React.ElementType;
  label: string;
  valor: string | number | null | undefined;
}) {
  const isEmpty = !valor || valor === 'N/A' || valor === '';

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg ${
        isEmpty ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
      }`}
    >
      <Icon
        className={`w-4 h-4 mt-0.5 ${isEmpty ? 'text-red-400' : 'text-gray-500'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {isEmpty ? (
          <p className="text-sm font-medium text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            No detectado
          </p>
        ) : (
          <p className="text-sm font-medium text-gray-900 truncate">{valor}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: PanelDatosFrente
// ============================================================================

function PanelDatosFrente({
  data,
  expanded,
  onToggle,
}: {
  data: DNIOCRData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const camposCompletos = [
    data.numero_dni,
    data.nombres,
    data.apellido_paterno,
    data.apellido_materno,
  ].filter((v) => v && v !== 'N/A').length;

  const totalCampos = 4;

  return (
    <div className="border-2 border-green-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between hover:from-green-100 hover:to-emerald-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-green-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-green-800">Frente DNI</p>
            <p className="text-xs text-green-600">
              {camposCompletos}/{totalCampos} campos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-xs font-bold ${data.confianza >= 80 ? 'text-green-600' : data.confianza >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
          >
            {data.confianza}%
          </p>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Contenido */}
      {expanded && (
        <div className="p-3 border-t border-green-100">
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Confianza</p>
            <BarraConfianza valor={data.confianza} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CampoExtraido icon={CreditCard} label="DNI" valor={data.numero_dni} />
            <CampoExtraido icon={User} label="Nombres" valor={data.nombres} />
            <CampoExtraido
              icon={User}
              label="Ap. Paterno"
              valor={data.apellido_paterno}
            />
            <CampoExtraido
              icon={User}
              label="Ap. Materno"
              valor={data.apellido_materno}
            />
            <CampoExtraido
              icon={Calendar}
              label="F. Nacimiento"
              valor={data.fecha_nacimiento}
            />
            <CampoExtraido
              icon={User}
              label="Sexo"
              valor={
                data.sexo === 'M'
                  ? 'Masculino'
                  : data.sexo === 'F'
                    ? 'Femenino'
                    : null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: PanelDatosReverso
// ============================================================================

function PanelDatosReverso({
  data,
  expanded,
  onToggle,
}: {
  data: DNIReversoOCRData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const camposCompletos = [
    data.departamento,
    data.provincia,
    data.distrito,
    data.direccion,
  ].filter((v) => v && v !== 'N/A').length;

  const totalCampos = 4;

  return (
    <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-800">Reverso DNI</p>
            <p className="text-xs text-blue-600">
              {camposCompletos}/{totalCampos} campos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-xs font-bold ${data.confianza >= 80 ? 'text-green-600' : data.confianza >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
          >
            {data.confianza}%
          </p>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Contenido */}
      {expanded && (
        <div className="p-3 border-t border-blue-100">
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Confianza</p>
            <BarraConfianza valor={data.confianza} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CampoExtraido
              icon={MapPin}
              label="Departamento"
              valor={data.departamento}
            />
            <CampoExtraido icon={MapPin} label="Provincia" valor={data.provincia} />
            <CampoExtraido icon={MapPin} label="Distrito" valor={data.distrito} />
            <CampoExtraido icon={Home} label="Direccion" valor={data.direccion} />
            {data.ubigeo && (
              <CampoExtraido icon={MapPin} label="Ubigeo" valor={data.ubigeo} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: DNISideUploadZone
// ============================================================================

function DNISideUploadZone({
  lado,
  side,
  onFileSelect,
  onDelete,
  disabled,
}: {
  lado: 'frente' | 'reverso';
  side: DNISide | null;
  onFileSelect: (file: File) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || side) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [disabled, side, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !side) setIsDragging(true);
    },
    [disabled, side]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !side) {
      inputRef.current?.click();
    }
  }, [disabled, side]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
      e.target.value = '';
    },
    [onFileSelect]
  );

  const getBadgeEstado = () => {
    if (!side) return null;

    switch (side.estado) {
      case 'listo':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            OCR OK
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
            OCR...
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

  return (
    <div className="flex-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || !!side}
      />

      {/* Titulo */}
      <div className="flex items-center justify-between mb-2">
        <p
          className={`text-sm font-semibold ${lado === 'frente' ? 'text-green-700' : 'text-blue-700'}`}
        >
          {lado === 'frente' ? 'FRENTE' : 'REVERSO'}
        </p>
        {side && (
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-1 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>

      {/* Zona de upload o preview */}
      {!side ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            aspect-[1.6] border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center
            ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : `${lado === 'frente' ? 'border-green-300 hover:border-green-500 hover:bg-green-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'}`}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div
            className={`p-2 rounded-full mb-2 ${lado === 'frente' ? 'bg-green-100' : 'bg-blue-100'}`}
          >
            <Upload
              className={`w-6 h-6 ${lado === 'frente' ? 'text-green-500' : 'text-blue-500'}`}
            />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Sube {lado === 'frente' ? 'frente' : 'reverso'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG (max 10MB)</p>
        </div>
      ) : (
        <div className="aspect-[1.6] border-2 border-green-300 rounded-xl overflow-hidden relative group">
          <img
            src={side.previewUrl}
            alt={`DNI ${lado}`}
            className="w-full h-full object-cover"
          />

          {/* Loading overlay */}
          {(side.estado === 'subiendo' || side.estado === 'procesando') && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
              <span className="text-xs text-white">
                {side.estado === 'subiendo' ? 'Subiendo...' : 'Analizando OCR...'}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          {side.estado === 'listo' && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setShowPreview(true)}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                title="Ver imagen"
              >
                <Eye className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          )}

          {/* Badge estado */}
          <div className="absolute top-2 left-2">{getBadgeEstado()}</div>
        </div>
      )}

      {/* Error message */}
      {side?.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{side.error}</p>
        </div>
      )}

      {/* Modal preview */}
      {showPreview && side && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={side.previewUrl}
              alt={`DNI ${lado}`}
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

// ============================================================================
// COMPONENTE: DNIPairCard
// ============================================================================

function DNIPairCard({
  pair,
  onFileSelectFrente,
  onFileSelectReverso,
  onDeleteFrente,
  onDeleteReverso,
  onDelete,
  disabled,
  canDelete,
}: {
  pair: DNIPair;
  onFileSelectFrente: (file: File) => void;
  onFileSelectReverso: (file: File) => void;
  onDeleteFrente: () => void;
  onDeleteReverso: () => void;
  onDelete: () => void;
  disabled: boolean;
  canDelete: boolean;
}) {
  const [expandedFrente, setExpandedFrente] = useState(false);
  const [expandedReverso, setExpandedReverso] = useState(false);

  const getPersonaLabel = () => {
    if (pair.persona === 'titular') return 'TITULAR';
    if (pair.persona === 'conyuge') return 'CONYUGE';
    return `COPROPIETARIO ${pair.personaIndex || 1}`;
  };

  const getPersonaIcon = () => {
    if (pair.persona === 'titular') return User;
    if (pair.persona === 'conyuge') return Users;
    return Users;
  };

  const Icon = getPersonaIcon();

  const isComplete = pair.frente?.estado === 'listo' && pair.reverso?.estado === 'listo';
  const hasError = pair.frente?.estado === 'error' || pair.reverso?.estado === 'error';

  return (
    <div
      className={`border-2 rounded-xl p-4 bg-white ${
        isComplete
          ? 'border-green-300'
          : hasError
            ? 'border-red-300'
            : 'border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1b967a] rounded-lg">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-[#192c4d]">{getPersonaLabel()}</h4>
            <p className="text-xs text-gray-500">DNI Frente y Reverso</p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-2 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
            title="Eliminar persona"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        )}
      </div>

      {/* Zonas de upload lado a lado */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <DNISideUploadZone
          lado="frente"
          side={pair.frente}
          onFileSelect={onFileSelectFrente}
          onDelete={onDeleteFrente}
          disabled={disabled}
        />
        <DNISideUploadZone
          lado="reverso"
          side={pair.reverso}
          onFileSelect={onFileSelectReverso}
          onDelete={onDeleteReverso}
          disabled={disabled}
        />
      </div>

      {/* Paneles OCR */}
      {pair.frente?.ocrData && (
        <div className="mb-3">
          <PanelDatosFrente
            data={pair.frente.ocrData as DNIOCRData}
            expanded={expandedFrente}
            onToggle={() => setExpandedFrente(!expandedFrente)}
          />
        </div>
      )}

      {pair.reverso?.ocrData && (
        <div>
          <PanelDatosReverso
            data={pair.reverso.ocrData as DNIReversoOCRData}
            expanded={expandedReverso}
            onToggle={() => setExpandedReverso(!expandedReverso)}
          />
        </div>
      )}

      {/* Warning si esta incompleto */}
      {(!pair.frente || !pair.reverso) && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              DNI incompleto
            </p>
            <p className="text-xs text-yellow-600">
              Debes subir ambas caras del DNI (frente y reverso)
            </p>
          </div>
        </div>
      )}

      {/* Success message */}
      {isComplete && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              DNI completo y validado
            </p>
            <p className="text-xs text-green-600">
              Ambas caras fueron procesadas correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DNIPairUploader({
  localId,
  onPairsChange,
  onDatosExtraidos,
  initialPairs = [],
  disabled = false,
  tieneConyuge = false,
  numeroCopropietarios = 0,
}: DNIPairUploaderProps) {
  const [pairs, setPairs] = useState<DNIPair[]>(() => {
    if (initialPairs.length > 0) return initialPairs;

    // Crear pair inicial para titular
    return [
      {
        id: `titular-${Date.now()}`,
        persona: 'titular',
        frente: null,
        reverso: null,
      },
    ];
  });

  // ========================================
  // SINCRONIZAR initialPairs cuando cambia (para persistencia al reabrir)
  // ========================================
  useEffect(() => {
    if (initialPairs && initialPairs.length > 0) {
      setPairs(initialPairs);
    }
  }, [initialPairs]);

  // ========================================
  // PROCESS FILE
  // ========================================

  const processFile = useCallback(
    async (pairId: string, lado: 'frente' | 'reverso', file: File) => {
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

      // Actualizar estado a "subiendo"
      setPairs((prev) =>
        prev.map((p) =>
          p.id === pairId
            ? {
                ...p,
                [lado]: {
                  url: '',
                  previewUrl: localPreview,
                  ocrData: null,
                  estado: 'subiendo' as EstadoDNI,
                },
              }
            : p
        )
      );

      // Obtener persona para nombre de archivo
      const pair = pairs.find((p) => p.id === pairId);
      const personaLabel = pair
        ? pair.persona === 'copropietario'
          ? `copropietario-${pair.personaIndex}`
          : pair.persona
        : 'unknown';

      // Comprimir y subir
      const compressed = await compressImage(file);
      const uploadedUrl = await uploadToStorage(
        compressed,
        localId,
        personaLabel,
        lado
      );

      if (!uploadedUrl) {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === pairId && p[lado]
              ? {
                  ...p,
                  [lado]: {
                    ...p[lado]!,
                    estado: 'error' as EstadoDNI,
                    error: 'Error al subir la imagen',
                  },
                }
              : p
          )
        );
        return;
      }

      // Actualizar con URL y cambiar a "procesando"
      setPairs((prev) =>
        prev.map((p) =>
          p.id === pairId && p[lado]
            ? {
                ...p,
                [lado]: {
                  ...p[lado]!,
                  url: uploadedUrl,
                  estado: 'procesando' as EstadoDNI,
                },
              }
            : p
        )
      );

      // Ejecutar OCR
      const base64 = await fileToBase64(file);
      const ocrResult = await runOCR(base64, file.type, lado);

      if (!ocrResult.success || !ocrResult.data) {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === pairId && p[lado]
              ? {
                  ...p,
                  [lado]: {
                    ...p[lado]!,
                    estado: 'error' as EstadoDNI,
                    error: ocrResult.error || 'Error en OCR',
                  },
                }
              : p
          )
        );
        return;
      }

      // Exito
      setPairs((prev) => {
        const updated = prev.map((p) =>
          p.id === pairId && p[lado]
            ? {
                ...p,
                [lado]: {
                  ...p[lado]!,
                  ocrData: ocrResult.data!,
                  estado: 'listo' as EstadoDNI,
                  error: undefined,
                },
              }
            : p
        );

        // Notificar si tenemos ambos lados completos
        const updatedPair = updated.find((p) => p.id === pairId);
        if (
          updatedPair &&
          updatedPair.frente?.estado === 'listo' &&
          updatedPair.reverso?.estado === 'listo' &&
          updatedPair.frente.ocrData &&
          updatedPair.reverso.ocrData
        ) {
          const personaLabel =
            updatedPair.persona === 'copropietario'
              ? `copropietario-${updatedPair.personaIndex}`
              : updatedPair.persona;

          onDatosExtraidos?.({
            frente: updatedPair.frente.ocrData as DNIOCRData,
            reverso: updatedPair.reverso.ocrData as DNIReversoOCRData,
            persona: personaLabel,
          });
        }

        return updated;
      });
    },
    [localId, pairs, onDatosExtraidos]
  );

  // ========================================
  // HANDLERS
  // ========================================

  const handleDeleteSide = useCallback(
    (pairId: string, lado: 'frente' | 'reverso') => {
      setPairs((prev) =>
        prev.map((p) => {
          if (p.id !== pairId) return p;

          // Revocar object URL
          if (p[lado]?.previewUrl && !p[lado]!.previewUrl.startsWith('http')) {
            URL.revokeObjectURL(p[lado]!.previewUrl);
          }

          return {
            ...p,
            [lado]: null,
          };
        })
      );
    },
    []
  );

  const handleDeletePair = useCallback((pairId: string) => {
    setPairs((prev) => {
      const pairToDelete = prev.find((p) => p.id === pairId);
      if (pairToDelete) {
        // Revocar object URLs
        if (
          pairToDelete.frente?.previewUrl &&
          !pairToDelete.frente.previewUrl.startsWith('http')
        ) {
          URL.revokeObjectURL(pairToDelete.frente.previewUrl);
        }
        if (
          pairToDelete.reverso?.previewUrl &&
          !pairToDelete.reverso.previewUrl.startsWith('http')
        ) {
          URL.revokeObjectURL(pairToDelete.reverso.previewUrl);
        }
      }

      return prev.filter((p) => p.id !== pairId);
    });
  }, []);

  const handleAddCopropietario = useCallback(() => {
    const currentCopropietarios = pairs.filter(
      (p) => p.persona === 'copropietario'
    ).length;

    const newPair: DNIPair = {
      id: `copropietario-${Date.now()}`,
      persona: 'copropietario',
      personaIndex: currentCopropietarios + 1,
      frente: null,
      reverso: null,
    };

    setPairs((prev) => [...prev, newPair]);
  }, [pairs]);

  // ========================================
  // EFFECTS
  // ========================================

  // Notificar cambios al padre
  // Nota: onPairsChange se quita de dependencias porque es una arrow function
  // que se recrea en cada render del padre, causando loops infinitos
  React.useEffect(() => {
    onPairsChange(pairs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs]);

  // Agregar/eliminar conyuge segun prop
  React.useEffect(() => {
    const tienePairConyuge = pairs.some((p) => p.persona === 'conyuge');

    if (tieneConyuge && !tienePairConyuge) {
      setPairs((prev) => [
        ...prev,
        {
          id: `conyuge-${Date.now()}`,
          persona: 'conyuge',
          frente: null,
          reverso: null,
        },
      ]);
    } else if (!tieneConyuge && tienePairConyuge) {
      setPairs((prev) => prev.filter((p) => p.persona !== 'conyuge'));
    }
  }, [tieneConyuge, pairs]);

  // ========================================
  // RENDER
  // ========================================

  const titular = pairs.find((p) => p.persona === 'titular');
  const conyuge = pairs.find((p) => p.persona === 'conyuge');
  const copropietarios = pairs.filter((p) => p.persona === 'copropietario');

  const canAddCopropietarios = copropietarios.length < (numeroCopropietarios || 5);

  return (
    <div className="space-y-6">
      {/* Titular (siempre presente) */}
      {titular && (
        <DNIPairCard
          pair={titular}
          onFileSelectFrente={(f) => processFile(titular.id, 'frente', f)}
          onFileSelectReverso={(f) => processFile(titular.id, 'reverso', f)}
          onDeleteFrente={() => handleDeleteSide(titular.id, 'frente')}
          onDeleteReverso={() => handleDeleteSide(titular.id, 'reverso')}
          onDelete={() => {}} // Titular no se puede eliminar
          disabled={disabled}
          canDelete={false}
        />
      )}

      {/* Conyuge (si tieneConyuge = true) */}
      {conyuge && (
        <DNIPairCard
          pair={conyuge}
          onFileSelectFrente={(f) => processFile(conyuge.id, 'frente', f)}
          onFileSelectReverso={(f) => processFile(conyuge.id, 'reverso', f)}
          onDeleteFrente={() => handleDeleteSide(conyuge.id, 'frente')}
          onDeleteReverso={() => handleDeleteSide(conyuge.id, 'reverso')}
          onDelete={() => {}} // Controlado por prop tieneConyuge
          disabled={disabled}
          canDelete={false}
        />
      )}

      {/* Copropietarios */}
      {copropietarios.map((coprop) => (
        <DNIPairCard
          key={coprop.id}
          pair={coprop}
          onFileSelectFrente={(f) => processFile(coprop.id, 'frente', f)}
          onFileSelectReverso={(f) => processFile(coprop.id, 'reverso', f)}
          onDeleteFrente={() => handleDeleteSide(coprop.id, 'frente')}
          onDeleteReverso={() => handleDeleteSide(coprop.id, 'reverso')}
          onDelete={() => handleDeletePair(coprop.id)}
          disabled={disabled}
          canDelete={true}
        />
      ))}

      {/* Boton agregar copropietario */}
      {canAddCopropietarios && (
        <button
          onClick={handleAddCopropietario}
          disabled={disabled}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1b967a] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Agregar Copropietario</span>
        </button>
      )}

      {/* Info final */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4" />
          Cada imagen sera procesada con OCR inteligente para extraer datos
          automaticamente
        </p>
      </div>
    </div>
  );
}
