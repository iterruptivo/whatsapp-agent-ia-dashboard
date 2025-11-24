'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ComisionStats } from '@/lib/actions-comisiones';

interface ComisionesChartProps {
  stats: ComisionStats;
}

export default function ComisionesChart({ stats }: ComisionesChartProps) {
  // TEMPORAL: Datos mockeados para presentación (Sesión 53)
  // Muestra 5 meses atrás + mes actual + 6 meses adelante
  // Solo mes actual tiene valor real (total_generado), resto en 0
  // TODO: Implementar lógica real de datos por mes después de presentación
  const currentDate = new Date();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Generar array de 12 meses (5 atrás + actual + 6 adelante)
  const chartData = [];
  for (let i = -5; i <= 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    chartData.push({
      mes: `${month} ${year}`,
      monto: i === 0 ? stats.total_generado : 0, // Solo mes actual (i=0) tiene valor
    });
  }

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
