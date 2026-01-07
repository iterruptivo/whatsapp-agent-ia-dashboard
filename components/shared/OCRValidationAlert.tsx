'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Datos de un campo con discrepancia
 */
interface FieldDiscrepancy {
  label: string;
  formValue: string;
  ocrValue: string;
  fieldKey: string;
}

/**
 * Discrepancias agrupadas por persona
 */
export interface PersonDiscrepancies {
  persona: 'Titular' | 'Cónyuge' | `Copropietario ${number}`;
  discrepancies: FieldDiscrepancy[];
}

interface OCRValidationAlertProps {
  /** Array de discrepancias agrupadas por persona */
  personDiscrepancies: PersonDiscrepancies[];
  /** Callback al hacer clic en "Usar datos del DNI" */
  onApplyOCRData: (persona: string, fieldKey: string, ocrValue: string) => void;
  /** Callback al cerrar la alerta */
  onDismiss: () => void;
  /** Modo compacto o expandido por defecto */
  defaultExpanded?: boolean;
}

/**
 * Componente de validación inteligente que compara datos del formulario vs OCR
 * Muestra discrepancias en un banner elegante con opciones de corrección
 */
export default function OCRValidationAlert({
  personDiscrepancies,
  onApplyOCRData,
  onDismiss,
  defaultExpanded = false,
}: OCRValidationAlertProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  // Contar total de discrepancias
  const totalDiscrepancies = useMemo(
    () => personDiscrepancies.reduce((sum, pd) => sum + pd.discrepancies.length, 0),
    [personDiscrepancies]
  );

  if (personDiscrepancies.length === 0) {
    return null;
  }

  const handleApply = (persona: string, fieldKey: string, ocrValue: string) => {
    onApplyOCRData(persona, fieldKey, ocrValue);
    setAppliedFields(prev => new Set(prev).add(`${persona}-${fieldKey}`));
  };

  const handleApplyAll = (persona: string, discrepancies: FieldDiscrepancy[]) => {
    discrepancies.forEach(d => {
      onApplyOCRData(persona, d.fieldKey, d.ocrValue);
      setAppliedFields(prev => new Set(prev).add(`${persona}-${d.fieldKey}`));
    });
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-md mb-6 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-yellow-100 to-yellow-50">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <h4 className="text-sm font-semibold text-[#192c4d]">
              Discrepancia detectada entre formulario y DNI
            </h4>
            <p className="text-xs text-yellow-700 mt-0.5">
              {totalDiscrepancies} {totalDiscrepancies === 1 ? 'campo difiere' : 'campos difieren'} de los datos OCR
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-yellow-200 rounded transition-colors"
            title={isExpanded ? 'Contraer' : 'Expandir'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-yellow-700" />
            ) : (
              <ChevronDown className="h-5 w-5 text-yellow-700" />
            )}
          </button>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-yellow-200 rounded transition-colors"
            title="Cerrar"
          >
            <X className="h-5 w-5 text-yellow-700" />
          </button>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-6">
          {personDiscrepancies.map((pd, idx) => (
            <div key={idx} className="border-t border-yellow-200 pt-4 first:border-t-0 first:pt-0">
              {/* Título de persona */}
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-semibold text-[#192c4d]">{pd.persona}</h5>
                <button
                  onClick={() => handleApplyAll(pd.persona, pd.discrepancies)}
                  className="text-xs bg-[#1b967a] text-white px-3 py-1.5 rounded-md hover:bg-[#156b5a] transition-colors"
                >
                  Usar todos los datos del DNI
                </button>
              </div>

              {/* Tabla de discrepancias */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-yellow-100/50 border-b border-yellow-200">
                      <th className="text-left py-2 px-3 font-medium text-[#192c4d]">Campo</th>
                      <th className="text-left py-2 px-3 font-medium text-[#192c4d]">Formulario</th>
                      <th className="text-left py-2 px-3 font-medium text-[#192c4d]">DNI (OCR)</th>
                      <th className="text-center py-2 px-3 font-medium text-[#192c4d]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pd.discrepancies.map((disc, discIdx) => {
                      const fieldId = `${pd.persona}-${disc.fieldKey}`;
                      const isApplied = appliedFields.has(fieldId);

                      return (
                        <tr key={discIdx} className="border-b border-yellow-100 last:border-b-0">
                          <td className="py-2 px-3 font-medium text-gray-700">{disc.label}</td>
                          <td className="py-2 px-3 text-gray-600">
                            {disc.formValue || (
                              <span className="text-gray-400 italic">(vacío)</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[#1b967a] font-medium">
                            {disc.ocrValue}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isApplied ? (
                              <div className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs">Aplicado</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApply(pd.persona, disc.fieldKey, disc.ocrValue)}
                                className="text-xs bg-[#1b967a] text-white px-3 py-1 rounded hover:bg-[#156b5a] transition-colors"
                              >
                                Usar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Footer con info adicional */}
          <div className="border-t border-yellow-200 pt-3 text-xs text-yellow-700">
            <p>
              <strong>Nota:</strong> Los datos del DNI fueron extraídos por OCR.
              Puedes aplicarlos automáticamente o ignorar si consideras que el formulario es correcto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
