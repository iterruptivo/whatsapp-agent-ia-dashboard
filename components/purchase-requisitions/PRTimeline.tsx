'use client';

import { useMemo } from 'react';
import type {
  PRApprovalHistory,
  PRComment,
  PRTimelineItem,
} from '@/lib/types/purchase-requisitions';
import { PR_ACTION_LABELS, PR_STATUS_LABELS } from '@/lib/types/purchase-requisitions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  Send,
  Edit,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Ban,
  FileCheck,
  FileText,
} from 'lucide-react';

interface PRTimelineProps {
  history: PRApprovalHistory[];
  comments: PRComment[];
}

export default function PRTimeline({ history, comments }: PRTimelineProps) {
  // Combinar historial y comentarios en una sola línea de tiempo
  const timelineItems = useMemo(() => {
    const items: PRTimelineItem[] = [];

    // Agregar historial
    history.forEach((h) => {
      items.push({
        id: h.id,
        type: 'history',
        timestamp: h.created_at,
        user_name: h.user_name,
        user_role: h.user_role,
        action: h.action,
        status_change: h.previous_status && h.new_status
          ? { from: h.previous_status, to: h.new_status }
          : undefined,
        comment: h.comments,
        icon: getActionIcon(h.action),
        color: getActionColor(h.action),
      });
    });

    // Agregar comentarios (que no estén duplicados en el historial)
    comments.forEach((c) => {
      items.push({
        id: c.id,
        type: 'comment',
        timestamp: c.created_at,
        user_name: c.user_name,
        user_role: c.user_role,
        comment: c.comment,
        is_internal: c.is_internal,
        icon: 'MessageSquare',
        color: c.is_internal ? 'text-purple-600' : 'text-blue-600',
      });
    });

    // Ordenar por fecha (más reciente primero)
    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [history, comments]);

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 mb-2 text-gray-400" />
        <p>No hay historial disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineItems.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          {/* Línea vertical + ícono */}
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 ${getBorderColor(item.color)} shadow-sm`}
            >
              {renderIcon(item.icon, item.color)}
            </div>
            {index < timelineItems.length - 1 && (
              <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-2" />
            )}
          </div>

          {/* Contenido */}
          <div className="flex-1 pb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.user_name}
                    {item.user_role && (
                      <span className="ml-2 text-xs font-normal text-gray-500 uppercase">
                        {item.user_role}
                      </span>
                    )}
                  </p>
                  {item.action && (
                    <p className="text-sm text-gray-600">
                      {PR_ACTION_LABELS[item.action]}
                    </p>
                  )}
                </div>
                <time className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(item.timestamp), {
                    addSuffix: true,
                    locale: es,
                  })}
                </time>
              </div>

              {/* Cambio de estado */}
              {item.status_change && (
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {PR_STATUS_LABELS[item.status_change.from]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                    {PR_STATUS_LABELS[item.status_change.to]}
                  </span>
                </div>
              )}

              {/* Comentario */}
              {item.comment && (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {item.is_internal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mr-2">
                      Interno
                    </span>
                  )}
                  {item.comment}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helpers
function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    created: 'FileText',
    submitted: 'Send',
    assigned: 'TrendingUp',
    approved: 'CheckCircle',
    rejected: 'XCircle',
    escalated: 'AlertCircle',
    cancelled: 'Ban',
    completed: 'FileCheck',
    commented: 'MessageSquare',
    edited: 'Edit',
  };
  return icons[action] || 'FileText';
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    created: 'text-gray-600',
    submitted: 'text-blue-600',
    assigned: 'text-indigo-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    escalated: 'text-orange-600',
    cancelled: 'text-gray-600',
    completed: 'text-teal-600',
    commented: 'text-blue-600',
    edited: 'text-yellow-600',
  };
  return colors[action] || 'text-gray-600';
}

function getBorderColor(color: string): string {
  return color.replace('text-', 'border-');
}

function renderIcon(iconName: string, color: string) {
  const iconProps = { className: `w-5 h-5 ${color}` };
  const icons: Record<string, any> = {
    FileText,
    Send,
    TrendingUp,
    CheckCircle,
    XCircle,
    AlertCircle,
    Ban,
    FileCheck,
    MessageSquare,
    Edit,
  };
  const Icon = icons[iconName] || FileText;
  return <Icon {...iconProps} />;
}
