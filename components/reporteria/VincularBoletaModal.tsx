'use client';

// ============================================================================
// MODAL: VincularBoletaModal (v3 - Multi-selección con carga desde servidor)
// ============================================================================
// Permite a Finanzas vincular una boleta/factura a MÚLTIPLES comprobantes
// del mismo cliente en el mismo día.
// Los depósitos relacionados se cargan desde el servidor al abrir el modal.
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  FileText,
  Receipt,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Users,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  vincularBoletaMultiple,
  getDepositosRelacionados,
  type DepositoRelacionadoServer
} from '@/lib/actions-fichas-reporte';
import { extractNumeroBoletaSimple } from '@/lib/actions-ocr';

interface VincularBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Depósito principal (el que se clickeó)
  fichaId: string;
  voucherIndex: number;
  clienteNombre: string;
  localCodigo: string;
  monto: string;
  montoNumerico: number;
  moneda: 'PEN' | 'USD';
  horaComprobante: string | null;
  fechaComprobante: string; // YYYY-MM-DD - para buscar relacionados
  onSuccess: () => void;
}

// Helper para formatear monto
function formatMonto(monto: number, moneda: 'PEN' | 'USD'): string {
  if (moneda === 'USD') {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `S/ ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function VincularBoletaModal({
  isOpen,
  onClose,
  fichaId,
  voucherIndex,
  clienteNombre,
  localCodigo,
  monto,
  montoNumerico,
  moneda,
  horaComprobante,
  fechaComprobante,
  onSuccess,
}: VincularBoletaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [tipo, setTipo] = useState<'boleta' | 'factura'>('boleta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para OCR
  const [extractingOCR, setExtractingOCR] = useState(false);
  const [confianzaOCR, setConfianzaOCR] = useState<number | null>(null);
  const [fueEditado, setFueEditado] = useState(false);

  // Estado para carga de depósitos relacionados desde el servidor
  const [loadingDepositos, setLoadingDepositos] = useState(false);
  const [depositosRelacionados, setDepositosRelacionados] = useState<DepositoRelacionadoServer[]>([]);
  const [fechaReferencia, setFechaReferencia] = useState<string>('');

  // Estado para multi-selección: incluye el depósito principal por defecto
  const [selectedDepositos, setSelectedDepositos] = useState<Set<string>>(new Set());

  // Cargar depósitos relacionados desde el servidor cuando se abre el modal
  // IMPORTANTE: Usamos fichaId para buscar por DNI del cliente, no por nombre
  useEffect(() => {
    if (isOpen && fichaId && fechaComprobante) {
      const cargarDepositos = async () => {
        setLoadingDepositos(true);
        try {
          const result = await getDepositosRelacionados({
            fichaId,
            fechaComprobante,
          });

          if (result.success) {
            setDepositosRelacionados(result.depositos);
            setFechaReferencia(result.fechaReferencia);
          }
        } catch (err) {
          console.error('Error cargando depósitos relacionados:', err);
        } finally {
          setLoadingDepositos(false);
        }
      };

      cargarDepositos();

      // Inicializar con el depósito principal seleccionado
      const primaryKey = `${fichaId}-${voucherIndex}`;
      setSelectedDepositos(new Set([primaryKey]));
    }
  }, [isOpen, fichaId, fechaComprobante, voucherIndex]);

  // Filtrar depósitos disponibles (sin boleta, excluyendo el principal)
  const depositosDisponibles = useMemo(() => {
    return depositosRelacionados.filter(d =>
      !d.tiene_boleta &&
      !(d.ficha_id === fichaId && d.voucher_index === voucherIndex)
    );
  }, [depositosRelacionados, fichaId, voucherIndex]);

  // Calcular total seleccionado
  const totalSeleccionado = useMemo(() => {
    let totalUSD = 0;
    let totalPEN = 0;

    // Siempre incluir el principal si está seleccionado
    const primaryKey = `${fichaId}-${voucherIndex}`;
    if (selectedDepositos.has(primaryKey)) {
      if (moneda === 'USD') totalUSD += montoNumerico;
      else totalPEN += montoNumerico;
    }

    // Agregar los relacionados seleccionados
    for (const dep of depositosDisponibles) {
      const key = `${dep.ficha_id}-${dep.voucher_index}`;
      if (selectedDepositos.has(key)) {
        if (dep.moneda === 'USD') totalUSD += dep.monto;
        else totalPEN += dep.monto;
      }
    }

    return { totalUSD, totalPEN };
  }, [selectedDepositos, depositosDisponibles, fichaId, voucherIndex, montoNumerico, moneda]);

  const toggleDeposito = (depFichaId: string, depVoucherIndex: number) => {
    const key = `${depFichaId}-${depVoucherIndex}`;
    const primaryKey = `${fichaId}-${voucherIndex}`;
    const newSet = new Set(selectedDepositos);
    if (newSet.has(key)) {
      // No permitir deseleccionar el principal
      if (key === primaryKey) return;
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedDepositos(newSet);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Formato no permitido. Use JPG, PNG, WEBP o PDF.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setConfianzaOCR(null);
    setFueEditado(false);

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));

      // Extraer número de boleta con OCR
      setExtractingOCR(true);
      try {
        const base64 = await fileToBase64(selectedFile);
        const ocrResult = await extractNumeroBoletaSimple(base64);

        if (ocrResult.success && ocrResult.data) {
          if (ocrResult.data.numero_boleta) {
            setNumeroBoleta(ocrResult.data.numero_boleta);
            toast.success('Número de boleta extraído automáticamente');
          }
          if (ocrResult.data.tipo) {
            setTipo(ocrResult.data.tipo);
          }
          setConfianzaOCR(ocrResult.data.confianza);
        } else {
          toast.warning('No se pudo extraer el número. Ingréselo manualmente.');
        }
      } catch (err) {
        console.error('Error en OCR:', err);
        toast.warning('No se pudo extraer el número. Ingréselo manualmente.');
      } finally {
        setExtractingOCR(false);
      }
    } else if (selectedFile.type === 'application/pdf') {
      // Convertir PDF a imagen para OCR y preview
      setExtractingOCR(true);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // Alta resolución para OCR

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Preview
        const pngDataUrl = canvas.toDataURL('image/png');
        setPreviewUrl(pngDataUrl);

        // OCR - extraer solo base64 sin el prefijo data:image/png;base64,
        const base64 = pngDataUrl.split(',')[1];
        const ocrResult = await extractNumeroBoletaSimple(base64);

        if (ocrResult.success && ocrResult.data) {
          if (ocrResult.data.numero_boleta) {
            setNumeroBoleta(ocrResult.data.numero_boleta);
            toast.success('Número de boleta extraído automáticamente del PDF');
          }
          if (ocrResult.data.tipo) {
            setTipo(ocrResult.data.tipo);
          }
          setConfianzaOCR(ocrResult.data.confianza);
        } else {
          toast.warning('No se pudo extraer el número del PDF. Ingréselo manualmente.');
        }
      } catch (err) {
        console.error('Error procesando PDF:', err);
        toast.warning('No se pudo procesar el PDF. Ingréselo manualmente.');
        setPreviewUrl(null);
      } finally {
        setExtractingOCR(false);
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleNumeroBoletaChange = (value: string) => {
    setNumeroBoleta(value);
    setFueEditado(true);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Seleccione un archivo');
      return;
    }

    if (!numeroBoleta.trim()) {
      setError('Ingrese el número de boleta/factura');
      return;
    }

    if (selectedDepositos.size === 0) {
      setError('Seleccione al menos un depósito');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // 2. Upload archivo (usamos el primer fichaId para el path)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fichaId', fichaId);
      formData.append('voucherIndex', voucherIndex.toString());

      const uploadResponse = await fetch('/api/boletas/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Error al subir archivo');
      }

      // 3. Preparar lista de depósitos a vincular
      const depositosAVincular: Array<{ fichaId: string; voucherIndex: number }> = [];

      for (const key of selectedDepositos) {
        // IMPORTANTE: El fichaId es un UUID con guiones, así que usamos lastIndexOf
        // key = "f4ecaedf-9376-4f27-812b-bf51318fdae9-0" -> fichaId + "-" + voucherIndex
        const lastDash = key.lastIndexOf('-');
        const fId = key.substring(0, lastDash);
        const vIdx = key.substring(lastDash + 1);
        depositosAVincular.push({
          fichaId: fId,
          voucherIndex: parseInt(vIdx, 10)
        });
      }

      // 4. Vincular boleta a múltiples depósitos
      const vincularResult = await vincularBoletaMultiple({
        depositos: depositosAVincular,
        boletaUrl: uploadResult.url,
        numeroBoleta: numeroBoleta.trim(),
        tipo,
      });

      if (!vincularResult.success) {
        throw new Error(vincularResult.message);
      }

      // Éxito
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error vinculando boleta:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setNumeroBoleta('');
    setTipo('boleta');
    setError(null);
    setSelectedDepositos(new Set());
    setDepositosRelacionados([]);
    setFechaReferencia('');
    setConfianzaOCR(null);
    setFueEditado(false);
    onClose();
  };

  if (!isOpen) return null;

  const cantidadSeleccionados = selectedDepositos.size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1b967a] to-[#156b58] px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Vincular Boleta
                </h2>
                <p className="text-sm text-white/80">
                  {clienteNombre}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body - scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('boleta')}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                  tipo === 'boleta'
                    ? 'border-[#1b967a] bg-[#1b967a]/10 text-[#1b967a]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Boleta</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('factura')}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                  tipo === 'factura'
                    ? 'border-[#1b967a] bg-[#1b967a]/10 text-[#1b967a]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Factura</span>
              </button>
            </div>
          </div>

          {/* Número de boleta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de {tipo === 'boleta' ? 'Boleta' : 'Factura'}
              {extractingOCR && (
                <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-[#1b967a]" />
              )}
            </label>
            <input
              type="text"
              value={numeroBoleta}
              onChange={(e) => handleNumeroBoletaChange(e.target.value)}
              placeholder="Ej: B001-00123"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a]/20 focus:border-[#1b967a] transition-colors font-mono"
            />

            {/* Barra de confianza OCR */}
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

          {/* Upload área */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#1b967a] hover:bg-[#1b967a]/5 transition-all group"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#1b967a] transition-colors" />
                  <p className="mt-2 text-sm font-medium text-gray-600 group-hover:text-[#1b967a]">
                    Haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, PDF (máx 5MB)
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Sección de multi-selección */}
          <div className="border-t border-gray-200 pt-5">
            {/* Encabezado con fecha de referencia */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  Depósitos a vincular
                </label>
              </div>
              {fechaReferencia && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    Fecha: {fechaReferencia}
                  </span>
                </div>
              )}
            </div>

            {loadingDepositos ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Buscando depósitos...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Depósito principal (siempre seleccionado) */}
                <div className="flex items-center gap-3 p-3 bg-[#1b967a]/10 border border-[#1b967a]/30 rounded-lg">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 text-[#1b967a] border-gray-300 rounded cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{localCodigo}</span>
                      <span className="text-sm font-bold text-green-600">{monto}</span>
                    </div>
                    {horaComprobante && (
                      <span className="text-xs text-gray-500">{horaComprobante.substring(0, 5)}</span>
                    )}
                  </div>
                  <span className="text-xs bg-[#1b967a] text-white px-2 py-0.5 rounded">Principal</span>
                </div>

                {/* Depósitos relacionados */}
                {depositosDisponibles.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 mt-3 mb-2">
                      Otros depósitos del mismo cliente en esta fecha (sin boleta):
                    </p>
                    {depositosDisponibles.map((dep, index) => {
                      const key = `${dep.ficha_id}-${dep.voucher_index}`;
                      const isSelected = selectedDepositos.has(key);
                      return (
                        <label
                          key={`${key}-${index}`}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDeposito(dep.ficha_id, dep.voucher_index)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{dep.local_codigo}</span>
                              <span className={`text-sm font-bold ${dep.moneda === 'USD' ? 'text-green-600' : 'text-blue-600'}`}>
                                {formatMonto(dep.monto, dep.moneda)}
                              </span>
                            </div>
                            {dep.hora_comprobante && (
                              <span className="text-xs text-gray-500">{dep.hora_comprobante.substring(0, 5)}</span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </>
                )}

                {depositosDisponibles.length === 0 && !loadingDepositos && (
                  <p className="text-xs text-gray-400 italic text-center py-2">
                    No hay otros depósitos del mismo cliente en esta fecha sin boleta
                  </p>
                )}
              </div>
            )}

            {/* Resumen de totales */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {cantidadSeleccionados} depósito{cantidadSeleccionados !== 1 ? 's' : ''} seleccionado{cantidadSeleccionados !== 1 ? 's' : ''}
                </span>
                <div className="text-right">
                  {totalSeleccionado.totalUSD > 0 && (
                    <div className="font-bold text-green-600">
                      {formatMonto(totalSeleccionado.totalUSD, 'USD')}
                    </div>
                  )}
                  {totalSeleccionado.totalPEN > 0 && (
                    <div className="font-bold text-blue-600">
                      {formatMonto(totalSeleccionado.totalPEN, 'PEN')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !file || !numeroBoleta.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1b967a] hover:bg-[#156b58] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Vincular a {cantidadSeleccionados} depósito{cantidadSeleccionados !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper para convertir File a base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
