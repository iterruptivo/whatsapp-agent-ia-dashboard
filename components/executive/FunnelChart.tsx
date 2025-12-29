"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface FunnelData {
  captados: number;
  completos: number;
  visitaron: number;
  ventas: number;
}

interface FunnelChartProps {
  data: FunnelData;
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const calculateConversion = (current: number, previous: number): string => {
    if (previous === 0) return "0.00";
    return ((current / previous) * 100).toFixed(2);
  };

  const funnelData = [
    {
      stage: "Leads Captados",
      value: data.captados,
      color: "#3b82f6", // blue-500
      conversion: "100%",
    },
    {
      stage: "Leads Completos",
      value: data.completos,
      color: "#10b981", // emerald-500
      conversion: calculateConversion(data.completos, data.captados) + "%",
    },
    {
      stage: "Visitaron",
      value: data.visitaron,
      color: "#f59e0b", // amber-500
      conversion: calculateConversion(data.visitaron, data.completos) + "%",
    },
    {
      stage: "Ventas Cerradas",
      value: data.ventas,
      color: "#1b967a", // EcoPlaza green
      conversion: calculateConversion(data.ventas, data.visitaron) + "%",
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-[#192c4d] mb-1">{payload[0].payload.stage}</p>
          <p className="text-2xl font-bold text-[#1b967a]">
            {payload[0].value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Conversión: {payload[0].payload.conversion}
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
          Funnel de Conversión
        </h2>
        <p className="text-sm text-gray-600">
          Tasa de conversión global: {calculateConversion(data.ventas, data.captados)}%
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={funnelData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="stage" width={110} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {funnelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value: unknown) => typeof value === 'number' ? value.toLocaleString() : String(value)}
              style={{ fill: "#192c4d", fontWeight: "bold" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {funnelData.map((stage, index) => (
          <div key={index} className="text-center">
            <div
              className="h-2 rounded-full mb-2"
              style={{ backgroundColor: stage.color }}
            ></div>
            <p className="text-xs text-gray-600">{stage.stage}</p>
            <p className="text-sm font-bold text-[#192c4d]">{stage.conversion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
