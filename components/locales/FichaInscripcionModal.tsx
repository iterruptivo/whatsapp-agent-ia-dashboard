'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { Local } from '@/lib/locales';
import { getLocalLeads } from '@/lib/locales';
import { getClienteFichaByLocalId, upsertClienteFicha, ClienteFichaInput, Copropietario } from '@/lib/actions-clientes-ficha';
import { getProyectoConfiguracion } from '@/lib/proyecto-config';
import PhoneInputCustom from '@/components/shared/PhoneInputCustom';

interface FichaInscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  local: Local | null;
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'Pasaporte'];
const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'];
const UTM_OPTIONS = [
  'Caseta', 'Facebook', 'Instagram', 'WhatsApp', 'Pag. Web', 'Volante', 'Panel Publicitario', 'Ferias',
  'Evento Presencial', 'Publicidad en Buses', 'Panel de Ruta', 'TikTok', 'Referido', 'Programa TV', 'Radio', 'Revistas'
];
const GENEROS = ['Masculino', 'Femenino'];
const NIVELES_ESTUDIO = ['Primaria', 'Secundaria', 'Técnico', 'Universitario', 'Postgrado'];
const TIPOS_TRABAJADOR = ['Dependiente', 'Independiente'];
const SI_NO_OPTIONS = ['Sí', 'No'];
const PARENTESCOS = ['Hijo(a)', 'Padre', 'Madre', 'Hermano(a)', 'Tío(a)', 'Sobrino(a)', 'Primo(a)', 'Abuelo(a)', 'Nieto(a)', 'Otro'];

const EMPTY_COPROPIETARIO: Copropietario = {
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  tipo_documento: 'DNI',
  numero_documento: '',
  telefono: '',
  email: '',
  parentesco: '',
};

