'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartComponentProps {
  data: ChartData[];
  title?: string;
}

export default function PieChartComponent({ data, title }: PieChartComponentProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-6">{title}</h3>
      )}

      {/* Chart Container */}
      <div className="flex flex-col items-center">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${Math.round(entry.percent * 100)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend - Below chart */}
        <div className="w-full mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {data.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700 font-medium text-sm">{entry.name}</span>
                <span className="text-gray-500 text-sm">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}