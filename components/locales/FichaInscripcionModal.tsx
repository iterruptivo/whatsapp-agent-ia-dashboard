'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Plus, Trash2, Eye } from 'lucide-react';
import { Local } from '@/lib/locales';
import { getLocalLeads } from '@/lib/locales';
import { getClienteFichaByLocalId, upsertClienteFicha, ClienteFichaInput, Copropietario, getUsuarioById } from '@/lib/actions-clientes-ficha';
import { getProyectoConfiguracion, getProyectoLegalData } from '@/lib/proyecto-config';
import PhoneInputCustom from '@/components/shared/PhoneInputCustom';
import AlertModal from '@/components/shared/AlertModal';
import DocumentUploader from '@/components/shared/DocumentUploader';

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
  const [leadData, setLeadData] = useState<{ nombre: string; telefono: string; lead_id: string | null; email: string; rubro: string }>({ nombre: '', telefono: '', lead_id: null, email: '', rubro: '' });

  // Datos del asesor (vendedor que confirmó NARANJA)
  const [asesorData, setAsesorData] = useState<{ nombre: string; email: string }>({ nombre: '', email: '' });

  // AlertModal state
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'danger' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  // UIN States
  const [teaProyecto, setTeaProyecto] = useState<number>(0);
  const [porcentajeInicialDefault, setPorcentajeInicialDefault] = useState<number>(30); // Default 30%

  // Datos legales del proyecto (para header/footer)
  const [proyectoLegalData, setProyectoLegalData] = useState<{
    razon_social: string;
    ruc: string;
    domicilio_fiscal: string;
    ubicacion_terreno: string;
    logo_url: string;
  }>({
    razon_social: '',
    ruc: '',
    domicilio_fiscal: '',
    ubicacion_terreno: '',
    logo_url: '',
  });

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
    rubro: '',
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
    tea: null,
    entidad_bancaria: '',
    fecha_inicio_pago: '',
    compromiso_pago: '',
    // Marketing
    utm_source: '',
    utm_detalle: '',
    observaciones: '',
    // Documentos adjuntos
    dni_fotos: [],
    comprobante_deposito_fotos: [],
    vendedor_id: null,
  });

  useEffect(() => {
    if (!isOpen || !local) return;

    async function loadData() {
      setLoading(true);

      // RESET: Limpiar todos los estados antes de cargar datos del nuevo local
      setLeadData({ nombre: '', telefono: '', lead_id: null, email: '', rubro: '' });
      setAsesorData({ nombre: '', email: '' });
      setFormData({
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
        rubro: '',
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
        tea: null,
        entidad_bancaria: '',
        fecha_inicio_pago: '',
        compromiso_pago: '',
        utm_source: '',
        utm_detalle: '',
        observaciones: '',
        dni_fotos: [],
        comprobante_deposito_fotos: [],
        vendedor_id: null,
      });

      // Obtener datos del lead vinculado
      const localLeads = await getLocalLeads(local!.id);
      let leadNombre = '';
      let leadTelefono = '';
      let leadId: string | null = null;
      let leadEmail = '';
      let leadRubro = '';

      if (localLeads.length > 0) {
        const lead = localLeads[0];
        console.log('[FichaModal] Lead vinculado raw:', lead);
        leadNombre = lead.lead_nombre || '';
        leadTelefono = lead.lead_telefono || '';
        leadId = lead.lead_id;
        leadEmail = lead.lead_email || '';
        leadRubro = lead.lead_rubro || '';
        console.log('[FichaModal] Datos extraídos:', { leadNombre, leadTelefono, leadId, leadEmail, leadRubro });
        setLeadData({
          nombre: leadNombre,
          telefono: leadTelefono,
          lead_id: leadId,
          email: leadEmail,
          rubro: leadRubro,
        });
      }

      // Obtener datos del asesor (vendedor que confirmó NARANJA)
      if (local!.usuario_paso_naranja_id) {
        const asesor = await getUsuarioById(local!.usuario_paso_naranja_id);
        if (asesor) {
          setAsesorData({
            nombre: asesor.nombre || '',
            email: asesor.email || '',
          });
        }
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
          // Si ficha tiene email vacío, usar el del lead como fallback
          titular_email: existingFicha.titular_email || leadEmail || '',
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
          // UIN fields - rubro del lead como fallback si ficha no tiene
          rubro: existingFicha.rubro || leadRubro || '',
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
          tea: existingFicha.tea,
          entidad_bancaria: existingFicha.entidad_bancaria || '',
          fecha_inicio_pago: existingFicha.fecha_inicio_pago || '',
          compromiso_pago: existingFicha.compromiso_pago || '',
          // Marketing
          utm_source: existingFicha.utm_source || '',
          utm_detalle: existingFicha.utm_detalle || '',
          observaciones: existingFicha.observaciones || '',
          // Documentos adjuntos
          dni_fotos: existingFicha.dni_fotos || [],
          comprobante_deposito_fotos: existingFicha.comprobante_deposito_fotos || [],
          vendedor_id: existingFicha.vendedor_id,
        });
        // Si la ficha tiene TEA guardada, usarla en vez del default del proyecto
        if (existingFicha.tea !== null && existingFicha.tea !== undefined) {
          setTeaProyecto(existingFicha.tea);
        }
      } else {
        // Pre-llenar con datos del lead vinculado
        // Parsear nombre completo: "Juan Carlos Perez Lopez" -> nombres: "Juan Carlos", ap_pat: "Perez", ap_mat: "Lopez"
        const nombreParts = leadNombre.trim().split(/\s+/);
        let nombres = '';
        let apellidoPaterno = '';
        let apellidoMaterno = '';

        if (nombreParts.length >= 4) {
          // 4+ palabras: asumimos 2 nombres + 2 apellidos
          nombres = nombreParts.slice(0, -2).join(' ');
          apellidoPaterno = nombreParts[nombreParts.length - 2];
          apellidoMaterno = nombreParts[nombreParts.length - 1];
        } else if (nombreParts.length === 3) {
          // 3 palabras: 1 nombre + 2 apellidos
          nombres = nombreParts[0];
          apellidoPaterno = nombreParts[1];
          apellidoMaterno = nombreParts[2];
        } else if (nombreParts.length === 2) {
          // 2 palabras: 1 nombre + 1 apellido
          nombres = nombreParts[0];
          apellidoPaterno = nombreParts[1];
        } else {
          // 1 palabra o vacío: todo en nombres
          nombres = leadNombre;
        }

        setFormData(prev => ({
          ...prev,
          local_id: local!.id,
          lead_id: leadId,
          titular_nombres: nombres,
          titular_apellido_paterno: apellidoPaterno,
          titular_apellido_materno: apellidoMaterno,
          titular_celular: leadTelefono,
          titular_email: leadEmail,
          rubro: leadRubro, // Rubro del lead → campo Rubro en UIN
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

      // Cargar datos legales del proyecto para header/footer (desde tabla proyectos)
      const legalData = await getProyectoLegalData(local!.proyecto_id);
      if (legalData) {
        setProyectoLegalData({
          razon_social: legalData.razon_social || '',
          ruc: legalData.ruc || '',
          domicilio_fiscal: legalData.domicilio_fiscal || '',
          ubicacion_terreno: legalData.ubicacion_terreno || '',
          logo_url: legalData.logo_url || '',
        });
      }
    }

    fetchProyectoConfig();
  }, [isOpen, local]);

  const handleChange = (field: keyof ClienteFichaInput, value: string | boolean | null | Copropietario[] | number | string[]) => {
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

  // Helper para validar documentos requeridos
  const validateDocuments = (): { isValid: boolean; message: string } => {
    const dniFotos = formData.dni_fotos || [];
    const comprobanteFotos = formData.comprobante_deposito_fotos || [];

    if (dniFotos.length === 0 && comprobanteFotos.length === 0) {
      return {
        isValid: false,
        message: 'Debe subir al menos 1 foto del DNI y 1 comprobante de depósito.',
      };
    }
    if (dniFotos.length === 0) {
      return {
        isValid: false,
        message: 'Debe subir al menos 1 foto del DNI (anverso o reverso).',
      };
    }
    if (comprobanteFotos.length === 0) {
      return {
        isValid: false,
        message: 'Debe subir al menos 1 imagen del comprobante de depósito.',
      };
    }
    return { isValid: true, message: '' };
  };

  const handleSave = async () => {
    if (!local) return;

    // Validar documentos requeridos
    const docValidation = validateDocuments();
    if (!docValidation.isValid) {
      setAlertModal({
        isOpen: true,
        title: 'Documentos requeridos',
        message: docValidation.message,
        variant: 'warning',
      });
      return;
    }

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
      // Guardar TEA usada (para trazabilidad: 0 = división simple, >0 = sistema francés)
      tea: formData.modalidad_pago === 'financiado' ? teaProyecto : null,
    });

    setSaving(false);

    if (result.success) {
      setAlertModal({
        isOpen: true,
        title: 'Ficha guardada',
        message: 'La ficha de inscripción se guardó correctamente.',
        variant: 'success',
      });
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Error al guardar',
        message: result.message || 'Ocurrió un error al guardar la ficha.',
        variant: 'danger',
      });
    }
  };

  // Función para generar Vista Previa en nueva ventana
  const handlePreview = () => {
    if (!local) return;

    // Validar documentos requeridos
    const docValidation = validateDocuments();
    if (!docValidation.isValid) {
      setAlertModal({
        isOpen: true,
        title: 'Documentos requeridos',
        message: docValidation.message,
        variant: 'warning',
      });
      return;
    }

    // Calcular valores para mostrar
    const pct = formData.porcentaje_inicial ?? porcentajeInicialDefault ?? 0;
    const precio = local.monto_venta ?? 0;
    const cuotaInicialCalc = (precio * pct) / 100;
    const separacion = formData.monto_separacion_usd ?? 0;
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

    // Helpers para checkboxes
    const getDocCheck = (tipo: string | null | undefined, expected: string) =>
      tipo === expected ? 'checked' : '';
    const getDocCheckSymbol = (tipo: string | null | undefined, expected: string) =>
      tipo === expected ? '✓' : '';

    const getECCheck = (estado: string | null | undefined, expected: string) => {
      if (!estado) return '';
      return estado.toLowerCase().includes(expected.toLowerCase()) ? 'checked' : '';
    };
    const getECCheckSymbol = (estado: string | null | undefined, expected: string) => {
      if (!estado) return '';
      return estado.toLowerCase().includes(expected.toLowerCase()) ? '✓' : '';
    };

    // Nombre completo del titular
    const clienteNombreCompleto = [
      formData.titular_nombres,
      formData.titular_apellido_paterno,
      formData.titular_apellido_materno
    ].filter(Boolean).join(' ') || '-';

    // Nombre completo del cónyuge
    const conyugeNombreCompleto = [
      formData.conyuge_nombres,
      formData.conyuge_apellido_paterno,
      formData.conyuge_apellido_materno
    ].filter(Boolean).join(' ') || '-';

    // Formatear fecha
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    // Formatear monto
    const formatMonto = (monto: number | null | undefined) => {
      if (monto === null || monto === undefined) return '-';
      return monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // UTM checkboxes
    const utmSource = formData.utm_source || '';
    const utmChecks: Record<string, { checked: string; symbol: string }> = {
      facebook: { checked: utmSource.toLowerCase() === 'facebook' ? 'checked' : '', symbol: utmSource.toLowerCase() === 'facebook' ? '✓' : '' },
      instagram: { checked: utmSource.toLowerCase() === 'instagram' ? 'checked' : '', symbol: utmSource.toLowerCase() === 'instagram' ? '✓' : '' },
      google: { checked: utmSource.toLowerCase() === 'google' ? 'checked' : '', symbol: utmSource.toLowerCase() === 'google' ? '✓' : '' },
      tiktok: { checked: utmSource.toLowerCase() === 'tiktok' ? 'checked' : '', symbol: utmSource.toLowerCase() === 'tiktok' ? '✓' : '' },
      referido: { checked: utmSource.toLowerCase() === 'referido' ? 'checked' : '', symbol: utmSource.toLowerCase() === 'referido' ? '✓' : '' },
      pasaba: { checked: utmSource.toLowerCase().includes('pasaba') ? 'checked' : '', symbol: utmSource.toLowerCase().includes('pasaba') ? '✓' : '' },
      otro: { checked: !['facebook', 'instagram', 'google', 'tiktok', 'referido', 'caseta'].includes(utmSource.toLowerCase()) && utmSource !== '' ? 'checked' : '', symbol: !['facebook', 'instagram', 'google', 'tiktok', 'referido', 'caseta'].includes(utmSource.toLowerCase()) && utmSource !== '' ? '✓' : '' },
    };

    // Mapa de placeholders a valores
    const placeholders: Record<string, string> = {
      // Proyecto
      'PROYECTO_NOMBRE': local.proyecto_nombre || '-',
      'CODIGO_LOCAL': local.codigo || '-',

      // Datos legales del proyecto (para header y footer)
      'EMPRESA_RAZON_SOCIAL': proyectoLegalData.razon_social || 'EcoPlaza Inmobiliaria S.A.C.',
      'EMPRESA_RUC': proyectoLegalData.ruc || '-',
      'EMPRESA_DOMICILIO': proyectoLegalData.domicilio_fiscal || '-',
      'EMPRESA_UBICACION': proyectoLegalData.ubicacion_terreno || '-',
      'LOGO_URL': proyectoLegalData.logo_url || '',
      'LOGO_DISPLAY': proyectoLegalData.logo_url ? 'block' : 'none',
      'LOGO_PLACEHOLDER_DISPLAY': proyectoLegalData.logo_url ? 'none' : 'flex',
      'METRAJE': local.metraje?.toString() || '-',
      'PRECIO_LISTA': formatMonto(local.precio_base),
      'PRECIO_VENTA': formatMonto(local.monto_venta),

      // Cliente titular
      'CLIENTE_APELLIDO_PATERNO': formData.titular_apellido_paterno || '-',
      'CLIENTE_APELLIDO_MATERNO': formData.titular_apellido_materno || '-',
      'CLIENTE_NOMBRES': formData.titular_nombres || '-',
      'CLIENTE_NOMBRE_COMPLETO': clienteNombreCompleto,
      'CLIENTE_DOC_DNI': getDocCheck(formData.titular_tipo_documento, 'DNI'),
      'CLIENTE_DOC_CE': getDocCheck(formData.titular_tipo_documento, 'CE'),
      'CLIENTE_DOC_PASAPORTE': getDocCheck(formData.titular_tipo_documento, 'Pasaporte'),
      'CHECK_DNI': getDocCheckSymbol(formData.titular_tipo_documento, 'DNI'),
      'CHECK_CE': getDocCheckSymbol(formData.titular_tipo_documento, 'CE'),
      'CHECK_PASAPORTE': getDocCheckSymbol(formData.titular_tipo_documento, 'Pasaporte'),
      'CLIENTE_NUMERO_DOCUMENTO': formData.titular_numero_documento || '-',
      'CLIENTE_FECHA_NACIMIENTO': formatDate(formData.titular_fecha_nacimiento),
      'CLIENTE_LUGAR_NACIMIENTO': formData.titular_lugar_nacimiento || '-',
      'CLIENTE_EC_SOLTERO': getECCheck(formData.titular_estado_civil, 'soltero'),
      'CLIENTE_EC_CASADO': getECCheck(formData.titular_estado_civil, 'casado'),
      'CLIENTE_EC_VIUDO': getECCheck(formData.titular_estado_civil, 'viudo'),
      'CLIENTE_EC_DIVORCIADO': getECCheck(formData.titular_estado_civil, 'divorciado'),
      'CHECK_SOLTERO': getECCheckSymbol(formData.titular_estado_civil, 'soltero'),
      'CHECK_CASADO': getECCheckSymbol(formData.titular_estado_civil, 'casado'),
      'CHECK_VIUDO': getECCheckSymbol(formData.titular_estado_civil, 'viudo'),
      'CHECK_DIVORCIADO': getECCheckSymbol(formData.titular_estado_civil, 'divorciado'),
      'CLIENTE_NACIONALIDAD': formData.titular_nacionalidad || '-',
      'CLIENTE_DIRECCION': formData.titular_direccion || '-',
      'CLIENTE_DISTRITO': formData.titular_distrito || '-',
      'CLIENTE_PROVINCIA': formData.titular_provincia || '-',
      'CLIENTE_DEPARTAMENTO': formData.titular_departamento || '-',
      'CLIENTE_CELULAR': formData.titular_celular || '-',
      'CLIENTE_TELEFONO_FIJO': formData.titular_telefono_fijo || '-',
      'CLIENTE_EMAIL': formData.titular_email || '-',
      'CLIENTE_OCUPACION': formData.titular_ocupacion || '-',
      'CLIENTE_CENTRO_TRABAJO': formData.titular_centro_trabajo || '-',
      'CLIENTE_RUC': formData.titular_ruc || '-',
      'CLIENTE_REFERENCIA': formData.titular_referencia || '-',
      'CLIENTE_GENERO': formData.titular_genero || '-',
      'CLIENTE_EDAD': formData.titular_edad || '-',
      'CLIENTE_INGRESOS': formData.titular_ingresos_salariales || '-',
      'CLIENTE_NIVEL_ESTUDIOS': formData.titular_nivel_estudios || '-',
      'CLIENTE_TIPO_TRABAJADOR': formData.titular_tipo_trabajador || '-',
      'CLIENTE_PUESTO_TRABAJO': formData.titular_puesto_trabajo || '-',
      'CLIENTE_CANTIDAD_HIJOS': formData.titular_cantidad_hijos || '-',
      'CLIENTE_PROPIEDADES': formData.titular_cuenta_propiedades || '-',
      'CLIENTE_TARJETA_CREDITO': formData.titular_cuenta_tarjeta_credito || '-',
      'CLIENTE_MOTIVO_COMPRA': formData.titular_motivo_compra || '-',

      // Cónyuge
      'MOSTRAR_CONYUGE': formData.tiene_conyuge ? '' : 'display: none;',
      'CONYUGE_APELLIDO_PATERNO': formData.conyuge_apellido_paterno || '-',
      'CONYUGE_APELLIDO_MATERNO': formData.conyuge_apellido_materno || '-',
      'CONYUGE_NOMBRES': formData.conyuge_nombres || '-',
      'CONYUGE_NOMBRE_COMPLETO': conyugeNombreCompleto,
      'CONYUGE_DOC_DNI': getDocCheck(formData.conyuge_tipo_documento, 'DNI'),
      'CONYUGE_DOC_CE': getDocCheck(formData.conyuge_tipo_documento, 'CE'),
      'CONYUGE_DOC_PASAPORTE': getDocCheck(formData.conyuge_tipo_documento, 'Pasaporte'),
      'CHECK_CONYUGE_DNI': getDocCheckSymbol(formData.conyuge_tipo_documento, 'DNI'),
      'CHECK_CONYUGE_CE': getDocCheckSymbol(formData.conyuge_tipo_documento, 'CE'),
      'CHECK_CONYUGE_PASAPORTE': getDocCheckSymbol(formData.conyuge_tipo_documento, 'Pasaporte'),
      'CONYUGE_NUMERO_DOCUMENTO': formData.conyuge_numero_documento || '-',
      'CONYUGE_FECHA_NACIMIENTO': formatDate(formData.conyuge_fecha_nacimiento),
      'CONYUGE_LUGAR_NACIMIENTO': formData.conyuge_lugar_nacimiento || '-',
      'CONYUGE_NACIONALIDAD': formData.conyuge_nacionalidad || '-',
      'CONYUGE_OCUPACION': formData.conyuge_ocupacion || '-',
      'CONYUGE_CELULAR': formData.conyuge_celular || '-',
      'CONYUGE_EMAIL': formData.conyuge_email || '-',
      'CONYUGE_GENERO': formData.conyuge_genero || '-',
      'CONYUGE_DIRECCION': formData.conyuge_direccion || '-',
      'CONYUGE_DISTRITO': formData.conyuge_distrito || '-',
      'CONYUGE_PROVINCIA': formData.conyuge_provincia || '-',
      'CONYUGE_DEPARTAMENTO': formData.conyuge_departamento || '-',
      'CONYUGE_REFERENCIA': formData.conyuge_referencia || '-',
      'MOSTRAR_FIRMA_CONYUGE': formData.tiene_conyuge ? '' : 'display: none;',

      // Forma de pago
      'PAGO_CONTADO': formData.modalidad_pago === 'contado' ? 'checked' : '',
      'PAGO_FINANCIADO': formData.modalidad_pago === 'financiado' ? 'checked' : '',
      'CHECK_CONTADO': formData.modalidad_pago === 'contado' ? '✓' : '',
      'CHECK_FINANCIADO': formData.modalidad_pago === 'financiado' ? '✓' : '',
      'MONTO_SEPARACION': formatMonto(formData.monto_separacion_usd),
      'FECHA_SEPARACION': formatDate(formData.fecha_separacion),
      'CUOTA_INICIAL': formatMonto(cuotaInicialCalc > 0 ? cuotaInicialCalc : null),
      'PORCENTAJE_INICIAL': pct > 0 ? `${pct}%` : '-',
      'SALDO_FINANCIAR': formatMonto(saldoFinanciar > 0 ? saldoFinanciar : null),
      'NUMERO_CUOTAS': numCuotas > 0 ? numCuotas.toString() : '-',
      'TEA': teaProyecto > 0 ? `${teaProyecto}%` : '0%',
      'CUOTA_MENSUAL': formatMonto(cuotaMensualCalc > 0 ? cuotaMensualCalc : null),
      'TIPO_CAMBIO': formData.tipo_cambio ? formData.tipo_cambio.toString() : '-',
      'SEPARACION_SOLES': formData.tipo_cambio && formData.monto_separacion_usd
        ? formatMonto(formData.monto_separacion_usd * formData.tipo_cambio)
        : '-',
      'INICIAL_RESTANTE': formatMonto(formData.modalidad_pago === 'financiado' && cuotaInicialCalc > 0
        ? (cuotaInicialCalc - (formData.monto_separacion_usd || 0))
        : null),
      'ENTIDAD_BANCARIA': formData.entidad_bancaria || '-',
      'FECHA_INICIO_PAGO': formatDate(formData.fecha_inicio_pago),
      'COMPROMISO_PAGO': formData.compromiso_pago || '-',
      'RUBRO_NEGOCIO': formData.rubro || '-',

      // Marketing
      'UTM_FACEBOOK': utmChecks.facebook.checked,
      'UTM_INSTAGRAM': utmChecks.instagram.checked,
      'UTM_GOOGLE': utmChecks.google.checked,
      'UTM_TIKTOK': utmChecks.tiktok.checked,
      'UTM_REFERIDO': utmChecks.referido.checked,
      'UTM_PASABA': utmChecks.pasaba.checked,
      'UTM_OTRO': utmChecks.otro.checked,
      'CHECK_FACEBOOK': utmChecks.facebook.symbol,
      'CHECK_INSTAGRAM': utmChecks.instagram.symbol,
      'CHECK_GOOGLE': utmChecks.google.symbol,
      'CHECK_TIKTOK': utmChecks.tiktok.symbol,
      'CHECK_REFERIDO': utmChecks.referido.symbol,
      'CHECK_PASABA': utmChecks.pasaba.symbol,
      'CHECK_OTRO': utmChecks.otro.symbol,
      'UTM_OTRO_DETALLE': utmChecks.otro.checked ? utmSource : '',

      // Observaciones
      'OBSERVACIONES': formData.observaciones || '-',

      // Copropietarios - generar HTML dinámico
      'COPROPIETARIOS_HTML': (() => {
        const cops = formData.copropietarios || [];
        if (cops.length === 0) return '';
        return cops.map((cop, idx) => `
          <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #1b967a;">Copropietario ${idx + 1}</div>
            <div class="form-grid">
              <div class="form-group"><span class="form-label">Nombres</span><span class="form-value">${cop.nombres || '-'}</span></div>
              <div class="form-group"><span class="form-label">Apellido Paterno</span><span class="form-value">${cop.apellido_paterno || '-'}</span></div>
              <div class="form-group"><span class="form-label">Apellido Materno</span><span class="form-value">${cop.apellido_materno || '-'}</span></div>
              <div class="form-group"><span class="form-label">Tipo Documento</span><span class="form-value">${cop.tipo_documento || '-'}</span></div>
              <div class="form-group"><span class="form-label">Nro. Documento</span><span class="form-value">${cop.numero_documento || '-'}</span></div>
              <div class="form-group"><span class="form-label">Teléfono</span><span class="form-value">${cop.telefono || '-'}</span></div>
              <div class="form-group"><span class="form-label">Email</span><span class="form-value">${cop.email || '-'}</span></div>
              <div class="form-group"><span class="form-label">Parentesco</span><span class="form-value">${cop.parentesco || '-'}</span></div>
            </div>
          </div>
        `).join('');
      })(),
      'MOSTRAR_COPROPIETARIOS': (formData.copropietarios || []).length > 0 ? '' : 'display: none;',

      // Asesor - datos del vendedor que confirmó NARANJA
      'ASESOR_NOMBRE': asesorData.nombre || '-',
      'ASESOR_CODIGO': asesorData.email ? asesorData.email.split('@')[0] : '-',
      // Fecha actual usando patrón de timezone local (igual que FinanciamientoModal)
      'FECHA_REGISTRO': (() => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
      })(),
      'FECHA_GENERACION': fechaGeneracion,
    };

    // Template HTML embebido
    const templateHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ficha de Inscripción - {{PROYECTO_NOMBRE}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; background: #f5f5f5; padding: 20px; }
    .ficha-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .ficha-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1b967a; padding-bottom: 15px; margin-bottom: 20px; }
    .logo-container { width: 120px; }
    .logo-img { max-width: 120px; max-height: 60px; object-fit: contain; }
    .logo-placeholder { width: 120px; height: 60px; background: #e0e0e0; align-items: center; justify-content: center; font-size: 10px; color: #666; border: 1px dashed #999; }
    .ficha-title { text-align: center; flex: 1; }
    .ficha-title h1 { font-size: 18px; font-weight: bold; color: #1b967a; text-transform: uppercase; }
    .ficha-title h2 { font-size: 14px; font-weight: normal; color: #333; margin-top: 5px; }
    .ficha-codigo { text-align: right; min-width: 120px; }
    .ficha-codigo .codigo-label { font-size: 10px; color: #666; }
    .ficha-codigo .codigo-value { font-size: 14px; font-weight: bold; color: #1b967a; border: 1px solid #1b967a; padding: 5px 10px; display: inline-block; margin-top: 5px; }
    .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
    .section-header { background: #1b967a; color: #fff; padding: 8px 15px; font-weight: bold; font-size: 13px; text-transform: uppercase; }
    .section-header.secondary { background: #192c4d; }
    .section-content { padding: 15px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .form-grid.three-cols { grid-template-columns: repeat(3, 1fr); }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group.span-2 { grid-column: span 2; }
    .form-label { font-size: 10px; font-weight: bold; color: #333; margin-bottom: 3px; text-transform: uppercase; }
    .form-value { border-bottom: 1px solid #333; min-height: 22px; padding: 3px 5px; font-size: 12px; background: #fafafa; }
    .checkbox-group { display: flex; flex-wrap: wrap; gap: 15px; align-items: center; }
    .checkbox-item { display: flex; align-items: center; gap: 5px; }
    .checkbox-box { width: 16px; height: 16px; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .checkbox-box.checked { background: #1b967a; color: #fff; border-color: #1b967a; }
    .checkbox-label { font-size: 11px; }
    .signature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 30px; }
    .signature-box { text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
    .signature-label { font-size: 11px; font-weight: bold; }
    .signature-sublabel { font-size: 10px; color: #666; }
    .ficha-footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
    .observaciones-box { min-height: 80px; border: 1px solid #ddd; padding: 10px; background: #fafafa; }
    .print-toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1b967a; padding: 10px 20px; display: flex; justify-content: center; gap: 15px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .print-toolbar button { padding: 10px 25px; font-size: 14px; font-weight: bold; border: none; border-radius: 5px; cursor: pointer; transition: all 0.2s; }
    .print-toolbar .btn-print { background: #fff; color: #1b967a; }
    .print-toolbar .btn-print:hover { background: #e0f0ed; }
    .print-toolbar .btn-close { background: transparent; color: #fff; border: 2px solid #fff; }
    .print-toolbar .btn-close:hover { background: rgba(255,255,255,0.1); }
    body { padding-top: 70px; }
    @media print {
      .print-toolbar { display: none; }
      body { padding: 0; background: #fff; }
      .ficha-container { box-shadow: none; max-width: 100%; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button class="btn-print" onclick="window.print()">Imprimir Ficha PDF</button>
    <button class="btn-close" onclick="window.close()">Cerrar Vista Previa</button>
  </div>
  <div class="ficha-container">
    <header class="ficha-header">
      <div class="logo-container">
        <img src="{{LOGO_URL}}" alt="Logo" class="logo-img" style="display: {{LOGO_DISPLAY}};" />
        <div class="logo-placeholder" style="display: {{LOGO_PLACEHOLDER_DISPLAY}};">LOGO</div>
      </div>
      <div class="ficha-title">
        <div style="font-size: 14px; font-weight: 600; color: #333;">{{EMPRESA_RAZON_SOCIAL}}</div>
        <div style="font-size: 11px; color: #666;">RUC: {{EMPRESA_RUC}}</div>
        <h1 style="margin-top: 5px;">Ficha de Inscripción</h1>
      </div>
      <div class="ficha-codigo"><div class="codigo-label">Cód. de Local</div><div class="codigo-value">{{CODIGO_LOCAL}}</div></div>
    </header>

    <section class="section">
      <div class="section-header">1. Datos del Proyecto</div>
      <div class="section-content">
        <div class="form-grid">
          <div class="form-group span-2"><span class="form-label">Proyecto</span><span class="form-value">{{PROYECTO_NOMBRE}}</span></div>
          <div class="form-group"><span class="form-label">Local / Lote</span><span class="form-value">{{CODIGO_LOCAL}}</span></div>
          <div class="form-group"><span class="form-label">Área (m²)</span><span class="form-value">{{METRAJE}}</span></div>
          <div class="form-group"><span class="form-label">Precio de Lista (USD)</span><span class="form-value">{{PRECIO_LISTA}}</span></div>
          <div class="form-group"><span class="form-label">Precio de Venta (USD)</span><span class="form-value">{{PRECIO_VENTA}}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">2. Datos del Cliente (Titular)</div>
      <div class="section-content">
        <div class="form-grid">
          <div class="form-group"><span class="form-label">Apellido Paterno</span><span class="form-value">{{CLIENTE_APELLIDO_PATERNO}}</span></div>
          <div class="form-group"><span class="form-label">Apellido Materno</span><span class="form-value">{{CLIENTE_APELLIDO_MATERNO}}</span></div>
          <div class="form-group span-2"><span class="form-label">Nombres</span><span class="form-value">{{CLIENTE_NOMBRES}}</span></div>
          <div class="form-group">
            <span class="form-label">Tipo de Documento</span>
            <div class="checkbox-group">
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_DOC_DNI}}">{{CHECK_DNI}}</span><span class="checkbox-label">DNI</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_DOC_CE}}">{{CHECK_CE}}</span><span class="checkbox-label">CE</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_DOC_PASAPORTE}}">{{CHECK_PASAPORTE}}</span><span class="checkbox-label">Pasaporte</span></div>
            </div>
          </div>
          <div class="form-group"><span class="form-label">Número de Documento</span><span class="form-value">{{CLIENTE_NUMERO_DOCUMENTO}}</span></div>
          <div class="form-group"><span class="form-label">Fecha de Nacimiento</span><span class="form-value">{{CLIENTE_FECHA_NACIMIENTO}}</span></div>
          <div class="form-group"><span class="form-label">Lugar de Nacimiento</span><span class="form-value">{{CLIENTE_LUGAR_NACIMIENTO}}</span></div>
          <div class="form-group">
            <span class="form-label">Estado Civil</span>
            <div class="checkbox-group">
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_EC_SOLTERO}}">{{CHECK_SOLTERO}}</span><span class="checkbox-label">Soltero(a)</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_EC_CASADO}}">{{CHECK_CASADO}}</span><span class="checkbox-label">Casado(a)</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_EC_VIUDO}}">{{CHECK_VIUDO}}</span><span class="checkbox-label">Viudo(a)</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CLIENTE_EC_DIVORCIADO}}">{{CHECK_DIVORCIADO}}</span><span class="checkbox-label">Divorciado(a)</span></div>
            </div>
          </div>
          <div class="form-group"><span class="form-label">Nacionalidad</span><span class="form-value">{{CLIENTE_NACIONALIDAD}}</span></div>
          <div class="form-group full-width"><span class="form-label">Dirección Domiciliaria</span><span class="form-value">{{CLIENTE_DIRECCION}}</span></div>
          <div class="form-group"><span class="form-label">Distrito</span><span class="form-value">{{CLIENTE_DISTRITO}}</span></div>
          <div class="form-group"><span class="form-label">Provincia</span><span class="form-value">{{CLIENTE_PROVINCIA}}</span></div>
          <div class="form-group span-2"><span class="form-label">Departamento</span><span class="form-value">{{CLIENTE_DEPARTAMENTO}}</span></div>
          <div class="form-group full-width"><span class="form-label">Referencia</span><span class="form-value">{{CLIENTE_REFERENCIA}}</span></div>
          <div class="form-group"><span class="form-label">Teléfono Celular</span><span class="form-value">{{CLIENTE_CELULAR}}</span></div>
          <div class="form-group"><span class="form-label">Correo Electrónico</span><span class="form-value">{{CLIENTE_EMAIL}}</span></div>
          <div class="form-group"><span class="form-label">Ocupación / Profesión</span><span class="form-value">{{CLIENTE_OCUPACION}}</span></div>
          <div class="form-group"><span class="form-label">Centro de Trabajo</span><span class="form-value">{{CLIENTE_CENTRO_TRABAJO}}</span></div>
          <div class="form-group"><span class="form-label">Género</span><span class="form-value">{{CLIENTE_GENERO}}</span></div>
          <div class="form-group"><span class="form-label">Edad</span><span class="form-value">{{CLIENTE_EDAD}}</span></div>
          <div class="form-group"><span class="form-label">Ingresos Salariales (S/)</span><span class="form-value">{{CLIENTE_INGRESOS}}</span></div>
          <div class="form-group"><span class="form-label">Nivel de Estudios</span><span class="form-value">{{CLIENTE_NIVEL_ESTUDIOS}}</span></div>
          <div class="form-group"><span class="form-label">Tipo de Trabajador</span><span class="form-value">{{CLIENTE_TIPO_TRABAJADOR}}</span></div>
          <div class="form-group"><span class="form-label">Puesto de Trabajo</span><span class="form-value">{{CLIENTE_PUESTO_TRABAJO}}</span></div>
          <div class="form-group"><span class="form-label">Cantidad de Hijos</span><span class="form-value">{{CLIENTE_CANTIDAD_HIJOS}}</span></div>
          <div class="form-group"><span class="form-label">¿Cuenta con Propiedades?</span><span class="form-value">{{CLIENTE_PROPIEDADES}}</span></div>
          <div class="form-group"><span class="form-label">¿Tarjeta de Crédito?</span><span class="form-value">{{CLIENTE_TARJETA_CREDITO}}</span></div>
          <div class="form-group"><span class="form-label">RUC (si aplica)</span><span class="form-value">{{CLIENTE_RUC}}</span></div>
          <div class="form-group full-width"><span class="form-label">Motivo de la Compra</span><span class="form-value">{{CLIENTE_MOTIVO_COMPRA}}</span></div>
        </div>
      </div>
    </section>

    <section class="section" style="{{MOSTRAR_CONYUGE}}">
      <div class="section-header secondary">3. Datos del Cónyuge (Si aplica)</div>
      <div class="section-content">
        <div class="form-grid">
          <div class="form-group"><span class="form-label">Apellido Paterno</span><span class="form-value">{{CONYUGE_APELLIDO_PATERNO}}</span></div>
          <div class="form-group"><span class="form-label">Apellido Materno</span><span class="form-value">{{CONYUGE_APELLIDO_MATERNO}}</span></div>
          <div class="form-group span-2"><span class="form-label">Nombres</span><span class="form-value">{{CONYUGE_NOMBRES}}</span></div>
          <div class="form-group">
            <span class="form-label">Tipo de Documento</span>
            <div class="checkbox-group">
              <div class="checkbox-item"><span class="checkbox-box {{CONYUGE_DOC_DNI}}">{{CHECK_CONYUGE_DNI}}</span><span class="checkbox-label">DNI</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CONYUGE_DOC_CE}}">{{CHECK_CONYUGE_CE}}</span><span class="checkbox-label">CE</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{CONYUGE_DOC_PASAPORTE}}">{{CHECK_CONYUGE_PASAPORTE}}</span><span class="checkbox-label">Pasaporte</span></div>
            </div>
          </div>
          <div class="form-group"><span class="form-label">Número de Documento</span><span class="form-value">{{CONYUGE_NUMERO_DOCUMENTO}}</span></div>
          <div class="form-group"><span class="form-label">Fecha de Nacimiento</span><span class="form-value">{{CONYUGE_FECHA_NACIMIENTO}}</span></div>
          <div class="form-group"><span class="form-label">Lugar de Nacimiento</span><span class="form-value">{{CONYUGE_LUGAR_NACIMIENTO}}</span></div>
          <div class="form-group"><span class="form-label">Nacionalidad</span><span class="form-value">{{CONYUGE_NACIONALIDAD}}</span></div>
          <div class="form-group"><span class="form-label">Ocupación / Profesión</span><span class="form-value">{{CONYUGE_OCUPACION}}</span></div>
          <div class="form-group"><span class="form-label">Teléfono Celular</span><span class="form-value">{{CONYUGE_CELULAR}}</span></div>
          <div class="form-group"><span class="form-label">Correo Electrónico</span><span class="form-value">{{CONYUGE_EMAIL}}</span></div>
          <div class="form-group"><span class="form-label">Género</span><span class="form-value">{{CONYUGE_GENERO}}</span></div>
          <div class="form-group full-width"><span class="form-label">Dirección</span><span class="form-value">{{CONYUGE_DIRECCION}}</span></div>
          <div class="form-group"><span class="form-label">Distrito</span><span class="form-value">{{CONYUGE_DISTRITO}}</span></div>
          <div class="form-group"><span class="form-label">Provincia</span><span class="form-value">{{CONYUGE_PROVINCIA}}</span></div>
          <div class="form-group"><span class="form-label">Departamento</span><span class="form-value">{{CONYUGE_DEPARTAMENTO}}</span></div>
          <div class="form-group full-width"><span class="form-label">Referencia</span><span class="form-value">{{CONYUGE_REFERENCIA}}</span></div>
        </div>
      </div>
    </section>

    <section class="section" style="{{MOSTRAR_COPROPIETARIOS}}">
      <div class="section-header secondary">3.1. Otros Copropietarios</div>
      <div class="section-content">
        {{COPROPIETARIOS_HTML}}
      </div>
    </section>

    <section class="section">
      <div class="section-header">4. Forma de Pago</div>
      <div class="section-content">
        <div class="form-grid">
          <div class="form-group full-width">
            <span class="form-label">Modalidad de Pago</span>
            <div class="checkbox-group">
              <div class="checkbox-item"><span class="checkbox-box {{PAGO_CONTADO}}">{{CHECK_CONTADO}}</span><span class="checkbox-label">Contado</span></div>
              <div class="checkbox-item"><span class="checkbox-box {{PAGO_FINANCIADO}}">{{CHECK_FINANCIADO}}</span><span class="checkbox-label">Financiado</span></div>
            </div>
          </div>
          <div class="form-group"><span class="form-label">Tipo de Cambio (S/)</span><span class="form-value">{{TIPO_CAMBIO}}</span></div>
          <div class="form-group"><span class="form-label">Monto de Separación (USD)</span><span class="form-value">{{MONTO_SEPARACION}}</span></div>
          <div class="form-group"><span class="form-label">Separación (S/)</span><span class="form-value">{{SEPARACION_SOLES}}</span></div>
          <div class="form-group"><span class="form-label">Fecha de Separación</span><span class="form-value">{{FECHA_SEPARACION}}</span></div>
          <div class="form-group"><span class="form-label">Cuota Inicial (USD)</span><span class="form-value">{{CUOTA_INICIAL}}</span></div>
          <div class="form-group"><span class="form-label">Porcentaje Inicial (%)</span><span class="form-value">{{PORCENTAJE_INICIAL}}</span></div>
          <div class="form-group"><span class="form-label">Inicial Restante (USD)</span><span class="form-value">{{INICIAL_RESTANTE}}</span></div>
          <div class="form-group"><span class="form-label">Saldo a Financiar (USD)</span><span class="form-value">{{SALDO_FINANCIAR}}</span></div>
          <div class="form-group"><span class="form-label">Número de Cuotas</span><span class="form-value">{{NUMERO_CUOTAS}}</span></div>
          <div class="form-group"><span class="form-label">TEA (%)</span><span class="form-value">{{TEA}}</span></div>
          <div class="form-group"><span class="form-label">Cuota Mensual (USD)</span><span class="form-value">{{CUOTA_MENSUAL}}</span></div>
          <div class="form-group"><span class="form-label">Fecha Inicio de Pago</span><span class="form-value">{{FECHA_INICIO_PAGO}}</span></div>
          <div class="form-group"><span class="form-label">Entidad Bancaria</span><span class="form-value">{{ENTIDAD_BANCARIA}}</span></div>
          <div class="form-group"><span class="form-label">Rubro del Negocio</span><span class="form-value">{{RUBRO_NEGOCIO}}</span></div>
          <div class="form-group full-width"><span class="form-label">Compromiso de Pago</span><span class="form-value">{{COMPROMISO_PAGO}}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header secondary">5. ¿Cómo se enteró del proyecto?</div>
      <div class="section-content">
        <div class="checkbox-group">
          <div class="checkbox-item"><span class="checkbox-box {{UTM_FACEBOOK}}">{{CHECK_FACEBOOK}}</span><span class="checkbox-label">Facebook</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_INSTAGRAM}}">{{CHECK_INSTAGRAM}}</span><span class="checkbox-label">Instagram</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_GOOGLE}}">{{CHECK_GOOGLE}}</span><span class="checkbox-label">Google</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_TIKTOK}}">{{CHECK_TIKTOK}}</span><span class="checkbox-label">TikTok</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_REFERIDO}}">{{CHECK_REFERIDO}}</span><span class="checkbox-label">Referido</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_PASABA}}">{{CHECK_PASABA}}</span><span class="checkbox-label">Pasaba por el lugar</span></div>
          <div class="checkbox-item"><span class="checkbox-box {{UTM_OTRO}}">{{CHECK_OTRO}}</span><span class="checkbox-label">Otro: {{UTM_OTRO_DETALLE}}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">6. Observaciones</div>
      <div class="section-content"><div class="observaciones-box">{{OBSERVACIONES}}</div></div>
    </section>

    <section class="section">
      <div class="section-header secondary">7. Datos del Asesor de Ventas</div>
      <div class="section-content">
        <div class="form-grid three-cols">
          <div class="form-group"><span class="form-label">Nombre del Asesor</span><span class="form-value">{{ASESOR_NOMBRE}}</span></div>
          <div class="form-group"><span class="form-label">Código / ID</span><span class="form-value">{{ASESOR_CODIGO}}</span></div>
          <div class="form-group"><span class="form-label">Fecha de Registro</span><span class="form-value">{{FECHA_REGISTRO}}</span></div>
        </div>
      </div>
    </section>

    <!-- Sección de Firmas oculta temporalmente -->
    <section class="section" style="display: none;">
      <div class="section-header">Firmas</div>
      <div class="section-content">
        <div class="signature-grid">
          <div class="signature-box"><div class="signature-line"><div class="signature-label">{{CLIENTE_NOMBRE_COMPLETO}}</div><div class="signature-sublabel">Cliente / Titular</div><div class="signature-sublabel">DNI: {{CLIENTE_NUMERO_DOCUMENTO}}</div></div></div>
          <div class="signature-box" style="{{MOSTRAR_FIRMA_CONYUGE}}"><div class="signature-line"><div class="signature-label">{{CONYUGE_NOMBRE_COMPLETO}}</div><div class="signature-sublabel">Cónyuge</div><div class="signature-sublabel">DNI: {{CONYUGE_NUMERO_DOCUMENTO}}</div></div></div>
          <div class="signature-box"><div class="signature-line"><div class="signature-label">{{ASESOR_NOMBRE}}</div><div class="signature-sublabel">Asesor de Ventas</div></div></div>
          <div class="signature-box"><div class="signature-line"><div class="signature-label">Jefe de Ventas</div><div class="signature-sublabel">V°B° Supervisión</div></div></div>
        </div>
      </div>
    </section>

    <!-- NOTA Legal -->
    <section class="section">
      <div class="section-header" style="background: #333;">NOTA</div>
      <div class="section-content" style="font-size: 11px; font-style: italic; text-align: justify; line-height: 1.5;">
        Las separaciones tienen una vigencia según la fecha señalada en la presente constancia. Sobre las separaciones, si el cliente decide no continuar con la compra, se genera una retención del 100% por gastos administrativos sobre el monto aportado, esta penalidad aplica desde el momento en que el cliente realiza el aporte en cuenta, dando de esta manera su conformidad con el depósito realizado. Asimismo, la firma y legalización del contrato debe realizarse en una programación máxima de 30 días calendarios.
      </div>
    </section>

    <footer class="ficha-footer">
      <p><strong>{{EMPRESA_RAZON_SOCIAL}}</strong> | RUC: {{EMPRESA_RUC}}</p>
      <p>Domicilio Fiscal: {{EMPRESA_DOMICILIO}}</p>
      <p>Ubicación del Terreno: {{EMPRESA_UBICACION}}</p>
      <p style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px;">Documento generado el {{FECHA_GENERACION}} | EcoPlaza Command Center</p>
    </footer>
  </div>
</body>
</html>`;

    // Reemplazar todos los placeholders
    let finalHtml = templateHtml;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
      finalHtml = finalHtml.replace(regex, value);
    }

    // Generar HTML para las páginas de documentos adjuntos
    const dniFotos = formData.dni_fotos || [];
    const comprobanteFotos = formData.comprobante_deposito_fotos || [];

    let documentosHtml = '';

    // Página separada para DNI
    if (dniFotos.length > 0) {
      documentosHtml += `
        <div style="page-break-before: always; padding: 40px; min-height: 100vh; display: flex; flex-direction: column;">
          <h2 style="text-align: center; color: #1b967a; margin-bottom: 30px; font-size: 20px; border-bottom: 2px solid #1b967a; padding-bottom: 10px;">
            DOCUMENTO DE IDENTIDAD (DNI)
          </h2>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
            ${dniFotos.map((url) => `
              <img src="${url}" alt="DNI" style="max-width: 90%; max-height: 45vh; border: 1px solid #ddd; border-radius: 8px; object-fit: contain;" />
            `).join('')}
          </div>
        </div>
      `;
    }

    // Página separada para Comprobante de Depósito
    if (comprobanteFotos.length > 0) {
      documentosHtml += `
        <div style="page-break-before: always; padding: 40px; min-height: 100vh; display: flex; flex-direction: column;">
          <h2 style="text-align: center; color: #1b967a; margin-bottom: 30px; font-size: 20px; border-bottom: 2px solid #1b967a; padding-bottom: 10px;">
            COMPROBANTE DE DEPÓSITO
          </h2>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
            ${comprobanteFotos.map((url) => `
              <img src="${url}" alt="Comprobante" style="max-width: 90%; max-height: 45vh; border: 1px solid #ddd; border-radius: 8px; object-fit: contain;" />
            `).join('')}
          </div>
        </div>
      `;
    }

    // Insertar documentos antes del cierre del body
    if (documentosHtml) {
      finalHtml = finalHtml.replace('</body>', `${documentosHtml}</body>`);
    }

    // Abrir en nueva ventana
    const previewWindow = window.open('', '_blank', 'width=900,height=800');
    if (previewWindow) {
      previewWindow.document.write(finalHtml);
      previewWindow.document.close();
      // Establecer título del documento (nombre sugerido al imprimir/guardar PDF)
      // Formato: FICHA-INSCRIPCION-CODLOCAL-YYYYMMDD-HHMMSS
      const now = new Date();
      const fecha = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const hora = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      previewWindow.document.title = `FICHA-INSCRIPCION-${local.codigo}-${fecha}-${hora}`;
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

                    {/* Fila de cuotas, TEA y mensualidad */}
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
                      {/* TEA editable */}
                      <div>
                        <label className={labelClass}>TEA (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className={inputClass}
                          value={teaProyecto}
                          onChange={e => setTeaProyecto(e.target.value ? parseFloat(e.target.value) : 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {teaProyecto > 0 ? 'Sistema francés (con interés)' : '0 = cuota simple (sin interés)'}
                        </p>
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

                            let cuotaMensual: number;
                            if (teaProyecto > 0) {
                              // Sistema Francés: Cuota = P × [r(1+r)^n] / [(1+r)^n - 1]
                              const teaDecimal = teaProyecto / 100;
                              const tem = Math.pow(1 + teaDecimal, 1/12) - 1;
                              cuotaMensual = saldoFinanciar * (tem * Math.pow(1 + tem, numCuotas)) / (Math.pow(1 + tem, numCuotas) - 1);
                            } else {
                              // Sin interés: división simple
                              cuotaMensual = saldoFinanciar / numCuotas;
                            }
                            // Redondear a 2 decimales
                            cuotaMensual = Math.round(cuotaMensual * 100) / 100;
                            return `$ ${cuotaMensual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </div>
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

                    {/* Entidad bancaria + Rubro */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelClass}>Entidad Bancaria</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.entidad_bancaria || ''}
                          onChange={e => handleChange('entidad_bancaria', e.target.value)}
                          placeholder="BCP, Interbank, BBVA, Scotiabank..."
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Rubro del Negocio</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.rubro || ''}
                          onChange={e => handleChange('rubro', e.target.value)}
                          placeholder="Ej: Retail, Restaurante, Servicios..."
                        />
                      </div>
                    </div>

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
                  <div className="col-span-2">
                    <label className={labelClass}>Motivo de la Compra</label>
                    <input type="text" className={inputClass} value={formData.titular_motivo_compra || ''} onChange={e => handleChange('titular_motivo_compra', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>RUC (si aplica)</label>
                    <input type="text" className={inputClass} maxLength={11} value={formData.titular_ruc || ''} onChange={e => handleChange('titular_ruc', e.target.value)} placeholder="20XXXXXXXXX" />
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

              {/* DOCUMENTOS ADJUNTOS (REQUERIDOS) */}
              <div className={sectionClass}>
                <h3 className={`${sectionTitleClass} text-red-600`}>
                  DOCUMENTOS ADJUNTOS (REQUERIDOS)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Suba las imágenes requeridas. Se requiere mínimo 1 imagen de cada tipo para poder guardar o ver la vista previa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentUploader
                    title="Foto de DNI"
                    description="Anverso y reverso (máx. 2 imágenes)"
                    maxImages={2}
                    images={formData.dni_fotos || []}
                    onImagesChange={(imgs) => handleChange('dni_fotos', imgs)}
                    localId={local?.id || ''}
                    folder="dni"
                    disabled={loading}
                    required={true}
                  />
                  <DocumentUploader
                    title="Comprobante de Depósito"
                    description="Foto/imagen del voucher (máx. 2 imágenes)"
                    maxImages={2}
                    images={formData.comprobante_deposito_fotos || []}
                    onImagesChange={(imgs) => handleChange('comprobante_deposito_fotos', imgs)}
                    localId={local?.id || ''}
                    folder="comprobante"
                    disabled={loading}
                    required={true}
                  />
                </div>
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
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-lg flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cancelar
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Vista Previa
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

      {/* AlertModal para mostrar resultados de operaciones */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onOk={() => {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
          // Si fue éxito, cerrar también el modal principal
          if (alertModal.variant === 'success') {
            onClose();
          }
        }}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
}
