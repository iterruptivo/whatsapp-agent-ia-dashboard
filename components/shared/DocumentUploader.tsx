'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface DocumentUploaderProps {
  title: string;
  description: string;
  maxImages: number;
  images: string[];
  onImagesChange: (images: string[]) => void;
  localId: string;
  folder: 'dni' | 'comprobante';
  disabled?: boolean;
  required?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function DocumentUploader({
  title,
  description,
  maxImages,
  images,
  onImagesChange,
  localId,
  folder,
  disabled = false,
  required = false,
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprimir imagen antes de subir
  const compressImage = async (file: File): Promise<Blob> => {
    const options = {
      maxSizeMB: 1, // Max 1MB
      maxWidthOrHeight: 1000, // Max 1000px width
      useWebWorker: true,
      fileType: 'image/jpeg' as const, // Convertir a JPEG
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (err) {
      console.error('Error compressing image:', err);
      // Si falla compresión, usar original
      return file;
    }
  };

  // Subir imagen a Supabase Storage
  const uploadImage = async (blob: Blob, index: number): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileName = `${localId}/${folder}/${timestamp}_${index}.jpg`;

      // Importar supabase dinámicamente para evitar problemas de SSR
      const { supabase } = await import('@/lib/supabase');

      // Subir a Storage
      const { data, error: uploadError } = await supabase.storage
        .from('documentos-ficha')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        throw new Error(uploadError.message);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos-ficha')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error in uploadImage:', err);
      return null;
    }
  };

  // Eliminar imagen de Supabase Storage
  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extraer path del archivo de la URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/documentos-ficha/');
      if (pathParts.length < 2) return false;

      const filePath = pathParts[1];
      const { supabase } = await import('@/lib/supabase');

      const { error: deleteError } = await supabase.storage
        .from('documentos-ficha')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting from storage:', deleteError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteImage:', err);
      return false;
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const remainingSlots = maxImages - images.length;

    if (remainingSlots <= 0) {
      setError(`Ya has alcanzado el máximo de ${maxImages} imágenes`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    // Validar tipos
    const invalidFiles = filesToProcess.filter(f => !ACCEPTED_TYPES.includes(f.type));
    if (invalidFiles.length > 0) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploadPromises = filesToProcess.map(async (file, index) => {
        // Comprimir
        const compressed = await compressImage(file);
        // Subir
        const url = await uploadImage(compressed, images.length + index);
        return url;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter((url): url is string => url !== null);

      if (successfulUrls.length > 0) {
        onImagesChange([...images, ...successfulUrls]);
      }

      if (successfulUrls.length < filesToProcess.length) {
        setError('Algunas imágenes no se pudieron subir');
      }
    } catch (err) {
      console.error('Error processing files:', err);
      setError('Error al procesar las imágenes');
    } finally {
      setUploading(false);
      // Limpiar input
      e.target.value = '';
    }
  }, [images, maxImages, localId, folder, onImagesChange]);

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index];
    setUploading(true);

    // Intentar eliminar del storage
    await deleteImage(imageUrl);

    // Actualizar state (siempre, incluso si falla el delete del storage)
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    setUploading(false);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <span className="text-xs text-gray-400">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Preview de imágenes existentes */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((url, index) => (
            <div
              key={url}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group"
            >
              <img
                src={url}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemoveImage(index)}
                  disabled={uploading}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Área de upload */}
      {images.length < maxImages && !disabled && (
        <label
          className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            uploading
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-[#1b967a] hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Subiendo...</span>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Click para subir</span>
              <span className="text-xs text-gray-400">JPG, PNG (máx. 5MB)</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={maxImages - images.length > 1}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
        </label>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {/* Required warning */}
      {required && images.length === 0 && !uploading && (
        <p className="mt-2 text-xs text-orange-500 flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          Se requiere al menos 1 imagen
        </p>
      )}
    </div>
  );
}
