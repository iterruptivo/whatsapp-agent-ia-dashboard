/**
 * Tipos TypeScript - Módulo Expansión (Corredores)
 *
 * Define interfaces y tipos para el sistema de registro de corredores externos.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

// ============================================================================
// ENUMS / TIPOS BASE
// ============================================================================

/**
 * Tipo de persona para registro
 */
export type TipoPersona = 'natural' | 'juridica';

/**
 * Estados posibles de un registro de corredor
 */
export type EstadoRegistro = 'borrador' | 'pendiente' | 'observado' | 'aprobado' | 'rechazado';

/**
 * Tipos de documentos que puede subir un corredor
 */
export type TipoDocumento =
  | 'dni_frente'
  | 'dni_reverso'
  | 'recibo_luz'
  | 'declaracion_jurada_direccion'
  | 'ficha_ruc'
  | 'vigencia_poder'
  | 'declaracion_pep';

/**
 * Acciones registradas en historial
 */
export type AccionHistorial = 'creado' | 'enviado' | 'observado' | 'corregido' | 'aprobado' | 'rechazado';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Registro de corredor completo
 */
export interface RegistroCorredor {
  id: string;
  usuario_id: string;

  // Tipo de persona
  tipo_persona: TipoPersona;

  // Datos comunes
  email: string;
  telefono: string;
  direccion: string | null;

  // Datos Persona Natural
  dni: string | null;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null; // ISO date string

  // Datos Persona Jurídica
  razon_social: string | null;
  ruc: string | null;
  representante_legal: string | null;
  dni_representante: string | null;

  // Declaraciones
  direccion_declarada: string | null;
  es_pep: boolean;

  // Estado
  estado: EstadoRegistro;
  observaciones: string | null;

  // Auditoría
  created_at: string;
  updated_at: string;
  enviado_at: string | null;
  aprobado_por: string | null;
  aprobado_at: string | null;

  // Relaciones (opcional, para joins)
  usuario?: {
    nombre: string;
    email: string;
  };
  aprobador?: {
    nombre: string;
  };
  documentos?: DocumentoCorredor[];
  historial?: HistorialCambio[];
}

/**
 * Documento subido por corredor
 */
export interface DocumentoCorredor {
  id: string;
  registro_id: string;
  tipo_documento: TipoDocumento;

  // Storage
  storage_path: string;
  public_url: string | null;

  // OCR
  ocr_data: Record<string, any> | null;
  ocr_confianza: number | null;

  // Metadata
  nombre_original: string | null;
  content_type: string | null;
  size_bytes: number | null;

  created_at: string;
}

/**
 * Entrada del historial de cambios
 */
export interface HistorialCambio {
  id: string;
  registro_id: string;
  accion: AccionHistorial;
  comentario: string | null;
  realizado_por: string | null;
  created_at: string;

  // Relación opcional
  usuario?: {
    nombre: string;
  };
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Datos para crear/actualizar registro de persona natural
 */
export interface RegistroNaturalDTO {
  tipo_persona: 'natural';
  email: string;
  telefono: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  direccion_declarada: string;
}

/**
 * Datos para crear/actualizar registro de persona jurídica
 */
export interface RegistroJuridicaDTO {
  tipo_persona: 'juridica';
  email: string;
  telefono: string;
  razon_social: string;
  ruc: string;
  representante_legal: string;
  dni_representante: string;
  direccion_declarada: string;
  es_pep: boolean;
}

/**
 * DTO unión para crear registro
 */
export type CreateRegistroDTO = RegistroNaturalDTO | RegistroJuridicaDTO;

/**
 * DTO para actualizar registro (todos los campos opcionales)
 */
export type UpdateRegistroDTO = Partial<CreateRegistroDTO>;

/**
 * Respuesta de acción de servidor
 */
export interface ExpansionActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// TIPOS PARA UI
// ============================================================================

/**
 * Registro con datos calculados para mostrar en tabla
 */
export interface RegistroListItem {
  id: string;
  tipo_persona: TipoPersona;
  nombre_completo: string; // Calculado: nombres + apellidos o razón social
  email: string;
  telefono: string;
  estado: EstadoRegistro;
  created_at: string;
  enviado_at: string | null;
  documentos_count: number;
}

/**
 * Filtros para búsqueda de registros
 */
export interface RegistrosFiltros {
  estado?: EstadoRegistro;
  tipo_persona?: TipoPersona;
  busqueda?: string; // Buscar en nombre, email, DNI, RUC
}

/**
 * Estadísticas del inbox
 */
export interface InboxStats {
  total: number;
  pendientes: number;
  observados: number;
  aprobados: number;
  rechazados: number;
}

// ============================================================================
// DOCUMENTOS REQUERIDOS POR TIPO
// ============================================================================

/**
 * Documentos requeridos para persona natural
 */
export const DOCUMENTOS_PERSONA_NATURAL: TipoDocumento[] = [
  'dni_frente',
  'dni_reverso',
  'recibo_luz',
  'declaracion_jurada_direccion',
];

/**
 * Documentos requeridos para persona jurídica
 */
export const DOCUMENTOS_PERSONA_JURIDICA: TipoDocumento[] = [
  'ficha_ruc',
  'vigencia_poder',
  'dni_frente', // Del representante legal
  'dni_reverso',
  'declaracion_jurada_direccion',
  'declaracion_pep',
];

/**
 * Labels para tipos de documento
 */
export const DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  dni_frente: 'DNI (Frente)',
  dni_reverso: 'DNI (Reverso)',
  recibo_luz: 'Recibo de Agua/Luz',
  declaracion_jurada_direccion: 'Declaración Jurada de Dirección',
  ficha_ruc: 'Ficha RUC',
  vigencia_poder: 'Copia Literal - Vigencia de Poder',
  declaracion_pep: 'Declaración PEP',
};

/**
 * Documentos que tienen OCR habilitado
 */
export const DOCUMENTOS_CON_OCR: TipoDocumento[] = [
  'dni_frente',
  'dni_reverso',
  'recibo_luz',
  'ficha_ruc',
];

// ============================================================================
// COLORES Y ESTADOS UI
// ============================================================================

/**
 * Colores para badges de estado
 */
export const ESTADO_COLORS: Record<EstadoRegistro, { bg: string; text: string; border: string }> = {
  borrador: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  observado: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  aprobado: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  rechazado: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

/**
 * Labels para estados
 */
export const ESTADO_LABELS: Record<EstadoRegistro, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  observado: 'Observado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

/**
 * Labels para acciones de historial
 */
export const ACCION_LABELS: Record<AccionHistorial, string> = {
  creado: 'Registro creado',
  enviado: 'Enviado para revisión',
  observado: 'Observación agregada',
  corregido: 'Corrección enviada',
  aprobado: 'Registro aprobado',
  rechazado: 'Registro rechazado',
};
