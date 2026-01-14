'use client';

import { useState } from 'react';
import type { PRDetailViewData } from '@/lib/types/purchase-requisitions';
import { PR_CATEGORY_INFO, PR_STATUS_LABELS } from '@/lib/types/purchase-requisitions';
import PRStatusBadge from './PRStatusBadge';
import PRPriorityBadge from './PRPriorityBadge';
import PRTimeline from './PRTimeline';
import {
  CheckCircle,
  XCircle,
  Ban,
  Edit,
  Calendar,
  DollarSign,
  User,
  Building,
  MessageSquare,
  Send,
  Loader2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { approvePR, rejectPR, cancelPR, addPRComment, submitPR } from '@/lib/actions-purchase-requisitions';

interface PRDetailViewProps {
  data: PRDetailViewData;
  userId: string;
  onUpdate: () => void;
}

export default function PRDetailView({ data, userId, onUpdate }: PRDetailViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  const { pr, category, history, comments, approval_rule, can_edit, can_approve, can_cancel } = data;

  const categoryInfo = PR_CATEGORY_INFO[category.code as keyof typeof PR_CATEGORY_INFO];

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const result = await submitPR(pr.id);

      if (result.success) {
        toast.success('Solicitud enviada a aprobación');
        setShowSubmitModal(false);
        onUpdate();
      } else {
        toast.error(result.error || 'Error al enviar');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!can_approve) return;

    setIsProcessing(true);
    try {
      const result = await approvePR({
        pr_id: pr.id,
        user_id: userId,
      });

      if (result.success) {
        toast.success('Solicitud aprobada exitosamente');
        onUpdate();
      } else {
        toast.error(result.error || 'Error al aprobar');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!can_approve || !rejectReason.trim()) {
      toast.error('Debes proporcionar una razón');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await rejectPR({
        pr_id: pr.id,
        user_id: userId,
        reason: rejectReason.trim(),
      });

      if (result.success) {
        toast.success('Solicitud rechazada');
        setShowRejectModal(false);
        onUpdate();
      } else {
        toast.error(result.error || 'Error al rechazar');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!can_cancel || !cancelReason.trim()) {
      toast.error('Debes proporcionar una razón');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await cancelPR({
        pr_id: pr.id,
        user_id: userId,
        reason: cancelReason.trim(),
      });

      if (result.success) {
        toast.success('Solicitud cancelada');
        setShowCancelModal(false);
        onUpdate();
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) {
      toast.error('Escribe un comentario');
      return;
    }

    setIsSendingComment(true);
    try {
      const result = await addPRComment({
        pr_id: pr.id,
        user_id: userId,
        comment: newComment.trim(),
        is_internal: isInternal,
      });

      if (result.success) {
        toast.success('Comentario agregado');
        setNewComment('');
        setIsInternal(false);
        onUpdate();
      } else {
        toast.error(result.error || 'Error al agregar comentario');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsSendingComment(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-mono font-bold text-secondary">
                {pr.pr_number}
              </span>
              <PRStatusBadge status={pr.status} />
              <PRPriorityBadge priority={pr.priority} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{pr.title}</h1>
            <p className="text-gray-600">{pr.item_description}</p>
          </div>
        </div>

        {/* Botones de acción */}
        {(can_approve || can_cancel || (can_edit && pr.status === 'draft')) && (
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
            {/* Botón Enviar a Aprobación - Solo para borradores del solicitante */}
            {can_edit && pr.status === 'draft' && (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg font-medium hover:bg-[#156b5a] disabled:bg-gray-400 transition-colors"
              >
                <Send className="w-5 h-5" />
                Enviar a Aprobación
              </button>
            )}
            {can_approve && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprobar
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Rechazar
                </button>
              </>
            )}
            {can_cancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <Ban className="w-5 h-5" />
                Cancelar Solicitud
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalles de la Compra */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              Detalles de la Compra
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Categoría</p>
                <p className="text-base font-medium text-gray-900">
                  {categoryInfo?.icon} {categoryInfo?.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha Requerida</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-base font-medium text-gray-900">
                    {format(new Date(pr.required_by_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Cantidad</p>
                <p className="text-base font-medium text-gray-900">{pr.quantity}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Precio Unitario</p>
                <p className="text-base font-medium text-gray-900">
                  {pr.unit_price.toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {pr.currency}
                </p>
              </div>

              <div className="md:col-span-2 bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Monto Total</p>
                <div className="flex items-baseline gap-2">
                  <DollarSign className="w-6 h-6 text-secondary" />
                  <p className="text-3xl font-bold text-gray-900">
                    {pr.total_amount.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-lg text-gray-500">{pr.currency}</p>
                </div>
              </div>

              {pr.preferred_vendor && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Proveedor Preferido</p>
                  <p className="text-base font-medium text-gray-900">
                    {pr.preferred_vendor}
                  </p>
                </div>
              )}

              {pr.cost_center && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Centro de Costo</p>
                  <p className="text-base font-medium text-gray-900">{pr.cost_center}</p>
                </div>
              )}
            </div>

            {/* Justificación */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Justificación</p>
              <p className="text-base text-gray-700 leading-relaxed">
                {pr.justification}
              </p>
            </div>

            {pr.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Notas Adicionales</p>
                <p className="text-base text-gray-700 leading-relaxed">{pr.notes}</p>
              </div>
            )}
          </div>

          {/* Agregar Comentario */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-secondary" />
              Agregar Comentario
            </h2>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
              disabled={isSendingComment}
            />

            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                  disabled={isSendingComment}
                />
                <span className="text-sm text-gray-700">Comentario interno</span>
              </label>

              <button
                onClick={handleSendComment}
                disabled={isSendingComment || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:bg-gray-400 transition-colors"
              >
                {isSendingComment ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              Historial
            </h2>
            <PRTimeline history={history} comments={comments} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Solicitante */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Solicitante
            </h3>
            <p className="text-base font-medium text-gray-900">{pr.requester_name}</p>
            {pr.requester_department && (
              <p className="text-sm text-gray-500 mt-1">{pr.requester_department}</p>
            )}
          </div>

          {/* Aprobador Actual */}
          {pr.current_approver_name && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Aprobador Actual
              </h3>
              <p className="text-base font-medium text-gray-900">
                {pr.current_approver_name}
              </p>
            </div>
          )}

          {/* Regla de Aprobación */}
          {approval_rule && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Regla de Aprobación
              </h3>
              <p className="text-base font-medium text-gray-900 mb-2">
                {approval_rule.name}
              </p>
              <p className="text-sm text-gray-600">
                SLA: {approval_rule.sla_hours} horas
              </p>
            </div>
          )}

          {/* Proyecto (si existe) */}
          {pr.proyecto_nombre && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Proyecto
              </h3>
              <p className="text-base font-medium text-gray-900">
                {pr.proyecto_nombre}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isProcessing && setShowRejectModal(false)}
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
                <h2 className="text-xl font-bold text-gray-900">Rechazar Solicitud</h2>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explica por qué se rechaza esta solicitud..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                disabled={isProcessing}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Confirmar Rechazo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isProcessing && setShowCancelModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-gray-100">
                  <Ban className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Cancelar Solicitud</h2>
              </div>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explica por qué se cancela esta solicitud..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none"
                disabled={isProcessing}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isProcessing || !cancelReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Confirmar Cancelación'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Submit Modal - Enviar a Aprobación */}
      {showSubmitModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isProcessing && setShowSubmitModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-[#1b967a]/10">
                  <Send className="w-6 h-6 text-[#1b967a]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Enviar a Aprobación</h2>
              </div>

              <p className="text-gray-600 mb-6">
                ¿Estás seguro de enviar esta solicitud a aprobación? Una vez enviada,
                no podrás modificarla hasta que sea revisada.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Total:</span>
                  <span className="font-bold text-gray-900">
                    {pr.total_amount.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} {pr.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Solicitud:</span>
                  <span className="font-mono text-gray-900">{pr.pr_number}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-[#1b967a] text-white rounded-lg font-medium hover:bg-[#156b5a] disabled:bg-gray-400"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Confirmar Envío'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
