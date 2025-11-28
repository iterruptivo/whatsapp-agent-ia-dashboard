// ============================================================================
// COMPONENT: FinanciamientoModal
// ============================================================================
// Descripción: Modal para registro de venta de locales en estado ROJO
// Features: Captura si hay financiamiento, muestra precio venta y monto separación
// SESIÓN 52: Feature inicial - Solo mostrar modal con título correcto
// SESIÓN 52B: Agregar campos financiamiento/separación (radio buttons + display values)
// SESIÓN 52D: Lead vinculado (nombre + teléfono) + Cuotas condicionales del proyecto
// SESIÓN 52E: Inicial (porcentaje + monto) + Inicial Restante + Monto Restante + TEA
// SESIÓN 52F: Fecha de pago + Calendario de cuotas (Sin financiamiento) con manejo de febrero
// SESIÓN 52G: Calendario CON financiamiento - Sistema Francés (TEA → TEM, amortización)
// SESIÓN 52H: Footer buttons reorganizados + Botón "Imprimir en PDF" (placeholder)
// SESIÓN 52I: Mejora UX - Botón "Procesar" deshabilitado hasta generar calendario
// SESIÓN 57: Campos editables por venta (TEA, % inicial, cuotas personalizadas)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import type { Local } from '@/lib/locales';
import { getLocalLeads } from '@/lib/locales';
import { getProyectoConfiguracion } from '@/lib/proyecto-config';
import type { CuotaMeses } from '@/lib/actions-proyecto-config';
import { generarPDFFinanciamiento } from '@/lib/pdf-generator';
import ConfirmModal from '@/components/shared/ConfirmModal';
import AlertModal from '@/components/shared/AlertModal';
import { useAuth } from '@/lib/auth-context';
import { procesarVentaLocal } from '@/lib/actions-control-pagos';

interface FinanciamientoModalProps {
  isOpen: boolean;
  local: Local | null;
  onClose: () => void;
}

