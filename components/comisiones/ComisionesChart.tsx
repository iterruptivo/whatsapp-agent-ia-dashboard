'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Comision } from '@/lib/actions-comisiones';

interface ComisionesChartProps {
  comisiones: Comision[];
}

// Determinar el mes de una comisión según su estado (lógica híbrida de agrupación)
function getMesComision(comision: Comision): string {
  let fechaStr: string;

  if (comision.estado === 'pagada' && comision.fecha_pago_comision) {
    fechaStr = comision.fecha_pago_comision;
  } else if (comision.estado === 'disponible' && comision.fecha_disponible) {
    fechaStr = comision.fecha_disponible;
  } else {
    fechaStr = comision.fecha_procesado;
  }

  // Parseo manual para evitar problemas de timezone
  const [year, month] = fechaStr.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function ComisionesChart({ comisiones }: ComisionesChartProps) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Agrupar comisiones por mes y calcular totales por estado
  const datosPorMes = new Map<string, { disponible: number; pagado: number; pendiente: number }>();

  comisiones.forEach(comision => {
    const mesKey = getMesComision(comision);

    if (!datosPorMes.has(mesKey)) {
      datosPorMes.set(mesKey, { disponible: 0, pagado: 0, pendiente: 0 });
    }

    const datos = datosPorMes.get(mesKey)!;

    if (comision.estado === 'disponible') {
      datos.disponible += comision.monto_comision;
    } else if (comision.estado === 'pagada') {
      datos.pagado += comision.monto_comision;
    } else if (comision.estado === 'pendiente_inicial') {
      datos.pendiente += comision.monto_comision;
    }
  });

  // Generar array de 12 meses (5 atrás + actual + 6 adelante)
  const currentDate = new Date();
  const chartData = [];

  for (let i = -5; i <= 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const mesKey = `${year}-${String(month).padStart(2, '0')}`;
    const mesLabel = `${monthNames[date.getMonth()]} ${year}`;

    const datos = datosPorMes.get(mesKey) || { disponible: 0, pagado: 0, pendiente: 0 };

    chartData.push({
      mes: mesLabel,
      disponible: datos.disponible,
      pagado: datos.pagado,
      pendiente: datos.pendiente,
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
          <Legend />
          <Bar
            dataKey="disponible"
            name="Disponible"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="pagado"
            name="Pagado"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="pendiente"
            name="Pendiente Inicial"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
