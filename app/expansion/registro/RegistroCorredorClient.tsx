/**
 * RegistroCorredorClient Component
 *
 * Formulario completo para registro de corredores.
 * Soporta persona natural y jurídica con upload de documentos.
 * ORDEN: Tipo → Documentos → Datos Personales
 *
 * @version 2.0
 * @fecha 13 Enero 2026
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  Mail,
  Phone,
  FileText,
  Upload,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Loader2,
  CreditCard,
  Home,
  FileCheck,
} from 'lucide-react';
import {
  createRegistroCorredor,
  updateRegistroCorredor,
  submitRegistro,
  saveDocumentosCorredor,
  deleteDocumentoByUrl,
} from '@/lib/actions-expansion';
import type {
  RegistroCorredor,
  TipoPersona,
  EstadoRegistro,
  DocumentoCorredor,
  TipoDocumento,
} from '@/lib/types/expansion';
import {
  ESTADO_COLORS,
  ESTADO_LABELS,
} from '@/lib/types/expansion';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DocumentoOCRUploader, {
  type DNIOCRData,
  type DNIReversoOCRData,
  type DeclaracionJuradaOCRData,
  type OCRData,
  type ReciboLuzOCRData
} from '@/components/shared/DocumentoOCRUploader';

// ============================================================================
// TYPES
// ============================================================================

interface RegistroCorredorClientProps {
  usuario: {
    id: string;
    nombre: string;
    email: string;
  };
  registroExistente: RegistroCorredor | null;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extrae el storagePath de una URL pública de Supabase Storage
 * Ejemplo: https://xxx.supabase.co/storage/v1/object/public/documentos-ficha/corredores/123/dni_frente_123.jpg
 * Retorna: corredores/123/dni_frente_123.jpg
 */
function extractStoragePathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // El path después de /public/documentos-ficha/
    const match = urlObj.pathname.match(/\/public\/documentos-ficha\/(.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback: retornar la URL completa si no se puede extraer
    return url;
  } catch (error) {
    console.error('Error extrayendo storagePath:', error);
    return url;
  }
}

/**
 * Valida el email con formato correcto
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida teléfono peruano (9 dígitos empezando con 9)
 */
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\s/g, '');
  return /^9\d{8}$/.test(cleanPhone);
}

/**
 * Valida DNI peruano (8 dígitos)
 */
function isValidDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

/**
 * Valida RUC peruano (11 dígitos empezando con 10 o 20)
 */
