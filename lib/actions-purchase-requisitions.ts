'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  PurchaseRequisition,
  PRCategory,
  PRApprovalRule,
  PRApprovalHistory,
  PRComment,
  CreatePRInput,
  UpdatePRInput,
  ApprovePRInput,
  RejectPRInput,
  CancelPRInput,
  AddPRCommentInput,
  PRListFilters,
  PRPaginationOptions,
  PRPaginatedResponse,
  PRDetailViewData,
  PRStats,
  PRActionResponse,
} from '@/lib/types/purchase-requisitions';
import {
  notifyPRPendingApproval,
  notifyPRApproved,
  notifyPRRejected,
} from '@/lib/actions-notifications';

// ============================================================================
// HELPER: Crear cliente Supabase
// ============================================================================

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// ============================================================================
// CATEGORÍAS (solo lectura)
// ============================================================================

/**
 * Obtener todas las categorías activas
 * Usado en selects del formulario
 */
export async function getCategories(): Promise<PRCategory[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pr_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('[purchase-requisitions] Error fetching categories:', error);
      return [];
    }

    return (data || []) as PRCategory[];
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return [];
  }
}

/**
 * Obtener una categoría por ID
 */
export async function getCategoryById(id: string): Promise<PRCategory | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pr_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[purchase-requisitions] Error fetching category:', error);
      return null;
    }

    return data as PRCategory;
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return null;
  }
}

// ============================================================================
// REGLAS DE APROBACIÓN (solo lectura)
// ============================================================================

/**
 * Obtener todas las reglas de aprobación activas
 */
export async function getApprovalRules(): Promise<PRApprovalRule[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pr_approval_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority');

    if (error) {
      console.error('[purchase-requisitions] Error fetching approval rules:', error);
      return [];
    }

    return (data || []) as PRApprovalRule[];
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return [];
  }
}

/**
 * Obtener la regla de aprobación aplicable para un monto específico
 * Usa la función RPC del schema para obtener la regla con mayor prioridad
 */
export async function getApprovalRuleForAmount(
  amount: number
): Promise<PRApprovalRule | null> {
  try {
    const supabase = await createClient();

    // Llamar a la función RPC definida en el schema
    const { data: ruleId, error } = await supabase
      .rpc('get_approval_rule_for_amount', { p_amount: amount });

    if (error || !ruleId) {
      console.error('[purchase-requisitions] Error getting approval rule:', error);
      return null;
    }

    // Obtener la regla completa por ID
    const { data: rule, error: ruleError } = await supabase
      .from('pr_approval_rules')
      .select('*')
      .eq('id', ruleId)
      .single();

    if (ruleError) {
      console.error('[purchase-requisitions] Error fetching rule details:', ruleError);
      return null;
    }

    return rule as PRApprovalRule;
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return null;
  }
}

// ============================================================================
// PURCHASE REQUISITIONS - CRUD
// ============================================================================

/**
 * Crear nueva PR (estado draft)
 * El usuario autenticado es el solicitante
 */
