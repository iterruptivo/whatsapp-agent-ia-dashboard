"use client";

import KPICards from "@/components/executive/KPICards";
import FunnelChart from "@/components/executive/FunnelChart";
import PipelineChart from "@/components/executive/PipelineChart";
import CanalesTable from "@/components/executive/CanalesTable";
import VendedoresRanking from "@/components/executive/VendedoresRanking";
import FinancieroHealth from "@/components/executive/FinancieroHealth";

export default function ExecutiveDemoPage() {
  // Datos de ejemplo basados en el plan
  const summaryData = {
    revenue_total: 8700000,
    pipeline_value: 9200000,
    conversion_rate: 0.78,
    total_leads: 20000,
    total_sales: 156,
  };

  const victoriaData = {
    victoria_leads: 5000,
    victoria_sales: 45,
    victoria_conversion: 0.9,
    victoria_attribution_percent: 28.8, // 45/156 * 100
  };

  const funnelData = {
    captados: 20000,
    completos: 9000,
    visitaron: 1300,
    ventas: 156,
  };

  const pipelineData = [
    { estado: "verde" as const, cantidad: 500, valor: 27500000 },
    { estado: "amarillo" as const, cantidad: 120, valor: 6600000 },
    { estado: "naranja" as const, cantidad: 47, valor: 2600000 },
    { estado: "rojo" as const, cantidad: 156, valor: 8700000 },
  ];

  const canalesData = [
    { canal: "Victoria (IA)", leads: 5000, visitaron: 750, compraron: 45 },
    { canal: "Facebook Ads", leads: 8000, visitaron: 400, compraron: 60 },
    { canal: "Google Ads", leads: 4000, visitaron: 150, compraron: 35 },
    { canal: "Instagram", leads: 2000, visitaron: 80, compraron: 10 },
    { canal: "Directo", leads: 1000, visitaron: 20, compraron: 6 },
  ];

  const vendedoresData = [
    { nombre: "Juan Pérez", leads: 850, visitas: 280, ventas: 12, monto: 680000, comisiones: 34000 },
    { nombre: "María González", leads: 720, visitas: 245, ventas: 10, monto: 520000, comisiones: 26000 },
    { nombre: "Carlos Rodríguez", leads: 680, visitas: 210, ventas: 9, monto: 480000, comisiones: 24000 },
    { nombre: "Ana Martínez", leads: 550, visitas: 180, ventas: 8, monto: 420000, comisiones: 21000 },
    { nombre: "Luis Sánchez", leads: 480, visitas: 155, ventas: 7, monto: 380000, comisiones: 19000 },
    { nombre: "Rosa López", leads: 420, visitas: 135, ventas: 6, monto: 320000, comisiones: 16000 },
    { nombre: "Pedro Vargas", leads: 380, visitas: 120, ventas: 5, monto: 280000, comisiones: 14000 },
    { nombre: "Carmen Silva", leads: 350, visitas: 110, ventas: 5, monto: 260000, comisiones: 13000 },
  ];

  const morosidadData = {
    porcentaje: 8.5,
    monto: 127000,
    clientes: 15,
  };

  const inicialPendienteData = {
    monto: 450000,
    contratos: 28,
  };

  const proyeccionData = {
    monto: 320000,
    mes: "Diciembre 2025",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#192c4d] mb-2">
            Dashboard Ejecutivo - EcoPlaza
          </h1>
          <p className="text-gray-600">
            Visualización de componentes del Dashboard Ejecutivo
          </p>
        </div>

        {/* KPI Cards */}
        <KPICards summary={summaryData} victoriaData={victoriaData} />

        {/* Funnel y Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FunnelChart data={funnelData} />
          <PipelineChart data={pipelineData} />
        </div>

        {/* Canales */}
        <div className="mb-8">
          <CanalesTable data={canalesData} />
        </div>

        {/* Vendedores */}
        <div className="mb-8">
          <VendedoresRanking data={vendedoresData} />
        </div>

        {/* Financiero */}
        <FinancieroHealth
          morosidad={morosidadData}
          inicialPendiente={inicialPendienteData}
          proyeccion={proyeccionData}
        />
      </div>
    </div>
  );
}
