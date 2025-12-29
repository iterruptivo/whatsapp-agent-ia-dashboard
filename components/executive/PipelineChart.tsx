"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Circle } from "lucide-react";

interface PipelineItem {
  estado: "verde" | "amarillo" | "naranja" | "rojo";
  cantidad: number;
  valor: number;
}

interface PipelineChartProps {
  data: PipelineItem[];
}

export default function PipelineChart({ data }: PipelineChartProps) {
  const estadoConfig = {
    verde: {
      label: "Disponible",
      color: "#10b981",
      emoji: "🟢",
    },
    amarillo: {
      label: "En Proceso",
      color: "#f59e0b",
      emoji: "🟡",
    },
    naranja: {
      label: "Confirmado",
      color: "#f97316",
      emoji: "🟠",
    },
    rojo: {
      label: "Vendido",
      color: "#ef4444",
      emoji: "🔴",
    },
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const chartData = data.map((item) => ({
    ...item,
    estadoLabel: estadoConfig[item.estado].label,
    color: estadoConfig[item.estado].color,
  }));

  const totalValue = data.reduce((sum, item) => sum + item.valor, 0);
  const totalCantidad = data.reduce((sum, item) => sum + item.cantidad, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const config = estadoConfig[item.estado as keyof typeof estadoConfig];
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-[#192c4d] mb-2 flex items-center gap-2">
            <span>{config.emoji}</span>
            {config.label}
          </p>
          <p className="text-lg font-bold text-[#1b967a]">
            {item.cantidad} locales
          </p>
          <p className="text-sm text-gray-600">
            Valor: {formatCurrency(item.valor)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {((item.valor / totalValue) * 100).toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#192c4d] mb-2">
          Pipeline por Estado (Semáforo)
        </h2>
        <p className="text-sm text-gray-600">
          {totalCantidad} locales · Valor total: {formatCurrency(totalValue)}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="estadoLabel" />
          <YAxis yAxisId="left" orientation="left" stroke="#192c4d" />
          <YAxis yAxisId="right" orientation="right" stroke="#1b967a" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="cantidad"
            name="Cantidad"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.map((item) => {
          const config = estadoConfig[item.estado];
          return (
            <div
              key={item.estado}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <Circle className="w-4 h-4" fill={config.color} stroke="none" />
                <p className="text-sm font-medium text-gray-700">
                  {config.label}
                </p>
              </div>
              <p className="text-2xl font-bold text-[#192c4d] mb-1">
                {item.cantidad}
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(item.valor)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
