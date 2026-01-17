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

// ============================================================================
// TERRENOS - TIPOS Y INTERFACES
// ============================================================================

/**
 * Tipo de terreno
 */
export type TerrenoTipo = 'urbano' | 'rural' | 'eriaza' | 'agricola' | 'industrial';

/**
 * Tipo de propiedad del terreno
 */
export type TerrenoPropiedad = 'inscrito' | 'posesion' | 'herencia' | 'comunidad' | 'otro';

/**
 * Urgencia de venta
 */
export type TerrenoUrgencia = 'inmediata' | 'corto_plazo' | 'mediano_plazo' | 'sin_apuro';

/**
 * Estados de un terreno en el pipeline
 */
export type TerrenoEstado =
  | 'borrador'
  | 'enviado'
  | 'en_revision'
  | 'info_adicional'
  | 'evaluacion'
  | 'visita_programada'
  | 'visitado'
  | 'negociacion'
  | 'aprobado'
  | 'rechazado'
  | 'archivado';

/**
 * Prioridad del terreno
 */
export type TerrenoPrioridad = 'baja' | 'normal' | 'alta' | 'urgente';

/**
 * Decisión final sobre el terreno
 */
export type TerrenoDecision = 'comprar' | 'descartar' | 'pendiente' | 'negociar';

/**
 * Moneda para precio
 */
export type TerrenoMoneda = 'USD' | 'PEN';

/**
 * Terreno completo
 */
export interface Terreno {
  id: string;
  corredor_id: string;
  codigo: string;

  // Ubicación
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;

  // Características
  area_total_m2: number;
  area_construida_m2: number;
  frente_ml?: number;
  fondo_ml?: number;
  tipo_terreno: TerrenoTipo;
  zonificacion?: string;
  uso_actual?: string;

  // Servicios
  tiene_agua: boolean;
  tiene_luz: boolean;
  tiene_desague: boolean;
  tiene_internet: boolean;
  acceso_pavimentado: boolean;

  // Legal
  tipo_propiedad?: TerrenoPropiedad;
  partida_registral?: string;
  ficha_registral_url?: string;
  tiene_cargas: boolean;
  descripcion_cargas?: string;
  propietario_nombre?: string;
  propietario_dni?: string;
  propietario_telefono?: string;
  propietario_es_corredor: boolean;

  // Valorización
  precio_solicitado?: number;
  moneda: TerrenoMoneda;
  precio_negociable: boolean;
  tasacion_referencial?: number;
  fuente_tasacion?: string;
  urgencia_venta?: TerrenoUrgencia;

  // Multimedia
  fotos_urls: string[];
  videos_urls: string[];
  planos_urls: string[];
  documentos_urls: string[];

  // Estado interno
  estado: TerrenoEstado;
  prioridad: TerrenoPrioridad;
  asignado_a?: string;
  fecha_asignacion?: string;

  // Evaluación
  puntaje_evaluacion?: number;
  evaluacion_notas?: string;

  // Visita
  fecha_visita_programada?: string;
  fecha_visita_realizada?: string;
  resultado_visita?: string;

  // Decisión
  decision_final?: TerrenoDecision;
  motivo_decision?: string;
  decidido_por?: string;
  fecha_decision?: string;

  // Oferta
  oferta_monto?: number;
  oferta_fecha?: string;
  oferta_aceptada?: boolean;

  // Comisión
  comision_porcentaje: number;
  comision_monto?: number;
  comision_pagada: boolean;
  fecha_pago_comision?: string;

  // Metadata
  notas_internas?: string;
  etiquetas: string[];

  // Auditoría
  created_at: string;
  updated_at: string;
  enviado_at?: string;

  // Proyecto relacionado
  proyecto_id?: string;

  // Relaciones (para joins)
  corredor?: RegistroCorredor;
  asignado?: {
    id: string;
    nombre: string;
  };
  proyecto?: {
    id: string;
    nombre: string;
  };
}

/**
 * Input para crear/editar terreno - Paso 1: Ubicación
 */
export interface TerrenoUbicacionInput {
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
}

/**
 * Input para crear/editar terreno - Paso 2: Características
 */
export interface TerrenoCaracteristicasInput {
  area_total_m2: number;
  area_construida_m2?: number;
  frente_ml?: number;
  fondo_ml?: number;
  tipo_terreno: TerrenoTipo;
  zonificacion?: string;
  uso_actual?: string;
  tiene_agua: boolean;
  tiene_luz: boolean;
  tiene_desague: boolean;
  tiene_internet: boolean;
  acceso_pavimentado: boolean;
}

/**
 * Input para crear/editar terreno - Paso 3: Legal
 */
export interface TerrenoLegalInput {
  tipo_propiedad?: TerrenoPropiedad;
  partida_registral?: string;
  tiene_cargas: boolean;
  descripcion_cargas?: string;
  propietario_nombre?: string;
  propietario_dni?: string;
  propietario_telefono?: string;
  propietario_es_corredor: boolean;
}

/**
 * Input para crear/editar terreno - Paso 4: Valorización
 */
export interface TerrenoValorizacionInput {
  precio_solicitado?: number;
  moneda: TerrenoMoneda;
  precio_negociable: boolean;
  tasacion_referencial?: number;
  fuente_tasacion?: string;
  urgencia_venta?: TerrenoUrgencia;
}

/**
 * Input para crear/editar terreno - Paso 5: Multimedia
 */
export interface TerrenoMultimediaInput {
  fotos_urls: string[];
  videos_urls: string[];
  planos_urls: string[];
  documentos_urls: string[];
}

/**
 * Input completo para crear terreno
 */
