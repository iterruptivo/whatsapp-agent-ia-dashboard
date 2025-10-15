'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartComponentProps {
  data: ChartData[];
}

export default function PieChartComponent({ data }: PieChartComponentProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Distribución de Estados al Notificar</h3>

      {/* Responsive layout: stacked on mobile/tablet, side-by-side on desktop (≥1280px) */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:gap-8">
        {/* Chart Container */}
        <div className="flex-shrink-0 xl:w-1/2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${Math.round(entry.percent * 100)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              {/* Hide default legend on desktop, show on mobile */}
              <Legend wrapperStyle={{ display: 'none' }} className="xl:hidden" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend - Only visible on desktop */}
        <div className="hidden xl:flex xl:flex-col xl:justify-center xl:flex-grow">
          {data.map((entry, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 py-3 ${
                index < data.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 font-medium">{entry.name}</span>
              <span className="text-gray-500 ml-auto">{entry.value} leads</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}