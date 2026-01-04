-- ============================================================================
-- Storage Policies for constancias-templates bucket
-- ============================================================================
-- Permite a usuarios autenticados leer templates de constancias
-- ============================================================================

-- Policy para SELECT (download)
CREATE POLICY "Authenticated users can read constancias templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'constancias-templates');

-- Policy para INSERT (upload) - solo service role (ya existe por defecto)
-- No se necesita crear policy adicional porque usamos service_role key para subir

-- Hacer el bucket público para lectura (alternativa más simple)
-- Esto permite que cualquier usuario autenticado descargue los templates
UPDATE storage.buckets
SET public = true
WHERE id = 'constancias-templates';
