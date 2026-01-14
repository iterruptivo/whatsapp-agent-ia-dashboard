/**
 * OCRDataCard Component
 *
 * Muestra los datos extraídos por OCR de documentos de forma visual y organizada.
 *
 * @version 1.0
 * @fecha 13 Enero 2026
 */

'use client';

import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DocumentoCorredor, TipoDocumento } from '@/lib/types/expansion';
import { DOCUMENTO_LABELS } from '@/lib/types/expansion';

// ============================================================================
// TYPES
// ============================================================================

interface OCRDataCardProps {
  documento: DocumentoCorredor;
}

interface OCRFieldConfig {
  label: string;
  key: string;
  format?: (value: any) => string;
}

// ============================================================================
// CONFIGURACIÓN DE CAMPOS POR TIPO DE DOCUMENTO
// ============================================================================

const OCR_FIELDS_CONFIG: Record<TipoDocumento, OCRFieldConfig[]> = {
  dni_frente: [
    { label: 'Nombres', key: 'nombres' },
    { label: 'Apellido Paterno', key: 'apellido_paterno' },
    { label: 'Apellido Materno', key: 'apellido_materno' },
    { label: 'DNI', key: 'numero_documento' },
    { label: 'Fecha Nacimiento', key: 'fecha_nacimiento' },
  ],
  dni_reverso: [
    { label: 'Dirección', key: 'direccion' },
    { label: 'Ubigeo', key: 'ubigeo' },
    { label: 'Distrito', key: 'distrito' },
    { label: 'Provincia', key: 'provincia' },
    { label: 'Departamento', key: 'departamento' },
  ],
  recibo_luz: [
    { label: 'Empresa', key: 'empresa' },
    { label: 'Dirección', key: 'direccion' },
    { label: 'Suministro', key: 'numero_suministro' },
    { label: 'Período', key: 'periodo' },
    { label: 'Total', key: 'total', format: (v) => `S/ ${v}` },
  ],
  declaracion_jurada_direccion: [
    { label: 'Nombre Completo', key: 'nombre_completo' },
    { label: 'DNI', key: 'dni' },
    { label: 'Dirección', key: 'direccion' },
    { label: 'Distrito', key: 'distrito' },
  ],
  ficha_ruc: [
    { label: 'RUC', key: 'ruc' },
    { label: 'Razón Social', key: 'razon_social' },
    { label: 'Dirección', key: 'direccion' },
    { label: 'Estado', key: 'estado' },
  ],
  vigencia_poder: [
    { label: 'RUC', key: 'ruc' },
    { label: 'Razón Social', key: 'razon_social' },
    { label: 'Representante', key: 'representante' },
  ],
  declaracion_pep: [
    { label: 'Nombre', key: 'nombre' },
    { label: 'DNI', key: 'dni' },
    { label: 'Es PEP', key: 'es_pep', format: (v) => v ? 'Sí' : 'No' },
  ],
};

// ============================================================================
// ICONOS POR TIPO DE DOCUMENTO
// ============================================================================

const DOCUMENTO_ICONS: Record<TipoDocumento, string> = {
  dni_frente: '🪪',
  dni_reverso: '🪪',
  recibo_luz: '💧',
  declaracion_jurada_direccion: '📄',
  ficha_ruc: '🏢',
  vigencia_poder: '⚖️',
  declaracion_pep: '📋',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getConfianzaBadge = (confianza: number | null) => {
  if (!confianza) return null;

  let bgColor = '';
  let textColor = '';
  let icon = null;

  if (confianza >= 90) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
    icon = <CheckCircle className="w-3 h-3" />;
  } else if (confianza >= 70) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
    icon = <AlertTriangle className="w-3 h-3" />;
  } else {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    icon = <XCircle className="w-3 h-3" />;
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bgColor} ${textColor} text-xs font-medium`}>
      {icon}
      {confianza}% confianza
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function OCRDataCard({ documento }: OCRDataCardProps) {
  // Si no hay datos OCR, no mostrar nada
  if (!documento.ocr_data || Object.keys(documento.ocr_data).length === 0) {
    return null;
  }

  const fieldsConfig = OCR_FIELDS_CONFIG[documento.tipo_documento] || [];
  const icon = DOCUMENTO_ICONS[documento.tipo_documento] || '📄';

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {DOCUMENTO_LABELS[documento.tipo_documento]}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Datos extraídos por OCR</p>
          </div>
        </div>
        {getConfianzaBadge(documento.ocr_confianza)}
      </div>

      {/* OCR Data Fields */}
      <div className="space-y-2.5">
        {fieldsConfig.map((field) => {
          const rawValue = documento.ocr_data?.[field.key];

          // Si el campo no existe, no mostrarlo
          if (rawValue === undefined || rawValue === null || rawValue === '') {
            return null;
          }

          const displayValue = field.format ? field.format(rawValue) : rawValue;

          return (
            <div key={field.key} className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-[#1b967a]" />
              <div className="ml-3 flex-1">
                <p className="text-xs font-medium text-gray-500">{field.label}</p>
                <p className="text-sm text-gray-900 font-medium mt-0.5">{displayValue}</p>
              </div>
            </div>
          );
        })}

        {/* Si no hay campos configurados, mostrar raw data */}
        {fieldsConfig.length === 0 && (
          <div className="text-xs text-gray-600 bg-gray-100 rounded p-3">
            <pre className="whitespace-pre-wrap font-mono">
              {JSON.stringify(documento.ocr_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
