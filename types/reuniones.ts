// ============================================================================
// TIPOS: Módulo de Reuniones
// ============================================================================
// Tipos TypeScript para el módulo de transcripciones y action items
// ============================================================================

export type ReunionEstado = 'subiendo' | 'procesando' | 'completado' | 'error';
export type MediaTipo = 'audio' | 'video';
export type Prioridad = 'alta' | 'media' | 'baja';

export interface Reunion {
  id: string;
  proyecto_id: string;
  created_by: string | null;

  // Metadata
  titulo: string;
  fecha_reunion: string | null;
  duracion_segundos: number | null;
  participantes: string[] | null;

  // Archivo multimedia
  media_storage_path: string | null;
  media_tipo: MediaTipo | null;
  media_size_bytes: number | null;
  media_deleted_at: string | null;

  // Contenido procesado por IA
  transcripcion_completa: string | null;
  resumen: string | null;
  puntos_clave: string[] | null;
  decisiones: string[] | null;
  preguntas_abiertas: string[] | null;

  // Sistema de permisos y compartir
  es_publico: boolean;
  link_token: string | null;
  usuarios_permitidos: string[] | null; // Array de UUIDs de usuarios
  roles_permitidos: string[] | null; // Array de roles ('vendedor', 'jefe_ventas', etc.)

  // Estado
  estado: ReunionEstado;
  error_mensaje: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface ReunionActionItem {
  id: string;
  reunion_id: string;

  // Contenido
  descripcion: string;
  asignado_nombre: string | null;
  asignado_usuario_id: string | null;
  deadline: string | null; // Date ISO string
  prioridad: Prioridad;
  contexto_quote: string | null;

  // Estado
  completado: boolean;
  completado_at: string | null;
  completado_por: string | null;

  created_at: string;
}

// ============================================================================
// TIPOS DE REQUEST/RESPONSE PARA APIs
// ============================================================================

export interface CreateReunionRequest {
  titulo: string;
  proyecto_id: string;
  fecha_reunion?: string;
  file: File;
}

export interface UploadReunionResponse {
  success: boolean;
  reunionId?: string;
  error?: string;
}

export interface ProcessReunionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GetReunionesParams {
  proyecto_id?: string;
  estado?: ReunionEstado;
  created_by?: string;
  created_by_filter?: 'mine' | 'all' | string; // Filtro adicional: 'mine'=solo mías, 'all'=todas, UUID=usuario específico
  page?: number;
  limit?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

// Tipo ligero para lista (sin campos pesados como transcripcion)
export interface ReunionListItem {
  id: string;
  titulo: string;
  fecha_reunion: string | null;
  estado: ReunionEstado;
  duracion_segundos: number | null;
  created_at: string;
  created_by: string | null;
  action_items_count: number;
  participantes_count: number;
  // Campos de permisos para badges de visibilidad
  es_publico: boolean;
  link_token: string | null;
  roles_permitidos: string[] | null;
  usuarios_permitidos: string[] | null;
}

// Metadata de paginación
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GetReunionesResponse {
  success: boolean;
  reuniones: ReunionListItem[];
  pagination: PaginationMetadata;
  error?: string;
}

// Request para editar reunión
export interface UpdateReunionRequest {
  titulo?: string;
  fecha_reunion?: string;
}

// Response para editar reunión
export interface UpdateReunionResponse {
  success: boolean;
  reunion?: Reunion;
  error?: string;
}

export interface GetReunionDetalleResponse {
  reunion: Reunion;
  actionItems: ReunionActionItem[];
}

// ============================================================================
// TIPOS PARA PROCESAMIENTO DE IA
// ============================================================================

export interface WhisperTranscriptionResult {
  text: string;
  duracion_segundos?: number;
}

export interface GPTResumenResult {
  resumen: string;
  puntos_clave: string[];
  decisiones: string[];
  preguntas_abiertas: string[];
  participantes: string[];
}

export interface GPTActionItemsResult {
  action_items: {
    descripcion: string;
    asignado_nombre: string | null;
    deadline: string | null;
    prioridad: Prioridad;
    contexto_quote: string | null;
  }[];
}

// ============================================================================
// TIPOS PARA CLEANUP CRON
// ============================================================================

export interface CleanupResult {
  cleaned_count: number;
  error_count: number;
  details: {
    success_ids: string[];
    errors: Array<{
      reunion_id: string;
      titulo: string;
      error: string;
    }>;
    timestamp: string;
  };
}

// ============================================================================
// TIPOS PARA ACTION ITEMS
// ============================================================================

export interface UpdateActionItemRequest {
  completado?: boolean;
  asignado_usuario_id?: string;
}

export interface GetUserActionItemsParams {
  include_completed?: boolean;
}

export interface ActionItemWithReunion extends ReunionActionItem {
  reunion_titulo: string;
  reunion_fecha: string | null;
}

// ============================================================================
// TIPOS PARA AUDITORÍA DE ELIMINACIÓN
// ============================================================================

export interface ReunionAudit {
  id: string;
  reunion_id: string;
  titulo: string;
  created_by: string;
  deleted_by: string;
  motivo: string;
  proyecto_id: string;
  deleted_at: string;
}
