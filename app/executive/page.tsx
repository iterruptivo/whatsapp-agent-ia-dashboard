// ============================================================================
// PAGE: Dashboard Ejecutivo
// ============================================================================
// Dashboard con métricas de negocio para ejecutivos y directores
// Acceso: admin, jefe_ventas
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/executive/KPICards";
import FunnelChart from "@/components/executive/FunnelChart";
import PipelineChart from "@/components/executive/PipelineChart";
import CanalesTable from "@/components/executive/CanalesTable";
import VendedoresRanking from "@/components/executive/VendedoresRanking";
import FinancieroHealth from "@/components/executive/FinancieroHealth";
import { RefreshCw, Building2, AlertCircle } from "lucide-react";
import {
  getSummary,
  getFunnel,
  getPipeline,
  getVendedores,
  getCanales,
  getFinanciero,
  getProyectos,
  type ExecutiveSummary,
  type ExecutiveFunnel,
  type PipelineEstado,
  type VendedorStats,
  type CanalStats,
  type FinancieroData,
  type ProyectoComparativa,
} from "@/lib/executive-api";

export default function ExecutiveDashboardPage() {
  const { user, loading: authLoading, selectedProyecto } = useAuth();
  const router = useRouter();

  // Estado para proyecto seleccionado (null = todos)
  const [proyectoId, setProyectoId] = useState<string | undefined>(undefined);
  const [proyectos, setProyectos] = useState<ProyectoComparativa[]>([]);

  // Estados de datos
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [funnel, setFunnel] = useState<ExecutiveFunnel | null>(null);
  const [pipeline, setPipeline] = useState<PipelineEstado[]>([]);
  const [vendedores, setVendedores] = useState<VendedorStats[]>([]);
  const [canales, setCanales] = useState<CanalStats[]>([]);
  const [financiero, setFinanciero] = useState<FinancieroData | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de proyectos
  useEffect(() => {
    getProyectos()
      .then(setProyectos)
      .catch((err) => console.error("Error loading proyectos:", err));
  }, []);

  // Cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, funnelData, pipelineData, vendedoresData, canalesData, financieroData] =
        await Promise.all([
          getSummary(proyectoId),
          getFunnel(proyectoId),
          getPipeline(proyectoId),
          getVendedores(proyectoId),
          getCanales(proyectoId),
          getFinanciero(proyectoId),
        ]);

      setSummary(summaryData);
      setFunnel(funnelData);
      setPipeline(pipelineData);
      setVendedores(vendedoresData);
      setCanales(canalesData);
      setFinanciero(financieroData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  // Cargar datos cuando cambia el proyecto
  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user, loadDashboardData]);

  // Verificar autenticación y permisos
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && !["admin", "jefe_ventas"].includes(user.rol || "")) {
      router.push("/operativo");
    }
  }, [user, authLoading, router]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          title="Dashboard Ejecutivo"
          subtitle="Métricas de negocio para directivos"
        />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-gray-600">Cargando dashboard ejecutivo...</span>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          title="Dashboard Ejecutivo"
          subtitle="Métricas de negocio para directivos"
        />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                  <button
                    onClick={loadDashboardData}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Calcular datos para KPICards
  const pipelineValue = pipeline
    .filter((p) => p.estado === "amarillo" || p.estado === "naranja")
    .reduce((sum, p) => sum + p.valor_total, 0);

  const victoriaCanal = canales.find(
    (c) => c.canal === "Victoria (IA)" || c.canal.toLowerCase().includes("victoria")
  );

  const totalVentas = canales.reduce((sum, c) => sum + c.compraron, 0);
  const victoriaAttribution = victoriaCanal && totalVentas > 0
    ? (victoriaCanal.compraron / totalVentas) * 100
    : 0;

  // Datos para componentes
  const summaryForKPI = {
    revenue_total: summary?.revenue_total || 0,
    pipeline_value: pipelineValue,
    conversion_rate: summary?.tasa_conversion || 0,
    total_leads: summary?.total_leads || 0,
    total_sales: summary?.locales_vendidos || 0,
  };

  const victoriaForKPI = {
    victoria_leads: victoriaCanal?.leads || 0,
    victoria_sales: victoriaCanal?.compraron || 0,
    victoria_conversion: victoriaCanal?.conversion_compra || 0,
    victoria_attribution_percent: victoriaAttribution,
  };

  const funnelForChart = {
    captados: funnel?.leads_captados || 0,
    completos: funnel?.leads_completos || 0,
    visitaron: funnel?.leads_visitaron || 0,
    ventas: funnel?.ventas || 0,
  };

  const pipelineForChart = pipeline.map((p) => ({
    estado: p.estado,
    cantidad: p.cantidad,
    valor: p.valor_total,
  }));

  const canalesForTable = canales.map((c) => ({
    canal: c.canal,
    leads: c.leads,
    visitaron: c.visitaron,
    compraron: c.compraron,
  }));

  const vendedoresForRanking = vendedores.map((v) => ({
    nombre: v.vendedor,
    leads: v.leads_asignados,
    visitas: v.leads_visitaron,
    ventas: v.ventas_cerradas,
    monto: v.monto_total,
    comisiones: v.comisiones_pendientes,
  }));

  const morosidadForHealth = {
    porcentaje: financiero?.morosidad.porcentaje_morosidad || 0,
    monto: financiero?.morosidad.monto_vencido || 0,
    clientes: financiero?.morosidad.clientes_morosos || 0,
  };

  const inicialPendienteForHealth = {
    monto: financiero?.inicial_pendiente.monto_total || 0,
    contratos: financiero?.inicial_pendiente.cantidad || 0,
  };

  const proyeccionForHealth = {
    monto: financiero?.proyeccion_mes.monto_esperado || 0,
    mes: new Date().toLocaleString("es-PE", { month: "long" }),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Dashboard Ejecutivo"
        subtitle="Métricas de negocio para directivos"
      />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Selector de Proyecto */}
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-500" />
            <select
              value={proyectoId || ""}
              onChange={(e) => setProyectoId(e.target.value || undefined)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-w-[200px]"
            >
              <option value="">Todos los proyectos</option>
              {proyectos.map((p) => (
                <option key={p.proyecto_id} value={p.proyecto_id}>
                  {p.proyecto}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Actualizar */}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* KPI Cards */}
        <KPICards summary={summaryForKPI} victoriaData={victoriaForKPI} />

        {/* Funnel y Pipeline */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <FunnelChart data={funnelForChart} />
          <PipelineChart data={pipelineForChart} />
        </div>

        {/* Canales */}
        <div className="mb-8">
          <CanalesTable data={canalesForTable} />
        </div>

        {/* Vendedores y Financiero */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <VendedoresRanking data={vendedoresForRanking} />
          <FinancieroHealth
            morosidad={morosidadForHealth}
            inicialPendiente={inicialPendienteForHealth}
            proyeccion={proyeccionForHealth}
          />
        </div>

        {/* Comparativa Proyectos (si hay más de 1) */}
        {proyectos.length > 1 && !proyectoId && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-[#192c4d] mb-6">
              Comparativa por Proyecto
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Proyecto
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Leads
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Locales
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Vendidos
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Ocupación
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((p, idx) => (
                    <tr
                      key={p.proyecto_id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {p.proyecto}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {p.leads.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {p.locales_total}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1b967a]">
                        {p.locales_vendidos}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            p.ocupacion_porcentaje >= 50
                              ? "text-emerald-600"
                              : p.ocupacion_porcentaje >= 25
                              ? "text-amber-600"
                              : "text-gray-600"
                          }`}
                        >
                          {p.ocupacion_porcentaje.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#192c4d]">
                        ${(p.revenue / 1000000).toFixed(2)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
