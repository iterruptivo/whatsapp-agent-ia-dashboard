import { useMemo } from 'react';
import type { DNIPair, DNIOCRData, DNIReversoOCRData } from '@/components/shared/DNIPairUploader';
import type { PersonDiscrepancies } from '@/components/shared/OCRValidationAlert';

/**
 * Type guard para DNIOCRData (frente)
 */
function isDNIFrenteOCR(data: DNIOCRData | DNIReversoOCRData | null | undefined): data is DNIOCRData {
  return data !== null && data !== undefined && 'numero_dni' in data;
}

/**
 * Type guard para DNIReversoOCRData (reverso)
 */
function isDNIReversoOCR(data: DNIOCRData | DNIReversoOCRData | null | undefined): data is DNIReversoOCRData {
  return data !== null && data !== undefined && 'direccion' in data;
}

/**
 * Normaliza un string para comparación:
 * - Convierte a mayúsculas
 * - Elimina acentos
 * - Elimina espacios múltiples
 * - Trim
 */
function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, ' ') // Espacios múltiples a uno
    .trim();
}

/**
 * Compara dos valores y retorna true si son significativamente diferentes
 */
function isDifferent(formValue: string | null | undefined, ocrValue: string | null | undefined): boolean {
  const normForm = normalizeString(formValue);
  const normOcr = normalizeString(ocrValue);

  // Si ambos están vacíos, no es discrepancia
  if (!normForm && !normOcr) return false;

  // Si OCR está vacío, no mostramos discrepancia (falta de datos no es error)
  if (!normOcr) return false;

  // Si formulario está vacío pero OCR tiene datos, SÍ es discrepancia (campo faltante)
  if (!normForm && normOcr) return true;

  // Comparar valores normalizados
  return normForm !== normOcr;
}

/**
 * Interfaz para los datos del formulario (simplificada)
 */
interface FormDataForValidation {
  // Titular
  titular_nombres?: string | null;
  titular_apellido_paterno?: string | null;
  titular_apellido_materno?: string | null;
  titular_numero_documento?: string | null;
  titular_direccion?: string | null;
  titular_distrito?: string | null;
  titular_provincia?: string | null;
  titular_departamento?: string | null;

  // Cónyuge
  conyuge_nombres?: string | null;
  conyuge_apellido_paterno?: string | null;
  conyuge_apellido_materno?: string | null;
  conyuge_numero_documento?: string | null;
  conyuge_direccion?: string | null;
  conyuge_distrito?: string | null;
  conyuge_provincia?: string | null;
  conyuge_departamento?: string | null;

  // Copropietarios
  copropietarios?: Array<{
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    numero_documento?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
  }> | null;
}

/**
 * Hook que compara datos del formulario con datos OCR de DNI
 * Retorna las discrepancias encontradas agrupadas por persona
 */