export async function createPR(
  input: CreatePRInput
): Promise<PRActionResponse<PurchaseRequisition>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener nombre del usuario para cachear
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, departamento')
      .eq('id', user.id)
      .single();

    // Calcular total_amount
    const totalAmount = input.quantity * input.unit_price;

    // Insertar la PR
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        requester_id: user.id,
        requester_name: userData?.nombre || 'Usuario',
        requester_department: input.requester_department || userData?.departamento,
        proyecto_id: input.proyecto_id || null,
        title: input.title,
        category_id: input.category_id,
        priority: input.priority,
        required_by_date: input.required_by_date,
        item_description: input.item_description,
        quantity: input.quantity,
        unit_price: input.unit_price,
        currency: input.currency,
        total_amount: totalAmount,
        justification: input.justification,
        preferred_vendor: input.preferred_vendor || null,
        cost_center: input.cost_center || null,
        notes: input.notes || null,
        attachments: input.attachments || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('[purchase-requisitions] Error creating PR:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as PurchaseRequisition,
      message: 'Solicitud de compra creada exitosamente',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener PR por ID (con datos relacionados para vista detallada)
 */
export async function getPRById(id: string): Promise<PRDetailViewData | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Obtener PR con categoría
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select(`
        *,
        category:pr_categories(*)
      `)
      .eq('id', id)
      .single();

    if (prError) {
      console.error('[purchase-requisitions] Error fetching PR:', prError);
      return null;
    }

    // Obtener historial
    const history = await getPRHistory(id);

    // Obtener comentarios
    const comments = await getPRComments(id);

    // Obtener regla de aprobación si existe
    let approval_rule: PRApprovalRule | undefined = undefined;
    if (pr.approval_rule_id) {
      const { data: rule } = await supabase
        .from('pr_approval_rules')
        .select('*')
        .eq('id', pr.approval_rule_id)
        .single();
      approval_rule = rule as PRApprovalRule | undefined;
    }

    // Determinar permisos del usuario actual
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    const userRole = userData?.rol || '';
    const isRequester = pr.requester_id === user.id;
    const isApprover = pr.current_approver_id === user.id;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    const can_edit = isRequester && pr.status === 'draft';
    const can_approve = isApprover && pr.status === 'pending_approval';
    const can_cancel = isRequester && ['draft', 'submitted', 'pending_approval'].includes(pr.status);

    return {
      pr: pr as PurchaseRequisition,
      category: pr.category as PRCategory,
      history,
      comments,
      approval_rule,
      can_edit,
      can_approve,
      can_cancel,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return null;
  }
}

/**
 * Actualizar PR (solo en draft)
 */
export async function updatePR(
  id: string,
  input: UpdatePRInput
): Promise<PRActionResponse<PurchaseRequisition>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que la PR está en draft y el usuario es el solicitante
    const { data: pr } = await supabase
      .from('purchase_requisitions')
      .select('status, requester_id, quantity, unit_price')
      .eq('id', id)
      .single();

    if (!pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'draft') {
      return { success: false, error: 'Solo se pueden editar borradores' };
    }

    if (pr.requester_id !== user.id) {
      return { success: false, error: 'No tienes permiso para editar esta solicitud' };
    }

    // Preparar datos de actualización
    const updateData: any = { ...input };

    // Recalcular total_amount si cambiaron quantity o unit_price
    if (input.quantity !== undefined || input.unit_price !== undefined) {
      // Obtener valores actuales si no se proveen
      if (input.quantity === undefined || input.unit_price === undefined) {
        const currentQuantity = input.quantity !== undefined ? input.quantity : (pr.quantity as number);
        const currentUnitPrice = input.unit_price !== undefined ? input.unit_price : (pr.unit_price as number);
        updateData.total_amount = currentQuantity * currentUnitPrice;
      } else {
        updateData.total_amount = input.quantity * input.unit_price;
      }
    }

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[purchase-requisitions] Error updating PR:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as PurchaseRequisition,
      message: 'Solicitud actualizada exitosamente',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Eliminar PR (solo en draft, soft delete)
 */
