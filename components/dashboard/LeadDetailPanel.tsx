'use client';

import { Lead } from '@/lib/db';
import { formatVisitTimestamp, getVisitStatus, getVisitStatusClasses, getVisitStatusLabel } from '@/lib/formatters';
import { X, User, Phone, Mail, Briefcase, Clock, Calendar, MessageSquare, Info, ChevronDown, ChevronUp, RefreshCw, RotateCcw, Bell, CalendarCheck, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LeadDetailPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

// Message type for chat bubbles
interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

// Parse historial text into chat messages
function parseMessages(historial: string | null): ChatMessage[] {
  if (!historial) return [];

  // Try parsing as JSON first (array of messages)
  try {
    const parsed = JSON.parse(historial);
    if (Array.isArray(parsed)) {
      return parsed.map((msg: any): ChatMessage => ({
        sender: (msg.sender === 'user' || msg.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
        text: msg.text || msg.content || msg.message || '',
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

    // Check for sender prefixes (case insensitive)
    const userMatch = trimmedLine.match(/^(Usuario|User|Cliente):\s*(.+)/i);
    const botMatch = trimmedLine.match(/^(Noa|Victoria|Bot|Asistente|Assistant|AgenteIA):\s*(.+)/i);

    if (userMatch) {
      // Start new user message
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'user', text: userMatch[2] };
    } else if (botMatch) {
      // Start new bot message
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'bot', text: botMatch[2] };
    } else if (currentMessage) {
      // Continue previous message (multi-line)
      currentMessage.text += '\n' + trimmedLine;
    } else {
      // No prefix detected, assume it's a continuation or standalone text
      // Default to user message if no context
      if (messages.length === 0) {
        currentMessage = { sender: 'user', text: trimmedLine };
      } else {
        // Continue last message
        const lastMessage = messages[messages.length - 1];
        lastMessage.text += '\n' + trimmedLine;
      }
    }
  }

  // Push last message
  if (currentMessage) messages.push(currentMessage);

  return messages;
}

export default function LeadDetailPanel({ lead, isOpen, onClose }: LeadDetailPanelProps) {
  // State for dropdown toggles
  const [isHistorialRecienteOpen, setIsHistorialRecienteOpen] = useState(false);
  const [isHistorialCompletoOpen, setIsHistorialCompletoOpen] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!lead) return null;

  // Date formatting helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // Estado badge helper (matching LeadsTable)
  const getEstadoBadge = (estado: string | null) => {
    const styles: Record<string, string> = {
      lead_completo: 'bg-primary text-white',
      lead_incompleto: 'bg-accent text-secondary',
      en_conversacion: 'bg-secondary text-white',
      conversacion_abandonada: 'bg-gray-300 text-gray-700',
      lead_manual: 'bg-purple-600 text-white',
    };

    const labels: Record<string, string> = {
      lead_completo: 'Completo',
      lead_incompleto: 'Incompleto',
      en_conversacion: 'En Conversación',
      conversacion_abandonada: 'Abandonado',
      lead_manual: 'Lead Manual',
    };

    const estadoKey = estado || 'conversacion_abandonada';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[estadoKey] || styles.conversacion_abandonada}`}>
        {labels[estadoKey] || 'Desconocido'}
      </span>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[500px] lg:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 id="panel-title" className="text-xl font-semibold text-gray-900">
            Detalle del Lead
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Contact Section */}
          <section>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2">
              Información de Contacto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="text-base font-medium text-gray-900">{lead.nombre || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="text-base font-medium text-gray-900">{lead.telefono}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base font-medium text-gray-900">{lead.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Asistió</p>
                  <div className="mt-1">
                    {lead.asistio ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <Check className="w-3 h-3" />
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        No
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Business Section */}
          <section>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2">
              Información de Negocio
            </h3>
            <div className="space-y-4">
              {/* Rubro */}
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Rubro</p>
                  <p className="text-base font-medium text-gray-900">{lead.rubro || 'N/A'}</p>
                </div>
              </div>

              {/* Horario de Visita - ENHANCED */}
              <div className="flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">Horario de Visita</p>

                  {lead.horario_visita_timestamp ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      {/* Formatted timestamp (large, bold, primary color) */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-bold text-primary">
                          {formatVisitTimestamp(lead.horario_visita_timestamp)}
                        </p>
                        {/* Status badge */}
                        {getVisitStatus(lead.horario_visita_timestamp) && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getVisitStatusClasses(
                              getVisitStatus(lead.horario_visita_timestamp)
                            )}`}
                          >
                            {getVisitStatusLabel(getVisitStatus(lead.horario_visita_timestamp))}
                          </span>
                        )}
                      </div>

                      {/* Original text (small, gray, italic) */}
                      {lead.horario_visita && (
                        <p className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">
                          El usuario dijo: &quot;{lead.horario_visita}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    // Backwards compatibility: show original text only
                    <p className="text-base font-medium text-gray-900">{lead.horario_visita || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Status Section - MEJORADO */}
          <section>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2">
              Estado
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Estado Actual</p>
                {getEstadoBadge(lead.estado)}
              </div>

              {/* Mostrar estado al notificar solo si difiere del actual */}
              {lead.estado_al_notificar && lead.estado_al_notificar !== lead.estado && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estado al Notificar Vendedores</p>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(lead.estado_al_notificar)}
                    <span className="text-xs text-gray-400 italic">
                      (cambió desde notificación)
                    </span>
                  </div>
                </div>
              )}

              {/* Mostrar solo si nunca fue notificado */}
              {!lead.estado_al_notificar && lead.notificacion_enviada === false && (
                <p className="text-xs text-gray-500 italic mt-2">
                  Este lead no ha sido notificado a vendedores aún.
                </p>
              )}
            </div>
          </section>

          {/* Conversation Section */}
          {(lead.ultimo_mensaje || lead.resumen_historial || lead.historial_reciente || lead.historial_conversacion) && (
            <section>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversación
              </h3>
              <div className="space-y-4">
                {lead.ultimo_mensaje && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Último Mensaje</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{lead.ultimo_mensaje}</p>
                  </div>
                )}
                {lead.resumen_historial && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Resumen del Historial</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{lead.resumen_historial}</p>
                  </div>
                )}

                {/* Historial Reciente Dropdown - WhatsApp Style */}
                {lead.historial_reciente && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setIsHistorialRecienteOpen(!isHistorialRecienteOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">Historial Reciente</span>
                      {isHistorialRecienteOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {isHistorialRecienteOpen && (
                      <div className="px-4 py-4 bg-gray-50 max-h-96 overflow-y-auto">
                        {/* WhatsApp-like Chat Bubbles */}
                        <div className="space-y-3">
                          {parseMessages(lead.historial_reciente).map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                                  message.sender === 'user'
                                    ? 'bg-white text-gray-900'
                                    : 'bg-primary text-white'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                              </div>
                            </div>
                          ))}
                          {parseMessages(lead.historial_reciente).length === 0 && (
                            <p className="text-sm text-gray-500 text-center italic">No hay mensajes para mostrar</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Historial Completo Dropdown - WhatsApp Style */}
                {lead.historial_conversacion && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setIsHistorialCompletoOpen(!isHistorialCompletoOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">Historial Completo de Conversación</span>
                      {isHistorialCompletoOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {isHistorialCompletoOpen && (
                      <div className="px-4 py-4 bg-gray-50 max-h-96 overflow-y-auto">
                        {/* WhatsApp-like Chat Bubbles */}
                        <div className="space-y-3">
                          {parseMessages(
                            typeof lead.historial_conversacion === 'string'
                              ? lead.historial_conversacion
                              : JSON.stringify(lead.historial_conversacion, null, 2)
                          ).map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                                  message.sender === 'user'
                                    ? 'bg-white text-gray-900'
                                    : 'bg-primary text-white'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                              </div>
                            </div>
                          ))}
                          {parseMessages(
                            typeof lead.historial_conversacion === 'string'
                              ? lead.historial_conversacion
                              : JSON.stringify(lead.historial_conversacion, null, 2)
                          ).length === 0 && (
                            <p className="text-sm text-gray-500 text-center italic">No hay mensajes para mostrar</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Metadata Section */}
          <section>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Información Adicional
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de Captura</p>
                  <p className="text-base font-medium text-gray-900">{formatDate(lead.fecha_captura)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Creado</p>
                    <p className="text-sm text-gray-900">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Última Actualización</p>
                    <p className="text-sm text-gray-900">{formatDate(lead.updated_at)}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Intentos del Bot</p>
                    <p className="text-sm text-gray-900">{lead.intentos_bot}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Notificación Enviada</p>
                    <p className="text-sm text-gray-900">{lead.notificacion_enviada ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
