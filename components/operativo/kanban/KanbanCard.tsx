'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, User, Clock, Building2, MessageCircle, Tag } from 'lucide-react';
import type { KanbanCardProps } from './types';

// Ícono de Facebook (SVG inline porque lucide no lo tiene)
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

/**
 * Determina el ícono y estilo para el UTM
 * - Número puro → Facebook (campañas de FB Ads)
 * - Contiene "whatsapp" → WhatsApp
 * - Otros → Tag genérico
 */
function getUtmDisplay(utm: string | null): { icon: React.ReactNode; color: string; label: string } | null {
  if (!utm) return null;

  const utmLower = utm.toLowerCase();

  // Si es puro número → Facebook Ads (mostrar el número con ícono de FB)
  if (/^\d+$/.test(utm)) {
    return {
      icon: <FacebookIcon className="w-3 h-3" />,
      color: 'text-blue-600 bg-blue-50',
      label: utm.length > 15 ? utm.substring(0, 15) + '...' : utm
    };
  }

  // Si contiene "whatsapp" o "wa" → WhatsApp
  if (utmLower.includes('whatsapp') || utmLower.includes('wa_')) {
    return {
      icon: <MessageCircle className="w-3 h-3" />,
      color: 'text-green-600 bg-green-50',
      label: utm.length > 15 ? utm.substring(0, 15) + '...' : utm
    };
  }

  // Otros UTMs → Tag genérico
  return {
    icon: <Tag className="w-3 h-3" />,
    color: 'text-gray-600 bg-gray-100',
    label: utm.length > 15 ? utm.substring(0, 15) + '...' : utm
  };
}

/**
 * Calcula el tiempo relativo desde una fecha
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `hace ${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `hace ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays}d`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks}sem`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `hace ${months}mes`;
  }
}

export default function KanbanCard({ lead, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'lead',
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = lead.nombre || 'Sin nombre';
  const displayPhone = lead.telefono || 'Sin teléfono';
  const timeAgo = getRelativeTime(lead.updated_at);
  const utmDisplay = getUtmDisplay(lead.utm_source);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Solo abrir si no está arrastrando
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab
        hover:shadow-md hover:border-gray-300 transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg scale-105 rotate-2' : ''}
        active:cursor-grabbing
      `}
    >
      {/* Header: Proyecto + Tiempo */}
      <div className="flex items-center justify-between mb-2">
        {lead.proyecto_nombre && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: lead.proyecto_color || '#6B7280' }}
          >
            {lead.proyecto_nombre}
          </span>
        )}
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
      </div>

      {/* Nombre */}
      <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
        {displayName}
      </h4>

      {/* Teléfono con link a WhatsApp - solo el número es clickeable */}
      <div className="mb-2">
        <a
          href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
        >
          <Phone className="w-3 h-3" />
          {displayPhone}
        </a>
      </div>

      {/* UTM Source Badge */}
      {utmDisplay && (
        <div className="mb-2">
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${utmDisplay.color}`}
            title={lead.utm_source || ''}
          >
            {utmDisplay.icon}
            <span className="truncate max-w-[80px]">{utmDisplay.label}</span>
          </span>
        </div>
      )}

      {/* Info adicional */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {lead.vendedor_nombre && (
          <span className="flex items-center gap-1 truncate max-w-[50%]">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.vendedor_nombre}</span>
          </span>
        )}
        {lead.rubro && (
          <span className="flex items-center gap-1 truncate max-w-[50%]">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.rubro}</span>
          </span>
        )}
      </div>
    </div>
  );
}
