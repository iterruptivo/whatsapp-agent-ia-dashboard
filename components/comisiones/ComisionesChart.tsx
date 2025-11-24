'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ComisionStats } from '@/lib/actions-comisiones';

interface ComisionesChartProps {
  stats: ComisionStats;
}

export default function ComisionesChart({ stats }: ComisionesChartProps) {
  // TEMPORAL: Datos mockeados simples para presentación (Sesión 53)
  // Solo muestra mes actual con valor total_generado
  // TODO: Implementar lógica real de datos por mes después de presentación
  const currentDate = new Date();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const chartData = [
    {
      mes: `${currentMonth} ${currentYear}`,
      monto: stats.total_generado,
    },
  ];

  const formatMonto = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Comisiones por Mes
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={formatMonto} />
          <Tooltip
            formatter={(value: number) => formatMonto(value)}
            labelStyle={{ color: '#111827' }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
          />
          <Bar dataKey="monto" fill="#1b967a" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