export default function FichaInscripcionModal({
  isOpen,
  onClose,
  local,
}: FichaInscripcionModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadData, setLeadData] = useState<{ nombre: string; telefono: string; lead_id: string | null }>({ nombre: '', telefono: '', lead_id: null });

  // UIN States
  const [teaProyecto, setTeaProyecto] = useState<number>(0);
  const [porcentajeInicialDefault, setPorcentajeInicialDefault] = useState<number>(30); // Default 30%

  const [formData, setFormData] = useState<ClienteFichaInput>({
    local_id: '',
    titular_nombres: '',
    titular_apellido_paterno: '',
    titular_apellido_materno: '',
    titular_tipo_documento: 'DNI',
    titular_numero_documento: '',
    titular_fecha_nacimiento: '',
    titular_lugar_nacimiento: '',
    titular_estado_civil: 'Soltero(a)',
    titular_nacionalidad: 'Peruana',
    titular_direccion: '',
    titular_distrito: '',
    titular_provincia: '',
    titular_departamento: 'Lima',
    titular_referencia: '',
    titular_celular: '',
    titular_telefono_fijo: '',
    titular_email: '',
    titular_ocupacion: '',
    titular_centro_trabajo: '',
    titular_ruc: '',
    titular_genero: '',
    titular_edad: '',
    titular_ingresos_salariales: '',
    titular_nivel_estudios: '',
    titular_tipo_trabajador: '',
    titular_puesto_trabajo: '',
    titular_cantidad_hijos: '',
    titular_cuenta_propiedades: '',
    titular_cuenta_tarjeta_credito: '',
    titular_motivo_compra: '',
    tiene_conyuge: false,
    conyuge_nombres: '',
    conyuge_apellido_paterno: '',
    conyuge_apellido_materno: '',
    conyuge_tipo_documento: 'DNI',
    conyuge_numero_documento: '',
    conyuge_fecha_nacimiento: '',
    conyuge_lugar_nacimiento: '',
    conyuge_nacionalidad: 'Peruana',
    conyuge_ocupacion: '',
    conyuge_celular: '',
    conyuge_email: '',
    conyuge_genero: '',
    conyuge_direccion: '',
    conyuge_distrito: '',
    conyuge_provincia: '',
    conyuge_departamento: 'Lima',
    conyuge_referencia: '',
    copropietarios: [],
    // UIN fields
    modalidad_pago: 'financiado',
    tipo_cambio: null,
    monto_separacion_usd: null,
    fecha_separacion: '',
    porcentaje_inicial: null,
    cuota_inicial_usd: null,
    inicial_restante_usd: null,
    saldo_financiar_usd: null,
    numero_cuotas: null,
    cuota_mensual_usd: null,
    entidad_bancaria: '',
    fecha_inicio_pago: '',
    compromiso_pago: '',
    // Marketing
    utm_source: '',
    utm_detalle: '',
    observaciones: '',
    vendedor_id: null,
  });

  useEffect(() => {
    if (!isOpen || !local) return;

    async function loadData() {
      setLoading(true);

      // Obtener datos del lead vinculado
      const localLeads = await getLocalLeads(local!.id);
      if (localLeads.length > 0) {
        const lead = localLeads[0];
        setLeadData({
          nombre: lead.lead_nombre || '',
          telefono: lead.lead_telefono || '',
          lead_id: lead.lead_id,
        });
      }

      // Obtener ficha existente o crear nueva
      const existingFicha = await getClienteFichaByLocalId(local!.id);

      if (existingFicha) {
        setFormData({
          local_id: local!.id,
          lead_id: existingFicha.lead_id,
          titular_nombres: existingFicha.titular_nombres || '',
          titular_apellido_paterno: existingFicha.titular_apellido_paterno || '',
          titular_apellido_materno: existingFicha.titular_apellido_materno || '',
          titular_tipo_documento: existingFicha.titular_tipo_documento || 'DNI',
          titular_numero_documento: existingFicha.titular_numero_documento || '',
          titular_fecha_nacimiento: existingFicha.titular_fecha_nacimiento || '',
          titular_lugar_nacimiento: existingFicha.titular_lugar_nacimiento || '',
          titular_estado_civil: existingFicha.titular_estado_civil || 'Soltero(a)',
          titular_nacionalidad: existingFicha.titular_nacionalidad || 'Peruana',
          titular_direccion: existingFicha.titular_direccion || '',
          titular_distrito: existingFicha.titular_distrito || '',
          titular_provincia: existingFicha.titular_provincia || '',
          titular_departamento: existingFicha.titular_departamento || 'Lima',
          titular_referencia: existingFicha.titular_referencia || '',
          titular_celular: existingFicha.titular_celular || '',
          titular_telefono_fijo: existingFicha.titular_telefono_fijo || '',
          titular_email: existingFicha.titular_email || '',
          titular_ocupacion: existingFicha.titular_ocupacion || '',
          titular_centro_trabajo: existingFicha.titular_centro_trabajo || '',
          titular_ruc: existingFicha.titular_ruc || '',
          titular_genero: existingFicha.titular_genero || '',
          titular_edad: existingFicha.titular_edad || '',
          titular_ingresos_salariales: existingFicha.titular_ingresos_salariales || '',
          titular_nivel_estudios: existingFicha.titular_nivel_estudios || '',
          titular_tipo_trabajador: existingFicha.titular_tipo_trabajador || '',
          titular_puesto_trabajo: existingFicha.titular_puesto_trabajo || '',
          titular_cantidad_hijos: existingFicha.titular_cantidad_hijos || '',
          titular_cuenta_propiedades: existingFicha.titular_cuenta_propiedades || '',
          titular_cuenta_tarjeta_credito: existingFicha.titular_cuenta_tarjeta_credito || '',
          titular_motivo_compra: existingFicha.titular_motivo_compra || '',
          tiene_conyuge: existingFicha.tiene_conyuge || false,
          conyuge_nombres: existingFicha.conyuge_nombres || '',
          conyuge_apellido_paterno: existingFicha.conyuge_apellido_paterno || '',
          conyuge_apellido_materno: existingFicha.conyuge_apellido_materno || '',
          conyuge_tipo_documento: existingFicha.conyuge_tipo_documento || 'DNI',
          conyuge_numero_documento: existingFicha.conyuge_numero_documento || '',
          conyuge_fecha_nacimiento: existingFicha.conyuge_fecha_nacimiento || '',
          conyuge_lugar_nacimiento: existingFicha.conyuge_lugar_nacimiento || '',
          conyuge_nacionalidad: existingFicha.conyuge_nacionalidad || 'Peruana',
          conyuge_ocupacion: existingFicha.conyuge_ocupacion || '',
          conyuge_celular: existingFicha.conyuge_celular || '',
          conyuge_email: existingFicha.conyuge_email || '',
          conyuge_genero: existingFicha.conyuge_genero || '',
          conyuge_direccion: existingFicha.conyuge_direccion || '',
          conyuge_distrito: existingFicha.conyuge_distrito || '',
          conyuge_provincia: existingFicha.conyuge_provincia || '',
          conyuge_departamento: existingFicha.conyuge_departamento || 'Lima',
          conyuge_referencia: existingFicha.conyuge_referencia || '',
          copropietarios: existingFicha.copropietarios || [],
          // UIN fields
          modalidad_pago: existingFicha.modalidad_pago || 'financiado',
          tipo_cambio: existingFicha.tipo_cambio,
          monto_separacion_usd: existingFicha.monto_separacion_usd,
          fecha_separacion: existingFicha.fecha_separacion || '',
          porcentaje_inicial: existingFicha.porcentaje_inicial,
          cuota_inicial_usd: existingFicha.cuota_inicial_usd,
          inicial_restante_usd: existingFicha.inicial_restante_usd,
          saldo_financiar_usd: existingFicha.saldo_financiar_usd,
          numero_cuotas: existingFicha.numero_cuotas,
          cuota_mensual_usd: existingFicha.cuota_mensual_usd,
          entidad_bancaria: existingFicha.entidad_bancaria || '',
          fecha_inicio_pago: existingFicha.fecha_inicio_pago || '',
          compromiso_pago: existingFicha.compromiso_pago || '',
          // Marketing
          utm_source: existingFicha.utm_source || '',
          utm_detalle: existingFicha.utm_detalle || '',
          observaciones: existingFicha.observaciones || '',
          vendedor_id: existingFicha.vendedor_id,
        });
      } else {
        // Pre-llenar con datos del lead
        const nombreParts = leadData.nombre.split(' ');
        setFormData(prev => ({
          ...prev,
          local_id: local!.id,
          lead_id: leadData.lead_id,
          titular_nombres: nombreParts.slice(0, -2).join(' ') || leadData.nombre,
          titular_apellido_paterno: nombreParts[nombreParts.length - 2] || '',
          titular_apellido_materno: nombreParts[nombreParts.length - 1] || '',
          titular_celular: leadData.telefono,
          vendedor_id: local!.usuario_paso_naranja_id || null,
        }));
      }

      setLoading(false);
    }

    loadData();
  }, [isOpen, local]);

  // Cargar configuración del proyecto (TEA, porcentaje inicial)
  useEffect(() => {
    if (!isOpen || !local?.proyecto_id) return;

    async function fetchProyectoConfig() {
      const config = await getProyectoConfiguracion(local!.proyecto_id);
      if (config) {
        if (config.tea !== null && config.tea !== undefined) {
          setTeaProyecto(config.tea);
        }
        if (config.configuraciones_extra) {
          const porcentajes = config.configuraciones_extra.porcentajes_inicial || [];
          if (porcentajes.length > 0) {
            setPorcentajeInicialDefault(porcentajes[0].value);
            // Inicializar porcentaje en formData si no tiene valor
            if (!formData.porcentaje_inicial) {
              setFormData(prev => ({ ...prev, porcentaje_inicial: porcentajes[0].value }));
            }
          }
        }
      }
    }

    fetchProyectoConfig();
  }, [isOpen, local]);

  const handleChange = (field: keyof ClienteFichaInput, value: string | boolean | null | Copropietario[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCopropietario = () => {
    const currentCopropietarios = formData.copropietarios || [];
    handleChange('copropietarios', [...currentCopropietarios, { ...EMPTY_COPROPIETARIO }]);
  };

  const removeCopropietario = (index: number) => {
    const currentCopropietarios = formData.copropietarios || [];
    const updated = currentCopropietarios.filter((_, i) => i !== index);
    handleChange('copropietarios', updated);
  };

  const updateCopropietario = (index: number, field: keyof Copropietario, value: string) => {
    const currentCopropietarios = formData.copropietarios || [];
    const updated = currentCopropietarios.map((cop, i) =>
      i === index ? { ...cop, [field]: value } : cop
    );
    handleChange('copropietarios', updated);
  };

  const handleSave = async () => {
    if (!local) return;

    setSaving(true);

    // Calcular valores para guardar
    const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
    const precio = local.monto_venta ?? 0;
    const cuotaInicialCalc = (precio * pct) / 100;
    const separacion = formData.monto_separacion_usd ?? 0;
    const inicialRestante = cuotaInicialCalc - separacion;
    const saldoFinanciar = precio - cuotaInicialCalc;
    const numCuotas = formData.numero_cuotas ?? 0;

    let cuotaMensualCalc = 0;
    if (formData.modalidad_pago === 'financiado' && saldoFinanciar > 0 && numCuotas > 0) {
      if (teaProyecto > 0) {
        const teaDecimal = teaProyecto / 100;
        const tem = Math.pow(1 + teaDecimal, 1/12) - 1;
        cuotaMensualCalc = saldoFinanciar * (tem * Math.pow(1 + tem, numCuotas)) / (Math.pow(1 + tem, numCuotas) - 1);
      } else {
        cuotaMensualCalc = saldoFinanciar / numCuotas;
      }
    }

    const result = await upsertClienteFicha({
      ...formData,
      local_id: local.id,
      lead_id: leadData.lead_id,
      vendedor_id: local.usuario_paso_naranja_id || formData.vendedor_id,
      // Guardar valores calculados
      porcentaje_inicial: pct || null,
      cuota_inicial_usd: cuotaInicialCalc > 0 ? cuotaInicialCalc : null,
      inicial_restante_usd: formData.modalidad_pago === 'financiado' && cuotaInicialCalc > 0 ? inicialRestante : null,
      saldo_financiar_usd: formData.modalidad_pago === 'financiado' && saldoFinanciar > 0 ? saldoFinanciar : null,
      cuota_mensual_usd: cuotaMensualCalc > 0 ? cuotaMensualCalc : null,
    });

    setSaving(false);

    if (result.success) {
      alert('Ficha guardada correctamente');
    } else {
      alert('Error: ' + result.message);
    }
  };

  if (!isOpen || !local) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionClass = "bg-gray-50 rounded-lg p-4 mb-4";
  const sectionTitleClass = "text-base font-semibold text-[#1b967a] mb-3 border-b border-[#1b967a] pb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1b967a] text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Ficha de Inscripción - {local.codigo}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
              <span className="ml-2 text-gray-500">Cargando datos...</span>
            </div>
          ) : (
            <>
              {/* UIN - Unidad de Inscripción */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>UIN - Unidad de Inscripción</h3>

                {/* Info básica del local (solo lectura) */}
                <div className="grid grid-cols-4 gap-3 text-sm mb-4 pb-3 border-b border-gray-200">
                  <div><span className="text-gray-500">Código:</span> <strong>{local.codigo}</strong></div>
                  <div><span className="text-gray-500">Proyecto:</span> <strong>{local.proyecto_nombre}</strong></div>
                  <div><span className="text-gray-500">Metraje:</span> <strong>{local.metraje} m²</strong></div>
                  <div><span className="text-gray-500">Precio local (USD):</span> <strong className="text-green-700">${local.monto_venta?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}</strong></div>
                </div>

                {/* Modalidad de Pago */}
                <div className="mb-4">
                  <label className={labelClass}>Modalidad de Pago</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modalidad_pago"
                        checked={formData.modalidad_pago === 'contado'}
                        onChange={() => handleChange('modalidad_pago', 'contado')}
                        className="w-4 h-4 text-[#1b967a] focus:ring-[#1b967a]"
                      />
                      <span className="text-sm">Al Contado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modalidad_pago"
                        checked={formData.modalidad_pago === 'financiado'}
                        onChange={() => handleChange('modalidad_pago', 'financiado')}
                        className="w-4 h-4 text-[#1b967a] focus:ring-[#1b967a]"
                      />
                      <span className="text-sm">Financiado</span>
                    </label>
                  </div>
                </div>

                {/* Campos editables comunes (contado y financiado) */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {/* T. Cambio */}
                  <div>
                    <label className={labelClass}>T. Cambio (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      value={formData.tipo_cambio ?? ''}
                      onChange={e => handleChange('tipo_cambio', e.target.value ? parseFloat(e.target.value) : null)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="3.75"
                    />
                  </div>
                  {/* Monto separación (USD) */}
                  <div>
                    <label className={labelClass}>Monto separación (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      value={formData.monto_separacion_usd ?? ''}
                      onChange={e => handleChange('monto_separacion_usd', e.target.value ? parseFloat(e.target.value) : null)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="500.00"
                    />
                  </div>
                  {/* Monto separación en Soles (calculado) */}
                  <div>
                    <label className={labelClass}>Separación (S/)</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700">
                      {(formData.monto_separacion_usd && formData.tipo_cambio)
                        ? `S/ ${(formData.monto_separacion_usd * formData.tipo_cambio).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </div>
                  </div>
                  {/* Fecha separación */}
                  <div>
                    <label className={labelClass}>Fecha separación</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={formData.fecha_separacion || ''}
                      onChange={e => handleChange('fecha_separacion', e.target.value)}
                    />
                  </div>
                </div>

                {/* Campos solo para Financiado */}
                {formData.modalidad_pago === 'financiado' && (
                  <>
                    {/* Fila de inicial y calculados */}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {/* Porcentaje inicial (editable) */}
                      <div>
                        <label className={labelClass}>% Inicial</label>
                        <input
                          type="number"
                          step="0.1"
                          className={inputClass}
                          value={formData.porcentaje_inicial ?? porcentajeInicialDefault ?? ''}
                          onChange={e => handleChange('porcentaje_inicial', e.target.value ? parseFloat(e.target.value) : null)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="30"
                        />
                      </div>
                      {/* Cuota inicial USD (calculado) */}
                      <div>
                        <label className={labelClass}>Cuota inicial (USD)</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-blue-50 text-blue-800 font-medium">
                          {(() => {
                            const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
                            const precio = local.monto_venta ?? 0;
                            const cuotaInicialCalc = (precio * pct) / 100;
                            return cuotaInicialCalc > 0 ? `$ ${cuotaInicialCalc.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
                          })()}
                        </div>
                      </div>
                      {/* Inicial restante USD (calculado) */}
                      <div>
                        <label className={labelClass}>Inicial restante (USD)</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-yellow-50 text-yellow-800 font-medium">
                          {(() => {
                            const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
                            const precio = local.monto_venta ?? 0;
                            const cuotaInicialCalc = (precio * pct) / 100;
                            const separacion = formData.monto_separacion_usd ?? 0;
                            const inicialRestante = cuotaInicialCalc - separacion;
                            return cuotaInicialCalc > 0 ? `$ ${inicialRestante.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
                          })()}
                        </div>
                      </div>
                      {/* Saldo a financiar USD (calculado) */}
                      <div>
                        <label className={labelClass}>Saldo a financiar (USD)</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 text-green-800 font-medium">
                          {(() => {
                            const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
                            const precio = local.monto_venta ?? 0;
                            const cuotaInicialCalc = (precio * pct) / 100;
                            const saldoFinanciar = precio - cuotaInicialCalc;
                            return precio > 0 ? `$ ${saldoFinanciar.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Fila de cuotas y mensualidad */}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {/* Número de cuotas (editable) */}
                      <div>
                        <label className={labelClass}>N° Cuotas</label>
                        <input
                          type="number"
                          step="1"
                          className={inputClass}
                          value={formData.numero_cuotas ?? ''}
                          onChange={e => handleChange('numero_cuotas', e.target.value ? parseInt(e.target.value) : null)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="24"
                        />
                      </div>
                      {/* Cuota mensual USD (calculado) */}
                      <div>
                        <label className={labelClass}>Cuota mensual (USD)</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-purple-50 text-purple-800 font-medium">
                          {(() => {
                            const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
                            const precio = local.monto_venta ?? 0;
                            const cuotaInicialCalc = (precio * pct) / 100;
                            const saldoFinanciar = precio - cuotaInicialCalc;
                            const numCuotas = formData.numero_cuotas ?? 0;

                            if (saldoFinanciar <= 0 || numCuotas <= 0) return '-';

                            if (teaProyecto > 0) {
                              // Sistema Francés: Cuota = P × [r(1+r)^n] / [(1+r)^n - 1]
                              const teaDecimal = teaProyecto / 100;
                              const tem = Math.pow(1 + teaDecimal, 1/12) - 1;
                              const cuotaMensual = saldoFinanciar * (tem * Math.pow(1 + tem, numCuotas)) / (Math.pow(1 + tem, numCuotas) - 1);
                              return `$ ${cuotaMensual.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                            } else {
                              // Sin interés: división simple
                              const cuotaMensual = saldoFinanciar / numCuotas;
                              return `$ ${cuotaMensual.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                            }
                          })()}
                        </div>
                      </div>
                      {/* Entidad bancaria */}
                      <div>
                        <label className={labelClass}>Entidad Bancaria</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.entidad_bancaria || ''}
                          onChange={e => handleChange('entidad_bancaria', e.target.value)}
                          placeholder="BCP, Interbank..."
                        />
                      </div>
                      {/* Fecha inicio pago */}
                      <div>
                        <label className={labelClass}>Fecha inicio pago</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={formData.fecha_inicio_pago || ''}
                          onChange={e => handleChange('fecha_inicio_pago', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* TEA info (solo lectura) */}
                    {teaProyecto > 0 && (
                      <div className="text-xs text-gray-500 mb-3">
                        TEA del proyecto: <span className="font-medium">{teaProyecto}%</span>
                      </div>
                    )}

                    {/* Compromiso de pago */}
                    <div>
                      <label className={labelClass}>Compromiso de Pago</label>
                      <textarea
                        className={`${inputClass} min-h-[60px]`}
                        value={formData.compromiso_pago || ''}
                        onChange={e => handleChange('compromiso_pago', e.target.value)}
                        placeholder="Detalles del compromiso de pago del cliente..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Datos del Titular */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>Datos del Titular</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Nombres</label>
                    <input type="text" className={inputClass} value={formData.titular_nombres || ''} onChange={e => handleChange('titular_nombres', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido Paterno</label>
                    <input type="text" className={inputClass} value={formData.titular_apellido_paterno || ''} onChange={e => handleChange('titular_apellido_paterno', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido Materno</label>
                    <input type="text" className={inputClass} value={formData.titular_apellido_materno || ''} onChange={e => handleChange('titular_apellido_materno', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo Documento</label>
                    <select className={inputClass} value={formData.titular_tipo_documento || 'DNI'} onChange={e => handleChange('titular_tipo_documento', e.target.value)}>
                      {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Número Documento</label>
                    <input type="text" className={inputClass} value={formData.titular_numero_documento || ''} onChange={e => handleChange('titular_numero_documento', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha Nacimiento</label>
                    <input type="date" className={inputClass} value={formData.titular_fecha_nacimiento || ''} onChange={e => handleChange('titular_fecha_nacimiento', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Lugar Nacimiento</label>
                    <input type="text" className={inputClass} value={formData.titular_lugar_nacimiento || ''} onChange={e => handleChange('titular_lugar_nacimiento', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Estado Civil</label>
                    <select className={inputClass} value={formData.titular_estado_civil || ''} onChange={e => handleChange('titular_estado_civil', e.target.value)}>
                      {ESTADOS_CIVILES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nacionalidad</label>
                    <input type="text" className={inputClass} value={formData.titular_nacionalidad || ''} onChange={e => handleChange('titular_nacionalidad', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Dirección</label>
                    <input type="text" className={inputClass} value={formData.titular_direccion || ''} onChange={e => handleChange('titular_direccion', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Distrito</label>
                    <input type="text" className={inputClass} value={formData.titular_distrito || ''} onChange={e => handleChange('titular_distrito', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Provincia</label>
                    <input type="text" className={inputClass} value={formData.titular_provincia || ''} onChange={e => handleChange('titular_provincia', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Departamento</label>
                    <input type="text" className={inputClass} value={formData.titular_departamento || ''} onChange={e => handleChange('titular_departamento', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Referencia</label>
                    <input type="text" className={inputClass} value={formData.titular_referencia || ''} onChange={e => handleChange('titular_referencia', e.target.value)} placeholder="Ej: A una cuadra del parque, frente a la bodega..." />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <PhoneInputCustom
                      value={formData.titular_celular || ''}
                      onChange={(value) => handleChange('titular_celular', value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Correo Electrónico</label>
                    <input type="email" className={inputClass} value={formData.titular_email || ''} onChange={e => handleChange('titular_email', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Ocupación</label>
                    <input type="text" className={inputClass} value={formData.titular_ocupacion || ''} onChange={e => handleChange('titular_ocupacion', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Centro de Trabajo</label>
                    <input type="text" className={inputClass} value={formData.titular_centro_trabajo || ''} onChange={e => handleChange('titular_centro_trabajo', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Género</label>
                    <select className={inputClass} value={formData.titular_genero || ''} onChange={e => handleChange('titular_genero', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Edad</label>
                    <input type="number" className={inputClass} value={formData.titular_edad || ''} onChange={e => handleChange('titular_edad', e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
                  </div>
                  <div>
                    <label className={labelClass}>Ingresos Salariales (S/)</label>
                    <input type="number" className={inputClass} value={formData.titular_ingresos_salariales || ''} onChange={e => handleChange('titular_ingresos_salariales', e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
                  </div>
                  <div>
                    <label className={labelClass}>Nivel de Estudios</label>
                    <select className={inputClass} value={formData.titular_nivel_estudios || ''} onChange={e => handleChange('titular_nivel_estudios', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {NIVELES_ESTUDIO.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de Trabajador</label>
                    <select className={inputClass} value={formData.titular_tipo_trabajador || ''} onChange={e => handleChange('titular_tipo_trabajador', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {TIPOS_TRABAJADOR.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Puesto de Trabajo</label>
                    <input type="text" className={inputClass} value={formData.titular_puesto_trabajo || ''} onChange={e => handleChange('titular_puesto_trabajo', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Cantidad de Hijos</label>
                    <input type="number" className={inputClass} value={formData.titular_cantidad_hijos || ''} onChange={e => handleChange('titular_cantidad_hijos', e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
                  </div>
                  <div>
                    <label className={labelClass}>¿Cuenta con Propiedades?</label>
                    <select className={inputClass} value={formData.titular_cuenta_propiedades || ''} onChange={e => handleChange('titular_cuenta_propiedades', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {SI_NO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>¿Cuenta con Tarjeta de Crédito?</label>
                    <select className={inputClass} value={formData.titular_cuenta_tarjeta_credito || ''} onChange={e => handleChange('titular_cuenta_tarjeta_credito', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {SI_NO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Motivo de la Compra</label>
                    <input type="text" className={inputClass} value={formData.titular_motivo_compra || ''} onChange={e => handleChange('titular_motivo_compra', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Cónyuge Toggle */}
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="tiene_conyuge"
                    checked={formData.tiene_conyuge || false}
                    onChange={e => handleChange('tiene_conyuge', e.target.checked)}
                    className="w-4 h-4 text-[#1b967a] rounded focus:ring-[#1b967a]"
                  />
                  <label htmlFor="tiene_conyuge" className="text-base font-semibold text-[#1b967a]">
                    Incluir datos del Cónyuge
                  </label>
                </div>

                {formData.tiene_conyuge && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className={labelClass}>Nombres</label>
                      <input type="text" className={inputClass} value={formData.conyuge_nombres || ''} onChange={e => handleChange('conyuge_nombres', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Apellido Paterno</label>
                      <input type="text" className={inputClass} value={formData.conyuge_apellido_paterno || ''} onChange={e => handleChange('conyuge_apellido_paterno', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Apellido Materno</label>
                      <input type="text" className={inputClass} value={formData.conyuge_apellido_materno || ''} onChange={e => handleChange('conyuge_apellido_materno', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Tipo Documento</label>
                      <select className={inputClass} value={formData.conyuge_tipo_documento || 'DNI'} onChange={e => handleChange('conyuge_tipo_documento', e.target.value)}>
                        {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Número Documento</label>
                      <input type="text" className={inputClass} value={formData.conyuge_numero_documento || ''} onChange={e => handleChange('conyuge_numero_documento', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha Nacimiento</label>
                      <input type="date" className={inputClass} value={formData.conyuge_fecha_nacimiento || ''} onChange={e => handleChange('conyuge_fecha_nacimiento', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Lugar Nacimiento</label>
                      <input type="text" className={inputClass} value={formData.conyuge_lugar_nacimiento || ''} onChange={e => handleChange('conyuge_lugar_nacimiento', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Nacionalidad</label>
                      <input type="text" className={inputClass} value={formData.conyuge_nacionalidad || ''} onChange={e => handleChange('conyuge_nacionalidad', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Ocupación</label>
                      <input type="text" className={inputClass} value={formData.conyuge_ocupacion || ''} onChange={e => handleChange('conyuge_ocupacion', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Teléfono</label>
                      <PhoneInputCustom
                        value={formData.conyuge_celular || ''}
                        onChange={(value) => handleChange('conyuge_celular', value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Correo Electrónico</label>
                      <input type="email" className={inputClass} value={formData.conyuge_email || ''} onChange={e => handleChange('conyuge_email', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Género</label>
                      <select className={inputClass} value={formData.conyuge_genero || ''} onChange={e => handleChange('conyuge_genero', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className={labelClass}>Dirección</label>
                      <input type="text" className={inputClass} value={formData.conyuge_direccion || ''} onChange={e => handleChange('conyuge_direccion', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Distrito</label>
                      <input type="text" className={inputClass} value={formData.conyuge_distrito || ''} onChange={e => handleChange('conyuge_distrito', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Provincia</label>
                      <input type="text" className={inputClass} value={formData.conyuge_provincia || ''} onChange={e => handleChange('conyuge_provincia', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Departamento</label>
                      <input type="text" className={inputClass} value={formData.conyuge_departamento || ''} onChange={e => handleChange('conyuge_departamento', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <label className={labelClass}>Referencia</label>
                      <input type="text" className={inputClass} value={formData.conyuge_referencia || ''} onChange={e => handleChange('conyuge_referencia', e.target.value)} placeholder="Ej: A una cuadra del parque, frente a la bodega..." />
                    </div>
                  </div>
                )}
              </div>

              {/* Otros Copropietarios */}
              <div className={sectionClass}>
                <div className="flex items-center justify-between mb-3 border-b border-[#1b967a] pb-1">
                  <h3 className="text-base font-semibold text-[#1b967a]">Otros Copropietarios</h3>
                  <button
                    type="button"
                    onClick={addCopropietario}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>

                {(!formData.copropietarios || formData.copropietarios.length === 0) ? (
                  <p className="text-sm text-gray-500 italic">No hay copropietarios agregados. Usa el botón "Agregar" para incluir más personas.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.copropietarios.map((cop, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 relative">
                        <div className="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => removeCopropietario(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar copropietario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-3">Copropietario {index + 1}</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={labelClass}>Nombres</label>
                            <input type="text" className={inputClass} value={cop.nombres} onChange={e => updateCopropietario(index, 'nombres', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Apellido Paterno</label>
                            <input type="text" className={inputClass} value={cop.apellido_paterno} onChange={e => updateCopropietario(index, 'apellido_paterno', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Apellido Materno</label>
                            <input type="text" className={inputClass} value={cop.apellido_materno} onChange={e => updateCopropietario(index, 'apellido_materno', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Tipo Documento</label>
                            <select className={inputClass} value={cop.tipo_documento} onChange={e => updateCopropietario(index, 'tipo_documento', e.target.value)}>
                              {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Número Documento</label>
                            <input type="text" className={inputClass} value={cop.numero_documento} onChange={e => updateCopropietario(index, 'numero_documento', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Teléfono</label>
                            <PhoneInputCustom
                              value={cop.telefono || ''}
                              onChange={(value) => updateCopropietario(index, 'telefono', value)}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Correo Electrónico</label>
                            <input type="email" className={inputClass} value={cop.email} onChange={e => updateCopropietario(index, 'email', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Parentesco</label>
                            <select className={inputClass} value={cop.parentesco.startsWith('Otro:') ? 'Otro' : cop.parentesco} onChange={e => {
                              const val = e.target.value;
                              if (val === 'Otro') {
                                updateCopropietario(index, 'parentesco', 'Otro:');
                              } else {
                                updateCopropietario(index, 'parentesco', val);
                              }
                            }}>
                              <option value="">Seleccionar...</option>
                              {PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          {(cop.parentesco === 'Otro' || cop.parentesco.startsWith('Otro:')) && (
                            <div>
                              <label className={labelClass}>Especificar parentesco</label>
                              <input
                                type="text"
                                className={inputClass}
                                value={cop.parentesco.startsWith('Otro:') ? cop.parentesco.slice(5) : ''}
                                onChange={e => updateCopropietario(index, 'parentesco', `Otro:${e.target.value}`)}
                                placeholder="Ej: Cuñado, Suegro..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Marketing */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>¿Cómo se enteró del proyecto?</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {UTM_OPTIONS.map(option => (
                    <label key={option} className="flex flex-col items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="utm_source"
                        checked={formData.utm_source === option}
                        onChange={() => handleChange('utm_source', option)}
                        className="w-5 h-5 text-[#1b967a] border-gray-300 focus:ring-[#1b967a]"
                      />
                      <span className="text-xs text-center text-gray-700 leading-tight">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>Observaciones</h3>
                <textarea
                  className={`${inputClass} min-h-[100px]`}
                  value={formData.observaciones || ''}
                  onChange={e => handleChange('observaciones', e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
