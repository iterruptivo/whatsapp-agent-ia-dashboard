-- ============================================================================
-- Migración 011: Configuración de Storage para Terrenos Multimedia
-- ============================================================================
-- Crea bucket público para archivos multimedia de terrenos
-- ============================================================================

-- Crear bucket público para terrenos multimedia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'terrenos-multimedia',
  'terrenos-multimedia',
  true,
  104857600, -- 100MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ];

-- ============================================================================
-- Políticas de Seguridad (RLS) para el Bucket
-- ============================================================================

-- 1. Permitir INSERT solo a usuarios autenticados (corredores, admin, superadmin)
-- El endpoint API ya maneja la validación de permisos
CREATE POLICY "Usuarios autenticados pueden subir archivos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'terrenos-multimedia'
);

-- 2. Permitir SELECT público (bucket es público, las imágenes deben ser visibles)
CREATE POLICY "Archivos públicos pueden ser leídos por todos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'terrenos-multimedia'
);

-- 3. Permitir UPDATE solo al creador del archivo o admins
CREATE POLICY "Solo el creador o admin puede actualizar archivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'terrenos-multimedia' AND (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('superadmin', 'admin')
    )
  )
);

-- 4. Permitir DELETE solo al creador del archivo o admins
CREATE POLICY "Solo el creador o admin puede eliminar archivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'terrenos-multimedia' AND (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('superadmin', 'admin')
    )
  )
);

-- ============================================================================
-- Notas
-- ============================================================================
-- - El bucket es público para que las URLs sean accesibles directamente
-- - Las políticas RLS protegen contra uploads no autorizados
-- - Los admins/superadmins pueden gestionar cualquier archivo
-- - Los corredores solo pueden gestionar sus propios archivos
-- - El límite de 100MB es suficiente para videos cortos de demostración
-- ============================================================================
