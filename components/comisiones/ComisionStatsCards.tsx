'use client';

import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import type { ComisionStats } from '@/lib/actions-comisiones';

interface ComisionStatsCardsProps {
  stats: ComisionStats;
}

export default function ComisionStatsCards({ stats }: ComisionStatsCardsProps) {
  const formatMonto = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const cards = [
    {
      title: 'Total Generado',
      value: stats.total_generado,
      count: stats.count_total,
      icon: DollarSign,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
    {
      title: 'Disponible',
      value: stats.disponible,
      count: stats.count_disponible,
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
    },
    {
      title: 'Pagado',
      value: stats.pagado,
      count: stats.count_pagado,
      icon: CheckCircle,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900',
    },
    // TEMPORAL: Oculto para presentación (Sesión 53)
    // TODO: Restaurar después de presentación
    {
      title: 'Pendiente Inicial',
      value: stats.pendiente_inicial,
      count: stats.count_pendiente,
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900',
      hidden: true, // TEMPORAL
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`${card.bgColor} rounded-lg shadow-sm p-6 border border-gray-200`}
            style={{ display: (card as any).hidden ? 'none' : 'block' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">
                {card.title}
              </h3>
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div className={`text-2xl font-bold ${card.textColor} mb-2`}>
              {formatMonto(card.value)}
            </div>
            <div className="text-sm text-gray-500">
              {card.count} {card.count === 1 ? 'comisión' : 'comisiones'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
