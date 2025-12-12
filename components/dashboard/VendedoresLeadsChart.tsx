// ============================================================================
// COMPONENT: VendedoresLeadsChart
// ============================================================================
// Descripción: Chart de barras apiladas mostrando leads por vendedor
// - Muestra todos los vendedores (incluso con 0 leads)
// - Barras apiladas: Leads Manuales + Leads Automáticos
// - Badge sutil de rol (vendedor vs vendedor_caseta)
// - Filtrado por proyecto seleccionado
// ============================================================================

'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';

interface VendedorLeadsData {
  id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta';
  leadsManuales: number;
  leadsAutomaticos: number;
  total: number;
}

interface VendedoresLeadsChartProps {
  data: VendedorLeadsData[];
  title?: string;
}

// Custom tooltip para mostrar detalles
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-medium">{entry.value}</span>
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-700 mt-2 pt-2 border-t border-gray-200">
          Total: {total}
        </p>
      </div>
    );
  }
  return null;
};

// Custom Y-axis tick para mostrar nombre + badge de rol
const CustomYAxisTick = ({ x, y, payload, data }: { x?: number; y?: number; payload?: { value: string }; data: VendedorLeadsData[] }) => {
  const vendedor = data.find(v => v.nombre === payload?.value);
  const isVendedorCaseta = vendedor?.rol === 'vendedor_caseta';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-5}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#374151"
        fontSize={12}
        className="truncate"
      >
        {payload?.value}
      </text>
      {isVendedorCaseta && (
        <circle
          cx={-(payload?.value?.length || 0) * 6 - 12}
          cy={0}
          r={4}
          fill="#0ea5e9"
          opacity={0.7}
        />
      )}
    </g>
  );
};

export default function VendedoresLeadsChart({ data, title }: VendedoresLeadsChartProps) {
  // Ordenar por total descendente
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  // Calcular totales
  const totalVendedores = data.length;
  const vendedoresConLeads = data.filter(v => v.total > 0).length;
  const vendedoresSinLeads = totalVendedores - vendedoresConLeads;
  const totalLeads = data.reduce((sum, v) => sum + v.total, 0);
  const totalManuales = data.reduce((sum, v) => sum + v.leadsManuales, 0);

  // Altura dinámica basada en cantidad de vendedores
  const chartHeight = Math.max(sortedData.length * 32 + 60, 200);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      )}

      {/* Legend sutil para roles */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span>Vendedor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <span>Vendedor Caseta</span>
        </div>
      </div>

      {/* Chart Container */}
      {sortedData.length > 0 ? (
        <div className="w-full">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 100, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 12, fill: '#374151' }}
                width={95}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
              />
              {/* Barras apiladas: Manuales (morado) + Automáticos (verde) */}
              <Bar
                dataKey="leadsManuales"
                name="Leads Manuales"
                stackId="leads"
                fill="#9333ea"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="leadsAutomaticos"
                name="Leads Automáticos"
                stackId="leads"
                fill="#1b967a"
                radius={[0, 4, 4, 0]}
                label={({ x, y, width, height, value, index }: { x: number; y: number; width: number; height: number; value: number; index: number }) => {
                  const total = sortedData[index]?.total;
                  if (!total || total === 0) return null;
                  return (
                    <text
                      x={x + width + 8}
                      y={y + height / 2}
                      fill="#6b7280"
                      fontSize={11}
                      fontWeight={600}
                      dominantBaseline="middle"
                    >
                      {total}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-sm">No hay vendedores activos en este proyecto</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Vendedores activos:</span>
            <span className="font-semibold text-gray-700">{totalVendedores}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Con leads asignados:</span>
            <span className="font-semibold text-green-600">{vendedoresConLeads}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sin leads asignados:</span>
            <span className={`font-semibold ${vendedoresSinLeads > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {vendedoresSinLeads}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Leads manuales:</span>
            <span className="font-semibold text-purple-600">{totalManuales}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