export async function deletePR(id: string): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que la PR está en draft y el usuario es el solicitante
    const { data: pr } = await supabase
      .from('purchase_requisitions')
      .select('status, requester_id')
      .eq('id', id)
      .single();

    if (!pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'draft') {
      return { success: false, error: 'Solo se pueden eliminar borradores' };
    }

    if (pr.requester_id !== user.id) {
      return { success: false, error: 'No tienes permiso para eliminar esta solicitud' };
    }

    // Soft delete: cambiar a cancelled
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: 'Borrador eliminado por el solicitante',
      })
      .eq('id', id);

    if (error) {
      console.error('[purchase-requisitions] Error deleting PR:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Solicitud eliminada exitosamente' };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ============================================================================
// WORKFLOW
// ============================================================================

/**
 * Enviar a aprobación (draft → submitted → pending_approval)
 * Asigna aprobador según regla y envía notificación
 */
export async function submitPR(prId: string): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener PR
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('id', prId)
      .single();

    if (prError || !pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'draft') {
      return { success: false, error: 'Solo se pueden enviar borradores' };
    }

    if (pr.requester_id !== user.id) {
      return { success: false, error: 'No tienes permiso para enviar esta solicitud' };
    }

    // Obtener regla de aprobación para el monto
    const approvalRule = await getApprovalRuleForAmount(pr.total_amount);

    if (!approvalRule) {
      return {
        success: false,
        error: 'No se encontró regla de aprobación aplicable para este monto',
      };
    }

    // Caso: Auto-aprobación
    if (approvalRule.approver_role === 'auto') {
      const { error: updateError } = await supabase
        .from('purchase_requisitions')
        .update({
          status: 'approved',
          approval_rule_id: approvalRule.id,
          submitted_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          approval_comments: 'Auto-aprobado según regla de gastos menores',
        })
        .eq('id', prId);

      if (updateError) {
        console.error('[purchase-requisitions] Error auto-approving:', updateError);
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        message: 'Solicitud auto-aprobada exitosamente',
      };
    }

    // Caso: Requiere aprobación de otro usuario
    // Buscar primer usuario con el rol requerido
    const { data: approvers, error: approversError } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('rol', approvalRule.approver_role)
      .eq('activo', true)
      .limit(1);

    if (approversError || !approvers || approvers.length === 0) {
      return {
        success: false,
        error: `No se encontró aprobador disponible con rol: ${approvalRule.approver_role}`,
      };
    }

    const approver = approvers[0];

    // Actualizar PR: submitted → pending_approval
    const { error: updateError } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'pending_approval',
        approval_rule_id: approvalRule.id,
        current_approver_id: approver.id,
        current_approver_name: approver.nombre,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', prId);

    if (updateError) {
      console.error('[purchase-requisitions] Error submitting PR:', updateError);
      return { success: false, error: updateError.message };
    }

    // Enviar notificación al aprobador
    await notifyPRPendingApproval({
      approver_id: approver.id,
      pr_id: prId,
      pr_number: pr.pr_number,
      amount: pr.total_amount,
      currency: pr.currency,
      requester_id: user.id,
      requester_name: pr.requester_name,
      title: pr.title,
    });

    return {
      success: true,
      message: `Solicitud enviada a ${approver.nombre} para aprobación`,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Aprobar PR
 * Solo el aprobador asignado puede ejecutar esta acción
 */
export async function approvePR(input: ApprovePRInput): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener PR
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('id', input.pr_id)
      .single();

    if (prError || !pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'pending_approval') {
      return { success: false, error: 'La solicitud no está pendiente de aprobación' };
    }

    if (pr.current_approver_id !== user.id) {
      return { success: false, error: 'No tienes permiso para aprobar esta solicitud' };
    }

    // Obtener nombre del aprobador
    const { data: approverData } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', user.id)
      .single();

    // Actualizar PR: approved
    const { error: updateError } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        approval_comments: input.comments || null,
      })
      .eq('id', input.pr_id);

    if (updateError) {
      console.error('[purchase-requisitions] Error approving PR:', updateError);
      return { success: false, error: updateError.message };
    }

    // Enviar notificación al solicitante
    await notifyPRApproved({
      requester_id: pr.requester_id,
      pr_id: pr.id,
      pr_number: pr.pr_number,
      amount: pr.total_amount,
      approver_name: approverData?.nombre || 'Aprobador',
    });

    return {
      success: true,
      message: 'Solicitud aprobada exitosamente',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Rechazar PR
 * Solo el aprobador asignado puede ejecutar esta acción
 */
export async function rejectPR(input: RejectPRInput): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener PR
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('id', input.pr_id)
      .single();

    if (prError || !pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'pending_approval') {
      return { success: false, error: 'La solicitud no está pendiente de aprobación' };
    }

    if (pr.current_approver_id !== user.id) {
      return { success: false, error: 'No tienes permiso para rechazar esta solicitud' };
    }

    // Obtener nombre del aprobador
    const { data: approverData } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', user.id)
      .single();

    // Actualizar PR: rejected
    const { error: updateError } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: input.reason,
      })
      .eq('id', input.pr_id);

    if (updateError) {
      console.error('[purchase-requisitions] Error rejecting PR:', updateError);
      return { success: false, error: updateError.message };
    }

    // Enviar notificación al solicitante
    await notifyPRRejected({
      requester_id: pr.requester_id,
      pr_id: pr.id,
      pr_number: pr.pr_number,
      amount: pr.total_amount,
      approver_name: approverData?.nombre || 'Aprobador',
      rejection_reason: input.reason,
    });

    return {
      success: true,
      message: 'Solicitud rechazada',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Cancelar PR (solicitante puede cancelar)
 */
export async function cancelPR(input: CancelPRInput): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener PR
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('id', input.pr_id)
      .single();

    if (prError || !pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.requester_id !== user.id) {
      return { success: false, error: 'Solo el solicitante puede cancelar esta solicitud' };
    }

    if (!['draft', 'submitted', 'pending_approval'].includes(pr.status)) {
      return {
        success: false,
        error: 'No se puede cancelar una solicitud ya aprobada, rechazada o completada',
      };
    }

    // Actualizar PR: cancelled
    const { error: updateError } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: input.reason,
      })
      .eq('id', input.pr_id);

    if (updateError) {
      console.error('[purchase-requisitions] Error cancelling PR:', updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      message: 'Solicitud cancelada exitosamente',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Marcar como completada (después de aprobada)
 * Indica que la compra ya se realizó
 */
export async function completePR(prId: string): Promise<PRActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener PR
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions')
      .select('*')
      .eq('id', prId)
      .single();

    if (prError || !pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (pr.status !== 'approved') {
      return { success: false, error: 'Solo se pueden completar solicitudes aprobadas' };
    }

    // Verificar permisos: solicitante o admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    const isRequester = pr.requester_id === user.id;
    const isAdmin = ['admin', 'superadmin'].includes(userData?.rol || '');

    if (!isRequester && !isAdmin) {
      return { success: false, error: 'No tienes permiso para completar esta solicitud' };
    }

    // Actualizar PR: completed
    const { error: updateError } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', prId);

    if (updateError) {
      console.error('[purchase-requisitions] Error completing PR:', updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      message: 'Solicitud marcada como completada',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ============================================================================
// LISTAS Y QUERIES
// ============================================================================

/**
 * Obtener estadísticas rápidas de mis PRs
 * Optimizado para calcular contadores en la BD
 */
export async function getMyPRsStats(): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { total: 0, draft: 0, pending: 0, approved: 0 };
    }

    // Contar por estado usando RPC o queries simples
    const [totalResult, draftResult, pendingResult, approvedResult] = await Promise.all([
      supabase
        .from('purchase_requisitions')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', user.id),
      supabase
        .from('purchase_requisitions')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .eq('status', 'draft'),
      supabase
        .from('purchase_requisitions')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .eq('status', 'pending_approval'),
      supabase
        .from('purchase_requisitions')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', user.id)
        .eq('status', 'approved'),
    ]);

    return {
      total: totalResult.count || 0,
      draft: draftResult.count || 0,
      pending: pendingResult.count || 0,
      approved: approvedResult.count || 0,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error fetching stats:', error);
    return { total: 0, draft: 0, pending: 0, approved: 0 };
  }
}

/**
 * Obtener mis PRs como solicitante
 * Con filtros y paginación
 */
export async function getMyPRs(
  filters?: PRListFilters,
  pagination?: PRPaginationOptions
): Promise<PRPaginatedResponse<PurchaseRequisition>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }

    const page = pagination?.page || 1;
    const page_size = Math.min(pagination?.page_size || 20, 100);
    const offset = (page - 1) * page_size;

    // Query base: mis PRs - SOLO traer campos necesarios
    let query = supabase
      .from('purchase_requisitions')
      .select('id, pr_number, title, status, priority, category_id, total_amount, currency, requester_name, created_at, required_by_date', { count: 'estimated' })
      .eq('requester_id', user.id);

    // Aplicar filtros
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters?.category_id) {
      if (Array.isArray(filters.category_id)) {
        query = query.in('category_id', filters.category_id);
      } else {
        query = query.eq('category_id', filters.category_id);
      }
    }

    if (filters?.proyecto_id) {
      query = query.eq('proyecto_id', filters.proyecto_id);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters?.min_amount) {
      query = query.gte('total_amount', filters.min_amount);
    }

    if (filters?.max_amount) {
      query = query.lte('total_amount', filters.max_amount);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,pr_number.ilike.%${filters.search}%,item_description.ilike.%${filters.search}%`
      );
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + page_size - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[purchase-requisitions] Error fetching my PRs:', error);
      return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / page_size);

    return {
      data: (data || []) as PurchaseRequisition[],
      total,
      page,
      page_size,
      total_pages,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
  }
}

/**
 * Obtener PRs pendientes de mi aprobación (para bandeja)
 * Sin paginación, ordenadas por prioridad y fecha
 * OPTIMIZADO: Solo trae campos necesarios
 */
export async function getPendingApprovals(): Promise<PurchaseRequisition[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('id, pr_number, title, status, priority, category_id, total_amount, currency, requester_name, requester_id, created_at, required_by_date, current_approver_id, current_approver_name')
      .eq('current_approver_id', user.id)
      .eq('status', 'pending_approval')
      .order('priority', { ascending: false }) // urgent primero
      .order('created_at', { ascending: true }); // más antiguas primero

    if (error) {
      console.error('[purchase-requisitions] Error fetching pending approvals:', error);
      return [];
    }

    return (data || []) as PurchaseRequisition[];
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return [];
  }
}

/**
 * Obtener todas las PRs (para admin)
 * Con filtros y paginación
 */
export async function getAllPRs(
  filters?: PRListFilters,
  pagination?: PRPaginationOptions
): Promise<PRPaginatedResponse<PurchaseRequisition>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }

    // Verificar que el usuario es admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!['admin', 'superadmin'].includes(userData?.rol || '')) {
      return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }

    const page = pagination?.page || 1;
    const page_size = Math.min(pagination?.page_size || 20, 100);
    const offset = (page - 1) * page_size;

    // Query base: todas las PRs
    let query = supabase
      .from('purchase_requisitions')
      .select('*', { count: 'exact' });

    // Aplicar filtros (igual que getMyPRs)
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters?.category_id) {
      if (Array.isArray(filters.category_id)) {
        query = query.in('category_id', filters.category_id);
      } else {
        query = query.eq('category_id', filters.category_id);
      }
    }

    if (filters?.proyecto_id) {
      query = query.eq('proyecto_id', filters.proyecto_id);
    }

    if (filters?.requester_id) {
      query = query.eq('requester_id', filters.requester_id);
    }

    if (filters?.current_approver_id) {
      query = query.eq('current_approver_id', filters.current_approver_id);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters?.min_amount) {
      query = query.gte('total_amount', filters.min_amount);
    }

    if (filters?.max_amount) {
      query = query.lte('total_amount', filters.max_amount);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,pr_number.ilike.%${filters.search}%,item_description.ilike.%${filters.search}%,requester_name.ilike.%${filters.search}%`
      );
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + page_size - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[purchase-requisitions] Error fetching all PRs:', error);
      return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / page_size);

    return {
      data: (data || []) as PurchaseRequisition[],
      total,
      page,
      page_size,
      total_pages,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return { data: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
  }
}

