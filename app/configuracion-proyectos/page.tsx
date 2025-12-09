'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  getProyectosWithConfigurations,
  saveProyectoConfiguracion,
  getUsuariosActivosPorRol,
  Proyecto,
  ProyectoWithConfig,
  PorcentajeInicial,
  CuotaMeses,
  ComisionRol,
  Usuario,
  RepresentanteLegal,
  CuentaBancaria
} from '@/lib/actions-proyecto-config';
import { Save, ChevronDown, ChevronUp, ChevronUp as ArrowUp, ChevronDown as ArrowDown, X, Plus, Users, Search, FileText, Building2, Banknote, UserCheck, Image as ImageIcon } from 'lucide-react';
import LogoUploader from '@/components/shared/LogoUploader';
import ContratoTemplateUploader from '@/components/shared/ContratoTemplateUploader';
import { uploadProyectoLogo, deleteProyectoLogo, uploadContratoTemplate, deleteContratoTemplate } from '@/lib/proyecto-config';

interface ProyectoFormData {
  tea: string;
  color: string;
  activo: boolean;
  porcentajes_inicial: PorcentajeInicial[];
  nuevoPorcentaje: string;
  cuotas_sin_interes: CuotaMeses[];
  nuevaCuotaSinInteres: string;
  cuotas_con_interes: CuotaMeses[];
  nuevaCuotaConInteres: string;
  // SESIÓN 54: Comisiones por rol
  comisiones: ComisionRol[];
  nuevaComision_rol: string;
  nuevaComision_usuarios: Set<string>;
  nuevaComision_porcentaje: string;
  nuevaComision_searchTerm: string;
  // SESIÓN 64: Datos para trámites legales
  razon_social: string;
  ruc: string;
  domicilio_fiscal: string;
  ubicacion_terreno: string;
  partida_electronica: string;
  zona_registral: string;
  plazo_firma_dias: string;
  penalidad_porcentaje: string;
  representantes_legales: RepresentanteLegal[];
  nuevoRepresentante_nombre: string;
  nuevoRepresentante_dni: string;
  nuevoRepresentante_cargo: string;
  cuentas_bancarias: CuentaBancaria[];
  nuevaCuenta_banco: string;
  nuevaCuenta_numero: string;
  nuevaCuenta_tipo: 'Corriente' | 'Ahorros' | '';
  nuevaCuenta_moneda: 'USD' | 'PEN' | '';
  // SESIÓN 66: Logo del proyecto
  logo_url: string | null;
  // SESIÓN 66: Template de contrato Word
  contrato_template_url: string | null;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
}

