// ============================================================================
// COMPONENT: RepulseTemplateModal
// ============================================================================
// Descripción: Modal para gestionar templates de mensajes de repulse
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { X, Plus, Edit, Trash2, Save, FileText, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import para evitar SSR issues con emoji-picker-react
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import {
  type RepulseTemplate,
  createRepulseTemplate,
  updateRepulseTemplate,
  deleteRepulseTemplate,
} from '@/lib/actions-repulse';

interface RepulseTemplateModalProps {
  templates: RepulseTemplate[];
  proyectoId: string;
  userId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function RepulseTemplateModal({
  templates,
  proyectoId,
  userId,
  onClose,
  onRefresh,
}: RepulseTemplateModalProps) {
  const [editingTemplate, setEditingTemplate] = useState<RepulseTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insertar emoji en la posición del cursor
  const handleEmojiClick = (emojiData: { emoji: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMensaje((prev) => prev + emojiData.emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = mensaje.slice(0, start) + emojiData.emoji + mensaje.slice(end);
    setMensaje(newText);
    setShowEmojiPicker(false);

    // Restaurar el foco y posición del cursor después del emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emojiData.emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const resetForm = () => {
    setNombre('');
    setMensaje('');
    setEditingTemplate(null);
    setIsCreating(false);
    setError('');
    setShowEmojiPicker(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setNombre('');
    setMensaje('');
    setEditingTemplate(null);
  };

  const handleEdit = (template: RepulseTemplate) => {
    setEditingTemplate(template);
    setNombre(template.nombre);
    setMensaje(template.mensaje);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!nombre.trim() || !mensaje.trim()) {
      setError('El nombre y mensaje son requeridos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isCreating) {
        const result = await createRepulseTemplate(proyectoId, nombre, mensaje, userId);
        if (!result.success) {
          setError(result.error || 'Error al crear template');
          setIsLoading(false);
          return;
        }
      } else if (editingTemplate) {
        const result = await updateRepulseTemplate(editingTemplate.id, nombre, mensaje);
        if (!result.success) {
          setError(result.error || 'Error al actualizar template');
          setIsLoading(false);
          return;
        }
      }

      resetForm();
      onRefresh();
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Eliminar este template?')) return;

    setIsLoading(true);
    const result = await deleteRepulseTemplate(templateId);
    setIsLoading(false);

    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || 'Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Templates de Mensajes
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Form (crear/editar) */}
            {(isCreating || editingTemplate) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">
                  {isCreating ? 'Nuevo Template' : 'Editar Template'}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del template
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Mensaje inicial, Recordatorio suave"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensaje
                    </label>
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
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

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de templates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Templates existentes</h3>
                {!isCreating && !editingTemplate && (
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo
                  </button>
                )}
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay templates creados</p>
                  <p className="text-sm">Crea uno para comenzar a enviar mensajes de repulse</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{template.nombre}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.mensaje}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
