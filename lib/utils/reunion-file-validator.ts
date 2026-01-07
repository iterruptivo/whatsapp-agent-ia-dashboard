// ============================================================================
// VALIDADOR DE ARCHIVOS DE REUNIONES
// ============================================================================
// Valida tipo, tamaño y formato de archivos antes de upload
// ============================================================================

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;

const ALLOWED_EXTENSIONS = [
  '.mp3',
  '.mp4',
  '.wav',
  '.m4a',
  '.webm',
  '.mov',
  '.avi',
  '.mpeg',
] as const;

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB en bytes

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mediaTipo?: 'audio' | 'video';
}

export function validateReunionFile(file: File): FileValidationResult {
  // 1. Verificar que existe el archivo
  if (!file) {
    return {
      isValid: false,
      error: 'No se proporcionó ningún archivo',
    };
  }

  // 2. Verificar tamaño
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      isValid: false,
      error: `El archivo es demasiado grande (${sizeMB}MB). Máximo permitido: 2GB`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'El archivo está vacío',
    };
  }

  // 3. Verificar extensión
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `Extensión de archivo no válida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 4. Verificar MIME type
  const mimeType = file.type.toLowerCase();
  const hasValidMimeType = ALLOWED_MIME_TYPES.some((type) =>
    mimeType.includes(type)
  );

  if (!hasValidMimeType && mimeType !== '') {
    return {
      isValid: false,
      error: `Tipo de archivo no válido: ${mimeType}. Debe ser audio o video`,
    };
  }

  // 5. Determinar tipo de media
  const mediaTipo: 'audio' | 'video' = mimeType.startsWith('audio') ||
    fileName.endsWith('.mp3') ||
    fileName.endsWith('.wav') ||
    fileName.endsWith('.m4a')
    ? 'audio'
    : 'video';

  return {
    isValid: true,
    mediaTipo,
  };
}

export function getFileSizeFormatted(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
