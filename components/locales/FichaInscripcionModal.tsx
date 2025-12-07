'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Local } from '@/lib/locales';
import { getLocalLeads } from '@/lib/locales';
import { getClienteFichaByLocalId, upsertClienteFicha, ClienteFichaInput } from '@/lib/actions-clientes-ficha';

interface FichaInscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  local: Local | null;
}

const TIPOS_DOCUMENTO = ['DNI', 'CE', 'Pasaporte'];
const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'];
const UTM_OPTIONS = ['Facebook', 'Instagram', 'Google', 'TikTok', 'Referido', 'Pasaba por el lugar', 'Otro'];

export default function FichaInscripcionModal({
  isOpen,
  onClose,
  local,
}: FichaInscripcionModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadData, setLeadData] = useState<{ nombre: string; telefono: string; lead_id: string | null }>({ nombre: '', telefono: '', lead_id: null });

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

  const handleChange = (field: keyof ClienteFichaInput, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!local) return;

    setSaving(true);
    const result = await upsertClienteFicha({
      ...formData,
      local_id: local.id,
      lead_id: leadData.lead_id,
      vendedor_id: local.usuario_paso_naranja_id || formData.vendedor_id,
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
              {/* Info del Local */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>Datos del Local</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Código:</span> <strong>{local.codigo}</strong></div>
                  <div><span className="text-gray-500">Proyecto:</span> <strong>{local.proyecto_nombre}</strong></div>
                  <div><span className="text-gray-500">Metraje:</span> <strong>{local.metraje} m²</strong></div>
                  <div><span className="text-gray-500">Precio Base:</span> <strong>${local.precio_base?.toLocaleString() || 'N/A'}</strong></div>
                  <div><span className="text-gray-500">Monto Venta:</span> <strong>${local.monto_venta?.toLocaleString() || 'N/A'}</strong></div>
                  <div><span className="text-gray-500">Separación:</span> <strong>${local.monto_separacion?.toLocaleString() || 'N/A'}</strong></div>
                </div>
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
                    <input type="text" className={inputClass} value={formData.titular_celular || ''} onChange={e => handleChange('titular_celular', e.target.value)} />
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
                    <label className={labelClass}>RUC</label>
                    <input type="text" className={inputClass} value={formData.titular_ruc || ''} onChange={e => handleChange('titular_ruc', e.target.value)} />
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
                      <input type="text" className={inputClass} value={formData.conyuge_celular || ''} onChange={e => handleChange('conyuge_celular', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Correo Electrónico</label>
                      <input type="email" className={inputClass} value={formData.conyuge_email || ''} onChange={e => handleChange('conyuge_email', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Marketing */}
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>¿Cómo nos conoció?</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fuente</label>
                    <select className={inputClass} value={formData.utm_source || ''} onChange={e => handleChange('utm_source', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {UTM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Detalle (si aplica)</label>
                    <input type="text" className={inputClass} value={formData.utm_detalle || ''} onChange={e => handleChange('utm_detalle', e.target.value)} placeholder="Ej: Nombre del referido" />
                  </div>
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