export interface TerrenoCreateInput extends
  TerrenoUbicacionInput,
  TerrenoCaracteristicasInput,
  TerrenoLegalInput,
  TerrenoValorizacionInput,
  TerrenoMultimediaInput {
  corredor_id: string;
}

/**
 * Historial de terreno
 */
export interface TerrenoHistorial {
  id: string;
  terreno_id: string;
  usuario_id?: string;
  corredor_id?: string;
  accion: string;
  estado_anterior?: TerrenoEstado;
  estado_nuevo?: TerrenoEstado;
  descripcion?: string;
  datos_anteriores?: Record<string, unknown>;
  datos_nuevos?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;

  // Relaciones
  usuario?: {
    id: string;
    nombre: string;
  };
  corredor?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
  };
}

/**
 * Comentario en terreno
 */
export interface TerrenoComentario {
  id: string;
  terreno_id: string;
  usuario_id?: string;
  corredor_id?: string;
  mensaje: string;
  archivos_urls: string[];
  es_interno: boolean;
  leido: boolean;
  fecha_leido?: string;
  created_at: string;

  // Relaciones
  usuario?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
  corredor?: {
    id: string;
    nombres: string;
    apellido_paterno: string;
    foto_perfil_url?: string;
  };
}

/**
 * Input para comentario
 */
export interface ComentarioInput {
  terreno_id: string;
  mensaje: string;
  archivos_urls?: string[];
  es_interno?: boolean;
}

/**
 * Ubigeo (ubicación geográfica)
 */
export interface Ubigeo {
  id: string;
  departamento: string;
  provincia?: string;
  distrito?: string;
  tipo: 'departamento' | 'provincia' | 'distrito';
}

/**
 * Filtros para terrenos
 */
export interface TerrenosFiltros {
  estado?: TerrenoEstado | 'todos';
  prioridad?: TerrenoPrioridad | 'todas';
  departamento?: string;
  tipo_terreno?: TerrenoTipo | 'todos';
  asignado_a?: string | 'todos' | 'sin_asignar';
  corredor_id?: string;
  busqueda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  area_min?: number;
  area_max?: number;
  precio_min?: number;
  precio_max?: number;
}

/**
 * Parámetros de paginación
 */
export interface PaginacionParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Estadísticas del módulo de terrenos
 */
export interface TerrenosStats {
  total: number;
  borradores: number;
  en_revision: number;
  aprobados: number;
  rechazados: number;
  por_estado: Record<TerrenoEstado, number>;
  por_departamento: { departamento: string; count: number }[];
  area_total_m2: number;
  valor_total_usd: number;
}

/**
 * Estado del wizard de terreno
 */
export interface TerrenoWizardState {
  paso_actual: number;
  terreno_id?: string;
  borrador: Partial<TerrenoCreateInput>;
  errores: Record<string, string>;
  guardando: boolean;
}

// ============================================================================
// TERRENOS - LABELS Y CONSTANTES UI
// ============================================================================

/**
 * Labels para tipos de terreno
 */
export const TIPO_TERRENO_LABELS: Record<TerrenoTipo, string> = {
  urbano: 'Urbano',
  rural: 'Rural',
  eriaza: 'Eriaza',
  agricola: 'Agrícola',
  industrial: 'Industrial',
};

/**
 * Labels para tipo de propiedad
 */
export const TIPO_PROPIEDAD_LABELS: Record<TerrenoPropiedad, string> = {
  inscrito: 'Inscrito en SUNARP',
  posesion: 'Posesión',
  herencia: 'Herencia',
  comunidad: 'Comunidad Campesina',
  otro: 'Otro',
};

/**
 * Labels para urgencia de venta
 */
export const URGENCIA_LABELS: Record<TerrenoUrgencia, string> = {
  inmediata: 'Inmediata (< 1 mes)',
  corto_plazo: 'Corto plazo (1-3 meses)',
  mediano_plazo: 'Mediano plazo (3-6 meses)',
  sin_apuro: 'Sin apuro',
};

/**
 * Labels para estados de terreno
 */
export const TERRENO_ESTADO_LABELS: Record<TerrenoEstado, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  en_revision: 'En Revisión',
  info_adicional: 'Info. Adicional',
  evaluacion: 'En Evaluación',
  visita_programada: 'Visita Programada',
  visitado: 'Visitado',
  negociacion: 'En Negociación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
};

/**
 * Colores para estados de terreno
 */
export const TERRENO_ESTADO_COLORS: Record<TerrenoEstado, { bg: string; text: string; border: string }> = {
  borrador: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  enviado: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  en_revision: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  info_adicional: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  evaluacion: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  visita_programada: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  visitado: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  negociacion: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  aprobado: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  rechazado: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  archivado: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

/**
 * Labels para prioridad
 */
export const PRIORIDAD_LABELS: Record<TerrenoPrioridad, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

/**
 * Colores para prioridad
 */
export const PRIORIDAD_COLORS: Record<TerrenoPrioridad, { bg: string; text: string }> = {
  baja: { bg: 'bg-gray-100', text: 'text-gray-600' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-600' },
  alta: { bg: 'bg-orange-100', text: 'text-orange-600' },
  urgente: { bg: 'bg-red-100', text: 'text-red-600' },
};

/**
 * Pasos del wizard de terreno
 */
export const WIZARD_STEPS = [
  { id: 1, titulo: 'Ubicación', descripcion: 'Datos de ubicación del terreno' },
  { id: 2, titulo: 'Características', descripcion: 'Área, tipo y servicios' },
  { id: 3, titulo: 'Documentación', descripcion: 'Información legal y propietario' },
  { id: 4, titulo: 'Valorización', descripcion: 'Precio y urgencia de venta' },
  { id: 5, titulo: 'Multimedia', descripcion: 'Fotos, videos y planos' },
];
