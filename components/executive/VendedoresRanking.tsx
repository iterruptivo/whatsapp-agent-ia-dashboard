"use client";

import { Medal, TrendingUp, Users, DollarSign } from "lucide-react";

interface VendedorData {
  nombre: string;
  leads: number;
  visitas: number;
  ventas: number;
  monto: number;
  comisiones: number;
}

interface VendedoresRankingProps {
  data: VendedorData[];
}

export default function VendedoresRanking({ data }: VendedoresRankingProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return "text-yellow-500"; // Oro
      case 1:
        return "text-gray-400"; // Plata
      case 2:
        return "text-amber-700"; // Bronce
      default:
        return "text-gray-300";
    }
  };

  const getMedalBg = (position: number) => {
    switch (position) {
      case 0:
        return "bg-yellow-50 border-yellow-200";
      case 1:
        return "bg-gray-50 border-gray-200";
      case 2:
        return "bg-amber-50 border-amber-200";
      default:
        return "";
    }
  };

  const sortedData = [...data]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 10); // Top 10

  const totalStats = {
    leads: sortedData.reduce((sum, v) => sum + v.leads, 0),
    visitas: sortedData.reduce((sum, v) => sum + v.visitas, 0),
    ventas: sortedData.reduce((sum, v) => sum + v.ventas, 0),
    monto: sortedData.reduce((sum, v) => sum + v.monto, 0),
    comisiones: sortedData.reduce((sum, v) => sum + v.comisiones, 0),
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#192c4d] mb-2">
          Top Vendedores
        </h2>
        <p className="text-sm text-gray-600">
          Ranking por monto total de ventas cerradas
        </p>
      </div>

      {/* Top 3 Destacado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sortedData.slice(0, 3).map((vendedor, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getMedalBg(index)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-700">#{index + 1}</span>
              <Medal className={`w-8 h-8 ${getMedalColor(index)}`} />
            </div>
            <h3 className="font-bold text-[#192c4d] mb-1 truncate">
              {vendedor.nombre}
            </h3>
            <p className="text-2xl font-bold text-[#1b967a] mb-2">
              {formatCurrency(vendedor.monto)}
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-600">Ventas</p>
                <p className="font-bold text-gray-900">{vendedor.ventas}</p>
              </div>
              <div>
                <p className="text-gray-600">Visitas</p>
                <p className="font-bold text-gray-900">{vendedor.visitas}</p>
              </div>
              <div>
                <p className="text-gray-600">Leads</p>
                <p className="font-bold text-gray-900">{vendedor.leads}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla Completa */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                #
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Vendedor
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Leads
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Visitas
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Ventas
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Monto Total
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Comisiones
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((vendedor, index) => {
              const conversionRate = vendedor.leads > 0
                ? ((vendedor.ventas / vendedor.leads) * 100).toFixed(1)
                : "0.0";

              return (
                <tr
                  key={index}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index < 3 ? getMedalBg(index) : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700">{index + 1}</span>
                      {index < 3 && (
                        <Medal className={`w-4 h-4 ${getMedalColor(index)}`} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{vendedor.nombre}</p>
                      <p className="text-xs text-gray-500">
                        Conv: {conversionRate}%
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {vendedor.leads.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {vendedor.visitas.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[#1b967a]">
                    {vendedor.ventas.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#192c4d]">
                    {formatCurrency(vendedor.monto)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 font-medium">
                    {formatCurrency(vendedor.comisiones)}
                  </td>
                </tr>
              );
            })}
            {/* Fila Total */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td colSpan={2} className="py-3 px-4 text-gray-900">
                TOTAL TOP {sortedData.length}
              </td>
              <td className="py-3 px-4 text-right text-gray-900">
                {totalStats.leads.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-gray-900">
                {totalStats.visitas.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-[#1b967a]">
                {totalStats.ventas.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-[#192c4d]">
                {formatCurrency(totalStats.monto)}
              </td>
              <td className="py-3 px-4 text-right text-amber-600">
                {formatCurrency(totalStats.comisiones)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
