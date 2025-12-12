'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Upload, X, Check, ZoomIn, ZoomOut, RotateCw, Trash2 } from 'lucide-react';

interface LogoUploaderProps {
  currentLogoUrl: string | null;
  onSave: (croppedImageBlob: Blob) => Promise<void>;
  onDelete?: () => Promise<void>;
  aspectRatio?: number;
  disabled?: boolean;
}

// Helper to create cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/png', 1);
  });
};

export default function LogoUploader({
  currentLogoUrl,
  onSave,
  onDelete,
  aspectRatio = 1,
  disabled = false,
}: LogoUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setIsEditing(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      await onSave(croppedImage);
      setIsEditing(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error saving logo:', error);
      alert('Error al guardar el logo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('¿Estás seguro de eliminar el logo?')) return;

    setIsSaving(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('Error al eliminar el logo');
    } finally {
      setIsSaving(false);
    }
  };

  // Editor mode
  if (isEditing && imageSrc) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">Ajustar Logo</div>

        {/* Cropper container */}
        <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden mb-4">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-500 w-10">{rotation}°</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1b967a] rounded-lg hover:bg-[#158a6e] disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <>
                <Check className="w-4 h-4 inline mr-1" />
                Guardar Logo
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Preview/Upload mode
  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">Logo del Proyecto</div>

      {currentLogoUrl ? (
        <div className="space-y-3">
          {/* Current logo preview */}
          <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
            <img
              src={currentLogoUrl}
              alt="Logo del proyecto"
              className="max-h-24 max-w-full object-contain"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4" />
              Cambiar
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled}
                className="hidden"
              />
            </label>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={disabled || isSaving}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500">Click para subir logo</span>
          <span className="text-xs text-gray-400 mt-1">PNG, JPG hasta 5MB</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