export default function FinanciamientoModal({
  isOpen,
  local,
  onClose,
}: FinanciamientoModalProps) {
  const [conFinanciamiento, setConFinanciamiento] = useState<boolean>(true);
  const [leadNombre, setLeadNombre] = useState<string>('');
  const [leadTelefono, setLeadTelefono] = useState<string>('');
  const [cuotasSinInteres, setCuotasSinInteres] = useState<CuotaMeses[]>([]);
  const [cuotasConInteres, setCuotasConInteres] = useState<CuotaMeses[]>([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<number | null>(null);
  const [porcentajeInicial, setPorcentajeInicial] = useState<number | null>(null);
  const [teaProyecto, setTeaProyecto] = useState<number | null>(null);
  // SESIÓN 57: Estados para valores editables por venta
  const [porcentajeInicialDefault, setPorcentajeInicialDefault] = useState<number | null>(null);
  const [teaProyectoDefault, setTeaProyectoDefault] = useState<number | null>(null);
  const [usarCuotaPersonalizada, setUsarCuotaPersonalizada] = useState<boolean>(false);
  const [cuotaPersonalizada, setCuotaPersonalizada] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>('');
  const [calendarioCuotas, setCalendarioCuotas] = useState<Array<{
    numero: number;
    fecha: string;
    monto?: number; // Sin financiamiento
    interes?: number; // Con financiamiento
    amortizacion?: number; // Con financiamiento
    cuota?: number; // Con financiamiento
    saldo?: number; // Con financiamiento
  }>>([]);
  // SESIÓN 52I: Modal de confirmación para "Procesar"
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  // SESIÓN 54: Estado de loading para procesamiento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  // SESIÓN 54: Modal de alerta para errores/éxito
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  // SESIÓN 54: useAuth para obtener usuario actual
  const { user } = useAuth();

  // Obtener nombre y teléfono del lead vinculado
  useEffect(() => {
    if (!isOpen || !local) return;

    async function fetchLeadData() {
      const localLeads = await getLocalLeads(local!.id);
      if (localLeads.length > 0) {
        setLeadNombre(localLeads[0].lead_nombre || 'N/A');
        setLeadTelefono(localLeads[0].lead_telefono || '');
      } else {
        setLeadNombre('N/A');
        setLeadTelefono('');
      }
    }

    fetchLeadData();
  }, [isOpen, local]);

  // Obtener configuración del proyecto (cuotas y porcentaje inicial)
  useEffect(() => {
    if (!isOpen || !local?.proyecto_id) return;

    async function fetchProyectoConfig() {
      const config = await getProyectoConfiguracion(local!.proyecto_id);
      if (config) {
        // TEA del proyecto - SESIÓN 57: Guardar default y valor editable
        if (config.tea !== null && config.tea !== undefined) {
          setTeaProyecto(config.tea);
          setTeaProyectoDefault(config.tea);
        }

        // Configuraciones extra
        if (config.configuraciones_extra) {
          const cuotasSin = config.configuraciones_extra.cuotas_sin_interes || [];
          const cuotasCon = config.configuraciones_extra.cuotas_con_interes || [];
          const porcentajes = config.configuraciones_extra.porcentajes_inicial || [];

          // Ordenar por campo order
          setCuotasSinInteres(cuotasSin.sort((a: CuotaMeses, b: CuotaMeses) => a.order - b.order));
          setCuotasConInteres(cuotasCon.sort((a: CuotaMeses, b: CuotaMeses) => a.order - b.order));

          // Tomar el primer (y único) porcentaje de inicial - SESIÓN 57: Guardar default
          if (porcentajes.length > 0) {
            setPorcentajeInicial(porcentajes[0].value);
            setPorcentajeInicialDefault(porcentajes[0].value);
          }
        }
      }
    }

    fetchProyectoConfig();
  }, [isOpen, local]);

  if (!isOpen || !local) return null;

  // Helper para formatear montos
  const formatMonto = (monto: number | null | undefined): string => {
    if (monto === null || monto === undefined) return 'N/A';
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Cálculos
  const montoInicial = porcentajeInicial && local.monto_venta
    ? (local.monto_venta * porcentajeInicial) / 100
    : null;

  const inicialRestante = montoInicial && local.monto_separacion
    ? montoInicial - local.monto_separacion
    : null;

  const montoRestante = montoInicial && local.monto_venta
    ? local.monto_venta - montoInicial
    : null;

  // Función helper para calcular fechas de cuotas (reutilizable)
  // FIXED: Construcción manual de fecha sin conversión UTC para evitar timezone shift
  const calcularFechaCuota = (fechaPagoInicial: string, numeroCuota: number): string => {
    console.log(`[DEBUG CALC] Input: fechaPagoInicial="${fechaPagoInicial}", numeroCuota=${numeroCuota}`);

    // Parsear fecha manualmente para evitar problemas de timezone
    const [año, mes, dia] = fechaPagoInicial.split('-').map(Number);
    const diaOriginal = dia;
    console.log(`[DEBUG CALC] Parsed: año=${año}, mes=${mes}, dia=${dia}`);

    // Calcular año y mes destino (mes en JS es 0-indexed)
    const mesInicial = mes - 1; // Convertir a 0-indexed
    const mesDestino = mesInicial + numeroCuota;

    const añoDestino = año + Math.floor(mesDestino / 12);
    const mesDestinoFinal = mesDestino % 12;

    // Obtener último día del mes destino
    const ultimoDiaMes = new Date(añoDestino, mesDestinoFinal + 1, 0).getDate();

    // Usar el menor entre el día original y el último día del mes
    const diaFinal = Math.min(diaOriginal, ultimoDiaMes);
    console.log(`[DEBUG CALC] Destino: año=${añoDestino}, mes=${mesDestinoFinal + 1}, diaFinal=${diaFinal}, ultimoDiaMes=${ultimoDiaMes}`);

    // Construir fecha manualmente SIN conversión UTC para evitar desplazamiento de zona horaria
    const mesStr = String(mesDestinoFinal + 1).padStart(2, '0');
    const diaStr = String(diaFinal).padStart(2, '0');
    const fechaResultado = `${añoDestino}-${mesStr}-${diaStr}`;
    console.log(`[DEBUG CALC] Resultado final: "${fechaResultado}"`);

    return fechaResultado;
  };

  // Función para generar calendario de cuotas
  const generarCalendarioCuotas = () => {
    if (!fechaPago || !cuotaSeleccionada || !montoRestante) return;

    if (conFinanciamiento) {
      // CON FINANCIAMIENTO: Sistema Francés con TEA
      if (teaProyecto === null) {
        alert('No se puede generar el calendario sin TEA del proyecto');
        return;
      }

      // Convertir TEA a TEM (Tasa Efectiva Mensual)
      const teaDecimal = teaProyecto / 100; // Ej: 20% → 0.20
      const tem = Math.pow(1 + teaDecimal, 1/12) - 1; // Fórmula compuesta

      // Calcular cuota mensual usando fórmula francesa
      // Cuota = P × [r(1+r)^n] / [(1+r)^n - 1]
      const P = montoRestante;
      const r = tem;
      const n = cuotaSeleccionada;
      const cuotaMensual = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      const cuotas = [];
      let saldoPendiente = montoRestante;

      for (let i = 0; i < cuotaSeleccionada; i++) {
        // Calcular interés de esta cuota
        const interes = saldoPendiente * tem;

        // Calcular amortización
        const amortizacion = cuotaMensual - interes;

        // Actualizar saldo pendiente
        saldoPendiente -= amortizacion;

        // Calcular fecha
        const fecha = calcularFechaCuota(fechaPago, i);

        cuotas.push({
          numero: i + 1,
          fecha,
          interes,
          amortizacion,
          cuota: cuotaMensual,
          saldo: Math.max(0, saldoPendiente) // Evitar valores negativos por redondeo
        });
      }

      setCalendarioCuotas(cuotas);

    } else {
      // SIN FINANCIAMIENTO: Cuotas iguales sin interés
      const montoPorCuota = montoRestante / cuotaSeleccionada;
      const cuotas = [];

      for (let i = 0; i < cuotaSeleccionada; i++) {
        const fecha = calcularFechaCuota(fechaPago, i);

        cuotas.push({
          numero: i + 1,
          fecha,
          monto: montoPorCuota
        });
      }

      setCalendarioCuotas(cuotas);
    }
  };

  // Fecha mínima (hoy)
  const fechaMinima = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header - Sticky Top con fondo verde */}
        <div className="sticky top-0 z-10 bg-[#1b967a] text-white flex items-center justify-between p-6 rounded-t-lg">
          <h2 className="text-xl font-semibold">
            Financiamiento de Local: {local.codigo} - {local.proyecto_nombre || 'N/A'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Información del Local */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Local</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Local:</span>
                <span className="ml-2 font-medium text-gray-900">{local.codigo}</span>
              </div>
              <div>
                <span className="text-gray-500">Proyecto:</span>
                <span className="ml-2 font-medium text-gray-900">{local.proyecto_nombre}</span>
              </div>
              <div>
                <span className="text-gray-500">Metraje:</span>
                <span className="ml-2 font-medium text-gray-900">{local.metraje} m²</span>
              </div>
              <div>
                <span className="text-gray-500">Lead Vinculado:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {leadNombre ? (
                    leadTelefono ? `${leadNombre} (${leadTelefono})` : leadNombre
                  ) : 'Cargando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Precio de Venta y Separación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta
              </label>
              <div className="text-2xl font-bold text-blue-900">
                {formatMonto(local.monto_venta)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Separó con
              </label>
              <div className="text-2xl font-bold text-green-900">
                {formatMonto(local.monto_separacion)}
              </div>
            </div>
          </div>

          {/* SESIÓN 57: Porcentaje Inicial Editable */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Porcentaje de Inicial
              </label>
              {porcentajeInicialDefault && (
                <span className="text-xs text-gray-500">
                  (Default proyecto: {porcentajeInicialDefault}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={porcentajeInicial ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  setPorcentajeInicial(val);
                  setCalendarioCuotas([]); // Reset calendario
                }}
                className="w-24 px-3 py-2 border border-orange-300 rounded-lg text-lg font-bold text-orange-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                placeholder="%"
              />
              <span className="text-lg font-bold text-orange-900">%</span>
              <span className="text-gray-500 mx-2">=</span>
              <span className="text-2xl font-bold text-orange-900">
                {formatMonto(montoInicial)}
              </span>
            </div>
          </div>

          {/* Inicial Restante y Monto Restante */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicial Restante
              </label>
              <div className="text-2xl font-bold text-purple-900">
                {formatMonto(inicialRestante)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Inicial - Separación</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-300">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Restante
              </label>
              <div className="text-2xl font-bold text-indigo-900">
                {formatMonto(montoRestante)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Precio Venta - Inicial</p>
            </div>
          </div>

          {/* ¿Con financiamiento? */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ¿Con financiamiento?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="financiamiento"
                  checked={conFinanciamiento === true}
                  onChange={() => {
                    setConFinanciamiento(true);
                    setCuotaSeleccionada(null);
                    setUsarCuotaPersonalizada(false);
                    setCuotaPersonalizada('');
                    setCalendarioCuotas([]); // Reset calendario cuando cambia tipo
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">Sí</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="financiamiento"
                  checked={conFinanciamiento === false}
                  onChange={() => {
                    setConFinanciamiento(false);
                    setCuotaSeleccionada(null);
                    setUsarCuotaPersonalizada(false);
                    setCuotaPersonalizada('');
                    setCalendarioCuotas([]); // Reset calendario cuando cambia tipo
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">No</span>
              </label>
            </div>
          </div>

          {/* Cuotas (condicional según financiamiento) */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Cuotas {conFinanciamiento ? 'con intereses' : 'sin intereses'} (meses)
            </label>
            {conFinanciamiento ? (
              // Cuotas CON intereses
              <>
                {cuotasConInteres.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-3">
                    {cuotasConInteres.map((cuota) => (
                      <label key={cuota.order} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="cuotas"
                          checked={cuotaSeleccionada === cuota.value && !usarCuotaPersonalizada}
                          onChange={() => {
                            setCuotaSeleccionada(cuota.value);
                            setUsarCuotaPersonalizada(false);
                            setCuotaPersonalizada('');
                            setCalendarioCuotas([]);
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {cuota.value} meses
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {/* SESIÓN 57: Input para cuotas personalizadas */}
                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="cuotas"
                      checked={usarCuotaPersonalizada}
                      onChange={() => {
                        setUsarCuotaPersonalizada(true);
                        setCuotaSeleccionada(null);
                        setCalendarioCuotas([]);
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Otro:</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={cuotaPersonalizada}
                    onChange={(e) => {
                      setCuotaPersonalizada(e.target.value);
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setCuotaSeleccionada(val);
                        setUsarCuotaPersonalizada(true);
                      } else {
                        setCuotaSeleccionada(null);
                      }
                      setCalendarioCuotas([]);
                    }}
                    onFocus={() => setUsarCuotaPersonalizada(true)}
                    placeholder="Ej: 24"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <span className="text-sm text-gray-600">meses</span>
                </div>

                {/* SESIÓN 57: TEA Editable */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      TEA (Tasa Efectiva Anual)
                    </label>
                    {teaProyectoDefault && (
                      <span className="text-xs text-gray-500">
                        (Default proyecto: {teaProyectoDefault}%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={teaProyecto ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setTeaProyecto(val);
                        setCalendarioCuotas([]);
                      }}
                      className="w-20 px-3 py-2 border border-blue-300 rounded-lg text-lg font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="%"
                    />
                    <span className="text-lg font-bold text-blue-900">% anual</span>
                  </div>
                </div>
              </>

            ) : (
              // Cuotas SIN intereses
              <>
                {cuotasSinInteres.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-3">
                    {cuotasSinInteres.map((cuota) => (
                      <label key={cuota.order} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="cuotas"
                          checked={cuotaSeleccionada === cuota.value && !usarCuotaPersonalizada}
                          onChange={() => {
                            setCuotaSeleccionada(cuota.value);
                            setUsarCuotaPersonalizada(false);
                            setCuotaPersonalizada('');
                            setCalendarioCuotas([]);
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {cuota.value} meses
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {/* SESIÓN 57: Input para cuotas personalizadas (sin intereses) */}
                <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="cuotas"
                      checked={usarCuotaPersonalizada}
                      onChange={() => {
                        setUsarCuotaPersonalizada(true);
                        setCuotaSeleccionada(null);
                        setCalendarioCuotas([]);
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Otro:</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={cuotaPersonalizada}
                    onChange={(e) => {
                      setCuotaPersonalizada(e.target.value);
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setCuotaSeleccionada(val);
                        setUsarCuotaPersonalizada(true);
                      } else {
                        setCuotaSeleccionada(null);
                      }
                      setCalendarioCuotas([]);
                    }}
                    onFocus={() => setUsarCuotaPersonalizada(true)}
                    placeholder="Ej: 8"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <span className="text-sm text-gray-600">meses</span>
                </div>
              </>
            )}
          </div>

          {/* Fecha de Pago (para ambos) */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Fecha de Pago
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => {
                setFechaPago(e.target.value);
                setCalendarioCuotas([]); // Reset calendario al cambiar fecha
              }}
              min={fechaMinima}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Botones Generar Calendario + Imprimir PDF */}
          {fechaPago && cuotaSeleccionada && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={generarCalendarioCuotas}
                className="px-6 py-3 bg-[#1b967a] text-white font-semibold rounded-lg hover:bg-[#157a63] transition-colors shadow-md"
              >
                Generar calendario de pagos
              </button>
              {calendarioCuotas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    generarPDFFinanciamiento({
                      local,
                      leadNombre,
                      leadTelefono,
                      porcentajeInicial,
                      teaProyecto,
                      montoInicial,
                      inicialRestante,
                      montoRestante,
                      conFinanciamiento,
                      cuotaSeleccionada,
                      fechaPago,
                      calendarioCuotas,
                    });
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#192c4d] text-white font-semibold rounded-lg hover:bg-[#192c4d]/90 transition-colors shadow-md"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir en PDF
                </button>
              )}
            </div>
          )}

          {/* Tabla de Cuotas SIN FINANCIAMIENTO */}
          {!conFinanciamiento && calendarioCuotas.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Calendario de Pagos (Sin Intereses)
              </h3>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#192c4d] text-white">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold"># Cuota</th>
                      <th className="px-4 py-3 text-center font-semibold">Fecha de Pago</th>
                      <th className="px-4 py-3 text-center font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calendarioCuotas.map((cuota, index) => (
                      <tr
                        key={cuota.numero}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-3 text-center font-medium text-gray-900">{cuota.numero}</td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {(() => {
                            console.log('[DEBUG FECHA] cuota.fecha RAW:', cuota.fecha);
                            const fechaFormateada = new Date(cuota.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });
                            console.log('[DEBUG FECHA] Formateada:', fechaFormateada);
                            return fechaFormateada;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-[#1b967a]">
                          {formatMonto(cuota.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Cuotas CON FINANCIAMIENTO (Sistema Francés) */}
          {conFinanciamiento && calendarioCuotas.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Calendario de Pagos (Con Intereses - Sistema Francés)
              </h3>
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#192c4d] text-white">
                    <tr>
                      <th className="px-3 py-3 text-center font-semibold"># Cuota</th>
                      <th className="px-3 py-3 text-center font-semibold">Fecha</th>
                      <th className="px-3 py-3 text-center font-semibold">Interés</th>
                      <th className="px-3 py-3 text-center font-semibold">Amortización</th>
                      <th className="px-3 py-3 text-center font-semibold">Cuota</th>
                      <th className="px-3 py-3 text-center font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calendarioCuotas.map((cuota, index) => (
                      <tr
                        key={cuota.numero}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-3 py-3 text-center font-medium text-gray-900">{cuota.numero}</td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {(() => {
                            console.log('[DEBUG FECHA CON FIN] cuota.fecha RAW:', cuota.fecha);
                            const fechaFormateada = new Date(cuota.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });
                            console.log('[DEBUG FECHA CON FIN] Formateada:', fechaFormateada);
                            return fechaFormateada;
                          })()}
                        </td>
                        <td className="px-3 py-3 text-center text-red-600 font-semibold">
                          {formatMonto(cuota.interes)}
                        </td>
                        <td className="px-3 py-3 text-center text-blue-600 font-semibold">
                          {formatMonto(cuota.amortizacion)}
                        </td>
                        <td className="px-3 py-3 text-center text-[#1b967a] font-bold">
                          {formatMonto(cuota.cuota)}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700 font-medium">
                          {formatMonto(cuota.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Sticky Bottom */}
        <div className="sticky bottom-0 bg-white border-t flex justify-between gap-3 p-6 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={calendarioCuotas.length === 0}
            className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
              calendarioCuotas.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#1b967a] text-white hover:bg-[#157a63]'
            }`}
          >
            Procesar
          </button>
        </div>

        {/* SESIÓN 52I: Modal de confirmación para Procesar */}
        <ConfirmModal
          isOpen={showConfirmModal}
          title="Procesar Venta"
          message="¿Está seguro en procesar la venta del local? Esta acción es irreversible"
          variant="warning"
          confirmText="Continuar"
          cancelText="Cancelar"
          onConfirm={async () => {
            setShowConfirmModal(false);
            setIsProcessing(true);

            try {
              // SESIÓN 54: Preparar datos para procesar venta
              const dataProcesar = {
                localId: local.id,
                codigoLocal: local.codigo,
                proyectoId: local.proyecto_id,
                proyectoNombre: local.proyecto_nombre || 'N/A',
                metraje: local.metraje,
                precioBase: local.precio_base ?? null, // SESIÓN 57: Snapshot precio_base (puede ser null)
                leadId: local.lead_id!,
                leadNombre: leadNombre,
                leadTelefono: leadTelefono,
                montoVenta: local.monto_venta!,
                montoSeparacion: local.monto_separacion!,
                montoInicial: montoInicial!,
                inicialRestante: inicialRestante!,
                montoRestante: montoRestante!,
                conFinanciamiento: conFinanciamiento,
                porcentajeInicial: porcentajeInicial,
                numeroCuotas: cuotaSeleccionada!,
                tea: conFinanciamiento ? teaProyecto : null,
                fechaPrimerPago: fechaPago,
                calendarioCuotas: calendarioCuotas,
                procesadoPor: user!.id,
                vendedorId: local.vendedor_actual_id || undefined,
              };

              const result = await procesarVentaLocal(dataProcesar);

              if (result.success) {
                // Cerrar modal de financiamiento
                onClose();
                // Mostrar mensaje de éxito
                setAlertModal({
                  isOpen: true,
                  title: 'Venta Procesada Exitosamente',
                  message: result.message || 'El local ahora está en Control de Pagos.',
                  variant: 'success',
                });
              } else {
                // Mostrar error
                setAlertModal({
                  isOpen: true,
                  title: 'Error al Procesar Venta',
                  message: result.message || 'No se pudo procesar la venta.',
                  variant: 'danger',
                });
                setIsProcessing(false);
              }
            } catch (error) {
              console.error('[FINANCIAMIENTO_MODAL] Error procesando venta:', error);
              // Mostrar error inesperado
              setAlertModal({
                isOpen: true,
                title: 'Error Inesperado',
                message: 'Ocurrió un error inesperado al procesar la venta. Por favor, intenta de nuevo.',
                variant: 'danger',
              });
              setIsProcessing(false);
            }
          }}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* SESIÓN 54: AlertModal para errores/éxito */}
        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          onOk={() => {
            setAlertModal({ ...alertModal, isOpen: false });
            // Si fue exitoso, recargar la página
            if (alertModal.variant === 'success') {
              window.location.reload();
            }
          }}
        />
      </div>
    </div>
  );
}
