'use client';

// ============================================================================
// COMPONENTE: DocumentoOCRCard
// ============================================================================
// Muestra preview de documento con datos extraidos por OCR
// Estados: procesando, ok, revision, error
// ============================================================================

import { useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  FileText
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

export type DocumentoEstado = 'procesando' | 'ok' | 'revision' | 'error';

export interface DocumentoOCRData {
  [key: string]: string | number | undefined;
}

export interface DocumentoOCRCardProps {
  // Identificador unico
  id: string;

  // Tipo de documento
  tipo: 'voucher' | 'dni' | 'boleta';

  // URL de la imagen/preview
  previewUrl: string;

  // Nombre del archivo
  fileName: string;

  // Estado del OCR
  estado: DocumentoEstado;

  // Datos extraidos por OCR
  datos: DocumentoOCRData;

  // Nivel de confianza (0-100)
  confianza?: number;

  // Callbacks
  onReescanear?: (id: string) => void;
  onEditar?: (id: string, datos: DocumentoOCRData) => void;
  onEliminar?: (id: string) => void;
  onVerCompleto?: (id: string) => void;

  // UI
  compacto?: boolean;
  editable?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const TIPO_LABELS: Record<string, string> = {
  voucher: 'Voucher Bancario',
  dni: 'DNI',
  boleta: 'Boleta/Factura',
};

const CAMPO_LABELS: Record<string, string> = {
  // Voucher
  monto: 'Monto',
  moneda: 'Moneda',
  fecha: 'Fecha',
  banco: 'Banco',
  numero_operacion: 'Nro. Operacion',
  nombre_depositante: 'Depositante',
  tipo_operacion: 'Tipo',
  // DNI
  numero_dni: 'DNI',
  nombres: 'Nombres',
  apellido_paterno: 'Ap. Paterno',
  apellido_materno: 'Ap. Materno',
  fecha_nacimiento: 'F. Nacimiento',
  sexo: 'Sexo',
  // Boleta
  tipo: 'Tipo Doc.',
  serie: 'Serie',
  numero: 'Numero',
  ruc_emisor: 'RUC Emisor',
  nombre_cliente: 'Cliente',
};

function getEstadoConfig(estado: DocumentoEstado) {
  switch (estado) {
    case 'procesando':
      return {
        icon: Loader2,
        color: 'text-gray-500',
        bg: 'bg-gray-100',
        label: 'Procesando...',
        animate: true,
      };
    case 'ok':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Datos OK',
        animate: false,
      };
    case 'revision':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        label: 'Requiere revision',
        animate: false,
      };
    case 'error':
      return {
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        label: 'Error de lectura',
        animate: false,
      };
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DocumentoOCRCard({
  id,
  tipo,
  previewUrl,
  fileName,
  estado,
  datos,
  confianza,
  onReescanear,
  onEditar,
  onEliminar,
  onVerCompleto,
  compacto = false,
  editable = true,
}: DocumentoOCRCardProps) {
  const [editando, setEditando] = useState(false);
  const [datosEditados, setDatosEditados] = useState<DocumentoOCRData>(datos);

  const estadoConfig = getEstadoConfig(estado);
  const EstadoIcon = estadoConfig.icon;

  // Filtrar campos a mostrar (excluir confianza)
  const camposAMostrar = Object.entries(datos).filter(
    ([key]) => key !== 'confianza' && datos[key] !== undefined && datos[key] !== ''
  );

  const handleGuardarEdicion = () => {
    onEditar?.(id, datosEditados);
    setEditando(false);
  };

  const handleCancelarEdicion = () => {
    setDatosEditados(datos);
    setEditando(false);
  };

  // ========================================
  // VISTA COMPACTA (para grids)
  // ========================================
  if (compacto) {
    return (
      <div
        className={`relative rounded-lg border overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${estadoConfig.bg}`}
        onClick={() => onVerCompleto?.(id)}
      >
        {/* Preview thumbnail */}
        <div className="relative w-full h-24 bg-gray-200">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={fileName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <div className="text-xs font-medium text-gray-700 truncate">
            {TIPO_LABELS[tipo] || tipo}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <EstadoIcon
              className={`w-3 h-3 ${estadoConfig.color} ${estadoConfig.animate ? 'animate-spin' : ''}`}
            />
            <span className={`text-xs ${estadoConfig.color}`}>
              {estado === 'ok' && confianza ? `${confianza}%` : estadoConfig.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // VISTA COMPLETA
  // ========================================
  return (
    <div className={`rounded-lg border overflow-hidden ${estadoConfig.bg}`}>
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {TIPO_LABELS[tipo] || tipo}
          </span>
          <span className="text-xs text-gray-500">
            ({fileName})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <EstadoIcon
            className={`w-4 h-4 ${estadoConfig.color} ${estadoConfig.animate ? 'animate-spin' : ''}`}
          />
          <span className={`text-sm ${estadoConfig.color}`}>
            {estadoConfig.label}
          </span>
          {confianza !== undefined && estado === 'ok' && (
            <span className="text-xs text-gray-500 ml-1">
              ({confianza}% confianza)
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex gap-4">
        {/* Preview */}
        <div className="flex-shrink-0">
          <div className="relative w-40 h-48 bg-gray-200 rounded-lg overflow-hidden border">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={fileName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          {onVerCompleto && (
            <button
              onClick={() => onVerCompleto(id)}
              className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Ver completo
            </button>
          )}
        </div>

        {/* Datos extraidos */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Datos detectados (OCR):
          </div>

          {estado === 'procesando' ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Extrayendo datos...</span>
            </div>
          ) : estado === 'error' ? (
            <div className="text-red-600 text-sm">
              No se pudieron extraer los datos. Intenta con otra imagen.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {camposAMostrar.map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-500">
                    {CAMPO_LABELS[key] || key}:
                  </span>
                  {editando ? (
                    <input
                      type="text"
                      value={String(datosEditados[key] || '')}
                      onChange={(e) => setDatosEditados({ ...datosEditados, [key]: e.target.value })}
                      className="ml-1 px-1 py-0.5 border rounded text-gray-900 w-full mt-0.5"
                    />
                  ) : (
                    <span className="ml-1 font-medium text-gray-900">
                      {String(value)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warning para baja confianza */}
          {estado === 'revision' && (
            <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              Algunos datos pueden ser incorrectos. Verifica antes de guardar.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {editable && estado !== 'procesando' && (
        <div className="bg-gray-50 border-t px-4 py-2 flex items-center gap-2">
          {editando ? (
            <>
              <button
                onClick={handleGuardarEdicion}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Guardar
              </button>
              <button
                onClick={handleCancelarEdicion}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {onReescanear && (
                <button
                  onClick={() => onReescanear(id)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                >
                  <RefreshCw className="w-3 h-3" />
                  Re-escanear
                </button>
              )}
              {onEditar && (
                <button
                  onClick={() => setEditando(true)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              )}
              {onEliminar && (
                <button
                  onClick={() => onEliminar(id)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
