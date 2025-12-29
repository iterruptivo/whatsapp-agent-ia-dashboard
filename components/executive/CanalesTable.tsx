"use client";

import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";

interface CanalData {
  canal: string;
  leads: number;
  visitaron: number;
  compraron: number;
}

interface CanalesTableProps {
  data: CanalData[];
}

export default function CanalesTable({ data }: CanalesTableProps) {
  const calculateConversion = (compraron: number, leads: number): string => {
    if (leads === 0) return "0.00";
    return ((compraron / leads) * 100).toFixed(2);
  };

  const sortedData = [...data].sort((a, b) => b.compraron - a.compraron);

  const avgConversion =
    data.reduce((sum, item) => sum + parseFloat(calculateConversion(item.compraron, item.leads)), 0) /
    data.length;

  const victoriaRow = sortedData.find(
    (item) => item.canal === "Victoria (IA)" || item.canal.toLowerCase().includes("victoria")
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#192c4d] mb-2">
          Efectividad por Canal (UTM)
        </h2>
        <p className="text-sm text-gray-600">
          Conversión promedio: {avgConversion.toFixed(2)}%
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Canal
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Leads
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Visitaron
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Compraron
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Conversión %
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => {
              const conversion = parseFloat(calculateConversion(item.compraron, item.leads));
              const isVictoria =
                item.canal === "Victoria (IA)" || item.canal.toLowerCase().includes("victoria");
              const isAboveAverage = conversion > avgConversion;

              return (
                <tr
                  key={index}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isVictoria ? "bg-purple-50" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {isVictoria && (
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      )}
                      <span className={`font-medium ${isVictoria ? "text-purple-700" : "text-gray-900"}`}>
                        {item.canal}
                      </span>
                      {isVictoria && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                          IA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {item.leads.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {item.visitaron.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[#1b967a]">
                    {item.compraron.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span
                        className={`font-bold ${
                          isAboveAverage ? "text-emerald-600" : "text-gray-600"
                        }`}
                      >
                        {conversion}%
                      </span>
                      {isAboveAverage ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {victoriaRow && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-1">
                Victoria (IA) Performance
              </h3>
              <p className="text-sm text-purple-700">
                {victoriaRow.compraron} ventas de {victoriaRow.leads} leads ·{" "}
                {calculateConversion(victoriaRow.compraron, victoriaRow.leads)}% conversión ·{" "}
                {((victoriaRow.compraron / sortedData.reduce((sum, item) => sum + item.compraron, 0)) * 100).toFixed(1)}% del total de ventas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