function isValidRUC(ruc: string): boolean {
  return /^(10|20)\d{9}$/.test(ruc);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RegistroCorredorClient({
  usuario,
  registroExistente,
}: RegistroCorredorClientProps) {
  const router = useRouter();

  // Helper para parsear teléfono existente (v2 - fix startsWith)
  const parseTelefono = (telefono: string): { codigo: string; numero: string } => {
    if (!telefono) return { codigo: '+51', numero: '' };

    // Lista de códigos de país conocidos (ordenados por longitud descendente para match correcto)
    const codigosPais = ['+51']; // Por ahora solo Perú, agregar más según se necesite

    for (const codigo of codigosPais) {
      if (telefono.startsWith(codigo)) {
        const numero = telefono.slice(codigo.length);
        return { codigo, numero };
      }
    }

    // Fallback: si no matchea ningún código conocido, asumir Perú
    return { codigo: '+51', numero: telefono.replace(/\D/g, '') };
  };

  // Estado del formulario
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(
    registroExistente?.tipo_persona || 'natural'
  );

  // Estado para código de país y número separados
  const telefonoInicial = parseTelefono(registroExistente?.telefono || '');
  const [codigoPais, setCodigoPais] = useState<string>(telefonoInicial.codigo);
  const [numeroCelular, setNumeroCelular] = useState<string>(telefonoInicial.numero);

  const [formData, setFormData] = useState({
    email: registroExistente?.email || usuario.email,
    telefono: registroExistente?.telefono || '',
    // Persona Natural
    dni: registroExistente?.dni || '',
    nombres: registroExistente?.nombres || '',
    apellido_paterno: registroExistente?.apellido_paterno || '',
    apellido_materno: registroExistente?.apellido_materno || '',
    fecha_nacimiento: registroExistente?.fecha_nacimiento || '',
    // Persona Jurídica
    razon_social: registroExistente?.razon_social || '',
    ruc: registroExistente?.ruc || '',
    representante_legal: registroExistente?.representante_legal || '',
    dni_representante: registroExistente?.dni_representante || '',
    // Común
    direccion_declarada: registroExistente?.direccion_declarada || '',
    es_pep: registroExistente?.es_pep || false,
  });

  const [registroId, setRegistroId] = useState<string | null>(
    registroExistente?.id || null
  );
  const [estado, setEstado] = useState<EstadoRegistro>(
    registroExistente?.estado || 'borrador'
  );
  const [observaciones, setObservaciones] = useState<string | null>(
    registroExistente?.observaciones || null
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // URLs de imágenes para DocumentoOCRUploader
  const [dniFrenteUrls, setDniFrenteUrls] = useState<string[]>([]);
  const [dniReversoUrls, setDniReversoUrls] = useState<string[]>([]);
  const [reciboUrls, setReciboUrls] = useState<string[]>([]);
  const [declaracionJuradaUrls, setDeclaracionJuradaUrls] = useState<string[]>([]);

  // Datos OCR guardados (para cargar sin re-ejecutar OCR)
  const [dniFrenteOCRData, setDniFrenteOCRData] = useState<OCRData | null>(null);
  const [dniReversoOCRData, setDniReversoOCRData] = useState<OCRData | null>(null);
  const [reciboOCRData, setReciboOCRData] = useState<OCRData | null>(null);
  const [declaracionJuradaOCRData, setDeclaracionJuradaOCRData] = useState<OCRData | null>(null);

  // Sincronizar teléfono completo con formData cuando cambia código o número
  useEffect(() => {
    const numeroLimpio = numeroCelular.replace(/\s/g, '');
    const telefonoCompleto = numeroLimpio ? `${codigoPais}${numeroLimpio}` : '';
    setFormData(prev => ({
      ...prev,
      telefono: telefonoCompleto,
    }));
  }, [codigoPais, numeroCelular]);

  // Cargar URLs existentes de documentos al montar
  useEffect(() => {
    if (registroExistente?.documentos && registroExistente.documentos.length > 0) {
      const docs = registroExistente.documentos;

      console.log('[RegistroCorredorClient] Cargando documentos desde BD:', docs);

      const dniFrenteDoc = docs.find(d => d.tipo_documento === 'dni_frente');
      if (dniFrenteDoc && dniFrenteDoc.public_url) {
        console.log('[RegistroCorredorClient] DNI Frente encontrado:', dniFrenteDoc.public_url);
        setDniFrenteUrls([dniFrenteDoc.public_url]);
        // Cargar datos OCR guardados si existen
        if (dniFrenteDoc.ocr_data) {
          console.log('[RegistroCorredorClient] DNI Frente OCR data encontrado:', dniFrenteDoc.ocr_data);
          setDniFrenteOCRData(dniFrenteDoc.ocr_data as OCRData);
        }
      }

      const dniReversoDoc = docs.find(d => d.tipo_documento === 'dni_reverso');
      if (dniReversoDoc && dniReversoDoc.public_url) {
        console.log('[RegistroCorredorClient] DNI Reverso encontrado:', dniReversoDoc.public_url);
        setDniReversoUrls([dniReversoDoc.public_url]);
        if (dniReversoDoc.ocr_data) {
          console.log('[RegistroCorredorClient] DNI Reverso OCR data encontrado:', dniReversoDoc.ocr_data);
          setDniReversoOCRData(dniReversoDoc.ocr_data as OCRData);
        }
      }

      const reciboDoc = docs.find(d => d.tipo_documento === 'recibo_luz');
      if (reciboDoc && reciboDoc.public_url) {
        console.log('[RegistroCorredorClient] Recibo encontrado:', reciboDoc.public_url);
        setReciboUrls([reciboDoc.public_url]);
        if (reciboDoc.ocr_data) {
          console.log('[RegistroCorredorClient] Recibo OCR data encontrado:', reciboDoc.ocr_data);
          setReciboOCRData(reciboDoc.ocr_data as OCRData);
        }
      }

      const declaracionDoc = docs.find(d => d.tipo_documento === 'declaracion_jurada_direccion');
      if (declaracionDoc && declaracionDoc.public_url) {
        console.log('[RegistroCorredorClient] Declaración Jurada encontrada:', declaracionDoc.public_url);
        setDeclaracionJuradaUrls([declaracionDoc.public_url]);
        if (declaracionDoc.ocr_data) {
          console.log('[RegistroCorredorClient] Declaración Jurada OCR data encontrado:', declaracionDoc.ocr_data);
          setDeclaracionJuradaOCRData(declaracionDoc.ocr_data as OCRData);
        }
      }
    } else {
      console.log('[RegistroCorredorClient] No hay documentos en registroExistente');
    }
  }, [registroExistente]);

  // Documentos requeridos según tipo
  const canEdit = ['borrador', 'observado'].includes(estado);
  const documentosCompletos =
    dniFrenteUrls.length > 0 &&
    dniReversoUrls.length > 0 &&
    reciboUrls.length > 0 &&
    declaracionJuradaUrls.length > 0;
  const canSubmit = canEdit && documentosCompletos && formData.telefono;

  // Helper para verificar si un campo tiene error de validación
  const hasFieldError = (field: string): boolean => {
    return validationErrors.some(err => err.field === field);
  };

  // Clases de input con error
  const getInputClasses = (field: string, baseClasses: string = ''): string => {
    const errorClasses = hasFieldError(field)
      ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-300 focus:ring-[#1b967a]/20 focus:border-[#1b967a]';
    return `${baseClasses} ${errorClasses}`;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    // Limpiar error de validación para este campo
    if (validationErrors.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== name && err.field !== 'direccion'));
      if (error) setError(null);
    }
  };

  // Handler para cambio de número de celular con auto-formato
  const handleNumeroCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Solo dígitos
    if (input.length <= 9) {
      // Auto-formato: 999 999 999
      let formatted = input;
      if (input.length > 3 && input.length <= 6) {
        formatted = `${input.slice(0, 3)} ${input.slice(3)}`;
      } else if (input.length > 6) {
        formatted = `${input.slice(0, 3)} ${input.slice(3, 6)} ${input.slice(6)}`;
      }
      setNumeroCelular(formatted);

      // Limpiar error de validación
      if (validationErrors.some(err => err.field === 'telefono')) {
        setValidationErrors(prev => prev.filter(err => err.field !== 'telefono'));
        if (error) setError(null);
      }
    }
  };

  const handleTipoPersonaChange = (tipo: TipoPersona) => {
    setTipoPersona(tipo);
    // Limpiar documentos si cambia el tipo (en borrador)
    if (estado === 'borrador') {
      setDniFrenteUrls([]);
      setDniReversoUrls([]);
      setReciboUrls([]);
      setDeclaracionJuradaUrls([]);
    }
    // Limpiar errores de validación
    setValidationErrors([]);
    setError(null);
  };

  // Handlers para documentos con limpieza de errores
  const handleDniFrenteChange = (urls: string[]) => {
    setDniFrenteUrls(urls);
    if (urls.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== 'dni_frente'));
    }
  };

  const handleDniReversoChange = (urls: string[]) => {
    setDniReversoUrls(urls);
    if (urls.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== 'dni_reverso'));
    }
  };

  const handleReciboChange = (urls: string[]) => {
    setReciboUrls(urls);
    if (urls.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== 'recibo'));
    }
  };

  const handleDeclaracionJuradaChange = (urls: string[]) => {
    setDeclaracionJuradaUrls(urls);
    if (urls.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== 'declaracion'));
    }
  };

  // Guardar borrador
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      console.log('[handleSave] Iniciando guardado de borrador');
      console.log('[handleSave] URLs de documentos:', {
        dniFrenteUrls,
        dniReversoUrls,
        reciboUrls,
        declaracionJuradaUrls,
      });
      console.log('[handleSave] Datos OCR:', {
        dniFrenteOCRData,
        dniReversoOCRData,
        reciboOCRData,
        declaracionJuradaOCRData,
      });

      const data = {
        tipo_persona: tipoPersona,
        email: formData.email,
        telefono: formData.telefono,
        ...(tipoPersona === 'natural' && {
          dni: formData.dni,
          nombres: formData.nombres,
          apellido_paterno: formData.apellido_paterno,
          apellido_materno: formData.apellido_materno,
          fecha_nacimiento: formData.fecha_nacimiento,
          direccion_declarada: formData.direccion_declarada,
        }),
        ...(tipoPersona === 'juridica' && {
          razon_social: formData.razon_social,
          ruc: formData.ruc,
          representante_legal: formData.representante_legal,
          dni_representante: formData.dni_representante,
          direccion_declarada: formData.direccion_declarada,
          es_pep: formData.es_pep,
        }),
      };

      let result;
      let currentRegistroId = registroId;

      if (registroId) {
        result = await updateRegistroCorredor(registroId, data);
      } else {
        result = await createRegistroCorredor(data as any);
        if (result.success && result.data) {
          currentRegistroId = result.data.id;
          setRegistroId(result.data.id);
        }
      }

      if (!result.success) {
        setError(result.error || 'Error guardando');
        return;
      }

      // CRÍTICO: Guardar documentos subidos en la base de datos
      if (currentRegistroId) {
        const documentosParaGuardar: { tipo: TipoDocumento; url: string; storagePath: string; ocrData?: any }[] = [];

        // Mapear documentos con sus URLs Y datos OCR
        if (dniFrenteUrls.length > 0) {
          documentosParaGuardar.push({
            tipo: 'dni_frente' as TipoDocumento,
            url: dniFrenteUrls[0],
            storagePath: extractStoragePathFromUrl(dniFrenteUrls[0]),
            ocrData: dniFrenteOCRData || undefined,
          });
        }

        if (dniReversoUrls.length > 0) {
          documentosParaGuardar.push({
            tipo: 'dni_reverso' as TipoDocumento,
            url: dniReversoUrls[0],
            storagePath: extractStoragePathFromUrl(dniReversoUrls[0]),
            ocrData: dniReversoOCRData || undefined,
          });
        }

        if (reciboUrls.length > 0) {
          documentosParaGuardar.push({
            tipo: 'recibo_luz' as TipoDocumento,
            url: reciboUrls[0],
            storagePath: extractStoragePathFromUrl(reciboUrls[0]),
            ocrData: reciboOCRData || undefined,
          });
        }

        if (declaracionJuradaUrls.length > 0) {
          documentosParaGuardar.push({
            tipo: 'declaracion_jurada_direccion' as TipoDocumento,
            url: declaracionJuradaUrls[0],
            storagePath: extractStoragePathFromUrl(declaracionJuradaUrls[0]),
            ocrData: declaracionJuradaOCRData || undefined,
          });
        }

        console.log('[handleSave] Documentos para guardar:', documentosParaGuardar);

        // Guardar documentos en la base de datos si hay alguno
        if (documentosParaGuardar.length > 0) {
          console.log('[handleSave] Guardando', documentosParaGuardar.length, 'documentos en BD');
          const docsResult = await saveDocumentosCorredor(currentRegistroId, documentosParaGuardar);
          if (!docsResult.success) {
            console.error('[handleSave] Error guardando documentos:', docsResult.error);
            setError('Datos guardados pero hubo un error al guardar los documentos');
            return;
          }
          console.log('[handleSave] Documentos guardados exitosamente');
        } else {
          console.log('[handleSave] No hay documentos para guardar');
        }
      }

      console.log('[handleSave] Guardado completo exitosamente');
      setSuccess('Datos y documentos guardados correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  // Función de validación completa
  const validateForm = (): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validar documentos
    if (dniFrenteUrls.length === 0) {
      errors.push({ field: 'dni_frente', message: 'DNI (Frente) es requerido' });
    }
    if (dniReversoUrls.length === 0) {
      errors.push({ field: 'dni_reverso', message: 'DNI (Reverso) es requerido' });
    }
    if (reciboUrls.length === 0) {
      errors.push({ field: 'recibo', message: 'Recibo de Luz o Agua es requerido' });
    }
    if (declaracionJuradaUrls.length === 0) {
      errors.push({ field: 'declaracion', message: 'Declaración Jurada es requerida' });
    }

    // Validar campos comunes
    if (!formData.email || !isValidEmail(formData.email)) {
      errors.push({ field: 'email', message: 'Email válido es requerido' });
    }
    const numeroLimpio = numeroCelular.replace(/\s/g, '');
    if (!numeroLimpio) {
      errors.push({ field: 'telefono', message: 'Celular es requerido' });
    } else if (numeroLimpio.length !== 9) {
      errors.push({ field: 'telefono', message: 'El celular debe tener 9 dígitos' });
    } else if (!numeroLimpio.startsWith('9')) {
      errors.push({ field: 'telefono', message: 'El celular debe empezar con 9' });
    }
    if (!formData.direccion_declarada || formData.direccion_declarada.trim().length < 10) {
      errors.push({ field: 'direccion', message: 'Dirección declarada es requerida (mínimo 10 caracteres)' });
    }

    // Validar según tipo de persona
    if (tipoPersona === 'natural') {
      if (!formData.dni) {
        errors.push({ field: 'dni', message: 'DNI es requerido' });
      } else if (!isValidDNI(formData.dni)) {
        errors.push({ field: 'dni', message: 'DNI debe ser 8 dígitos' });
      }
      if (!formData.nombres || formData.nombres.trim().length < 2) {
        errors.push({ field: 'nombres', message: 'Nombres es requerido' });
      }
      if (!formData.apellido_paterno || formData.apellido_paterno.trim().length < 2) {
        errors.push({ field: 'apellido_paterno', message: 'Apellido Paterno es requerido' });
      }
      if (!formData.apellido_materno || formData.apellido_materno.trim().length < 2) {
        errors.push({ field: 'apellido_materno', message: 'Apellido Materno es requerido' });
      }
    } else {
      // Persona Jurídica
      if (!formData.ruc) {
        errors.push({ field: 'ruc', message: 'RUC es requerido' });
      } else if (!isValidRUC(formData.ruc)) {
        errors.push({ field: 'ruc', message: 'RUC debe ser 11 dígitos (empezando con 10 o 20)' });
      }
      if (!formData.razon_social || formData.razon_social.trim().length < 3) {
        errors.push({ field: 'razon_social', message: 'Razón Social es requerida' });
      }
      if (!formData.representante_legal || formData.representante_legal.trim().length < 3) {
        errors.push({ field: 'representante_legal', message: 'Representante Legal es requerido' });
      }
      if (!formData.dni_representante) {
        errors.push({ field: 'dni_representante', message: 'DNI del Representante es requerido' });
      } else if (!isValidDNI(formData.dni_representante)) {
        errors.push({ field: 'dni_representante', message: 'DNI del Representante debe ser 8 dígitos' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Determinar tipo de error según el mensaje
  const getErrorType = (errorMessage: string): 'validation' | 'session' | 'permission' | 'network' | 'unknown' => {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('token') || lowerError.includes('sesión') || lowerError.includes('session') ||
        lowerError.includes('autenticación') || lowerError.includes('authentication')) {
      return 'session';
    }
    if (lowerError.includes('permiso') || lowerError.includes('permission') ||
        lowerError.includes('autorizado') || lowerError.includes('unauthorized')) {
      return 'permission';
    }
    if (lowerError.includes('red') || lowerError.includes('network') ||
        lowerError.includes('conexión') || lowerError.includes('connection') ||
        lowerError.includes('timeout')) {
      return 'network';
    }
    return 'unknown';
  };

  // Obtener mensaje de error con scroll al primer campo con error
  const scrollToFirstError = () => {
    if (validationErrors.length === 0) return;

    // Mapear field names a sus IDs o query selectors
    const fieldToIdMap: Record<string, string> = {
      'dni_frente': 'input[type="file"]', // Primer campo de documento
      'dni_reverso': 'input[type="file"]',
      'recibo': 'input[type="file"]',
      'declaracion': 'input[type="file"]',
      'email': 'input[name="email"]',
      'telefono': 'input[type="tel"]',
      'dni': 'input[name="dni"]',
      'nombres': 'input[name="nombres"]',
      'apellido_paterno': 'input[name="apellido_paterno"]',
      'apellido_materno': 'input[name="apellido_materno"]',
      'ruc': 'input[name="ruc"]',
      'razon_social': 'input[name="razon_social"]',
      'representante_legal': 'input[name="representante_legal"]',
      'dni_representante': 'input[name="dni_representante"]',
      'direccion': 'textarea[name="direccion_declarada"]',
    };

    const firstErrorField = validationErrors[0].field;
    const selector = fieldToIdMap[firstErrorField];

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus en el elemento después del scroll
        setTimeout(() => {
          (element as HTMLElement).focus();
        }, 500);
      }
    } else {
      // Fallback: scroll al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Enviar para revisión
  const handleSubmit = async () => {
    // Primero validar todo el formulario
    const validation = validateForm();
    setValidationErrors(validation.errors);

    if (!validation.isValid) {
      setError('validation'); // Cambiar a tipo de error en lugar de mensaje
      // Scroll al primer campo con error
      scrollToFirstError();
      return;
    }

    if (!registroId) {
      // Guardar primero si no hay registro
      await handleSave();
      if (!registroId) {
        setError('Primero guarda los datos');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const result = await submitRegistro(registroId);

      if (!result.success) {
        const errorType = getErrorType(result.error || '');
        setError(errorType === 'unknown' ? (result.error || 'Error enviando') : errorType);
        return;
      }

      setEstado('pendiente');
      setSuccess('Registro enviado para revisión');
      router.refresh();
    } catch (err) {
      // Detectar tipo de error desde la excepción
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      const errorType = getErrorType(errorMessage);
      setError(errorType === 'unknown' ? 'Error inesperado al enviar el registro' : errorType);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para datos extraídos por OCR
  const handleDNIFrenteExtractedData = (data: OCRData) => {
    const dniData = data as DNIOCRData;
    console.log('[handleDNIFrenteExtractedData] Datos extraídos:', dniData);
    // Guardar los datos OCR en estado
    setDniFrenteOCRData(data);
    setFormData(prev => ({
      ...prev,
      dni: dniData.numero_dni || prev.dni,
      nombres: dniData.nombres || prev.nombres,
      apellido_paterno: dniData.apellido_paterno || prev.apellido_paterno,
      apellido_materno: dniData.apellido_materno || prev.apellido_materno,
      fecha_nacimiento: dniData.fecha_nacimiento || prev.fecha_nacimiento,
    }));
    setSuccess('Datos del DNI extraídos correctamente');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleReciboExtractedData = (data: OCRData) => {
    const reciboData = data as ReciboLuzOCRData;
    console.log('[handleReciboExtractedData] Datos extraídos:', reciboData);
    // Guardar los datos OCR en estado
    setReciboOCRData(data);
    if (reciboData.direccion) {
      setFormData(prev => ({
        ...prev,
        direccion_declarada: reciboData.direccion || prev.direccion_declarada,
      }));
      setSuccess('Dirección extraída del recibo correctamente');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDeclaracionJuradaExtractedData = (data: OCRData) => {
    const declaracionData = data as DeclaracionJuradaOCRData;
    console.log('[handleDeclaracionJuradaExtractedData] Datos extraídos:', declaracionData);
    // Guardar los datos OCR en estado
    setDeclaracionJuradaOCRData(data);

    // Siempre llenar la dirección desde la declaración jurada (tiene prioridad)
    if (declaracionData.direccion) {
      setFormData(prev => ({
        ...prev,
        direccion_declarada: declaracionData.direccion || prev.direccion_declarada,
      }));
      setSuccess('Dirección extraída de la declaración jurada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Handler para DNI Reverso - SOLO extrae dirección (no valida otros campos del DNI)
  const handleDNIReversoExtractedData = (data: OCRData) => {
    const reversoData = data as DNIReversoOCRData;
    console.log('[handleDNIReversoExtractedData] Datos extraídos:', reversoData);
    // Guardar los datos OCR en estado
    setDniReversoOCRData(data);
    // El reverso del DNI peruano contiene la dirección
    if (reversoData.direccion && !formData.direccion_declarada) {
      setFormData(prev => ({
        ...prev,
        direccion_declarada: reversoData.direccion || prev.direccion_declarada,
      }));
      setSuccess('Dirección extraída del DNI reverso correctamente');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // ============================================================================
  // HANDLERS DE ELIMINACIÓN DE DOCUMENTOS
  // ============================================================================

  const handleDeleteDniFrente = async (url: string) => {
    if (!registroId) return;
    const result = await deleteDocumentoByUrl(registroId, 'dni_frente', url);
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando documento');
    }
    router.refresh(); // Actualizar UI con datos del servidor
  };

  const handleDeleteDniReverso = async (url: string) => {
    if (!registroId) return;
    const result = await deleteDocumentoByUrl(registroId, 'dni_reverso', url);
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando documento');
    }
    router.refresh(); // Actualizar UI con datos del servidor
  };

  const handleDeleteRecibo = async (url: string) => {
    if (!registroId) return;
    const result = await deleteDocumentoByUrl(registroId, 'recibo_luz', url);
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando documento');
    }
    router.refresh(); // Actualizar UI con datos del servidor
  };

  const handleDeleteDeclaracionJurada = async (url: string) => {
    if (!registroId) return;
    const result = await deleteDocumentoByUrl(registroId, 'declaracion_jurada_direccion', url);
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando documento');
    }
    router.refresh(); // Actualizar UI con datos del servidor
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <DashboardHeader
        title="Registro de Corredor"
        subtitle="Complete su información para operar como corredor de EcoPlaza"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Estado */}
        {estado !== 'borrador' && (
          <div
            className={`mb-6 p-4 rounded-lg border ${ESTADO_COLORS[estado].bg} ${ESTADO_COLORS[estado].border}`}
          >
            <div className="flex items-center gap-3">
              {estado === 'pendiente' && <Clock className="w-5 h-5 text-yellow-600" />}
              {estado === 'observado' && <AlertCircle className="w-5 h-5 text-orange-600" />}
              {estado === 'aprobado' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {estado === 'rechazado' && <XCircle className="w-5 h-5 text-red-600" />}
              <div>
                <p className={`font-semibold ${ESTADO_COLORS[estado].text}`}>
                  Estado: {ESTADO_LABELS[estado]}
                </p>
                {observaciones && (
                  <p className="text-sm mt-1 text-gray-700">
                    <strong>Observaciones:</strong> {observaciones}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mensajes de Error - Mejorados */}
        {error && (
          <>
            {/* Error de Validación */}
            {error === 'validation' && validationErrors.length > 0 && (
              <div className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-xl shadow-sm">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-1">
                        Completa los siguientes campos
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        Hay {validationErrors.length} campo(s) que necesitan tu atención antes de continuar
                      </p>

                      {/* Lista de errores con iconos */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-red-200">
                        <ul className="space-y-2.5">
                          {validationErrors.map((err, idx) => (
                            <li key={idx} className="flex items-start gap-3 group">
                              <div className="mt-0.5 p-1 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                                <XCircle className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="text-sm text-red-800 font-medium flex-1">
                                {err.message}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            setError(null);
                            scrollToFirstError();
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Ir al primer campo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error de Sesión Expirada */}
            {error === 'session' && (
              <div className="mb-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 rounded-xl shadow-sm">
                      <AlertCircle className="w-6 h-6 text-yellow-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-900 mb-1 flex items-center gap-2">
                        Sesión Expirada
                      </h3>
                      <p className="text-sm text-yellow-800 mb-4">
                        Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente para continuar con tu registro.
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push('/login')}
                          className="px-5 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Iniciar Sesión
                        </button>
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2.5 bg-white text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors font-medium text-sm"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error de Permisos */}
            {error === 'permission' && (
              <div className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-400 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl shadow-sm">
                      <XCircle className="w-6 h-6 text-orange-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-orange-900 mb-1">
                        No tienes permiso
                      </h3>
                      <p className="text-sm text-orange-800 mb-4">
                        No tienes autorización para realizar esta acción. Por favor, contacta con el administrador o intenta iniciar sesión nuevamente.
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push('/login')}
                          className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Iniciar Sesión
                        </button>
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2.5 bg-white text-orange-800 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors font-medium text-sm"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error de Red */}
            {error === 'network' && (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
                      <AlertCircle className="w-6 h-6 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-blue-900 mb-1">
                        Error de Conexión
                      </h3>
                      <p className="text-sm text-blue-800 mb-4">
                        No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setError(null);
                            handleSubmit();
                          }}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Reintentar
                        </button>
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2.5 bg-white text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Desconocido / Genérico */}
            {error !== 'validation' && error !== 'session' && error !== 'permission' && error !== 'network' && (
              <div className="mb-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-xl shadow-sm">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-1">
                        Error al Enviar Registro
                      </h3>
                      <p className="text-sm text-red-800 mb-1">
                        {error}
                      </p>
                      <p className="text-xs text-red-600 mb-4">
                        Por favor, revisa los datos e intenta nuevamente. Si el problema persiste, contacta con soporte.
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Entendido
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">{success}</p>
              <p className="text-sm text-green-600">Puedes continuar editando o cerrar esta página</p>
            </div>
          </div>
        )}

        {/* Selector Tipo de Persona */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tipo de Registro
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => canEdit && handleTipoPersonaChange('natural')}
              disabled={!canEdit}
              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                tipoPersona === 'natural'
                  ? 'border-[#1b967a] bg-[#1b967a]/5 text-[#1b967a]'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <User className="w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold">Persona Natural</p>
                <p className="text-xs text-gray-500">DNI y documentos personales</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => canEdit && handleTipoPersonaChange('juridica')}
              disabled={!canEdit}
              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                tipoPersona === 'juridica'
                  ? 'border-[#1b967a] bg-[#1b967a]/5 text-[#1b967a]'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Building2 className="w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold">Persona Jurídica</p>
                <p className="text-xs text-gray-500">Empresa con RUC</p>
              </div>
            </button>
          </div>
        </div>

        {/* SECCIÓN 1: DOCUMENTOS REQUERIDOS - PRIMERO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#1b967a]" />
            Documentos Requeridos
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Sube tus documentos. Los datos se extraerán automáticamente.
          </p>

          <div className="space-y-6">
            {/* DNI Frente */}
            <div className={hasFieldError('dni_frente') ? 'ring-2 ring-red-200 rounded-lg' : ''}>
              <DocumentoOCRUploader
                tipo="dni"
                title="DNI (Frente)"
                description="Foto clara del lado frontal de tu DNI"
                localId={registroId || 'temp'}
                maxImages={1}
                required
                disabled={!canEdit}
                initialImageUrls={dniFrenteUrls}
                initialOCRData={dniFrenteOCRData}
                onDocumentosChange={handleDniFrenteChange}
                onDatosExtraidos={handleDNIFrenteExtractedData}
                onDocumentoEliminado={handleDeleteDniFrente}
              />
              {hasFieldError('dni_frente') && (
                <p className="text-xs text-red-500 mt-2 ml-2">DNI (Frente) es requerido</p>
              )}
            </div>

            {/* DNI Reverso - Solo extrae dirección */}
            <div className={hasFieldError('dni_reverso') ? 'ring-2 ring-red-200 rounded-lg' : ''}>
              <DocumentoOCRUploader
                tipo="dni_reverso"
                title="DNI (Reverso)"
                description="Foto clara del lado posterior de tu DNI"
                localId={registroId || 'temp'}
                maxImages={1}
                required
                disabled={!canEdit}
                initialImageUrls={dniReversoUrls}
                initialOCRData={dniReversoOCRData}
                onDocumentosChange={handleDniReversoChange}
                onDatosExtraidos={handleDNIReversoExtractedData}
                onDocumentoEliminado={handleDeleteDniReverso}
              />
              {hasFieldError('dni_reverso') && (
                <p className="text-xs text-red-500 mt-2 ml-2">DNI (Reverso) es requerido</p>
              )}
            </div>

            {/* Recibo de Luz O Agua */}
            <div className={hasFieldError('recibo') ? 'ring-2 ring-red-200 rounded-lg' : ''}>
              <DocumentoOCRUploader
                tipo="recibo_luz"
                title="Recibo de Luz O Agua"
                description="Recibo del último mes de cualquiera de los dos servicios"
                localId={registroId || 'temp'}
                maxImages={1}
                required
                disabled={!canEdit}
                initialImageUrls={reciboUrls}
                initialOCRData={reciboOCRData}
                onDocumentosChange={handleReciboChange}
                onDatosExtraidos={handleReciboExtractedData}
                onDocumentoEliminado={handleDeleteRecibo}
              />
              {hasFieldError('recibo') ? (
                <p className="text-xs text-red-500 mt-2 ml-2">Recibo de Luz o Agua es requerido</p>
              ) : (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Puedes subir un recibo de luz O un recibo de agua. Con cualquiera de los dos es suficiente.
                </p>
              )}
            </div>

            {/* Declaración Jurada de Dirección */}
            <div className={hasFieldError('declaracion') ? 'ring-2 ring-red-200 rounded-lg' : ''}>
              <DocumentoOCRUploader
                tipo="declaracion_jurada"
                title="Declaración Jurada de Dirección"
                description="Documento firmado donde declaras tu domicilio actual"
                localId={registroId || 'temp'}
                maxImages={1}
                required
                disabled={!canEdit}
                initialImageUrls={declaracionJuradaUrls}
                initialOCRData={declaracionJuradaOCRData}
                onDocumentosChange={handleDeclaracionJuradaChange}
                onDatosExtraidos={handleDeclaracionJuradaExtractedData}
                onDocumentoEliminado={handleDeleteDeclaracionJurada}
              />
              {hasFieldError('declaracion') && (
                <p className="text-xs text-red-500 mt-2 ml-2">Declaración Jurada es requerida</p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DATOS PERSONALES - DESPUÉS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-[#1b967a]" />
            {tipoPersona === 'natural' ? 'Datos Personales' : 'Datos de la Empresa'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Verifica y completa la información extraída de tus documentos
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${hasFieldError('email') ? 'text-red-600' : 'text-gray-700'}`}>
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${hasFieldError('email') ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('email')}`}
                />
              </div>
              {hasFieldError('email') && (
                <p className="text-xs text-red-500 mt-1">Email válido es requerido</p>
              )}
            </div>

            {/* Celular con selector de código de país */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${hasFieldError('telefono') ? 'text-red-600' : 'text-gray-700'}`}>
                Celular *
              </label>
              <div className="flex gap-0">
                {/* Selector de código de país */}
                <div className="relative">
                  <select
                    value={codigoPais}
                    onChange={(e) => setCodigoPais(e.target.value)}
                    disabled={!canEdit}
                    className={`h-full px-3 py-2 border border-r-0 rounded-l-lg focus:ring-2 focus:z-10 disabled:bg-gray-100 appearance-none pr-8 font-medium ${
                      hasFieldError('telefono')
                        ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                        : 'border-gray-300 focus:ring-[#1b967a]/20 focus:border-[#1b967a]'
                    }`}
                  >
                    <option value="+51">🇵🇪 +51</option>
                    {/* Preparado para agregar más países */}
                  </select>
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Input de número */}
                <div className="relative flex-1">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${hasFieldError('telefono') ? 'text-red-400' : 'text-gray-400'}`} />
                  <input
                    type="tel"
                    value={numeroCelular}
                    onChange={handleNumeroCelularChange}
                    disabled={!canEdit}
                    placeholder="999 999 999"
                    className={`w-full pl-10 pr-4 py-2 border rounded-r-lg focus:ring-2 disabled:bg-gray-100 ${
                      hasFieldError('telefono')
                        ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                        : 'border-gray-300 focus:ring-[#1b967a]/20 focus:border-[#1b967a]'
                    }`}
                  />
                </div>
              </div>
              {hasFieldError('telefono') ? (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.find(err => err.field === 'telefono')?.message || 'El celular debe tener 9 dígitos'}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Ingresa tu número de celular (9 dígitos)</p>
              )}
            </div>

            {/* Campos Persona Natural */}
            {tipoPersona === 'natural' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('dni') ? 'text-red-600' : 'text-gray-700'}`}>
                    DNI *
                  </label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    maxLength={8}
                    placeholder="12345678"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('dni')}`}
                  />
                  {hasFieldError('dni') && (
                    <p className="text-xs text-red-500 mt-1">DNI debe ser 8 dígitos</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a]/20 focus:border-[#1b967a] disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('nombres') ? 'text-red-600' : 'text-gray-700'}`}>
                    Nombres *
                  </label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('nombres')}`}
                  />
                  {hasFieldError('nombres') && (
                    <p className="text-xs text-red-500 mt-1">Nombres es requerido</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('apellido_paterno') ? 'text-red-600' : 'text-gray-700'}`}>
                    Apellido Paterno *
                  </label>
                  <input
                    type="text"
                    name="apellido_paterno"
                    value={formData.apellido_paterno}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('apellido_paterno')}`}
                  />
                  {hasFieldError('apellido_paterno') && (
                    <p className="text-xs text-red-500 mt-1">Apellido Paterno es requerido</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('apellido_materno') ? 'text-red-600' : 'text-gray-700'}`}>
                    Apellido Materno *
                  </label>
                  <input
                    type="text"
                    name="apellido_materno"
                    value={formData.apellido_materno}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('apellido_materno')}`}
                  />
                  {hasFieldError('apellido_materno') && (
                    <p className="text-xs text-red-500 mt-1">Apellido Materno es requerido</p>
                  )}
                </div>
              </>
            )}

            {/* Campos Persona Jurídica */}
            {tipoPersona === 'juridica' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('ruc') ? 'text-red-600' : 'text-gray-700'}`}>
                    RUC *
                  </label>
                  <input
                    type="text"
                    name="ruc"
                    value={formData.ruc}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    maxLength={11}
                    placeholder="20123456789"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('ruc')}`}
                  />
                  {hasFieldError('ruc') && (
                    <p className="text-xs text-red-500 mt-1">RUC debe ser 11 dígitos (empezando con 10 o 20)</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('razon_social') ? 'text-red-600' : 'text-gray-700'}`}>
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    name="razon_social"
                    value={formData.razon_social}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('razon_social')}`}
                  />
                  {hasFieldError('razon_social') && (
                    <p className="text-xs text-red-500 mt-1">Razón Social es requerida</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('representante_legal') ? 'text-red-600' : 'text-gray-700'}`}>
                    Representante Legal *
                  </label>
                  <input
                    type="text"
                    name="representante_legal"
                    value={formData.representante_legal}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('representante_legal')}`}
                  />
                  {hasFieldError('representante_legal') && (
                    <p className="text-xs text-red-500 mt-1">Representante Legal es requerido</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${hasFieldError('dni_representante') ? 'text-red-600' : 'text-gray-700'}`}>
                    DNI Representante *
                  </label>
                  <input
                    type="text"
                    name="dni_representante"
                    value={formData.dni_representante}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    maxLength={8}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${getInputClasses('dni_representante')}`}
                  />
                  {hasFieldError('dni_representante') && (
                    <p className="text-xs text-red-500 mt-1">DNI del Representante debe ser 8 dígitos</p>
                  )}
                </div>

                {/* Declaración PEP */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="es_pep"
                      checked={formData.es_pep}
                      onChange={handleInputChange}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded border-gray-300 text-[#1b967a] focus:ring-[#1b967a]"
                    />
                    <span className="text-sm text-gray-700">
                      Declaro que soy o he sido una Persona Expuesta Políticamente (PEP)
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* Dirección Declarada */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-1 flex items-center gap-1 ${hasFieldError('direccion') ? 'text-red-600' : 'text-gray-700'}`}>
                <Home className={`w-4 h-4 ${hasFieldError('direccion') ? 'text-red-400' : ''}`} />
                Dirección Declarada *
              </label>
              <textarea
                name="direccion_declarada"
                value={formData.direccion_declarada}
                onChange={handleInputChange}
                disabled={!canEdit}
                rows={4}
                placeholder="Av. Principal 123, Distrito, Provincia, Departamento"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 resize-none ${
                  hasFieldError('direccion')
                    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                    : 'border-gray-300 focus:ring-[#1b967a] focus:border-transparent'
                }`}
              />
              {hasFieldError('direccion') ? (
                <p className="text-xs text-red-500 mt-1">Dirección declarada es requerida (mínimo 10 caracteres)</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Este campo se llenará automáticamente al subir el recibo de luz/agua o la declaración jurada
                </p>
              )}
            </div>
          </div>

          {/* Botón Guardar */}
          {canEdit && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Borrador
              </button>
            </div>
          )}
        </div>

        {/* Botón Enviar */}
        {canEdit && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {estado === 'observado'
                    ? 'Reenviar para Revisión'
                    : 'Enviar para Revisión'}
                </p>
                <p className="text-sm text-gray-500">
                  {documentosCompletos
                    ? 'Todos los documentos están completos'
                    : 'Completa todos los documentos requeridos'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#156b5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {estado === 'observado' ? 'Reenviar' : 'Enviar'}
              </button>
            </div>
          </div>
        )}

        {/* Estado Pendiente Info */}
        {estado === 'pendiente' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  Tu registro está siendo revisado
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  El equipo legal de EcoPlaza revisará tu documentación.
                  Te notificaremos cuando haya una actualización.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
