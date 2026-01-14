'use client';

import { useState } from 'react';
import type { PurchaseRequisition } from '@/lib/types/purchase-requisitions';
import PRStatusBadge from './PRStatusBadge';
import PRPriorityBadge from './PRPriorityBadge';
import { CheckCircle, XCircle, Clock, DollarSign, Calendar, Loader2, Inbox } from 'lucide-react';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { approvePR, rejectPR } from '@/lib/actions-purchase-requisitions';

interface PRApprovalInboxProps {
  prs: PurchaseRequisition[];
  isLoading?: boolean;
  onPRUpdated: () => void;
}

export default function PRApprovalInbox({
  prs,
  isLoading = false,
  onPRUpdated,
}: PRApprovalInboxProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (pr: PurchaseRequisition) => {
    setProcessingId(pr.id);
    try {
      const result = await approvePR({
        pr_id: pr.id,
        user_id: pr.current_approver_id!,
      });

      if (result.success) {
        toast.success('Solicitud aprobada exitosamente');
        onPRUpdated();
      } else {
        toast.error(result.error || 'Error al aprobar');
      }
    } catch (error) {
      toast.error('Error inesperado al aprobar');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (pr: PurchaseRequisition) => {
    setSelectedPR(pr);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPR || !rejectReason.trim()) {
      toast.error('Debes proporcionar una razón para el rechazo');
      return;
    }

    setProcessingId(selectedPR.id);
    try {
      const result = await rejectPR({
        pr_id: selectedPR.id,
        user_id: selectedPR.current_approver_id!,
        reason: rejectReason.trim(),
      });

      if (result.success) {
        toast.success('Solicitud rechazada');
        setRejectModalOpen(false);
        onPRUpdated();
      } else {
        toast.error(result.error || 'Error al rechazar');
      }
    } catch (error) {
      toast.error('Error inesperado al rechazar');
    } finally {
      setProcessingId(null);
    }
  };

  const getSLAStatus = (pr: PurchaseRequisition) => {
    if (!pr.submitted_at) return null;

    const submittedDate = new Date(pr.submitted_at);
    const now = new Date();
    const hoursPassed = differenceInHours(now, submittedDate);

    // SLA típico: 24-48 horas (asumiendo 24h para urgent, 48h para normal)
    const slaHours = pr.priority === 'urgent' ? 24 : 48;
    const remainingHours = slaHours - hoursPassed;

    if (remainingHours < 0) {
      return {
        status: 'overdue',
        text: `Vencido hace ${Math.abs(remainingHours)}h`,
        color: 'text-red-600 bg-red-100',
      };
    } else if (remainingHours < 4) {
      return {
        status: 'urgent',
        text: `${remainingHours}h restantes`,
        color: 'text-orange-600 bg-orange-100',
      };
    } else {
      return {
        status: 'normal',
        text: `${remainingHours}h restantes`,
        color: 'text-green-600 bg-green-100',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
        <p className="text-gray-600">Cargando solicitudes pendientes...</p>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Inbox className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No hay solicitudes pendientes
        </h3>
        <p className="text-sm text-gray-500">
          Todas las solicitudes han sido procesadas
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {prs.map((pr) => {
          const slaStatus = getSLAStatus(pr);
          const isProcessing = processingId === pr.id;

          return (
            <div
              key={pr.id}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono font-semibold text-secondary">
                      {pr.pr_number}
                    </span>
                    <PRPriorityBadge priority={pr.priority} size="sm" />
                    {slaStatus && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${slaStatus.color}`}
                      >
                        <Clock className="w-3 h-3" />
                        {slaStatus.text}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {pr.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {pr.item_description}
                  </p>
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Solicitante</p>
                  <p className="text-sm font-medium text-gray-900">
                    {pr.requester_name}
                  </p>
                  {pr.requester_department && (
                    <p className="text-xs text-gray-500">{pr.requester_department}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Monto Total</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">
                      {pr.total_amount.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-sm text-gray-500">{pr.currency}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha Requerida</p>
                  <div className="flex items-center gap-1 text-sm text-gray-900">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(pr.required_by_date), 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </div>
                </div>
              </div>

              {/* Justificación */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Justificación</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {pr.justification}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleApprove(pr)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Aprobar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => openRejectModal(pr)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedPR && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !processingId && setRejectModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-red-100">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Rechazar Solicitud
                </h2>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Por favor indica la razón del rechazo de{' '}
                <span className="font-semibold">{selectedPR.pr_number}</span>
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explica por qué se rechaza esta solicitud..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                disabled={!!processingId}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  disabled={!!processingId}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!processingId || !rejectReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingId ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Confirmar Rechazo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
