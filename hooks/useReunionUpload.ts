// ============================================================================
// HOOK: useReunionUpload
// ============================================================================
// Descripcion: Hook para manejar upload de reuniones con progreso
// Features: XMLHttpRequest para tracking, cancel, estados
// ============================================================================

import { useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

// Reuniones son GLOBALES - no requieren proyectoId
interface UseReunionUploadResult {
  status: UploadStatus;
  progress: number;
  error: string | null;
  reunionId: string | null;
  upload: (file: File, titulo: string, fechaReunion?: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useReunionUpload(): UseReunionUploadResult {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reunionId, setReunionId] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Reuniones son GLOBALES - no requieren proyectoId
  const upload = async (
    file: File,
    titulo: string,
    fechaReunion?: string
  ) => {
    try {
      setStatus('uploading');
      setProgress(0);
      setError(null);
      setReunionId(null);

      // Obtener token de autenticación
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      // PASO 1: Obtener presigned URL (sin proyectoId - reuniones globales)
      console.log('[useReunionUpload] Solicitando presigned URL...');
      const presignedResponse = await fetch('/api/reuniones/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          titulo,
          // NO enviamos proyectoId - reuniones son globales
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fechaReunion: fechaReunion || undefined,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Error al obtener URL de upload');
      }

      const { reunionId: uploadReunionId, presignedUrl, storagePath, token } = await presignedResponse.json();
      setReunionId(uploadReunionId);

      console.log('[useReunionUpload] Presigned URL obtenida:', { presignedUrl: presignedUrl?.substring(0, 100), storagePath });

      // PASO 2: Subir archivo usando el SDK de Supabase con el token
      // El método uploadToSignedUrl es más confiable que XHR directo
      console.log('[useReunionUpload] Iniciando upload con token a Supabase Storage...');

      // Para archivos grandes, usamos XHR con la URL construida correctamente
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Tracking de progreso de upload
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          console.log(`[useReunionUpload] Progreso: ${percentComplete}%`);
          setProgress(percentComplete);
        }
      });

      // Promesa para manejar el upload a Storage
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          console.log('[useReunionUpload] XHR load event, status:', xhr.status, 'response:', xhr.responseText?.substring(0, 200));
          if (xhr.status === 200 || xhr.status === 201) {
            resolve();
          } else {
            reject(new Error(`Error HTTP ${xhr.status}: ${xhr.responseText || 'Error desconocido'}`));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[useReunionUpload] XHR error event');
          reject(new Error('Error de red al subir archivo a Storage'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });
      });

      // Construir la URL de upload correcta usando el token
      // Supabase Storage espera PUT a /storage/v1/object/{bucket}/{path} con token como query param
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/reuniones-media/${storagePath}`;

      console.log('[useReunionUpload] Upload URL:', uploadUrl);

      // Iniciar upload con autenticación del usuario (no presigned)
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.send(file);

      // Esperar resultado del upload
      await uploadPromise;
      setProgress(100);

      console.log('[useReunionUpload] Upload completado, notificando al servidor...');

      // PASO 3: Notificar al servidor que el upload terminó
      const completeResponse = await fetch(`/api/reuniones/${uploadReunionId}/upload-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storagePath }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Error al confirmar upload');
      }

      console.log('[useReunionUpload] Upload confirmado, iniciando procesamiento...');
      setStatus('processing');

      // PASO 4: Trigger procesamiento en background
      fetch(`/api/reuniones/${uploadReunionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }).catch((err) => {
        console.error('Error triggering background processing:', err);
      });

      // Cambiar a done después de un delay
      setTimeout(() => {
        setStatus('done');
      }, 1000);
    } catch (err: any) {
      console.error('[useReunionUpload] Error:', err);
      setStatus('error');
      setError(err.message || 'Error al subir archivo');
      setProgress(0);
    } finally {
      xhrRef.current = null;
    }
  };

  const cancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setStatus('idle');
    setProgress(0);
    setError(null);
    setReunionId(null);
  };

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setReunionId(null);
    xhrRef.current = null;
  };

  return {
    status,
    progress,
    error,
    reunionId,
    upload,
    cancel,
    reset,
  };
}