export function useOCRValidation(
  dniPairs: DNIPair[],
  formData: FormDataForValidation
): PersonDiscrepancies[] {
  return useMemo(() => {
    const discrepancies: PersonDiscrepancies[] = [];

    // Función helper para agregar discrepancia
    const addDiscrepancy = (
      persona: 'Titular' | 'Cónyuge' | `Copropietario ${number}`,
      label: string,
      fieldKey: string,
      formValue: string | null | undefined,
      ocrValue: string | null | undefined
    ) => {
      if (!isDifferent(formValue, ocrValue)) return;

      let personGroup = discrepancies.find(d => d.persona === persona);
      if (!personGroup) {
        personGroup = { persona, discrepancies: [] };
        discrepancies.push(personGroup);
      }

      personGroup.discrepancies.push({
        label,
        formValue: formValue || '',
        ocrValue: ocrValue || '',
        fieldKey,
      });
    };

    // Validar TITULAR
    const titularPair = dniPairs.find(p => p.persona === 'titular');
    if (titularPair) {
      const frenteData = titularPair.frente?.ocrData;
      const reversoData = titularPair.reverso?.ocrData;

      if (isDNIFrenteOCR(frenteData)) {
        addDiscrepancy('Titular', 'Nombres', 'titular_nombres', formData.titular_nombres, frenteData.nombres);
        addDiscrepancy('Titular', 'Apellido Paterno', 'titular_apellido_paterno', formData.titular_apellido_paterno, frenteData.apellido_paterno);
        addDiscrepancy('Titular', 'Apellido Materno', 'titular_apellido_materno', formData.titular_apellido_materno, frenteData.apellido_materno);
        addDiscrepancy('Titular', 'Número de Documento', 'titular_numero_documento', formData.titular_numero_documento, frenteData.numero_dni);
      }

      if (isDNIReversoOCR(reversoData)) {
        addDiscrepancy('Titular', 'Dirección', 'titular_direccion', formData.titular_direccion, reversoData.direccion);
        addDiscrepancy('Titular', 'Distrito', 'titular_distrito', formData.titular_distrito, reversoData.distrito);
        addDiscrepancy('Titular', 'Provincia', 'titular_provincia', formData.titular_provincia, reversoData.provincia);
        addDiscrepancy('Titular', 'Departamento', 'titular_departamento', formData.titular_departamento, reversoData.departamento);
      }
    }

    // Validar CÓNYUGE
    const conyugePair = dniPairs.find(p => p.persona === 'conyuge');
    if (conyugePair) {
      const frenteData = conyugePair.frente?.ocrData;
      const reversoData = conyugePair.reverso?.ocrData;

      if (isDNIFrenteOCR(frenteData)) {
        addDiscrepancy('Cónyuge', 'Nombres', 'conyuge_nombres', formData.conyuge_nombres, frenteData.nombres);
        addDiscrepancy('Cónyuge', 'Apellido Paterno', 'conyuge_apellido_paterno', formData.conyuge_apellido_paterno, frenteData.apellido_paterno);
        addDiscrepancy('Cónyuge', 'Apellido Materno', 'conyuge_apellido_materno', formData.conyuge_apellido_materno, frenteData.apellido_materno);
        addDiscrepancy('Cónyuge', 'Número de Documento', 'conyuge_numero_documento', formData.conyuge_numero_documento, frenteData.numero_dni);
      }

      if (isDNIReversoOCR(reversoData)) {
        addDiscrepancy('Cónyuge', 'Dirección', 'conyuge_direccion', formData.conyuge_direccion, reversoData.direccion);
        addDiscrepancy('Cónyuge', 'Distrito', 'conyuge_distrito', formData.conyuge_distrito, reversoData.distrito);
        addDiscrepancy('Cónyuge', 'Provincia', 'conyuge_provincia', formData.conyuge_provincia, reversoData.provincia);
        addDiscrepancy('Cónyuge', 'Departamento', 'conyuge_departamento', formData.conyuge_departamento, reversoData.departamento);
      }
    }

    // Validar COPROPIETARIOS
    const copropietarioPairs = dniPairs.filter(p => p.persona.startsWith('copropietario'));
    copropietarioPairs.forEach((pair, index) => {
      const coprop = formData.copropietarios?.[index];
      if (!coprop) return;

      const personaLabel = `Copropietario ${index + 1}` as const;
      const frenteData = pair.frente?.ocrData;
      const reversoData = pair.reverso?.ocrData;

      if (isDNIFrenteOCR(frenteData)) {
        addDiscrepancy(personaLabel, 'Nombres', `copropietarios.${index}.nombres`, coprop.nombres, frenteData.nombres);
        addDiscrepancy(personaLabel, 'Apellido Paterno', `copropietarios.${index}.apellido_paterno`, coprop.apellido_paterno, frenteData.apellido_paterno);
        addDiscrepancy(personaLabel, 'Apellido Materno', `copropietarios.${index}.apellido_materno`, coprop.apellido_materno, frenteData.apellido_materno);
        addDiscrepancy(personaLabel, 'Número de Documento', `copropietarios.${index}.numero_documento`, coprop.numero_documento, frenteData.numero_dni);
      }

      if (isDNIReversoOCR(reversoData)) {
        addDiscrepancy(personaLabel, 'Dirección', `copropietarios.${index}.direccion`, coprop.direccion, reversoData.direccion);
        addDiscrepancy(personaLabel, 'Distrito', `copropietarios.${index}.distrito`, coprop.distrito, reversoData.distrito);
        addDiscrepancy(personaLabel, 'Provincia', `copropietarios.${index}.provincia`, coprop.provincia, reversoData.provincia);
        addDiscrepancy(personaLabel, 'Departamento', `copropietarios.${index}.departamento`, coprop.departamento, reversoData.departamento);
      }
    });

    return discrepancies;
  }, [dniPairs, formData]);
}
