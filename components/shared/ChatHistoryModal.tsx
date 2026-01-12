// ============================================================================
// COMPONENT: ChatHistoryModal
// ============================================================================
// Descripción: Modal para mostrar historial de conversación estilo WhatsApp
// Reutilizable en cualquier parte del dashboard (Operativo, Repulse, etc.)
// Features: Carga lazy, burbujas de chat, soporte para mensajes de Repulse
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircle, ChevronDown, ChevronUp, Loader2, Phone, User } from 'lucide-react';
import { getLeadConversationHistorial, type LeadConversationHistorial } from '@/lib/actions-repulse';

// ============================================================================
// INTERFACES
// ============================================================================

interface ChatHistoryModalProps {
  isOpen: boolean;
  leadId: string;
  leadNombre?: string;
  leadTelefono?: string;
  onClose: () => void;
}

// Message type for chat bubbles
interface ChatMessage {
  sender: 'user' | 'bot' | 'date_separator';
  text: string;
  tipo?: 'repulse';
}

// ============================================================================
// HELPER: Parse Messages
// ============================================================================

function parseMessages(historial: string | null): ChatMessage[] {
  if (!historial) return [];

  // Try parsing as JSON first (array of messages)
  try {
    const parsed = JSON.parse(historial);
    if (Array.isArray(parsed)) {
      return parsed.map((msg: any): ChatMessage => ({
        sender: (msg.sender === 'user' || msg.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
        text: msg.text || msg.content || msg.message || '',
        tipo: msg.tipo === 'repulse' ? 'repulse' : undefined,
      })).filter(msg => msg.text.trim() !== '');
    }
  } catch {
    // Not JSON, continue to text parsing
  }

  // Parse as plain text with prefixes (Usuario:, Victoria:, Bot:, etc.)
  const messages: ChatMessage[] = [];
  const lines = historial.split('\n');

  let currentMessage: ChatMessage | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for DATE SEPARATORS first (formato: --- DD/MM/YYYY ---)
    const dateSeparatorMatch = trimmedLine.match(/^---\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*---$/);
    if (dateSeparatorMatch) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = null;
      messages.push({ sender: 'date_separator', text: dateSeparatorMatch[1] });
      continue;
    }

    // Check for NEW REPULSE format (formato: --- REPULSE [DD/MM/YYYY, HH:MM] ---)
    const newRepulseMatch = trimmedLine.match(/^---\s*REPULSE\s*\[[^\]]+\]\s*---$/i);
    if (newRepulseMatch) {
      if (currentMessage) messages.push(currentMessage);
      // Start a new repulse message (content will come in following lines)
      currentMessage = { sender: 'bot', text: '', tipo: 'repulse' };
      continue;
    }

    // Skip "[Mensaje enviado por sistema]" line (part of new repulse format)
    if (trimmedLine.match(/^\[Mensaje enviado por sistema\]$/i)) {
      continue;
    }

    // Check for OLD REPULSE messages (formato: [REPULSE DD/MM/YYYY, HH:MM]: mensaje)
    const repulseMatch = trimmedLine.match(/^\[REPULSE[^\]]*\]:\s*(.+)/i);
    if (repulseMatch) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'bot', text: repulseMatch[1], tipo: 'repulse' };
      continue;
    }

    // Check for sender prefixes (case insensitive)
    const userMatch = trimmedLine.match(/^(Usuario|User|Cliente):\s*(.+)/i);
    const botMatch = trimmedLine.match(/^(Noa|Victoria|Bot|Asistente|Assistant|AgenteIA|Vendedor):\s*(.+)/i);

    if (userMatch) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'user', text: userMatch[2] };
    } else if (botMatch) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'bot', text: botMatch[2] };
    } else if (currentMessage) {
      // Si el texto está vacío (nuevo formato repulse), no agregar '\n' al inicio
      currentMessage.text += currentMessage.text ? '\n' + trimmedLine : trimmedLine;
    } else {
      if (messages.length === 0) {
        currentMessage = { sender: 'user', text: trimmedLine };
      } else {
        const lastMessage = messages[messages.length - 1];
        lastMessage.text += '\n' + trimmedLine;
      }
    }
  }

  if (currentMessage) messages.push(currentMessage);

  return messages;
}

// ============================================================================
// COMPONENT: ChatBubble
// ============================================================================

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.sender === 'date_separator') {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${
          message.tipo === 'repulse'
            ? 'bg-purple-500 text-white'
            : message.sender === 'user'
            ? 'bg-white text-gray-900 border border-gray-200'
            : 'bg-primary text-white'
        }`}
      >
        {message.tipo === 'repulse' && (
          <span className="inline-block bg-purple-700 text-white text-xs px-1.5 py-0.5 rounded mb-1">
            Repulse
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: ChatHistorySection
// ============================================================================

function ChatHistorySection({
  title,
  historial,
  defaultOpen = false,
}: {
  title: string;
  historial: string | null;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const messages = parseMessages(historial);

  if (!historial || messages.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{messages.length} mensajes</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-[#e5ddd5] max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ChatHistoryModal
// ============================================================================

export default function ChatHistoryModal({
  isOpen,
  leadId,
  leadNombre,
  leadTelefono,
  onClose,
}: ChatHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historialData, setHistorialData] = useState<LeadConversationHistorial | null>(null);

  // Fetch historial when modal opens
  useEffect(() => {
    if (isOpen && leadId) {
      fetchHistorial();
    }
  }, [isOpen, leadId]);

  const fetchHistorial = async () => {
    setLoading(true);
    setError(null);

    const result = await getLeadConversationHistorial(leadId);

    if (result.success && result.data) {
      setHistorialData(result.data);
    } else {
      setError(result.error || 'Error al cargar el historial');
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  const nombre = historialData?.nombre || leadNombre || 'Sin nombre';
  const telefono = historialData?.telefono || leadTelefono || '';

  // Check if there's any historial
  const hasHistorial = historialData?.historial_conversacion;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-primary text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">Historial de Conversación</h2>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {nombre}
                  </span>
                  {telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {telefono}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-gray-500">Cargando historial...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
                <button
                  onClick={fetchHistorial}
                  className="mt-4 text-primary hover:underline text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : !hasHistorial ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p>No hay historial de conversación disponible</p>
                <p className="text-sm text-gray-400 mt-1">
                  El lead aún no ha tenido conversaciones registradas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Historial Completo - siempre abierto */}
                <ChatHistorySection
                  title="Historial de Conversación"
                  historial={historialData?.historial_conversacion || null}
                  defaultOpen={true}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