// ============================================================================
// HISTORIAL Y COMENTARIOS
// ============================================================================

/**
 * Obtener historial de una PR
 * Para mostrar el timeline de acciones
 */
export async function getPRHistory(prId: string): Promise<PRApprovalHistory[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pr_approval_history')
      .select('*')
      .eq('pr_id', prId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[purchase-requisitions] Error fetching history:', error);
      return [];
    }

    return (data || []) as PRApprovalHistory[];
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return [];
  }
}

/**
 * Obtener comentarios de una PR
 * Filtra comentarios eliminados
 */
export async function getPRComments(prId: string): Promise<PRComment[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pr_comments')
      .select('*')
      .eq('pr_id', prId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[purchase-requisitions] Error fetching comments:', error);
      return [];
    }

    return (data || []) as PRComment[];
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return [];
  }
}

/**
 * Agregar comentario a una PR
 */
export async function addPRComment(
  input: AddPRCommentInput
): Promise<PRActionResponse<PRComment>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que el usuario está involucrado en la PR
    const { data: pr } = await supabase
      .from('purchase_requisitions')
      .select('requester_id, current_approver_id')
      .eq('id', input.pr_id)
      .single();

    if (!pr) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    const isInvolved = pr.requester_id === user.id || pr.current_approver_id === user.id;

    if (!isInvolved) {
      return { success: false, error: 'No tienes permiso para comentar en esta solicitud' };
    }

    // Obtener nombre y rol del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();

    // Insertar comentario
    const { data, error } = await supabase
      .from('pr_comments')
      .insert({
        pr_id: input.pr_id,
        user_id: user.id,
        user_name: userData?.nombre || 'Usuario',
        user_role: userData?.rol,
        comment: input.comment,
        is_internal: input.is_internal,
      })
      .select()
      .single();

    if (error) {
      console.error('[purchase-requisitions] Error adding comment:', error);
      return { success: false, error: error.message };
    }

    // Registrar en historial
    await supabase.from('pr_approval_history').insert({
      pr_id: input.pr_id,
      user_id: user.id,
      user_name: userData?.nombre || 'Usuario',
      user_role: userData?.rol,
      action: 'commented',
      comments: input.comment,
      metadata: { is_internal: input.is_internal },
    });

    return {
      success: true,
      data: data as PRComment,
      message: 'Comentario agregado exitosamente',
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas generales de PRs
 * Para dashboards y reportes
 */
export async function getPRStats(): Promise<PRStats> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        total: 0,
        by_status: {} as any,
        by_priority: {} as any,
        by_category: {},
        total_amount: 0,
        avg_amount: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        approval_rate: 0,
        avg_cycle_time_days: 0,
      };
    }

    // Verificar permisos de admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!['admin', 'superadmin'].includes(userData?.rol || '')) {
      return {
        total: 0,
        by_status: {} as any,
        by_priority: {} as any,
        by_category: {},
        total_amount: 0,
        avg_amount: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        approval_rate: 0,
        avg_cycle_time_days: 0,
      };
    }

    // Obtener todas las PRs (sin paginación para stats)
    const { data: prs } = await supabase
      .from('purchase_requisitions')
      .select('*');

    if (!prs || prs.length === 0) {
      return {
        total: 0,
        by_status: {} as any,
        by_priority: {} as any,
        by_category: {},
        total_amount: 0,
        avg_amount: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        approval_rate: 0,
        avg_cycle_time_days: 0,
      };
    }

    // Calcular estadísticas
    const total = prs.length;
    const by_status: any = {};
    const by_priority: any = {};
    const by_category: any = {};

    let total_amount = 0;
    let pending_count = 0;
    let approved_count = 0;
    let rejected_count = 0;
    let cycle_time_sum = 0;
    let cycle_time_count = 0;

    prs.forEach((pr) => {
      // Por estado
      by_status[pr.status] = (by_status[pr.status] || 0) + 1;

      // Por prioridad
      by_priority[pr.priority] = (by_priority[pr.priority] || 0) + 1;

      // Por categoría
      by_category[pr.category_id] = (by_category[pr.category_id] || 0) + 1;

      // Montos
      total_amount += pr.total_amount;

      // Contadores
      if (pr.status === 'pending_approval') pending_count++;
      if (pr.status === 'approved') approved_count++;
      if (pr.status === 'rejected') rejected_count++;

      // Cycle time (días desde creación a aprobación/rechazo)
      if (pr.approved_at || pr.rejected_at) {
        const endDate = new Date(pr.approved_at || pr.rejected_at);
        const startDate = new Date(pr.created_at);
        const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        cycle_time_sum += days;
        cycle_time_count++;
      }
    });

    const avg_amount = total_amount / total;
    const approval_rate = total > 0 ? (approved_count / (approved_count + rejected_count)) * 100 : 0;
    const avg_cycle_time_days = cycle_time_count > 0 ? cycle_time_sum / cycle_time_count : 0;

    return {
      total,
      by_status,
      by_priority,
      by_category,
      total_amount,
      avg_amount,
      pending_count,
      approved_count,
      rejected_count,
      approval_rate,
      avg_cycle_time_days,
    };
  } catch (error) {
    console.error('[purchase-requisitions] Error:', error);
    return {
      total: 0,
      by_status: {} as any,
      by_priority: {} as any,
      by_category: {},
      total_amount: 0,
      avg_amount: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      approval_rate: 0,
      avg_cycle_time_days: 0,
    };
  }
}
