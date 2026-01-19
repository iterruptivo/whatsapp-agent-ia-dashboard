'use client';

import { useState } from 'react';
import { Image, Video, FileText, Upload, X, Loader2, Link as LinkIcon, Play } from 'lucide-react';
import { toast } from 'sonner';
import type { TerrenoCreateInput } from '@/lib/types/expansion';

interface PasoMultimediaProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
  terrenoId?: string;
}

export default function PasoMultimedia({
  datos,
  actualizarDatos,
  errores,
  terrenoId,
}: PasoMultimediaProps) {
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [subiendoVideos, setSubiendoVideos] = useState(false);
  const [subiendoPlanos, setSubiendoPlanos] = useState(false);
  const [subiendoDocumentos, setSubiendoDocumentos] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Parsear URL de YouTube para extraer el ID del video
  const extraerYoutubeVideoId = (url: string): string | null => {
    // Limpiar espacios
    url = url.trim();

    // Patrones comunes de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Si parece ser solo el ID (11 caracteres alfanuméricos)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  };

  // Convertir video ID a URL embed
  const obtenerUrlEmbed = (videoId: string): string => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // Detectar si una URL es de YouTube embed
  const esUrlYoutube = (url: string): boolean => {
    return url.includes('youtube.com/embed/');
  };

  // Agregar video de YouTube
  const handleAgregarYoutubeUrl = () => {
    if (!youtubeUrl.trim()) {
      toast.error('Por favor ingresa una URL de YouTube');
      return;
    }

    const videoId = extraerYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      toast.error('URL de YouTube inválida. Usa formatos como: https://www.youtube.com/watch?v=ABC123 o https://youtu.be/ABC123');
      return;
    }

    const embedUrl = obtenerUrlEmbed(videoId);

    // Verificar si ya existe
    if (datos.videos_urls?.includes(embedUrl)) {
      toast.warning('Este video ya fue agregado');
      return;
    }

    actualizarDatos({
      videos_urls: [...(datos.videos_urls || []), embedUrl],
    });

    toast.success('Video de YouTube agregado');
    // Limpiar input
    setYoutubeUrl('');
  };

  // Subir archivos a Supabase Storage
  const subirArchivos = async (
    files: FileList,
    tipo: 'fotos' | 'videos' | 'planos' | 'documentos'
  ): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      try {
        // Crear FormData con el archivo
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);

        // Si tenemos terrenoId, agregarlo para organizar mejor los archivos
        if (terrenoId) {
          formData.append('terreno_id', terrenoId);
        }

        // Hacer request al endpoint de upload
        const response = await fetch('/api/expansion/terrenos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al subir archivo');
        }

        const data = await response.json();

        if (data.success && data.url) {
          urls.push(data.url);
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      } catch (error: any) {
        console.error(`Error subiendo ${file.name}:`, error);
        toast.error(`Error subiendo ${file.name}: ${error.message}`);
        // Continuar con los demás archivos
      }
    }

    return urls;
  };

  // Handler para subir fotos
  const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoFotos(true);
    try {
      const urls = await subirArchivos(files, 'fotos');
      actualizarDatos({
        fotos_urls: [...(datos.fotos_urls || []), ...urls],
      });
      toast.success(`${urls.length} foto(s) agregada(s)`);
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      toast.error('Error al subir fotos');
    } finally {
      setSubiendoFotos(false);
    }
  };

  // Handler para subir videos
  const handleUploadVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoVideos(true);
    try {
      const urls = await subirArchivos(files, 'videos');
      actualizarDatos({
        videos_urls: [...(datos.videos_urls || []), ...urls],
      });
      toast.success(`${urls.length} video(s) subido(s)`);
    } catch (error) {
      console.error('Error subiendo videos:', error);
      toast.error('Error al subir videos');
    } finally {
      setSubiendoVideos(false);
    }
  };

  // Handler para subir planos
  const handleUploadPlanos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoPlanos(true);
    try {
      const urls = await subirArchivos(files, 'planos');
      actualizarDatos({
        planos_urls: [...(datos.planos_urls || []), ...urls],
      });
      toast.success(`${urls.length} plano(s) agregado(s)`);
    } catch (error) {
      console.error('Error subiendo planos:', error);
      toast.error('Error al subir planos');
    } finally {
      setSubiendoPlanos(false);
    }
  };

  // Handler para subir documentos
  const handleUploadDocumentos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoDocumentos(true);
    try {
      const urls = await subirArchivos(files, 'documentos');
      actualizarDatos({
        documentos_urls: [...(datos.documentos_urls || []), ...urls],
      });
      toast.success(`${urls.length} documento(s) agregado(s)`);
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      toast.error('Error al subir documentos');
    } finally {
      setSubiendoDocumentos(false);
    }
  };

  // Eliminar archivo
  const eliminarArchivo = (
    tipo: 'fotos_urls' | 'videos_urls' | 'planos_urls' | 'documentos_urls',
    index: number
  ) => {
    const nuevosUrls = [...(datos[tipo] || [])];
    nuevosUrls.splice(index, 1);
    actualizarDatos({ [tipo]: nuevosUrls });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-6 h-6 text-[#1b967a]" />
        <h2 className="text-[#192c4d] text-2xl font-bold">Multimedia</h2>
      </div>

      {/* Fotos (REQUERIDO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fotos del Terreno *
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            errores.fotos_urls
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-[#1b967a] bg-gray-50'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUploadFotos}
            className="hidden"
            id="upload-fotos"
            disabled={subiendoFotos}
          />
          <label
            htmlFor="upload-fotos"
            className="cursor-pointer flex flex-col items-center"
          >
            {subiendoFotos ? (
              <>
                <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mb-2" />
                <p className="text-sm text-gray-600">Subiendo fotos...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Haga clic para subir fotos o arrastre aquí
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, WebP (máx. 5MB cada una)
                </p>
              </>
            )}
          </label>
        </div>
        {errores.fotos_urls && (
          <p className="text-red-500 text-xs mt-1">{errores.fotos_urls}</p>
        )}

        {/* Lista de fotos */}
        {datos.fotos_urls && datos.fotos_urls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {datos.fotos_urls.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => eliminarArchivo('fotos_urls', index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos (Opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Videos (Opcional)
        </label>

        {/* Upload de archivos de video */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1b967a] transition-colors bg-gray-50 mb-4">
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleUploadVideos}
            className="hidden"
            id="upload-videos"
            disabled={subiendoVideos}
          />
          <label
            htmlFor="upload-videos"
            className="cursor-pointer flex flex-col items-center"
          >
            {subiendoVideos ? (
              <>
                <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mb-2" />
                <p className="text-sm text-gray-600">Subiendo videos...</p>
              </>
            ) : (
              <>
                <Video className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Subir videos del terreno</p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM (máx. 100MB cada uno)</p>
              </>
            )}
          </label>
        </div>

        {/* Input para link de YouTube */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">O pega un link de YouTube</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAgregarYoutubeUrl();
                }
              }}
              placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
              className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent text-sm"
            />
            <button
              type="button"
              onClick={handleAgregarYoutubeUrl}
              className="bg-[#1b967a] text-white px-4 py-2 rounded-md hover:bg-[#156b5a] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              Agregar
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Formatos: youtube.com/watch?v=ABC123, youtu.be/ABC123
          </p>
        </div>

        {/* Lista de videos */}
        {datos.videos_urls && datos.videos_urls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {datos.videos_urls.map((url, index) => (
              <div key={index} className="relative group">
                {esUrlYoutube(url) ? (
                  // Video de YouTube - Mostrar embed
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="relative" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={url}
                        title={`Video de YouTube ${index + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                    <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-white">Video de YouTube</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarArchivo('videos_urls', index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Video subido - Mostrar card simple
                  <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-700">Video subido {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarArchivo('videos_urls', index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planos (Opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Planos (Opcional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1b967a] transition-colors bg-gray-50">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleUploadPlanos}
            className="hidden"
            id="upload-planos"
            disabled={subiendoPlanos}
          />
          <label
            htmlFor="upload-planos"
            className="cursor-pointer flex flex-col items-center"
          >
            {subiendoPlanos ? (
              <>
                <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mb-2" />
                <p className="text-sm text-gray-600">Subiendo planos...</p>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Subir planos del terreno</p>
                <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG (máx. 10MB)</p>
              </>
            )}
          </label>
        </div>

        {datos.planos_urls && datos.planos_urls.length > 0 && (
          <div className="space-y-2 mt-4">
            {datos.planos_urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-100 rounded"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-700">Plano {index + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarArchivo('planos_urls', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos Adicionales (Opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Documentos Adicionales (Opcional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1b967a] transition-colors bg-gray-50">
          <input
            type="file"
            multiple
            accept="application/pdf,image/*,.doc,.docx"
            onChange={handleUploadDocumentos}
            className="hidden"
            id="upload-documentos"
            disabled={subiendoDocumentos}
          />
          <label
            htmlFor="upload-documentos"
            className="cursor-pointer flex flex-col items-center"
          >
            {subiendoDocumentos ? (
              <>
                <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mb-2" />
                <p className="text-sm text-gray-600">Subiendo documentos...</p>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Subir certificados, permisos, etc.
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, PNG, JPG (máx. 10MB)</p>
              </>
            )}
          </label>
        </div>

        {datos.documentos_urls && datos.documentos_urls.length > 0 && (
          <div className="space-y-2 mt-4">
            {datos.documentos_urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-100 rounded"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">Documento {index + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarArchivo('documentos_urls', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Suba fotos claras del terreno desde diferentes ángulos. Las
          fotos son obligatorias para enviar el terreno a revisión.
        </p>
      </div>
    </div>
  );
}
