'use client';

/**
 * LeadDetalleModal - Lazy-loaded Lead Detail View
 * Session 74 - Sistema de Atribución de Ventas IA
 *
 * Features:
 * - Lazy load lead data on open
 * - Show lead info, conversation history
 * - Show sale attribution
 */

import { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  Calendar,
  User,
  Tag,
  MapPin,
  MessageCircle,
  Bot,
  DollarSign,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { getLeadDetalleParaVenta, type LeadDetalle } from '@/lib/actions-ventas-ia';

interface LeadDetalleModalProps {
  leadId: string;
  ventaId: string;
  onClose: () => void;
}

// Helper para formatear fecha
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper para formatear mes de venta
function formatMesVenta(mes: string | null): string {
  if (!mes) return '-';
  const [year, month] = mes.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

// Badge de estado
function EstadoBadge({ estado }: { estado: string }) {
  const estadoConfig: Record<string, { bg: string; text: string; label: string }> = {
    nuevo: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Nuevo' },
    en_conversacion: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En conversación' },
    completo: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completo' },
    abandonado: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Abandonado' },
  };

  const config = estadoConfig[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', label: estado };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function LeadDetalleModal({ leadId, ventaId, onClose }: LeadDetalleModalProps) {
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazy load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeadDetalleParaVenta(leadId, ventaId);
        if (!data) {
          setError('No se encontró el lead');
        } else {
          setLead(data);
        }
      } catch (err) {
        console.error('Error loading lead:', err);
        setError('Error al cargar los datos del lead');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [leadId, ventaId]);

  // Parse conversation for display
  const parseConversation = (conversacion: string | null): Array<{ role: 'user' | 'bot'; message: string }> => {
    if (!conversacion) return [];

    // Try to parse as structured conversation
    const messages: Array<{ role: 'user' | 'bot'; message: string }> = [];

    // Common patterns in conversation logs
    const lines = conversacion.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Pattern: [Victoria]: message or [Usuario]: message
      if (trimmed.startsWith('[Victoria]') || trimmed.toLowerCase().startsWith('victoria:')) {
        messages.push({ role: 'bot', message: trimmed.replace(/^\[?Victoria\]?:?\s*/i, '') });
      } else if (trimmed.startsWith('[Usuario]') || trimmed.toLowerCase().startsWith('usuario:') || trimmed.toLowerCase().startsWith('cliente:')) {
        messages.push({ role: 'user', message: trimmed.replace(/^\[?(Usuario|Cliente)\]?:?\s*/i, '') });
      } else if (trimmed.startsWith('🤖') || trimmed.toLowerCase().includes('bot:')) {
        messages.push({ role: 'bot', message: trimmed.replace(/^🤖\s*|^bot:\s*/i, '') });
      } else if (trimmed.startsWith('👤') || trimmed.toLowerCase().includes('user:')) {
        messages.push({ role: 'user', message: trimmed.replace(/^👤\s*|^user:\s*/i, '') });
      } else {
        // Default: treat as user message if no pattern matched
        messages.push({ role: 'user', message: trimmed });
      }
    }

    return messages;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b967a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Detalle del Lead</h2>
              <p className="text-sm text-white/80">Capturado por Victoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-[#1b967a] animate-spin mb-3" />
              <p className="text-gray-600">Cargando información del lead...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <XCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : lead ? (
            <div className="p-6 space-y-6">
              {/* Lead Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{lead.nombre}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <EstadoBadge estado={lead.estado} />
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1b967a]/10 text-[#1b967a]">
                      <Tag className="w-3 h-3" />
                      {lead.utm || 'Sin UTM'}
                    </span>
                  </div>
                </div>
                {/* Sale indicator */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-right">
                  <p className="text-xs text-green-600 font-medium">Venta registrada</p>
                  <p className="text-lg font-bold text-green-700">
                    {lead.venta_monto ? `$${lead.venta_monto.toLocaleString()}` : '-'}
                  </p>
                  <p className="text-xs text-green-600">{formatMesVenta(lead.venta_mes)}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#1b967a]" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="font-medium font-mono">{lead.telefono}</p>
                  </div>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-[#1b967a]" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{lead.email}</p>
                    </div>
                  </div>
                )}
                {lead.proyecto_nombre && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-[#1b967a]" />
                    <div>
                      <p className="text-xs text-gray-500">Proyecto</p>
                      <p className="font-medium">{lead.proyecto_nombre}</p>
                    </div>
                  </div>
                )}
                {lead.rubro && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-[#1b967a]" />
                    <div>
                      <p className="text-xs text-gray-500">Rubro</p>
                      <p className="font-medium">{lead.rubro}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#1b967a]" />
                  <div>
                    <p className="text-xs text-gray-500">Capturado</p>
                    <p className="font-medium">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
                {lead.vendedor_nombre && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-[#1b967a]" />
                    <div>
                      <p className="text-xs text-gray-500">Vendedor asignado</p>
                      <p className="font-medium">{lead.vendedor_nombre}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Visit info */}
              {(lead.horario_visita || lead.asistio !== null) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Visita programada
                  </h4>
                  <div className="flex items-center gap-4 text-sm">
                    {lead.horario_visita && (
                      <span className="text-amber-700">{lead.horario_visita}</span>
                    )}
                    {lead.asistio !== null && (
                      <span className={`flex items-center gap-1 ${lead.asistio ? 'text-green-700' : 'text-red-700'}`}>
                        {lead.asistio ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {lead.asistio ? 'Asistió' : 'No asistió'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Conversation */}
              {lead.conversacion && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-[#1b967a]/5 px-4 py-3 border-b flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#1b967a]" />
                    <h4 className="font-semibold text-gray-800">Conversación con Victoria</h4>
                  </div>
                  <div className="p-4 max-h-60 overflow-y-auto space-y-3 bg-gray-50">
                    {parseConversation(lead.conversacion).length > 0 ? (
                      parseConversation(lead.conversacion).map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-[#1b967a] text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none shadow-sm border'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border">
                        {lead.conversacion}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No conversation */}
              {!lead.conversacion && (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Sin conversación registrada</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
