'use client';

import { Lead } from '@/lib/db';
import { formatVisitTimestamp, getVisitStatus, getVisitStatusClasses, getVisitStatusLabel } from '@/lib/formatters';
import { X, User, Phone, Mail, Briefcase, Clock, Calendar, MessageSquare, Info, ChevronDown, ChevronUp, RefreshCw, RotateCcw, Bell, CalendarCheck, Check, Zap, Ban, CircleSlash, Tag } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import EvidenciasSection from '@/components/leads/EvidenciasSection';
import SearchDropdown from '@/components/shared/SearchDropdown';
import { updateLeadTipificacion } from '@/lib/actions-tipificacion';
import { getTipificacionesN1Client, getTipificacionesN2Client, getTipificacionesN3Client } from '@/lib/tipificaciones-client';

// ============================================================================
// FALLBACK: Constantes por si la BD no está disponible
// ============================================================================
const FALLBACK_TIPIFICACION_NIVEL_1 = [
  { value: 'contactado', label: 'Contactado' },
  { value: 'no_contactado', label: 'No Contactado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otros', label: 'Otros' },
];

const FALLBACK_TIPIFICACION_NIVEL_2: Record<string, { value: string; label: string }[]> = {
  contactado: [
    { value: 'interesado', label: 'Interesado' },
    { value: 'no_interesado', label: 'No Interesado' },
    { value: 'cliente_evaluacion', label: 'Cliente en Evaluación' },
    { value: 'cliente_negociacion', label: 'Cliente en Negociación' },
    { value: 'cliente_cierre', label: 'Cliente en Cierre' },
  ],
  no_contactado: [
    { value: 'no_contesta', label: 'No contesta' },
    { value: 'buzon_mensaje', label: 'Buzón / mensaje de voz' },
    { value: 'telefono_apagado', label: 'Teléfono apagado' },
    { value: 'telefono_fuera_servicio', label: 'Teléfono fuera de servicio' },
    { value: 'numero_incorrecto', label: 'Número incorrecto' },
  ],
  seguimiento: [
    { value: 'pendiente_visita', label: 'Pendiente de visita' },
    { value: 'pendiente_decision', label: 'Pendiente de decisión' },
  ],
  otros: [
    { value: 'contacto_otra_area', label: 'Solicita contacto con otra área' },
  ],
};

const FALLBACK_TIPIFICACION_NIVEL_3 = [
  { value: 'solicita_info_proyecto', label: 'Solicita información del proyecto' },
  { value: 'requiere_cotizacion', label: 'Requiere cotización' },
  { value: 'agenda_visita', label: 'Agenda visita / cita presencial' },
  { value: 'contactar_despues', label: 'Quiere ser contactado más adelante' },
  { value: 'interesado_otro_proyecto', label: 'Interesado en otro proyecto' },
  { value: 'no_califica', label: 'No califica' },
  { value: 'no_desea_comprar', label: 'No desea comprar' },
  { value: 'adquirio_otra_propiedad', label: 'Ya adquirió otra propiedad' },
  { value: 'precio_fuera_presupuesto', label: 'Precio fuera de presupuesto' },
  { value: 'ubicacion_no_conveniente', label: 'Ubicación no conveniente' },
  { value: 'condiciones_no_convencen', label: 'Condiciones/beneficios no le convencen' },
  { value: 'evaluacion_crediticia', label: 'En evaluación crediticia' },
  { value: 'falta_sustento_docs', label: 'Falta sustento / documentos' },
  { value: 'observado_banco', label: 'Observado por banco' },
  { value: 'aprobado_banco', label: 'Aprobado por banco' },
  { value: 'requiere_asesoria_financiera', label: 'Requiere asesoría financiera' },
  { value: 'revision_contrato', label: 'Revisión de contrato' },
  { value: 'aprobacion_familiar_pendiente', label: 'Aprobación familiar pendiente' },
  { value: 'negociacion_precio', label: 'Negociación de precio/descuento' },
  { value: 'separacion_pagada', label: 'Separación pagada' },
  { value: 'agendado_firma', label: 'Agendado para firma de contrato' },
  { value: 'firma_contrato', label: 'Firma de contrato' },
  { value: 'visita_confirmada', label: 'Visita confirmada' },
  { value: 'visita_reprogramada', label: 'Visita reprogramada' },
  { value: 'visita_no_asistida', label: 'Visita no asistida' },
  { value: 'cotizacion_enviada', label: 'Cotización enviada' },
  { value: 'evaluacion_familiar', label: 'En evaluación familiar' },
  { value: 'comparando_proyectos', label: 'Comparando con otros proyectos' },
  { value: 'postventa', label: 'Postventa' },
  { value: 'reclamos', label: 'Reclamos' },
  { value: 'administracion_pagos', label: 'Administración / pagos' },
  { value: 'area_comercial_presencial', label: 'Área comercial presencial' },
];

interface LeadDetailPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToRepulse?: (leadId: string) => void;
  onToggleExcludeRepulse?: (leadId: string, exclude: boolean) => void;
  showRepulseButton?: boolean;
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioRol?: string;
  onLeadUpdate?: () => Promise<void> | void; // Callback para notificar que el lead fue actualizado
}

