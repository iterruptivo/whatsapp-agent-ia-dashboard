'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface Lead {
  id: string;
  vendedor_asignado_id: string | null;
  tipificacion_nivel_1: string | null;
  tipificacion_nivel_2: string | null;
  tipificacion_nivel_3: string | null;
  observaciones_vendedor: string | null;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  vendedor_id: string | null;
}

interface DistribucionLeadsProps {
  leads: Lead[];
  usuarios: Usuario[];
  userRole: string;
}

export default function DistribucionLeads({
  leads,
  usuarios,
  userRole,
}: DistribucionLeadsProps) {
  // Solo visible para superadmin, admin, jefe_ventas, marketing
  const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  // Get active vendedor_ids for consistent counting with other components
  // Incluye: vendedor, vendedor_caseta, jefe_ventas, coordinador (todos pueden vender)
  const activeVendedorIds = useMemo(() => {
    const rolesQueVenden = ['vendedor', 'vendedor_caseta', 'jefe_ventas', 'coordinador'];
    return new Set(
      usuarios
        .filter(u => rolesQueVenden.includes(u.rol) && u.activo && u.vendedor_id)
        .map(u => u.vendedor_id)
    );
  }, [usuarios]);

  const stats = useMemo(() => {
    const total = leads.length;

    // Sin asignar = no tiene vendedor_asignado_id
    const sinAsignar = leads.filter(l => !l.vendedor_asignado_id).length;

    // Asignados = tiene vendedor_asignado_id de un vendedor ACTIVO
    const asignados = leads.filter(l =>
      l.vendedor_asignado_id && activeVendedorIds.has(l.vendedor_asignado_id)
    );
    const totalAsignados = asignados.length;

    // Leads asignados a vendedores inactivos/eliminados (huérfanos)
    const huerfanos = leads.filter(l =>
      l.vendedor_asignado_id && !activeVendedorIds.has(l.vendedor_asignado_id)
    ).length;

    // Trabajados = asignados (activos) que tienen tipificación o observación
    const trabajados = asignados.filter(lead =>
      (lead.tipificacion_nivel_1 && lead.tipificacion_nivel_1 !== '') ||
      (lead.tipificacion_nivel_2 && lead.tipificacion_nivel_2 !== '') ||
      (lead.tipificacion_nivel_3 && lead.tipificacion_nivel_3 !== '') ||
      (lead.observaciones_vendedor && lead.observaciones_vendedor !== '')
    ).length;

    // Pendientes = asignados que NO han sido trabajados
    const pendientesAsignados = totalAsignados - trabajados;

    return {
      total,
      sinAsignar,
      totalAsignados,
      trabajados,
      pendientesAsignados,
      huerfanos,
    };
  }, [leads, activeVendedorIds]);

  // Datos para el pie chart principal (Sin Asignar vs Asignados vs Huérfanos)
  const pieDataPrincipal = [
    { name: 'Sin Asignar', value: stats.sinAsignar, color: '#94a3b8' },
    { name: 'Asignados', value: stats.totalAsignados, color: '#1b967a' },
    ...(stats.huerfanos > 0 ? [{ name: 'Vend. Inactivo', value: stats.huerfanos, color: '#ef4444' }] : []),
  ].filter(d => d.value > 0);

  // Datos para el pie chart secundario (Trabajados vs Pendientes dentro de Asignados)
  const pieDataAsignados = [
    { name: 'Trabajados', value: stats.trabajados, color: '#3b82f6' },
    { name: 'Pendientes', value: stats.pendientesAsignados, color: '#f97316' },
  ].filter(d => d.value > 0);

  // Porcentajes
  const pctSinAsignar = stats.total > 0 ? ((stats.sinAsignar / stats.total) * 100).toFixed(0) : '0';
  const pctAsignados = stats.total > 0 ? ((stats.totalAsignados / stats.total) * 100).toFixed(0) : '0';
  const pctHuerfanos = stats.total > 0 ? ((stats.huerfanos / stats.total) * 100).toFixed(0) : '0';
  const pctTrabajados = stats.totalAsignados > 0 ? ((stats.trabajados / stats.totalAsignados) * 100).toFixed(0) : '0';
  const pctPendientes = stats.totalAsignados > 0 ? ((stats.pendientesAsignados / stats.totalAsignados) * 100).toFixed(0) : '0';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-[#192c4d]" />
        <h3 className="text-lg font-semibold text-gray-800">Distribución de Leads</h3>
        <span className="ml-auto text-sm text-gray-500">Total: <span className="font-bold text-gray-800">{stats.total.toLocaleString()}</span></span>
      </div>

      {/* Contenido - Grid de 2 gráficos */}
      <div className="flex items-center justify-center gap-8">

        {/* Card 1: Total Leads → Sin Asignar / Asignados */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-2 font-medium">TOTAL LEADS</p>
          <div className="relative w-36 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataPrincipal}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pieDataPrincipal.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  contentStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{stats.total.toLocaleString()}</span>
            </div>
          </div>
          {/* Leyenda debajo del gráfico */}
          <div className="mt-3 space-y-1.5 w-full min-w-[200px]">
            <div className="flex items-center justify-between text-sm gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-gray-600">Sin Asignar</span>
              </div>
              <span className="font-semibold text-slate-600 tabular-nums">{stats.sinAsignar.toLocaleString()} <span className="text-gray-400 font-normal">({pctSinAsignar}%)</span></span>
            </div>
            <div className="flex items-center justify-between text-sm gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1b967a] flex-shrink-0"></span>
                <span className="text-gray-600">Asignados</span>
              </div>
              <span className="font-semibold text-[#1b967a] tabular-nums">{stats.totalAsignados.toLocaleString()} <span className="text-gray-400 font-normal">({pctAsignados}%)</span></span>
            </div>
            {stats.huerfanos > 0 && (
              <div className="flex items-center justify-between text-sm gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span>
                  <span className="text-gray-600">Vend. Inactivo</span>
                </div>
                <span className="font-semibold text-red-500 tabular-nums">{stats.huerfanos.toLocaleString()} <span className="text-gray-400 font-normal">({pctHuerfanos}%)</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Flecha */}
        <div className="flex flex-col items-center text-gray-300">
          <ArrowRight className="w-8 h-8" />
        </div>

        {/* Card 2: Asignados → Trabajados / Pendientes */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-2 font-medium">ASIGNADOS</p>
          <div className="relative w-36 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataAsignados}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pieDataAsignados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  contentStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{stats.totalAsignados.toLocaleString()}</span>
            </div>
          </div>
          {/* Leyenda debajo del gráfico */}
          <div className="mt-3 space-y-1.5 w-full min-w-[200px]">
            <div className="flex items-center justify-between text-sm gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></span>
                <span className="text-gray-600">Trabajados</span>
              </div>
              <span className="font-semibold text-blue-600 tabular-nums">{stats.trabajados.toLocaleString()} <span className="text-gray-400 font-normal">({pctTrabajados}%)</span></span>
            </div>
            <div className="flex items-center justify-between text-sm gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></span>
                <span className="text-gray-600">Pendientes</span>
              </div>
              <span className="font-semibold text-orange-500 tabular-nums">{stats.pendientesAsignados.toLocaleString()} <span className="text-gray-400 font-normal">({pctPendientes}%)</span></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
