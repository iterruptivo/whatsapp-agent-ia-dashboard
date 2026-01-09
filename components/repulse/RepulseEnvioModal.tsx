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
import { type RepulseTemplate, prepararEnvioRepulseBatch } from '@/lib/actions-repulse';

interface RepulseEnvioModalProps {
  selectedLeadIds: string[];
  templates: RepulseTemplate[];
  proyectoId: string;
  userId: string;
  onClose: () => void;
  onBatchStarted: (batchId: string, totalLeads: number) => void;
}

export default function RepulseEnvioModal({
  selectedLeadIds,
  templates,
  proyectoId,
  userId,
  onClose,
  onBatchStarted,
}: RepulseEnvioModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : ''
  );
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      // 1. Preparar datos y registrar en historial con batch_id
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

      // 2. Iniciar procesamiento en background via API Route
      const batchResponse = await fetch('/api/repulse/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: prepResponse.leadsParaN8n,
          batchId: prepResponse.batchId,
        }),
      });

      if (!batchResponse.ok) {
        const errorData = await batchResponse.json();
        setError(errorData.error || 'Error al iniciar envío');
        setIsLoading(false);
        return;
      }

      // 3. Notificar al padre que el batch comenzó
      onBatchStarted(prepResponse.batchId, prepResponse.leadsParaN8n.length);
    } catch (err) {
      setError('Error inesperado al enviar');
    } finally {
      setIsLoading(false);
    }
  };

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
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-1">Variables disponibles (clic para insertar):</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = textareaRef.current;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newText = customMessage.slice(0, start) + '{{nombre}}' + customMessage.slice(end);
                            setCustomMessage(newText);
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 10, start + 10);
                            }, 0);
                          } else {
                            setCustomMessage(prev => prev + '{{nombre}}');
                          }
                        }}
                        className="px-2 py-0.5 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100 text-blue-700"
                      >
                        {'{{nombre}}'} <span className="text-blue-400">- Nombre</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = textareaRef.current;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newText = customMessage.slice(0, start) + '{{fecha_visita}}' + customMessage.slice(end);
                            setCustomMessage(newText);
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 16, start + 16);
                            }, 0);
                          } else {
                            setCustomMessage(prev => prev + '{{fecha_visita}}');
                          }
                        }}
                        className="px-2 py-0.5 text-xs bg-white border border-blue-200 rounded hover:bg-blue-100 text-blue-700"
                      >
                        {'{{fecha_visita}}'} <span className="text-blue-400">- Fecha visita</span>
                      </button>
                    </div>
                  </div>
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
