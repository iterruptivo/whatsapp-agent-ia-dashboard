'use client';

import { useState, useEffect } from 'react';
import type {
  CreatePRInput,
  PRCategory,
  PRApprovalRule,
  PRPriority,
  PRCurrency,
  PurchaseRequisition,
} from '@/lib/types/purchase-requisitions';
import { PR_CATEGORY_INFO, PR_PRIORITY_LABELS } from '@/lib/types/purchase-requisitions';
import {
  createPR,
  submitPR,
  getCategories,
  getApprovalRuleForAmount,
} from '@/lib/actions-purchase-requisitions';
import { Save, Send, Loader2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePRFormProps {
  onSuccess: (pr: PurchaseRequisition) => void;
  onCancel: () => void;
}

export default function CreatePRForm({ onSuccess, onCancel }: CreatePRFormProps) {
  const [categories, setCategories] = useState<PRCategory[]>([]);
  const [formData, setFormData] = useState<CreatePRInput>({
    title: '',
    category_id: '',
    priority: 'normal',
    required_by_date: '',
    item_description: '',
    quantity: 1,
    unit_price: 0,
    currency: 'PEN',
    justification: '',
    preferred_vendor: '',
    cost_center: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalRule, setApprovalRule] = useState<PRApprovalRule | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    // Obtener regla de aprobación cuando cambia el monto
    const totalAmount = formData.quantity * formData.unit_price;
    if (totalAmount > 0) {
      getApprovalRuleForAmount(totalAmount).then((rule) => {
        setApprovalRule(rule);
      });
    } else {
      setApprovalRule(null);
    }
  }, [formData.quantity, formData.unit_price]);

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleChange = (
    field: keyof CreatePRInput,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Debes seleccionar una categoría';
    }
    if (!formData.required_by_date) {
      newErrors.required_by_date = 'La fecha requerida es obligatoria';
    }
    if (!formData.item_description.trim()) {
      newErrors.item_description = 'La descripción del item es obligatoria';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }
    if (formData.unit_price <= 0) {
      newErrors.unit_price = 'El precio unitario debe ser mayor a 0';
    }
    if (!formData.justification.trim()) {
      newErrors.justification = 'La justificación es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPR(formData);
      if (result.success && result.data) {
        toast.success('Borrador guardado exitosamente');
        onSuccess(result.data);
      } else {
        toast.error(result.error || 'Error al guardar borrador');
      }
    } catch (error) {
      toast.error('Error inesperado al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Crear PR
      const createResult = await createPR(formData);
      if (!createResult.success || !createResult.data) {
        toast.error(createResult.error || 'Error al crear solicitud');
        return;
      }

      // 2. Enviar a aprobación
      const submitResult = await submitPR(createResult.data.id);
      if (submitResult.success) {
        toast.success(submitResult.message || 'Solicitud enviada a aprobación');
        onSuccess(createResult.data);
      } else {
        toast.error(submitResult.error || 'Error al enviar a aprobación');
      }
    } catch (error) {
      toast.error('Error inesperado al enviar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = formData.quantity * formData.unit_price;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Nueva Solicitud de Compra
      </h2>

      <form className="space-y-6">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título de la Solicitud <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Ej: Compra de laptops para equipo de desarrollo"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Categoría y Prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => {
                const info = PR_CATEGORY_INFO[cat.code as keyof typeof PR_CATEGORY_INFO];
                return (
                  <option key={cat.id} value={cat.id}>
                    {info?.icon} {info?.name || cat.name}
                  </option>
                );
              })}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value as PRPriority)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            >
              <option value="urgent">🔴 {PR_PRIORITY_LABELS.urgent}</option>
              <option value="high">🟠 {PR_PRIORITY_LABELS.high}</option>
              <option value="normal">🔵 {PR_PRIORITY_LABELS.normal}</option>
              <option value="low">⚪ {PR_PRIORITY_LABELS.low}</option>
            </select>
          </div>
        </div>

        {/* Fecha Requerida */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Requerida <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.required_by_date}
            onChange={(e) => handleChange('required_by_date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
          />
          {errors.required_by_date && (
            <p className="mt-1 text-sm text-red-600">{errors.required_by_date}</p>
          )}
        </div>

        {/* Descripción del Item */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción del Item <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.item_description}
            onChange={(e) => handleChange('item_description', e.target.value)}
            placeholder="Describe detalladamente el producto o servicio a adquirir..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
          />
          {errors.item_description && (
            <p className="mt-1 text-sm text-red-600">{errors.item_description}</p>
          )}
        </div>

        {/* Cantidad, Precio Unitario, Moneda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              min="1"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio Unitario <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.unit_price}
              onChange={(e) => handleChange('unit_price', parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
            {errors.unit_price && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moneda <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value as PRCurrency)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            >
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Monto Total:</span>
            <span className="text-2xl font-bold text-gray-900">
              {totalAmount.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {formData.currency}
            </span>
          </div>

          {/* Regla de aprobación */}
          {approvalRule && totalAmount > 0 && (
            <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{approvalRule.name}</p>
                <p>
                  {approvalRule.approver_role === 'auto'
                    ? 'Se aprobará automáticamente'
                    : `Requiere aprobación de: ${approvalRule.approver_role}`}
                </p>
                <p className="text-xs text-gray-500">
                  SLA: {approvalRule.sla_hours} horas
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Justificación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Justificación de la Compra <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.justification}
            onChange={(e) => handleChange('justification', e.target.value)}
            placeholder="Explica por qué es necesaria esta compra, cómo beneficia al negocio, y cualquier contexto relevante..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
          />
          {errors.justification && (
            <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
          )}
        </div>

        {/* Campos opcionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor Preferido (Opcional)
            </label>
            <input
              type="text"
              value={formData.preferred_vendor}
              onChange={(e) => handleChange('preferred_vendor', e.target.value)}
              placeholder="Nombre del proveedor sugerido"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Centro de Costo (Opcional)
            </label>
            <input
              type="text"
              value={formData.cost_center}
              onChange={(e) => handleChange('cost_center', e.target.value)}
              placeholder="Código de centro de costo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales (Opcional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Cualquier información adicional relevante..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Guardar Borrador</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:bg-gray-400 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Enviar a Aprobación</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