export default function ConfiguracionProyectos() {
  const router = useRouter();
  const { user, loading: authLoading, selectedProyecto } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProyectos, setExpandedProyectos] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, ProyectoFormData>>({});
  // SESIÓN 54: Estado de usuarios para comisiones
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // SESIÓN 54: Cargar usuarios activos
      const usuariosResult = await getUsuariosActivosPorRol();
      if (usuariosResult.success && usuariosResult.data) {
        setTodosUsuarios(usuariosResult.data);
      }

      const result = await getProyectosWithConfigurations();

      if (!result.success || !result.data) {
        console.error('Error loading proyectos:', result.message);
        setLoading(false);
        return;
      }

      // SESIÓN 55: Filtrar solo el proyecto seleccionado en login
      const filteredData = selectedProyecto
        ? result.data.filter(p => p.proyecto.id === selectedProyecto.id)
        : result.data;

      const proyectosData = filteredData.map(p => p.proyecto);
      setProyectos(proyectosData);

      if (proyectosData.length > 0) {
        setExpandedProyectos(new Set([proyectosData[0].id]));
      }

      const initialFormData: Record<string, ProyectoFormData> = {};
      for (const { proyecto, configuracion } of filteredData) {
        initialFormData[proyecto.id] = {
          tea: configuracion?.tea?.toString() || '',
          color: proyecto.color || '#1b967a',
          activo: proyecto.activo,
          porcentajes_inicial: configuracion?.configuraciones_extra?.porcentajes_inicial || [],
          nuevoPorcentaje: '',
          cuotas_sin_interes: configuracion?.configuraciones_extra?.cuotas_sin_interes || [],
          nuevaCuotaSinInteres: '',
          cuotas_con_interes: configuracion?.configuraciones_extra?.cuotas_con_interes || [],
          nuevaCuotaConInteres: '',
          // SESIÓN 54: Inicializar comisiones
          comisiones: configuracion?.configuraciones_extra?.comisiones || [],
          nuevaComision_rol: '',
          nuevaComision_usuarios: new Set<string>(),
          nuevaComision_porcentaje: '',
          nuevaComision_searchTerm: '',
          // SESIÓN 64: Inicializar datos legales
          razon_social: proyecto.razon_social || '',
          ruc: proyecto.ruc || '',
          domicilio_fiscal: proyecto.domicilio_fiscal || '',
          ubicacion_terreno: proyecto.ubicacion_terreno || '',
          partida_electronica: proyecto.partida_electronica || '',
          zona_registral: proyecto.zona_registral || '',
          plazo_firma_dias: proyecto.plazo_firma_dias?.toString() || '5',
          penalidad_porcentaje: proyecto.penalidad_porcentaje?.toString() || '100',
          representantes_legales: proyecto.representantes_legales || [],
          nuevoRepresentante_nombre: '',
          nuevoRepresentante_dni: '',
          nuevoRepresentante_cargo: '',
          cuentas_bancarias: proyecto.cuentas_bancarias || [],
          nuevaCuenta_banco: '',
          nuevaCuenta_numero: '',
          nuevaCuenta_tipo: '',
          nuevaCuenta_moneda: 'USD',
          // SESIÓN 66: Logo del proyecto
          logo_url: proyecto.logo_url || null,
          // SESIÓN 66: Template de contrato Word
          contrato_template_url: proyecto.contrato_template_url || null,
          saving: false,
          message: null,
        };
      }
      setFormData(initialFormData);

      setLoading(false);
    }

    if (user && selectedProyecto) {
      loadData();
    }
  }, [user, selectedProyecto]);

  const toggleProyecto = (proyectoId: string) => {
    setExpandedProyectos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(proyectoId)) {
        newSet.delete(proyectoId);
      } else {
        newSet.add(proyectoId);
      }
      return newSet;
    });
  };

  const updateFormData = (proyectoId: string, field: keyof ProyectoFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [proyectoId]: {
        ...prev[proyectoId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const teaValue = data.tea.trim() === '' ? null : parseFloat(data.tea);

    if (teaValue !== null && (isNaN(teaValue) || teaValue <= 0 || teaValue > 100)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'TEA debe ser un número mayor a 0 y menor o igual a 100',
      });
      return;
    }

    if (!data.color || !/^#[0-9A-F]{6}$/i.test(data.color)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Color debe ser un código hexadecimal válido (ej: #1b967a)',
      });
      return;
    }

    updateFormData(proyectoId, 'saving', true);
    updateFormData(proyectoId, 'message', null);

    const result = await saveProyectoConfiguracion(proyectoId, {
      tea: teaValue,
      color: data.color,
      activo: data.activo,
      porcentajes_inicial: data.porcentajes_inicial,
      cuotas_sin_interes: data.cuotas_sin_interes,
      cuotas_con_interes: data.cuotas_con_interes,
      comisiones: data.comisiones, // SESIÓN 54
      // SESIÓN 64: Datos para trámites legales
      razon_social: data.razon_social || undefined,
      ruc: data.ruc || undefined,
      domicilio_fiscal: data.domicilio_fiscal || undefined,
      ubicacion_terreno: data.ubicacion_terreno || undefined,
      partida_electronica: data.partida_electronica || undefined,
      zona_registral: data.zona_registral || undefined,
      plazo_firma_dias: data.plazo_firma_dias ? parseInt(data.plazo_firma_dias) : undefined,
      penalidad_porcentaje: data.penalidad_porcentaje ? parseInt(data.penalidad_porcentaje) : undefined,
      representantes_legales: data.representantes_legales,
      cuentas_bancarias: data.cuentas_bancarias,
    });

    updateFormData(proyectoId, 'saving', false);

    if (result.success) {
      updateFormData(proyectoId, 'message', { type: 'success', text: result.message });
      setTimeout(() => {
        updateFormData(proyectoId, 'message', null);
      }, 3000);
    } else {
      updateFormData(proyectoId, 'message', { type: 'error', text: result.message });
    }
  };

  const handleAgregarPorcentaje = (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    // VALIDACIÓN: Máximo 1 porcentaje de inicial permitido
    if (data.porcentajes_inicial.length >= 1) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Solo se permite un porcentaje de inicial por proyecto',
      });
      return;
    }

    const value = parseFloat(data.nuevoPorcentaje);

    if (isNaN(value) || value <= 0 || value > 100) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Porcentaje debe ser un número mayor a 0 y menor o igual a 100',
      });
      return;
    }

    if (data.porcentajes_inicial.some(p => p.value === value)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Este porcentaje ya existe',
      });
      return;
    }

    const newPorcentaje: PorcentajeInicial = {
      value,
      order: data.porcentajes_inicial.length
    };

    updateFormData(proyectoId, 'porcentajes_inicial', [...data.porcentajes_inicial, newPorcentaje]);
    updateFormData(proyectoId, 'nuevoPorcentaje', '');
    updateFormData(proyectoId, 'message', null);
  };

  const handleEliminarPorcentaje = (proyectoId: string, index: number) => {
    const data = formData[proyectoId];
    if (!data) return;

    const updated = data.porcentajes_inicial.filter((_, i) => i !== index);
    const reordered = updated.map((p, i) => ({ ...p, order: i }));

    updateFormData(proyectoId, 'porcentajes_inicial', reordered);
  };

  const handleMoverPorcentaje = (proyectoId: string, index: number, direction: 'up' | 'down') => {
    const data = formData[proyectoId];
    if (!data) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= data.porcentajes_inicial.length) return;

    const updated = [...data.porcentajes_inicial];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const reordered = updated.map((p, i) => ({ ...p, order: i }));

    updateFormData(proyectoId, 'porcentajes_inicial', reordered);
  };

  // Handlers para Cuotas Sin Interés
  const handleAgregarCuotaSinInteres = (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const value = parseInt(data.nuevaCuotaSinInteres);

    if (isNaN(value) || value <= 0) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Cuota debe ser un número entero mayor a 0',
      });
      return;
    }

    if (data.cuotas_sin_interes.some(c => c.value === value)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Esta cuota ya existe',
      });
      return;
    }

    const newCuota: CuotaMeses = {
      value,
      order: data.cuotas_sin_interes.length
    };

    updateFormData(proyectoId, 'cuotas_sin_interes', [...data.cuotas_sin_interes, newCuota]);
    updateFormData(proyectoId, 'nuevaCuotaSinInteres', '');
    updateFormData(proyectoId, 'message', null);
  };

  const handleEliminarCuotaSinInteres = (proyectoId: string, index: number) => {
    const data = formData[proyectoId];
    if (!data) return;

    const updated = data.cuotas_sin_interes.filter((_, i) => i !== index);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'cuotas_sin_interes', reordered);
  };

  const handleMoverCuotaSinInteres = (proyectoId: string, index: number, direction: 'up' | 'down') => {
    const data = formData[proyectoId];
    if (!data) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= data.cuotas_sin_interes.length) return;

    const updated = [...data.cuotas_sin_interes];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'cuotas_sin_interes', reordered);
  };

  // Handlers para Cuotas Con Interés
  const handleAgregarCuotaConInteres = (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const value = parseInt(data.nuevaCuotaConInteres);

    if (isNaN(value) || value <= 0) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Cuota debe ser un número entero mayor a 0',
      });
      return;
    }

    if (data.cuotas_con_interes.some(c => c.value === value)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Esta cuota ya existe',
      });
      return;
    }

    const newCuota: CuotaMeses = {
      value,
      order: data.cuotas_con_interes.length
    };

    updateFormData(proyectoId, 'cuotas_con_interes', [...data.cuotas_con_interes, newCuota]);
    updateFormData(proyectoId, 'nuevaCuotaConInteres', '');
    updateFormData(proyectoId, 'message', null);
  };

  const handleEliminarCuotaConInteres = (proyectoId: string, index: number) => {
    const data = formData[proyectoId];
    if (!data) return;

    const updated = data.cuotas_con_interes.filter((_, i) => i !== index);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'cuotas_con_interes', reordered);
  };

  const handleMoverCuotaConInteres = (proyectoId: string, index: number, direction: 'up' | 'down') => {
    const data = formData[proyectoId];
    if (!data) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= data.cuotas_con_interes.length) return;

    const updated = [...data.cuotas_con_interes];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'cuotas_con_interes', reordered);
  };

  // ==========================================================================
  // SESIÓN 54: Handlers para Comisiones por Rol
  // ==========================================================================

  // Helper: Obtener usuarios ya asignados en comisiones
  const getUsuariosYaAsignados = (proyectoId: string): string[] => {
    const data = formData[proyectoId];
    if (!data) return [];

    return data.comisiones.flatMap(c => c.usuarios_ids);
  };

  // Helper: Filtrar usuarios disponibles según rol seleccionado
  const getUsuariosDisponiblesParaRol = (proyectoId: string, rol: string): Usuario[] => {
    if (!rol) return [];

    const usuariosYaAsignados = getUsuariosYaAsignados(proyectoId);

    return todosUsuarios
      .filter(u => u.rol === rol) // Filtrar por rol
      .filter(u => !usuariosYaAsignados.includes(u.id)); // Excluir ya asignados
  };

  // Handler: Seleccionar rol (carga usuarios disponibles)
  const handleSeleccionarRol = (proyectoId: string, rol: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    // Obtener usuarios disponibles y pre-cargar todos sus IDs (checkboxes marcados por defecto)
    const usuariosDisponibles = getUsuariosDisponiblesParaRol(proyectoId, rol);
    const todosLosIds = new Set(usuariosDisponibles.map(u => u.id));

    // Reset campos relacionados
    updateFormData(proyectoId, 'nuevaComision_rol', rol);
    updateFormData(proyectoId, 'nuevaComision_usuarios', todosLosIds); // Pre-cargado con todos los IDs
    updateFormData(proyectoId, 'nuevaComision_porcentaje', '');
    updateFormData(proyectoId, 'nuevaComision_searchTerm', '');
    updateFormData(proyectoId, 'message', null);

    // Si no hay usuarios disponibles, mostrar mensaje
    if (usuariosDisponibles.length === 0) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: `Todos los usuarios del rol "${rol}" ya tienen comisión asignada`,
      });
    }
  };

  // Handler: Toggle checkbox de usuario
  const handleToggleUsuario = (proyectoId: string, usuarioId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const newSet = new Set(data.nuevaComision_usuarios);

    if (newSet.has(usuarioId)) {
      newSet.delete(usuarioId);
    } else {
      newSet.add(usuarioId);
    }

    updateFormData(proyectoId, 'nuevaComision_usuarios', newSet);
  };

  // Handler: Agregar comisión
  const handleAgregarComision = (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    // Validación: Rol seleccionado
    if (!data.nuevaComision_rol) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Debe seleccionar un rol',
      });
      return;
    }

    // Validación: Al menos un usuario seleccionado
    if (data.nuevaComision_usuarios.size === 0) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Debe seleccionar al menos un usuario',
      });
      return;
    }

    // Validación: Porcentaje válido
    const porcentaje = parseFloat(data.nuevaComision_porcentaje);
    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Porcentaje debe ser un número mayor a 0 y menor o igual a 100',
      });
      return;
    }

    // Crear nueva comisión
    const nuevaComision: ComisionRol = {
      rol: data.nuevaComision_rol as 'admin' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta',
      usuarios_ids: Array.from(data.nuevaComision_usuarios),
      porcentaje,
      order: data.comisiones.length
    };

    // Agregar al array
    updateFormData(proyectoId, 'comisiones', [...data.comisiones, nuevaComision]);

    // Reset campos
    updateFormData(proyectoId, 'nuevaComision_rol', '');
    updateFormData(proyectoId, 'nuevaComision_usuarios', new Set<string>());
    updateFormData(proyectoId, 'nuevaComision_porcentaje', '');
    updateFormData(proyectoId, 'nuevaComision_searchTerm', '');
    updateFormData(proyectoId, 'message', null);
  };

  // Handler: Eliminar comisión
  const handleEliminarComision = (proyectoId: string, index: number) => {
    const data = formData[proyectoId];
    if (!data) return;

    const updated = data.comisiones.filter((_, i) => i !== index);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'comisiones', reordered);
  };

  // Handler: Mover comisión (reordenar)
  const handleMoverComision = (proyectoId: string, index: number, direction: 'up' | 'down') => {
    const data = formData[proyectoId];
    if (!data) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= data.comisiones.length) return;

    const updated = [...data.comisiones];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const reordered = updated.map((c, i) => ({ ...c, order: i }));

    updateFormData(proyectoId, 'comisiones', reordered);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Configuración de Proyectos"
        subtitle={`Gestiona la configuración del proyecto${selectedProyecto ? ` - ${selectedProyecto.nombre}` : ''}`}
      />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Configuración de Proyectos
          </h2>

          <div className="space-y-4">
            {proyectos.map((proyecto, index) => {
              const isExpanded = expandedProyectos.has(proyecto.id);
              const data = formData[proyecto.id];
              const isEven = index % 2 === 0;

              return (
                <div
                  key={proyecto.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleProyecto(proyecto.id)}
                    className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${
                      isEven
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: data?.color || proyecto.color || '#1b967a' }}
                      />
                      <span className="text-lg font-semibold text-gray-900">
                        {proyecto.nombre}
                      </span>
                      {!proyecto.activo && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {isExpanded && data && (
                    <div className="px-6 py-6">
                      {/* Grid 3 columnas en desktop, apilado en mobile - SESIÓN 53: Agregada columna Mantenimiento de comisiones */}
                      <div className="grid lg:grid-cols-3 gap-8 mb-6">

                        {/* Columna Izquierda: TEA + Color + Estado */}
                        <div className="space-y-6">
                          {/* TEA del proyecto */}
                          <div>
                            <label
                              htmlFor={`tea-${proyecto.id}`}
                              className="block text-lg font-semibold text-gray-900 mb-1"
                            >
                              TEA del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Este dato se usará para financiamiento del proyecto
                            </p>
                            <input
                              type="number"
                              id={`tea-${proyecto.id}`}
                              value={data.tea}
                              onChange={(e) => updateFormData(proyecto.id, 'tea', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Ej: 18.5"
                              min="0.01"
                              max="100"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          <div className="border-t border-gray-200"></div>

                          {/* Color del proyecto */}
                          <div>
                            <label
                              htmlFor={`color-${proyecto.id}`}
                              className="block text-lg font-semibold text-gray-900 mb-1"
                            >
                              Color del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Color para identificación visual en el dashboard
                            </p>
                            <div className="flex gap-3 items-center">
                              <input
                                type="color"
                                id={`color-${proyecto.id}`}
                                value={data.color}
                                onChange={(e) => updateFormData(proyecto.id, 'color', e.target.value)}
                                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={data.color}
                                onChange={(e) => updateFormData(proyecto.id, 'color', e.target.value)}
                                placeholder="#1b967a"
                                maxLength={7}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors font-mono"
                              />
                              <div
                                className="h-12 w-24 rounded-lg border border-gray-300 flex items-center justify-center text-white font-medium text-sm"
                                style={{ backgroundColor: data.color }}
                              >
                                Preview
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-gray-200"></div>

                          {/* Estado Activo/Inactivo */}
                          <div>
                            <label className="block text-lg font-semibold text-gray-900 mb-1">
                              Estado del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Proyecto activo en el sistema
                            </p>
                            <button
                              type="button"
                              onClick={() => updateFormData(proyecto.id, 'activo', !data.activo)}
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                data.activo ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  data.activo ? 'translate-x-9' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {data.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>

                        {/* Columna Derecha: Porcentaje de Inicial */}
                        <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-1">
                          Porcentaje de Inicial
                        </label>
                        <p className="text-sm text-gray-500 mb-4">
                          Define el porcentaje de inicial para este proyecto (máximo 1 valor)
                        </p>

                        {/* Input para agregar porcentaje */}
                        <div className="flex gap-2 mb-4">
                          <input
                            type="number"
                            value={data.nuevoPorcentaje}
                            onChange={(e) => updateFormData(proyecto.id, 'nuevoPorcentaje', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && data.porcentajes_inicial.length < 1) {
                                handleAgregarPorcentaje(proyecto.id);
                              }
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="Ej: 30"
                            min="0.01"
                            max="100"
                            step="0.01"
                            disabled={data.porcentajes_inicial.length >= 1}
                            className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors ${
                              data.porcentajes_inicial.length >= 1 ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAgregarPorcentaje(proyecto.id)}
                            disabled={data.porcentajes_inicial.length >= 1}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                              data.porcentajes_inicial.length >= 1
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-primary/90'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            Agregar
                          </button>
                        </div>

                        {/* Lista de porcentajes */}
                        {data.porcentajes_inicial.length > 0 && (
                          <div className="space-y-2">
                            {data.porcentajes_inicial.map((porcentaje, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <span className="flex-1 text-base font-semibold text-gray-900">
                                  {porcentaje.value}%
                                </span>
                                <div className="flex items-center gap-1">
                                  {/* Solo botón eliminar (sin ordenar porque máximo 1 valor) */}
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarPorcentaje(proyecto.id, index)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {data.porcentajes_inicial.length === 0 && (
                          <p className="text-sm text-gray-400 italic">
                            No hay porcentaje configurado. Agrega uno para comenzar.
                          </p>
                        )}

                        <div className="border-t border-gray-200 my-6"></div>

                        {/* Cuotas sin intereses */}
                        <div className="mt-6">
                          <label className="block text-lg font-semibold text-gray-900 mb-1">
                            Cuotas sin intereses (Meses)
                          </label>
                          <p className="text-sm text-gray-500 mb-4">
                            Gestiona las cuotas sin intereses disponibles para este proyecto
                          </p>

                          {/* Input para agregar cuota */}
                          <div className="flex gap-2 mb-4">
                            <input
                              type="number"
                              value={data.nuevaCuotaSinInteres}
                              onChange={(e) => updateFormData(proyecto.id, 'nuevaCuotaSinInteres', e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAgregarCuotaSinInteres(proyecto.id);
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Ej: 12"
                              min="1"
                              step="1"
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => handleAgregarCuotaSinInteres(proyecto.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Agregar
                            </button>
                          </div>

                          {/* Lista de cuotas */}
                          {data.cuotas_sin_interes.length > 0 && (
                            <div className="space-y-2">
                              {data.cuotas_sin_interes.map((cuota, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                  <span className="text-sm font-medium text-gray-600 min-w-[30px]">
                                    {index + 1}°
                                  </span>
                                  <span className="flex-1 text-base font-semibold text-gray-900">
                                    {cuota.value} meses
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMoverCuotaSinInteres(proyecto.id, index, 'up')}
                                      disabled={index === 0}
                                      className={`p-1 rounded ${
                                        index === 0
                                          ? 'text-gray-300 cursor-not-allowed'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoverCuotaSinInteres(proyecto.id, index, 'down')}
                                      disabled={index === data.cuotas_sin_interes.length - 1}
                                      className={`p-1 rounded ${
                                        index === data.cuotas_sin_interes.length - 1
                                          ? 'text-gray-300 cursor-not-allowed'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarCuotaSinInteres(proyecto.id, index)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {data.cuotas_sin_interes.length === 0 && (
                            <p className="text-sm text-gray-400 italic">
                              No hay cuotas configuradas. Agrega una para comenzar.
                            </p>
                          )}
                        </div>

                        <div className="border-t border-gray-200 my-6"></div>

                        {/* Cuotas con intereses */}
                        <div className="mt-6">
                          <label className="block text-lg font-semibold text-gray-900 mb-1">
                            Cuotas con intereses (Meses)
                          </label>
                          <p className="text-sm text-gray-500 mb-4">
                            Gestiona las cuotas con intereses disponibles para este proyecto
                          </p>

                          {/* Input para agregar cuota */}
                          <div className="flex gap-2 mb-4">
                            <input
                              type="number"
                              value={data.nuevaCuotaConInteres}
                              onChange={(e) => updateFormData(proyecto.id, 'nuevaCuotaConInteres', e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAgregarCuotaConInteres(proyecto.id);
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="Ej: 36"
                              min="1"
                              step="1"
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => handleAgregarCuotaConInteres(proyecto.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Agregar
                            </button>
                          </div>

                          {/* Lista de cuotas */}
                          {data.cuotas_con_interes.length > 0 && (
                            <div className="space-y-2">
                              {data.cuotas_con_interes.map((cuota, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                  <span className="text-sm font-medium text-gray-600 min-w-[30px]">
                                    {index + 1}°
                                  </span>
                                  <span className="flex-1 text-base font-semibold text-gray-900">
                                    {cuota.value} meses
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMoverCuotaConInteres(proyecto.id, index, 'up')}
                                      disabled={index === 0}
                                      className={`p-1 rounded ${
                                        index === 0
                                          ? 'text-gray-300 cursor-not-allowed'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoverCuotaConInteres(proyecto.id, index, 'down')}
                                      disabled={index === data.cuotas_con_interes.length - 1}
                                      className={`p-1 rounded ${
                                        index === data.cuotas_con_interes.length - 1
                                          ? 'text-gray-300 cursor-not-allowed'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarCuotaConInteres(proyecto.id, index)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {data.cuotas_con_interes.length === 0 && (
                            <p className="text-sm text-gray-400 italic">
                              No hay cuotas configuradas. Agrega una para comenzar.
                            </p>
                          )}
                        </div>
                        </div>

                        {/* Columna 3: Mantenimiento de comisiones - SESIÓN 54 */}
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-900 mb-1">
                              Mantenimiento de comisiones
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Asigna porcentajes de comisión por rol de usuario
                            </p>

                            {/* Dropdown de roles */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Seleccionar rol
                              </label>
                              <div className="relative">
                                <select
                                  value={data.nuevaComision_rol}
                                  onChange={(e) => handleSeleccionarRol(proyecto.id, e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors appearance-none bg-white"
                                >
                                  <option value="">Seleccionar rol...</option>
                                  <option value="admin">Admin</option>
                                  <option value="jefe_ventas">Jefe de Ventas</option>
                                  <option value="vendedor">Vendedor</option>
                                  <option value="vendedor_caseta">Vendedor Caseta</option>
                                  <option value="coordinador">Coordinador</option>
                                  <option value="finanzas">Finanzas</option>
                                </select>
                                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Box de usuarios (aparece cuando se selecciona un rol) */}
                            {data.nuevaComision_rol && (() => {
                              const usuariosDisponibles = getUsuariosDisponiblesParaRol(proyecto.id, data.nuevaComision_rol);
                              const usuariosFiltrados = data.nuevaComision_searchTerm
                                ? usuariosDisponibles.filter(u =>
                                    u.nombre.toLowerCase().includes(data.nuevaComision_searchTerm.toLowerCase())
                                  )
                                : usuariosDisponibles;

                              return (
                                <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                                  {/* Header con rol */}
                                  <div className="pb-3 mb-3 border-b border-gray-300">
                                    <p className="text-sm font-semibold text-gray-900">
                                      Rol: {data.nuevaComision_rol === 'admin' ? 'Admin' :
                                             data.nuevaComision_rol === 'jefe_ventas' ? 'Jefe de Ventas' :
                                             data.nuevaComision_rol === 'vendedor' ? 'Vendedor' : 'Vendedor Caseta'}
                                    </p>
                                  </div>

                                  {usuariosDisponibles.length === 0 ? (
                                    <p className="text-sm text-amber-600 italic mb-3">
                                      Todos los usuarios de este rol ya tienen comisión asignada
                                    </p>
                                  ) : (
                                    <>
                                      {/* Buscador */}
                                      {usuariosDisponibles.length > 5 && (
                                        <div className="relative mb-3">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <input
                                            type="text"
                                            value={data.nuevaComision_searchTerm}
                                            onChange={(e) => updateFormData(proyecto.id, 'nuevaComision_searchTerm', e.target.value)}
                                            placeholder="Buscar usuario..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                                          />
                                        </div>
                                      )}

                                      {/* Lista de checkboxes */}
                                      <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                                        {usuariosFiltrados.map((usuario) => (
                                          <label
                                            key={usuario.id}
                                            className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={data.nuevaComision_usuarios.has(usuario.id)}
                                              onChange={() => handleToggleUsuario(proyecto.id, usuario.id)}
                                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-gray-900">
                                              {usuario.nombre}
                                            </span>
                                          </label>
                                        ))}
                                      </div>

                                      {usuariosFiltrados.length === 0 && (
                                        <p className="text-sm text-gray-400 italic mb-3">
                                          No se encontraron usuarios
                                        </p>
                                      )}

                                      {/* Input porcentaje + botón Agregar */}
                                      <div className="pt-3 border-t border-gray-300">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Definir porcentaje
                                        </label>
                                        <div className="flex gap-2">
                                          <input
                                            type="number"
                                            value={data.nuevaComision_porcentaje}
                                            onChange={(e) => updateFormData(proyecto.id, 'nuevaComision_porcentaje', e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            placeholder="10.5"
                                            min="0.01"
                                            max="100"
                                            step="0.01"
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                                          />
                                          <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                                            %
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleAgregarComision(proyecto.id)}
                                            disabled={data.nuevaComision_usuarios.size === 0 || !data.nuevaComision_porcentaje}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                              data.nuevaComision_usuarios.size === 0 || !data.nuevaComision_porcentaje
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-primary text-white hover:bg-primary/90'
                                            }`}
                                          >
                                            <Plus className="w-4 h-4" />
                                            Agregar
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Lista de comisiones configuradas */}
                            {data.comisiones.length > 0 && (
                              <div className="mt-6">
                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                  Comisiones configuradas
                                </label>
                                <div className="space-y-2">
                                  {data.comisiones.map((comision, index) => {
                                    // Obtener nombres de usuarios
                                    const nombresUsuarios = comision.usuarios_ids
                                      .map(id => todosUsuarios.find(u => u.id === id)?.nombre)
                                      .filter(Boolean);

                                    return (
                                      <div
                                        key={index}
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                      >
                                        {/* Header con rol, cantidad, porcentaje */}
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-600 min-w-[30px]">
                                              {index + 1}°
                                            </span>
                                            <div>
                                              <p className="text-base font-semibold text-gray-900">
                                                {comision.rol === 'admin' ? 'Admin' :
                                                 comision.rol === 'jefe_ventas' ? 'Jefe de Ventas' :
                                                 comision.rol === 'vendedor' ? 'Vendedor' :
                                                 comision.rol === 'vendedor_caseta' ? 'Vendedor Caseta' :
                                                 comision.rol === 'coordinador' ? 'Coordinador' : 'Finanzas'}
                                                {' - '}
                                                <span className="text-primary">
                                                  {comision.usuarios_ids.length} usuario{comision.usuarios_ids.length !== 1 ? 's' : ''}
                                                </span>
                                                {' - '}
                                                <span className="text-green-600">{comision.porcentaje}%</span>
                                              </p>
                                            </div>
                                          </div>

                                          {/* Botones de acción */}
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleMoverComision(proyecto.id, index, 'up')}
                                              disabled={index === 0}
                                              className={`p-1 rounded ${
                                                index === 0
                                                  ? 'text-gray-300 cursor-not-allowed'
                                                  : 'text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                              <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleMoverComision(proyecto.id, index, 'down')}
                                              disabled={index === data.comisiones.length - 1}
                                              className={`p-1 rounded ${
                                                index === data.comisiones.length - 1
                                                  ? 'text-gray-300 cursor-not-allowed'
                                                  : 'text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                              <ArrowDown className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleEliminarComision(proyecto.id, index)}
                                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Lista de usuarios */}
                                        <ul className="ml-12 space-y-1">
                                          {nombresUsuarios.map((nombre, i) => (
                                            <li key={i} className="text-sm text-gray-600">
                                              • {nombre}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {data.comisiones.length === 0 && !data.nuevaComision_rol && (
                              <p className="text-sm text-gray-400 italic mt-4">
                                No hay comisiones configuradas. Selecciona un rol para comenzar.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ================================================================== */}
                      {/* SESIÓN 64: Sección Datos para Trámites Legales */}
                      {/* ================================================================== */}
                      <div className="border-t border-gray-200 mt-8 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                          <FileText className="w-6 h-6 text-primary" />
                          <h3 className="text-xl font-bold text-gray-900">Datos para Trámites Legales</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                          Información legal de la empresa para generación automática de documentos (Acuerdo de Separación, contratos, etc.)
                        </p>

                        {/* SESIÓN 66: Logo del proyecto */}
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            <h4 className="text-lg font-semibold text-gray-900">Logo Oficial del Proyecto</h4>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Este logo aparecerá en documentos oficiales como la Ficha de Inscripción
                          </p>
                          <div className="max-w-md">
                            <LogoUploader
                              currentLogoUrl={data.logo_url}
                              onSave={async (croppedImageBlob) => {
                                const result = await uploadProyectoLogo(proyecto.id, croppedImageBlob);
                                if (result.success && result.url) {
                                  updateFormData(proyecto.id, 'logo_url', result.url);
                                } else {
                                  throw new Error(result.error || 'Error al subir logo');
                                }
                              }}
                              onDelete={data.logo_url ? async () => {
                                const result = await deleteProyectoLogo(proyecto.id, data.logo_url!);
                                if (result.success) {
                                  updateFormData(proyecto.id, 'logo_url', null);
                                } else {
                                  throw new Error(result.error || 'Error al eliminar logo');
                                }
                              } : undefined}
                              aspectRatio={1}
                              disabled={data.saving}
                            />
                          </div>
                        </div>

                        {/* SESIÓN 66: Template de Contrato Word */}
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h4 className="text-lg font-semibold text-gray-900">Template de Contrato</h4>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Sube un archivo Word (.docx) con las variables para generar contratos automáticamente
                          </p>
                          <div className="max-w-md">
                            <ContratoTemplateUploader
                              currentTemplateUrl={data.contrato_template_url}
                              onUpload={async (file) => {
                                const result = await uploadContratoTemplate(proyecto.id, file);
                                if (result.success && result.url) {
                                  updateFormData(proyecto.id, 'contrato_template_url', result.url);
                                } else {
                                  throw new Error(result.error || 'Error al subir template');
                                }
                              }}
                              onDelete={data.contrato_template_url ? async () => {
                                const result = await deleteContratoTemplate(proyecto.id, data.contrato_template_url!);
                                if (result.success) {
                                  updateFormData(proyecto.id, 'contrato_template_url', null);
                                } else {
                                  throw new Error(result.error || 'Error al eliminar template');
                                }
                              } : undefined}
                              disabled={data.saving}
                            />
                          </div>
                        </div>

                        {/* Grid responsive: 3 columnas en desktop, 2 en tablet, 1 en mobile */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          {/* Razón Social */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Razón Social
                            </label>
                            <input
                              type="text"
                              value={data.razon_social}
                              onChange={(e) => updateFormData(proyecto.id, 'razon_social', e.target.value)}
                              placeholder="Ej: ECO PLAZA S.A.C."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          {/* RUC */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              RUC
                            </label>
                            <input
                              type="text"
                              value={data.ruc}
                              onChange={(e) => updateFormData(proyecto.id, 'ruc', e.target.value)}
                              placeholder="Ej: 20612345678"
                              maxLength={11}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors font-mono"
                            />
                          </div>

                          {/* Zona Registral */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Zona Registral
                            </label>
                            <input
                              type="text"
                              value={data.zona_registral}
                              onChange={(e) => updateFormData(proyecto.id, 'zona_registral', e.target.value)}
                              placeholder="Ej: Lima"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          {/* Domicilio Fiscal - ocupa 2 columnas en desktop */}
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Domicilio Fiscal
                            </label>
                            <input
                              type="text"
                              value={data.domicilio_fiscal}
                              onChange={(e) => updateFormData(proyecto.id, 'domicilio_fiscal', e.target.value)}
                              placeholder="Ej: Av. Javier Prado 4567, San Isidro, Lima"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          {/* Partida Electrónica */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Partida Electrónica
                            </label>
                            <input
                              type="text"
                              value={data.partida_electronica}
                              onChange={(e) => updateFormData(proyecto.id, 'partida_electronica', e.target.value)}
                              placeholder="Ej: P12345678"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors font-mono"
                            />
                          </div>

                          {/* Ubicación del Terreno - ocupa 3 columnas en desktop */}
                          <div className="lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ubicación del Terreno (Proyecto)
                            </label>
                            <input
                              type="text"
                              value={data.ubicacion_terreno}
                              onChange={(e) => updateFormData(proyecto.id, 'ubicacion_terreno', e.target.value)}
                              placeholder="Ej: Mz. A Lt. 1, Urbanización San Gabriel, Carabayllo, Lima"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          {/* Plazo Firma (días) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Plazo para Firma (días)
                            </label>
                            <input
                              type="number"
                              value={data.plazo_firma_dias}
                              onChange={(e) => updateFormData(proyecto.id, 'plazo_firma_dias', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="5"
                              min="1"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-400 mt-1">Días para firmar contrato de compraventa</p>
                          </div>

                          {/* Penalidad % */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Penalidad por Desistimiento (%)
                            </label>
                            <input
                              type="number"
                              value={data.penalidad_porcentaje}
                              onChange={(e) => updateFormData(proyecto.id, 'penalidad_porcentaje', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="100"
                              min="0"
                              max="100"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-400 mt-1">% del monto de separación</p>
                          </div>
                        </div>

                        {/* Sección Representantes Legales y Cuentas Bancarias - 2 columnas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Representantes Legales */}
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <UserCheck className="w-5 h-5 text-primary" />
                              <h4 className="text-lg font-semibold text-gray-900">Representantes Legales</h4>
                            </div>

                            {/* Form para agregar representante */}
                            <div className="space-y-3 mb-4">
                              <input
                                type="text"
                                value={data.nuevoRepresentante_nombre}
                                onChange={(e) => updateFormData(proyecto.id, 'nuevoRepresentante_nombre', e.target.value)}
                                placeholder="Nombre completo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={data.nuevoRepresentante_dni}
                                  onChange={(e) => updateFormData(proyecto.id, 'nuevoRepresentante_dni', e.target.value)}
                                  placeholder="DNI"
                                  maxLength={8}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-mono"
                                />
                                <input
                                  type="text"
                                  value={data.nuevoRepresentante_cargo}
                                  onChange={(e) => updateFormData(proyecto.id, 'nuevoRepresentante_cargo', e.target.value)}
                                  placeholder="Cargo (Ej: Gerente General)"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!data.nuevoRepresentante_nombre || !data.nuevoRepresentante_dni || !data.nuevoRepresentante_cargo) {
                                    updateFormData(proyecto.id, 'message', { type: 'error', text: 'Complete todos los campos del representante' });
                                    return;
                                  }
                                  const nuevoRep: RepresentanteLegal = {
                                    nombre: data.nuevoRepresentante_nombre,
                                    dni: data.nuevoRepresentante_dni,
                                    cargo: data.nuevoRepresentante_cargo
                                  };
                                  updateFormData(proyecto.id, 'representantes_legales', [...data.representantes_legales, nuevoRep]);
                                  updateFormData(proyecto.id, 'nuevoRepresentante_nombre', '');
                                  updateFormData(proyecto.id, 'nuevoRepresentante_dni', '');
                                  updateFormData(proyecto.id, 'nuevoRepresentante_cargo', '');
                                  updateFormData(proyecto.id, 'message', null);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar Representante
                              </button>
                            </div>

                            {/* Lista de representantes */}
                            {data.representantes_legales.length > 0 ? (
                              <div className="space-y-2">
                                {data.representantes_legales.map((rep, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                    <div>
                                      <p className="font-medium text-gray-900">{rep.nombre}</p>
                                      <p className="text-sm text-gray-500">DNI: {rep.dni} • {rep.cargo}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = data.representantes_legales.filter((_, i) => i !== index);
                                        updateFormData(proyecto.id, 'representantes_legales', updated);
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic text-center py-4">
                                No hay representantes configurados
                              </p>
                            )}
                          </div>

                          {/* Cuentas Bancarias */}
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <Banknote className="w-5 h-5 text-primary" />
                              <h4 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h4>
                            </div>

                            {/* Form para agregar cuenta */}
                            <div className="space-y-3 mb-4">
                              <input
                                type="text"
                                value={data.nuevaCuenta_banco}
                                onChange={(e) => updateFormData(proyecto.id, 'nuevaCuenta_banco', e.target.value)}
                                placeholder="Nombre del banco"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                              />
                              <input
                                type="text"
                                value={data.nuevaCuenta_numero}
                                onChange={(e) => updateFormData(proyecto.id, 'nuevaCuenta_numero', e.target.value)}
                                placeholder="Número de cuenta"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-mono"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <select
                                  value={data.nuevaCuenta_tipo}
                                  onChange={(e) => updateFormData(proyecto.id, 'nuevaCuenta_tipo', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-white"
                                >
                                  <option value="">Tipo de cuenta</option>
                                  <option value="Corriente">Corriente</option>
                                  <option value="Ahorros">Ahorros</option>
                                </select>
                                <select
                                  value={data.nuevaCuenta_moneda}
                                  onChange={(e) => updateFormData(proyecto.id, 'nuevaCuenta_moneda', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-white"
                                >
                                  <option value="USD">USD (Dólares)</option>
                                  <option value="PEN">PEN (Soles)</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!data.nuevaCuenta_banco || !data.nuevaCuenta_numero || !data.nuevaCuenta_tipo) {
                                    updateFormData(proyecto.id, 'message', { type: 'error', text: 'Complete todos los campos de la cuenta bancaria' });
                                    return;
                                  }
                                  const nuevaCuenta: CuentaBancaria = {
                                    banco: data.nuevaCuenta_banco,
                                    numero: data.nuevaCuenta_numero,
                                    tipo: data.nuevaCuenta_tipo as 'Corriente' | 'Ahorros',
                                    moneda: (data.nuevaCuenta_moneda || 'USD') as 'USD' | 'PEN'
                                  };
                                  updateFormData(proyecto.id, 'cuentas_bancarias', [...data.cuentas_bancarias, nuevaCuenta]);
                                  updateFormData(proyecto.id, 'nuevaCuenta_banco', '');
                                  updateFormData(proyecto.id, 'nuevaCuenta_numero', '');
                                  updateFormData(proyecto.id, 'nuevaCuenta_tipo', '');
                                  updateFormData(proyecto.id, 'nuevaCuenta_moneda', 'USD');
                                  updateFormData(proyecto.id, 'message', null);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar Cuenta
                              </button>
                            </div>

                            {/* Lista de cuentas */}
                            {data.cuentas_bancarias.length > 0 ? (
                              <div className="space-y-2">
                                {data.cuentas_bancarias.map((cuenta, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                    <div>
                                      <p className="font-medium text-gray-900">{cuenta.banco}</p>
                                      <p className="text-sm text-gray-500 font-mono">{cuenta.numero}</p>
                                      <p className="text-xs text-gray-400">{cuenta.tipo} • {cuenta.moneda}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = data.cuentas_bancarias.filter((_, i) => i !== index);
                                        updateFormData(proyecto.id, 'cuentas_bancarias', updated);
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic text-center py-4">
                                No hay cuentas configuradas
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botón Guardar y Mensajes */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleSave(proyecto.id)}
                          disabled={data.saving}
                          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                            data.saving
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-95'
                          }`}
                        >
                          <Save className="w-5 h-5" />
                          {data.saving ? 'Guardando...' : 'Guardar'}
                        </button>

                        {data.message && (
                          <div
                            className={`flex-1 p-3 rounded-lg text-sm ${
                              data.message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {data.message.text}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
