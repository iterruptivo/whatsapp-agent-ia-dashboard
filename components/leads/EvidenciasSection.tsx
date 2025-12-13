'use client';

import { useState, useEffect, useRef } from 'react';
import { FileWarning, Upload, Image, Video, User, Calendar, Loader2, X, Play } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

interface Evidencia {
  id: string;
  lead_id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  archivo_url: string;
  archivo_tipo: 'imagen' | 'video';
  archivo_nombre: string;
  archivo_size: number | null;
  created_at: string;
}

interface EvidenciasSectionProps {
  leadId: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  canUpload: boolean;
  canView: boolean;
}

const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export default function EvidenciasSection({
  leadId,
  usuarioId,
  usuarioNombre,
  usuarioRol,
  canUpload,
  canView,
}: EvidenciasSectionProps) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'imagen' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canView) {
      loadEvidencias();
    }
  }, [leadId, canView]);

  const loadEvidencias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_evidencias')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evidencias:', error);
        setEvidencias([]);
      } else {
        setEvidencias(data || []);
      }
    } catch (err) {
      console.error('Error in loadEvidencias:', err);
      setEvidencias([]);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getRolBadge = (rol: string) => {
    const styles: Record<string, string> = {
      vendedor: 'bg-blue-100 text-blue-800',
      vendedor_caseta: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      vendedor: 'Vendedor',
      vendedor_caseta: 'Vendedor Caseta',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[rol] || 'bg-gray-100 text-gray-800'}`}>
        {labels[rol] || rol}
      </span>
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
          setError('Solo se permiten imágenes (JPG, PNG, WebP) y videos (MP4, MOV, WebM)');
          continue;
        }

        const fileSizeMB = file.size / (1024 * 1024);

        if (isImage && fileSizeMB > MAX_IMAGE_SIZE_MB) {
          setError(`La imagen "${file.name}" excede el límite de ${MAX_IMAGE_SIZE_MB}MB`);
          continue;
        }

        if (isVideo && fileSizeMB > MAX_VIDEO_SIZE_MB) {
          setError(`El video "${file.name}" excede el límite de ${MAX_VIDEO_SIZE_MB}MB`);
          continue;
        }

        let fileToUpload: Blob = file;
        let finalSize = file.size;

        if (isImage) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              fileType: 'image/jpeg',
            });
            fileToUpload = compressed;
            finalSize = compressed.size;
          } catch (compressError) {
            console.error('Error compressing image:', compressError);
          }
        }

        const timestamp = Date.now();
        const extension = isImage ? 'jpg' : file.name.split('.').pop() || 'mp4';
        const fileName = `${leadId}/${usuarioId}/${timestamp}_${i}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('evidencias-leads')
          .upload(fileName, fileToUpload, {
            contentType: isImage ? 'image/jpeg' : file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          setError(`Error al subir "${file.name}"`);
          continue;
        }

        const { data: urlData } = await supabase.storage
          .from('evidencias-leads')
          .getPublicUrl(fileName);

        // Insert directly from client (has auth context)
        const { data: insertedData, error: insertError } = await supabase
          .from('lead_evidencias')
          .insert({
            lead_id: leadId,
            usuario_id: usuarioId,
            usuario_nombre: usuarioNombre,
            usuario_rol: usuarioRol,
            archivo_url: urlData.publicUrl,
            archivo_tipo: isImage ? 'imagen' : 'video',
            archivo_nombre: file.name,
            archivo_size: finalSize,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting evidencia:', insertError);
          setError(`Error al guardar "${file.name}"`);
          continue;
        }

        if (insertedData) {
          setEvidencias((prev) => [insertedData as Evidencia, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error in handleFileSelect:', err);
      setError('Error al procesar archivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openPreview = (url: string, tipo: 'imagen' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(tipo);
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType(null);
  };

  if (!canView) {
    return null;
  }

  return (
    <section className="mt-6">
      <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
        <FileWarning className="w-5 h-5 text-orange-500" />
        Resolución de Conflictos / Evidencias
      </h3>

      {canUpload && (
        <div className="mb-4">
          <label
            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-primary hover:bg-green-50'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-2 pb-2">
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-1" />
                  <p className="text-sm text-gray-500">Subiendo...</p>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-primary">Click para subir</span> evidencias
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Imágenes (máx {MAX_IMAGE_SIZE_MB}MB) o Videos (máx {MAX_VIDEO_SIZE_MB}MB)
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')}
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
          {error && (
            <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : evidencias.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <FileWarning className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay evidencias registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evidencias.map((evidencia) => (
            <div
              key={evidencia.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
                  onClick={() => openPreview(evidencia.archivo_url, evidencia.archivo_tipo)}
                >
                  {evidencia.archivo_tipo === 'imagen' ? (
                    <img
                      src={evidencia.archivo_url}
                      alt={evidencia.archivo_nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {evidencia.archivo_tipo === 'imagen' ? (
                      <Image className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Video className="w-4 h-4 text-purple-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {evidencia.archivo_nombre}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(evidencia.archivo_size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    <span>{evidencia.usuario_nombre}</span>
                    {getRolBadge(evidencia.usuario_rol)}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(evidencia.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={closePreview}
          >
            <X className="w-8 h-8" />
          </button>
          {previewType === 'imagen' ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={previewUrl}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </section>
  );
}
