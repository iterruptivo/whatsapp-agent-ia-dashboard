"use client";

import { AlertTriangle, Clock, TrendingUp, DollarSign } from "lucide-react";

interface FinancieroData {
  morosidad: {
    porcentaje: number;
    monto: number;
    clientes: number;
  };
  inicialPendiente: {
    monto: number;
    contratos: number;
  };
  proyeccion: {
    monto: number;
    mes: string;
  };
}

interface FinancieroHealthProps {
  morosidad: FinancieroData["morosidad"];
  inicialPendiente: FinancieroData["inicialPendiente"];
  proyeccion: FinancieroData["proyeccion"];
}

export default function FinancieroHealth({
  morosidad,
  inicialPendiente,
  proyeccion,
}: FinancieroHealthProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getMorosidadStatus = (porcentaje: number) => {
    if (porcentaje >= 15) {
      return {
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "Crítico",
        labelColor: "bg-red-600",
      };
    }
    if (porcentaje >= 10) {
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        label: "Alerta",
        labelColor: "bg-orange-600",
      };
    }
    if (porcentaje >= 5) {
      return {
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        label: "Atención",
        labelColor: "bg-amber-600",
      };
    }
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      label: "Saludable",
      labelColor: "bg-emerald-600",
    };
  };

  const morosidadStatus = getMorosidadStatus(morosidad.porcentaje);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#192c4d] mb-4">
        Salud Financiera
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Morosidad */}
        <div
          className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${morosidadStatus.borderColor}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Morosidad
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-3xl font-bold ${morosidadStatus.color}`}>
                  {morosidad.porcentaje.toFixed(1)}%
                </span>
                <span
                  className={`${morosidadStatus.labelColor} text-white text-xs px-2 py-0.5 rounded-full`}
                >
                  {morosidadStatus.label}
                </span>
              </div>
            </div>
            <div className={`${morosidadStatus.bgColor} p-3 rounded-lg`}>
              <AlertTriangle className={`w-6 h-6 ${morosidadStatus.color}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monto vencido:</span>
              <span className={`font-bold ${morosidadStatus.color}`}>
                {formatCurrency(morosidad.monto)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Clientes morosos:</span>
              <span className="font-semibold text-gray-900">
                {morosidad.clientes}
              </span>
            </div>
          </div>
        </div>

        {/* Card Inicial Pendiente */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Inicial Pendiente
              </p>
              <span className="text-3xl font-bold text-blue-600">
                {formatCurrency(inicialPendiente.monto)}
              </span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Contratos:</span>
              <span className="font-semibold text-gray-900">
                {inicialPendiente.contratos}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Promedio/contrato:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(
                  inicialPendiente.contratos > 0
                    ? inicialPendiente.monto / inicialPendiente.contratos
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card Proyección */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Proyección {proyeccion.mes}
              </p>
              <span className="text-3xl font-bold text-emerald-600">
                {formatCurrency(proyeccion.monto)}
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((new Date().getDate() / 30) * 100)
                  )}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Progreso del mes:</span>
              <span className="font-semibold text-gray-900">
                {((new Date().getDate() / 30) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="bg-gradient-to-r from-[#192c4d] to-[#1b967a] rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-6 h-6" />
          <h3 className="text-lg font-bold">Resumen Financiero</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-200 mb-1">Total por Cobrar</p>
            <p className="text-2xl font-bold">
              {formatCurrency(morosidad.monto + inicialPendiente.monto)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-200 mb-1">Tasa de Recuperación</p>
            <p className="text-2xl font-bold">
              {morosidad.porcentaje < 10 ? "Alta" : morosidad.porcentaje < 15 ? "Media" : "Baja"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-200 mb-1">Status General</p>
            <p className="text-2xl font-bold">{morosidadStatus.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