// Message type for chat bubbles
interface ChatMessage {
  sender: 'user' | 'bot' | 'date_separator';
  text: string;
  tipo?: 'repulse'; // Identificador especial para mensajes de Repulse
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
        tipo: msg.tipo === 'repulse' ? 'repulse' : undefined, // Preservar tipo repulse
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
      // Start new user message
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'user', text: userMatch[2] };
    } else if (botMatch) {
      // Start new bot message
      if (currentMessage) messages.push(currentMessage);
      currentMessage = { sender: 'bot', text: botMatch[2] };
    } else if (currentMessage) {
      // Continue previous message (multi-line)
      // Si el texto está vacío (nuevo formato repulse), no agregar '\n' al inicio
      currentMessage.text += currentMessage.text ? '\n' + trimmedLine : trimmedLine;
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

export default function LeadDetailPanel({ lead, isOpen, onClose, onSendToRepulse, onToggleExcludeRepulse, showRepulseButton = false, usuarioId, usuarioNombre, usuarioRol, onLeadUpdate }: LeadDetailPanelProps) {
  // State for dropdown toggles
  const [isHistorialRecienteOpen, setIsHistorialRecienteOpen] = useState(false);
  const [isHistorialCompletoOpen, setIsHistorialCompletoOpen] = useState(false);

  // State for tipificación
  const [nivel1, setNivel1] = useState<string | null>(null);
  const [nivel2, setNivel2] = useState<string | null>(null);
  const [nivel3, setNivel3] = useState<string | null>(null);
  const [isSavingTipificacion, setIsSavingTipificacion] = useState(false);

  // State for tipificaciones from DB (with fallbacks)
  const [tipifN1Options, setTipifN1Options] = useState<{ value: string; label: string }[]>(FALLBACK_TIPIFICACION_NIVEL_1);
  const [tipifN2Map, setTipifN2Map] = useState<Record<string, { value: string; label: string }[]>>(FALLBACK_TIPIFICACION_NIVEL_2);
  const [tipifN3Options, setTipifN3Options] = useState<{ value: string; label: string }[]>(FALLBACK_TIPIFICACION_NIVEL_3);
  const [tipifLoaded, setTipifLoaded] = useState(false);

  // Cargar tipificaciones desde BD al montar
  useEffect(() => {
    const loadTipificaciones = async () => {
      try {
        // Cargar N1 y N3 en paralelo (funciones client-side)
        const [n1Options, n3Options] = await Promise.all([
          getTipificacionesN1Client(),
          getTipificacionesN3Client(),
        ]);

        // Procesar N1
        if (n1Options.length > 0) {
          setTipifN1Options(n1Options);

          // Cargar N2 para cada N1
          const n2Map: Record<string, { value: string; label: string }[]> = {};
          await Promise.all(
            n1Options.map(async (n1) => {
              const n2Options = await getTipificacionesN2Client(n1.value);
              if (n2Options.length > 0) {
                n2Map[n1.value] = n2Options;
              } else {
                // Usar fallback para este N1 si existe
                n2Map[n1.value] = FALLBACK_TIPIFICACION_NIVEL_2[n1.value] || [];
              }
            })
          );
          setTipifN2Map(n2Map);
        }

        // Procesar N3
        if (n3Options.length > 0) {
          setTipifN3Options(n3Options);
        }

        setTipifLoaded(true);
      } catch (error) {
        console.warn('[LeadDetailPanel] Error cargando tipificaciones, usando fallback:', error);
        setTipifLoaded(true);
      }
    };

    loadTipificaciones();
  }, []);

  // Sync tipificación state when lead changes
  useEffect(() => {
    if (lead) {
      setNivel1(lead.tipificacion_nivel_1 || null);
      setNivel2(lead.tipificacion_nivel_2 || null);
      setNivel3(lead.tipificacion_nivel_3 || null);
    }
  }, [lead?.id, lead?.tipificacion_nivel_1, lead?.tipificacion_nivel_2, lead?.tipificacion_nivel_3]);

  // Get nivel2 options based on nivel1 (from DB or fallback)
  const nivel2Options = nivel1 ? tipifN2Map[nivel1] || [] : [];

  // Handle nivel1 change (reset nivel2)
  const handleNivel1Change = useCallback(async (value: string) => {
    const newNivel1 = value || null;
    setNivel1(newNivel1);
    setNivel2(null); // Reset nivel2 when nivel1 changes
    if (lead) {
      setIsSavingTipificacion(true);
      await updateLeadTipificacion(lead.id, newNivel1, null, nivel3);
      // Notificar al padre que el lead fue actualizado y esperar el refresh
      if (onLeadUpdate) {
        await onLeadUpdate();
      }
      setIsSavingTipificacion(false);
    }
  }, [lead, nivel3, onLeadUpdate]);

  // Handle nivel2 change
  const handleNivel2Change = useCallback(async (value: string) => {
    const newNivel2 = value || null;
    setNivel2(newNivel2);
    if (lead) {
      setIsSavingTipificacion(true);
      await updateLeadTipificacion(lead.id, nivel1, newNivel2, nivel3);
      // Notificar al padre que el lead fue actualizado y esperar el refresh
      if (onLeadUpdate) {
        await onLeadUpdate();
      }
      setIsSavingTipificacion(false);
    }
  }, [lead, nivel1, nivel3, onLeadUpdate]);

  // Handle nivel3 change
  const handleNivel3Change = useCallback(async (value: string) => {
    const newNivel3 = value || null;
    setNivel3(newNivel3);
    if (lead) {
      setIsSavingTipificacion(true);
      await updateLeadTipificacion(lead.id, nivel1, nivel2, newNivel3);
      // Notificar al padre que el lead fue actualizado y esperar el refresh
      if (onLeadUpdate) {
        await onLeadUpdate();
      }
      setIsSavingTipificacion(false);
    }
  }, [lead, nivel1, nivel2, onLeadUpdate]);

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
                <Info className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">UTM</p>
                  <p className="text-base font-medium text-gray-900">{lead.utm || 'victoria'}</p>
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

          {/* Tipificación del Lead Section */}
          <section>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Tipificación del Lead
              {isSavingTipificacion && (
                <span className="text-xs font-normal text-gray-500 animate-pulse">Guardando...</span>
              )}
            </h3>
            <div className="space-y-4">
              {/* Nivel 1 - Azul */}
              <SearchDropdown
                label="Nivel 1"
                options={tipifN1Options}
                value={nivel1}
                onChange={handleNivel1Change}
                placeholder="Seleccionar nivel 1..."
                allowClear={true}
                clearLabel="-- Ninguno --"
                size="md"
                colorScheme="blue"
              />

              {/* Nivel 2 - Verde */}
              <SearchDropdown
                label="Nivel 2"
                options={nivel2Options}
                value={nivel2}
                onChange={handleNivel2Change}
                placeholder={nivel1 ? "Seleccionar nivel 2..." : "Primero selecciona Nivel 1"}
                disabled={!nivel1}
                allowClear={true}
                clearLabel="-- Ninguno --"
                size="md"
                colorScheme="green"
              />

              {/* Nivel 3 - Lima */}
              <SearchDropdown
                label="Nivel 3"
                options={tipifN3Options}
                value={nivel3}
                onChange={handleNivel3Change}
                placeholder={nivel2 ? "Seleccionar nivel 3..." : "Primero selecciona Nivel 2"}
                disabled={!nivel2}
                allowClear={true}
                clearLabel="-- Ninguno --"
                size="md"
                colorScheme="lime"
              />
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

              {/* Sección Repulse */}
              {showRepulseButton && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {/* Estado de exclusión */}
                  {lead.excluido_repulse ? (
                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">Excluido de Repulse</span>
                      </div>
                      {onToggleExcludeRepulse && (
                        <button
                          onClick={() => onToggleExcludeRepulse(lead.id, false)}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Reincluir
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Botón Enviar a Repulse */}
                      {onSendToRepulse && (
                        <div>
                          <button
                            onClick={() => onSendToRepulse(lead.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                          >
                            <Zap className="w-4 h-4" />
                            Enviar a Repulse
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Agregar este lead al sistema de re-engagement para enviar mensaje de seguimiento.
                          </p>
                        </div>
                      )}

                      {/* Botón Excluir de Repulse */}
                      {onToggleExcludeRepulse && (
                        <button
                          onClick={() => onToggleExcludeRepulse(lead.id, true)}
                          className="flex items-center gap-2 text-sm text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 hover:border-red-400 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Excluir permanentemente de Repulse
                        </button>
                      )}
                    </>
                  )}
                </div>
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
                            message.sender === 'date_separator' ? (
                              // Date separator
                              <div key={index} className="flex items-center justify-center my-4">
                                <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                                  {message.text}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={index}
                                className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                              >
                                <div
                                  className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                                    message.tipo === 'repulse'
                                      ? 'bg-purple-500 text-white'
                                      : message.sender === 'user'
                                      ? 'bg-white text-gray-900'
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
                            )
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
                            message.sender === 'date_separator' ? (
                              // Date separator
                              <div key={index} className="flex items-center justify-center my-4">
                                <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                                  {message.text}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={index}
                                className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                              >
                                <div
                                  className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                                    message.tipo === 'repulse'
                                      ? 'bg-purple-500 text-white'
                                      : message.sender === 'user'
                                      ? 'bg-white text-gray-900'
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
                            )
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

          {/* Evidencias Section - Only for vendedor and vendedor_caseta (upload) or admin/jefe_ventas/marketing (view) */}
          {usuarioId && usuarioNombre && usuarioRol && (
            <EvidenciasSection
              leadId={lead.id}
              usuarioId={usuarioId}
              usuarioNombre={usuarioNombre}
              usuarioRol={usuarioRol}
              canUpload={usuarioRol === 'vendedor' || usuarioRol === 'vendedor_caseta' || usuarioRol === 'coordinador'}
              canView={['admin', 'jefe_ventas', 'marketing', 'vendedor', 'vendedor_caseta', 'coordinador'].includes(usuarioRol)}
            />
          )}
        </div>
      </div>
    </>
  );
}
