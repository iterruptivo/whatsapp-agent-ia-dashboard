// ============================================================================
// VALIDADOR DE ARCHIVOS DE TERRENOS
// ============================================================================
// Valida tipo, tamaño y formato de archivos antes de upload
// ============================================================================

// Tipos de archivo permitidos por categoría
const ALLOWED_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
const ALLOWED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
const ALLOWED_DOCUMENTS = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

// Límites de tamaño
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB (compatible con bucket)
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export type FileCategory = 'fotos' | 'videos' | 'planos' | 'documentos';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateTerrenoFile(
  file: File,
  category: FileCategory
): FileValidationResult {
  // 1. Verificar que existe el archivo
  if (!file) {
    return {
      isValid: false,
      error: 'No se proporcionó ningún archivo',
    };
  }

  // 2. Verificar que no está vacío
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'El archivo está vacío',
    };
  }

  // 3. Validar según categoría
  switch (category) {
    case 'fotos':
      return validatePhoto(file);
    case 'videos':
      return validateVideo(file);
    case 'planos':
      return validateDocument(file);
    case 'documentos':
      return validateDocument(file);
    default:
      return {
        isValid: false,
        error: 'Categoría de archivo no válida',
      };
  }
}

function validatePhoto(file: File): FileValidationResult {
  // Verificar tamaño
  if (file.size > MAX_PHOTO_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      isValid: false,
      error: `La foto es demasiado grande (${sizeMB}MB). Máximo permitido: 10MB`,
    };
  }

  // Verificar tipo MIME
  if (!ALLOWED_IMAGES.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Formato de imagen no válido. Permitidos: JPG, PNG, WebP`,
    };
  }

  return { isValid: true };
}

function validateVideo(file: File): FileValidationResult {
  // Verificar tamaño
  if (file.size > MAX_VIDEO_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      isValid: false,
      error: `El video es demasiado grande (${sizeMB}MB). Máximo permitido: 100MB`,
    };
  }

  // Verificar tipo MIME
  if (!ALLOWED_VIDEOS.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Formato de video no válido. Permitidos: MP4, WebM, MOV`,
    };
  }

  return { isValid: true };
}

function validateDocument(file: File): FileValidationResult {
  // Verificar tamaño
  if (file.size > MAX_DOCUMENT_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      isValid: false,
      error: `El documento es demasiado grande (${sizeMB}MB). Máximo permitido: 10MB`,
    };
  }

  // Verificar tipo MIME
  if (!ALLOWED_DOCUMENTS.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Formato de documento no válido. Permitidos: PDF, JPG, PNG`,
    };
  }

  return { isValid: true };
}

export function getFileSizeFormatted(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
