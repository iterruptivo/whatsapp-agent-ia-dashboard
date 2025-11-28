'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  data: ChartData[];
  title?: string;
}

export default function HorizontalBarChart({ data, title }: HorizontalBarChartProps) {
  // Calculate max value for percentage width
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}

      {/* Chart Container */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={data.length * 40 + 20}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 13, fill: '#374151' }}
              width={75}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right',
                fill: '#6b7280',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total count */}
      <div className="mt-4 pt-3 border-t border-gray-200 text-center">
        <span className="text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-700">{data.reduce((sum, d) => sum + d.value, 0)} leads</span>
        </span>
      </div>
    </div>
  );
}
