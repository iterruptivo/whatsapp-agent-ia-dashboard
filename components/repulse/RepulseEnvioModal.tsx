// ============================================================================
// COMPONENT: RepulseEnvioModal
// ============================================================================
// Descripción: Modal para configurar y enviar mensajes de repulse
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { X, Zap, Send, FileText, Edit, AlertCircle, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import para evitar SSR issues con emoji-picker-react
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { type RepulseTemplate, prepararEnvioRepulseBatch, enviarRepulseViaWebhook } from '@/lib/actions-repulse';

interface RepulseEnvioModalProps {
  selectedLeadIds: string[];
  templates: RepulseTemplate[];
  proyectoId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RepulseEnvioModal({
  selectedLeadIds,
  templates,
  proyectoId,
  userId,
  onClose,
  onSuccess,
}: RepulseEnvioModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : ''
  );
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    enviados: number;
    errores: number;
    detalles: Array<{ telefono: string; status: 'ok' | 'error'; error?: string }>;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Insertar emoji en la posición del cursor
  const handleEmojiClick = (emojiData: { emoji: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomMessage((prev) => prev + emojiData.emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = customMessage.slice(0, start) + emojiData.emoji + customMessage.slice(end);
    setCustomMessage(newText);
    setShowEmojiPicker(false);

    // Restaurar el foco y posición del cursor después del emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emojiData.emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const getMensaje = () => {
    if (useCustomMessage) {
      return customMessage;
    }
    return selectedTemplate?.mensaje || '';
  };

  const handleEnviar = async () => {
    const mensaje = getMensaje();

    if (!mensaje.trim()) {
      setError('Debes seleccionar un template o escribir un mensaje personalizado');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Preparar datos y registrar en historial
      const prepResponse = await prepararEnvioRepulseBatch(
        selectedLeadIds,
        mensaje,
        useCustomMessage ? null : selectedTemplateId,
        userId
      );

      if (!prepResponse.success) {
        setError(prepResponse.error || 'Error al preparar envío');
        setIsLoading(false);
        return;
      }

      // 2. Enviar via webhook de n8n
      const envioResponse = await enviarRepulseViaWebhook(prepResponse.leadsParaN8n);

      setResult({
        success: envioResponse.success,
        enviados: envioResponse.enviados,
        errores: envioResponse.errores,
        detalles: envioResponse.detalles,
      });
    } catch (err) {
      setError('Error inesperado al enviar');
    } finally {
      setIsLoading(false);
    }
  };

  // Vista de resultado
  if (result) {
    const hasErrors = result.errores > 0;
    const allFailed = result.enviados === 0 && result.errores > 0;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onSuccess} />
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 ${allFailed ? 'bg-red-100' : hasErrors ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Zap className={`w-8 h-8 ${allFailed ? 'text-red-600' : hasErrors ? 'text-yellow-600' : 'text-green-600'}`} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {allFailed ? 'Error en el envío' : hasErrors ? 'Envío parcial completado' : 'Repulse enviado'}
              </h2>
              <p className="text-gray-600 mb-4">
                {allFailed
                  ? 'No se pudo enviar ningún mensaje. Verifica la configuración del webhook.'
                  : `Se enviaron ${result.enviados} mensajes${result.errores > 0 ? ` (${result.errores} fallidos)` : ''}.`
                }
              </p>

              {allFailed && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Webhook n8n no configurado</p>
                      <p className="mt-1">
                        Configura la variable de entorno <code className="bg-red-100 px-1 rounded">N8N_REPULSE_WEBHOOK_URL</code> con
                        la URL de tu webhook de n8n.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen de resultados */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.enviados}</p>
                  <p className="text-sm text-green-600">Enviados</p>
                </div>
                <div className={`${result.errores > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg p-3 text-center`}>
                  <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-700' : 'text-gray-500'}`}>{result.errores}</p>
                  <p className={`text-sm ${result.errores > 0 ? 'text-red-600' : 'text-gray-500'}`}>Fallidos</p>
                </div>
              </div>

              {/* Detalle de envíos (primeros 5) */}
              <div className="bg-gray-50 rounded-lg p-3 text-left text-sm max-h-40 overflow-y-auto">
                <p className="font-medium text-gray-700 mb-2">Detalle:</p>
                <ul className="space-y-1 text-gray-600">
                  {result.detalles.slice(0, 5).map((d, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className={`w-2 h-2 ${d.status === 'ok' ? 'bg-green-500' : 'bg-red-500'} rounded-full`} />
                      {d.telefono} {d.status === 'error' && d.error && <span className="text-red-500 text-xs">({d.error})</span>}
                    </li>
                  ))}
                  {result.detalles.length > 5 && (
                    <li className="text-gray-400">
                      y {result.detalles.length - 5} más...
                    </li>
                  )}
                </ul>
              </div>

              <button
                onClick={onSuccess}
                className="mt-6 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Enviar Repulse
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{selectedLeadIds.length}</strong> leads seleccionados para enviar mensaje
                de repulse.
              </p>
            </div>

            {/* Selector de template o mensaje personalizado */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useCustomMessage}
                    onChange={() => setUseCustomMessage(false)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-gray-700">Usar template</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useCustomMessage}
                    onChange={() => setUseCustomMessage(true)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-gray-700">Mensaje personalizado</span>
                </label>
              </div>

              {!useCustomMessage ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar template
                  </label>
                  {templates.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                      No hay templates disponibles. Crea uno primero.
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.nombre}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{selectedTemplate.mensaje}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escribe tu mensaje
                  </label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Escribe el mensaje. Usa {{nombre}} para insertar el nombre del lead."
                      rows={4}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Agregar emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                      <div className="absolute right-0 top-12 z-50">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowEmojiPicker(false)}
                        />
                        <div className="relative">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width={320}
                            height={400}
                            searchPlaceholder="Buscar emoji..."
                            previewConfig={{ showPreview: false }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Variables disponibles: {"{{nombre}}"} - Nombre del lead
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={isLoading || (!useCustomMessage && templates.length === 0)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isLoading ? 'Enviando...' : 'Enviar Repulse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
