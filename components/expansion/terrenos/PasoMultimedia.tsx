'use client';

import { useState } from 'react';
import { Image, Video, FileText, Upload, X, Loader2 } from 'lucide-react';
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

  // Subir archivos a Supabase Storage
  const subirArchivos = async (
    files: FileList,
    tipo: 'fotos' | 'videos' | 'planos' | 'documentos'
  ): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      // TODO: Implementar endpoint de upload en /api/expansion/terrenos/upload
      // Por ahora, retornamos URL placeholder
      const placeholderUrl = `https://placeholder.com/${tipo}/${file.name}`;
      urls.push(placeholderUrl);
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
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      alert('Error al subir fotos');
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
    } catch (error) {
      console.error('Error subiendo videos:', error);
      alert('Error al subir videos');
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
    } catch (error) {
      console.error('Error subiendo planos:', error);
      alert('Error al subir planos');
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
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      alert('Error al subir documentos');
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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1b967a] transition-colors bg-gray-50">
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
                <p className="text-xs text-gray-400 mt-1">MP4, MOV (máx. 50MB cada uno)</p>
              </>
            )}
          </label>
        </div>

        {datos.videos_urls && datos.videos_urls.length > 0 && (
          <div className="space-y-2 mt-4">
            {datos.videos_urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-100 rounded"
              >
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">Video {index + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarArchivo('videos_urls', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
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
