'use client';

// ============================================================================
// SESIÓN 102: Modal para crear locales excepcionales
// ============================================================================
// Permite crear locales como A-107-1, A-107-2 para regularizar ventas duplicadas
// Solo visible para: superadmin, admin, jefe_ventas
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { crearLocalExcepcional } from '@/lib/actions-locales';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Proyecto {
  id: string;
  nombre: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proyectos: Proyecto[];
  selectedProyectoId?: string;
  onSuccess: () => void;
}

// Formatear número como moneda (con separadores de miles)
function formatCurrency(value: string): string {
  // Remover todo excepto números y punto decimal
  const cleanValue = value.replace(/[^\d.]/g, '');

  // Si está vacío, retornar vacío
  if (!cleanValue) return '';

  // Separar parte entera y decimal
  const parts = cleanValue.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Agregar separadores de miles
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Reconstruir con decimal si existe
  if (decimalPart !== undefined) {
    return `${integerPart}.${decimalPart.slice(0, 2)}`; // Máximo 2 decimales
  }

  return integerPart;
}

// Convertir string formateado a número
function parseCurrency(value: string): number {
  const cleanValue = value.replace(/,/g, '');
  return parseFloat(cleanValue) || 0;
}

export default function CrearLocalExcepcionalModal({
  isOpen,
  onClose,
  proyectos,
  selectedProyectoId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    proyecto_id: '',
    metraje: '',
    precio_base: '',
    piso: '',
  });
  const [pisosDisponibles, setPisosDisponibles] = useState<string[]>([]);

  // Estado para validación de código duplicado
  const [codigoValidation, setCodigoValidation] = useState<{
    checking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    checking: false,
    isValid: null,
    message: '',
  });

  // Efecto para sincronizar proyecto seleccionado cuando el modal se abre
  useEffect(() => {
    if (isOpen && selectedProyectoId) {
      setFormData(prev => ({
        ...prev,
        proyecto_id: selectedProyectoId,
      }));
    }
  }, [isOpen, selectedProyectoId]);

  // Efecto para cargar pisos disponibles cuando cambia el proyecto
  useEffect(() => {
    async function fetchPisosDisponibles() {
      if (!formData.proyecto_id) {
        setPisosDisponibles([]);
        return;
      }

      const { data, error } = await supabase
        .from('proyecto_configuraciones')
        .select('configuraciones_extra')
        .eq('proyecto_id', formData.proyecto_id)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar pisos disponibles:', error);
        setPisosDisponibles([]);
        return;
      }

      const pisos = data?.configuraciones_extra?.pisos_disponibles || [];
      setPisosDisponibles(pisos);
    }

    fetchPisosDisponibles();
  }, [formData.proyecto_id]);

  // Reset form cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        codigo: '',
        proyecto_id: selectedProyectoId || '',
        metraje: '',
        precio_base: '',
        piso: '',
      });
      setCodigoValidation({
        checking: false,
        isValid: null,
        message: '',
      });
      setPisosDisponibles([]);
    }
  }, [isOpen, selectedProyectoId]);

  // Validar código duplicado con debounce (considerando piso)
  const checkCodigoDuplicado = useCallback(async (codigo: string, proyectoId: string, piso: string) => {
    if (!codigo.trim() || !proyectoId) {
      setCodigoValidation({ checking: false, isValid: null, message: '' });
      return;
    }

    setCodigoValidation({ checking: true, isValid: null, message: 'Verificando...' });

    try {
      let query = supabase
        .from('locales')
        .select('id, codigo, piso')
        .eq('proyecto_id', proyectoId)
        .eq('codigo', codigo.trim().toUpperCase());

      // Filtrar por piso si está presente
      if (piso) {
        query = query.eq('piso', piso);
      } else {
        query = query.is('piso', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        setCodigoValidation({ checking: false, isValid: null, message: '' });
        return;
      }

      if (data) {
        const pisoMsg = piso ? ` en piso ${piso}` : '';
        setCodigoValidation({
          checking: false,
          isValid: false,
          message: `El código "${codigo}"${pisoMsg} ya existe en este proyecto`,
        });
      } else {
        setCodigoValidation({
          checking: false,
          isValid: true,
          message: 'Código disponible',
        });
      }
    } catch {
      setCodigoValidation({ checking: false, isValid: null, message: '' });
    }
  }, []);

  // Efecto para validar código cuando cambia (incluyendo piso)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.codigo && formData.proyecto_id) {
        checkCodigoDuplicado(formData.codigo, formData.proyecto_id, formData.piso);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData.codigo, formData.proyecto_id, formData.piso, checkCodigoDuplicado]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que el código no esté duplicado
    if (codigoValidation.isValid === false) {
      toast.error('El código ya existe en este proyecto');
      return;
    }

    setLoading(true);

    try {
      const result = await crearLocalExcepcional({
        codigo: formData.codigo.trim().toUpperCase(),
        proyecto_id: formData.proyecto_id,
        metraje: parseFloat(formData.metraje),
        precio_base: parseCurrency(formData.precio_base),
        piso: formData.piso || null,
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al crear el local excepcional');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'precio_base') {
      // Formatear como moneda
      setFormData(prev => ({ ...prev, [field]: formatCurrency(value) }));
    } else if (field === 'codigo') {
      // Convertir a mayúsculas
      setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleProyectoChange = (value: string) => {
    setFormData(prev => ({ ...prev, proyecto_id: value }));
    // Re-validar código si ya hay uno ingresado
    if (formData.codigo) {
      setCodigoValidation({ checking: false, isValid: null, message: '' });
    }
  };

  const isFormValid =
    formData.codigo.trim() &&
    formData.proyecto_id &&
    formData.metraje &&
    parseCurrency(formData.precio_base) > 0 &&
    codigoValidation.isValid !== false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="bg-amber-500 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Crear Local Excepcional</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Para regularizar ventas duplicadas</p>
            <p className="text-amber-700">
              Use códigos como A-107-1, A-107-2 para diferenciar de locales existentes.
              Este local se marcará como "excepcional" y podrá eliminarse si no tiene ficha.
            </p>
          </div>

          {/* Proyecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.proyecto_id}
              onChange={(e) => handleProyectoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
              disabled={loading}
            >
              <option value="">Seleccionar proyecto...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código del Local <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => handleChange('codigo', e.target.value)}
                placeholder="Ej: A-107-1, B-205-2"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                  codigoValidation.isValid === false
                    ? 'border-red-300 bg-red-50'
                    : codigoValidation.isValid === true
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                required
                disabled={loading}
              />
              {/* Indicador de validación */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {codigoValidation.checking && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {!codigoValidation.checking && codigoValidation.isValid === true && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {!codigoValidation.checking && codigoValidation.isValid === false && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            {/* Mensaje de validación */}
            {codigoValidation.message && (
              <p className={`text-xs mt-1 ${
                codigoValidation.isValid === false ? 'text-red-500' :
                codigoValidation.isValid === true ? 'text-green-600' : 'text-gray-500'
              }`}>
                {codigoValidation.message}
              </p>
            )}
            {!codigoValidation.message && (
              <p className="text-xs text-gray-500 mt-1">
                Debe ser único en el proyecto seleccionado
              </p>
            )}
          </div>

          {/* Metraje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metraje (m²) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.metraje}
              onChange={(e) => handleChange('metraje', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="Ej: 6.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
              disabled={loading}
            />
          </div>

          {/* Piso (opcional, solo si el proyecto tiene pisos configurados) */}
          {pisosDisponibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Piso (opcional)
              </label>
              <select
                value={formData.piso}
                onChange={(e) => handleChange('piso', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                disabled={loading}
              >
                <option value="">Sin piso</option>
                {pisosDisponibles.map((piso) => (
                  <option key={piso} value={piso}>
                    {piso}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Seleccione el piso donde se encuentra el local
              </p>
            </div>
          )}

          {/* Precio Base con formato de moneda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Base (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.precio_base}
                onChange={(e) => handleChange('precio_base', e.target.value)}
                placeholder="15,000.00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
                disabled={loading}
              />
            </div>
            {parseCurrency(formData.precio_base) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Valor: ${parseCurrency(formData.precio_base).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Crear Local
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
