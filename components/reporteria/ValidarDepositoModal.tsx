'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertTriangle, Edit2, Image } from 'lucide-react';
import { extractMovimientoBancarioData } from '@/lib/actions-ocr';
import { validarDepositoConMovimientoBancario } from '@/lib/actions-depositos-ficha';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DepositoData {
  id: string;
  cliente_nombre: string;
  monto: number;
  moneda: string;
  banco: string;
  numero_operacion: string;
  fecha_comprobante: string;
  // Campos de validación (para modo readonly)
  validado_finanzas?: boolean;
  validado_finanzas_nombre?: string | null;
  validado_finanzas_at?: string | null;
  imagen_movimiento_bancario_url?: string | null;
  numero_operacion_banco?: string | null;
  notas_validacion?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deposito: DepositoData | null;
  onSuccess: () => void;
  readOnly?: boolean;
}

export default function ValidarDepositoModal({ isOpen, onClose, deposito, onSuccess, readOnly = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractingOCR, setExtractingOCR] = useState(false);

  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [numeroOperacionBanco, setNumeroOperacionBanco] = useState('');
  const [confianzaOCR, setConfianzaOCR] = useState<number | null>(null);
  const [fueEditado, setFueEditado] = useState(false);
  const [notas, setNotas] = useState('');

  // Cargar datos existentes en modo readonly
  useEffect(() => {
    if (readOnly && deposito) {
      if (deposito.imagen_movimiento_bancario_url) {
        setImagenUrl(deposito.imagen_movimiento_bancario_url);
        setImagePreview(deposito.imagen_movimiento_bancario_url);
      }
      if (deposito.numero_operacion_banco) {
        setNumeroOperacionBanco(deposito.numero_operacion_banco);
      }
      if (deposito.notas_validacion) {
        setNotas(deposito.notas_validacion);
      }
    }
  }, [readOnly, deposito]);

  const resetState = () => {
    setImagenUrl(null);
    setImagePreview(null);
    setNumeroOperacionBanco('');
    setConfianzaOCR(null);
    setFueEditado(false);
    setNotas('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Preview local
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Upload a Supabase Storage
      const fileName = `movimiento-bancario/${deposito?.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('depositos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading:', uploadError);
        toast.error('Error al subir imagen');
        setUploadingImage(false);
        return;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('depositos')
        .getPublicUrl(fileName);

      setImagenUrl(publicUrl);

      // Extraer OCR
      setExtractingOCR(true);
      const base64 = await fileToBase64(file);
      const ocrResult = await extractMovimientoBancarioData(base64);

      if (ocrResult.success && ocrResult.data) {
        setNumeroOperacionBanco(ocrResult.data.numero_operacion || '');
        setConfianzaOCR(ocrResult.data.confianza);
        if (ocrResult.data.numero_operacion) {
          toast.success('Número de operación extraído');
        }
      } else {
        toast.warning('No se pudo extraer el número. Ingréselo manualmente.');
      }
    } catch (error) {
      console.error('Error procesando imagen:', error);
      toast.error('Error al procesar la imagen');
    } finally {
      setUploadingImage(false);
      setExtractingOCR(false);
    }
  }, [deposito?.id]);

  const handleNumeroChange = (value: string) => {
    setNumeroOperacionBanco(value);
    setFueEditado(true);
  };

  const handleValidar = async () => {
    if (!deposito) return;

    setLoading(true);

    try {
      const result = await validarDepositoConMovimientoBancario(deposito.id, {
        imagenMovimientoBancarioUrl: imagenUrl || undefined,
        numeroOperacionBanco: numeroOperacionBanco || undefined,
        numeroOperacionBancoEditado: fueEditado,
        numeroOperacionBancoConfianza: confianzaOCR || undefined,
        notas: notas || undefined,
      });

      if (result.success) {
        toast.success('Depósito validado correctamente');
        onSuccess();
        handleClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al validar depósito');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deposito) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${readOnly ? 'bg-blue-600' : 'bg-green-600'} text-white px-6 py-4 rounded-t-lg flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{readOnly ? 'Detalle de Validación' : 'Validar Depósito'}</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info de validación */}
        {readOnly && deposito?.validado_finanzas_nombre && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">
              Validado por <strong>{deposito.validado_finanzas_nombre}</strong>
              {deposito.validado_finanzas_at && (
                <> el {new Date(deposito.validado_finanzas_at).toLocaleDateString('es-PE')}</>
              )}
            </span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Datos del voucher original */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Datos del Voucher</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{deposito.cliente_nombre}</span></div>
              <div><span className="text-gray-500">Monto:</span> <span className="font-medium">{deposito.moneda} {deposito.monto.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Banco:</span> {deposito.banco}</div>
              <div><span className="text-gray-500">N° Op (voucher):</span> <span className="font-mono">{deposito.numero_operacion}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Fecha:</span> {deposito.fecha_comprobante}</div>
            </div>
          </div>

          {/* Adjuntar movimiento bancario */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-400 transition-colors">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              {readOnly ? 'Movimiento Bancario Adjunto' : 'Adjuntar Movimiento Bancario (opcional)'}
            </h3>

            {!imagePreview ? (
              readOnly ? (
                /* Modo readonly sin imagen */
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Image className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">No se adjuntó imagen de movimiento bancario</span>
                </div>
              ) : (
                /* Modo edición - control de upload */
                <label className="block cursor-pointer">
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500 hover:text-green-600 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Click para subir captura del reporte del banco</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG (máx 5MB)</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )
            ) : (
              <div className="space-y-3">
                <img
                  src={imagePreview}
                  alt="Movimiento bancario"
                  className="w-full max-h-48 object-contain rounded border bg-gray-100 cursor-pointer"
                  onClick={() => window.open(imagePreview, '_blank')}
                  title="Click para ampliar imagen"
                />
                {!readOnly && (
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImagenUrl(null);
                      setNumeroOperacionBanco('');
                      setConfianzaOCR(null);
                      setFueEditado(false);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 hover:underline"
                  >
                    Eliminar imagen
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Número de operación extraído */}
          {(imagePreview || numeroOperacionBanco) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                N° Operación (del banco)
                {extractingOCR && <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-green-600" />}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={numeroOperacionBanco}
                  onChange={(e) => handleNumeroChange(e.target.value)}
                  placeholder="Número de operación"
                  disabled={readOnly}
                  className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {/* Barra de confianza */}
              {confianzaOCR !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Confianza OCR</span>
                    <span>{confianzaOCR}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        confianzaOCR >= 80 ? 'bg-green-500' :
                        confianzaOCR >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${confianzaOCR}%` }}
                    />
                  </div>
                </div>
              )}

              {fueEditado && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Valor editado manualmente
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas de validación (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agregar observaciones..."
              rows={2}
              disabled={readOnly}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button
                onClick={handleValidar}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Validar Depósito
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
