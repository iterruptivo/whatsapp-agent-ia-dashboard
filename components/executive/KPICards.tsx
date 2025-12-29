"use client";

import { DollarSign, TrendingUp, Users, Sparkles } from "lucide-react";

interface SummaryData {
  revenue_total: number;
  pipeline_value: number;
  conversion_rate: number;
  total_leads: number;
  total_sales: number;
}

interface VictoriaData {
  victoria_leads: number;
  victoria_sales: number;
  victoria_conversion: number;
  victoria_attribution_percent: number;
}

interface KPICardsProps {
  summary: SummaryData;
  victoriaData: VictoriaData;
}

export default function KPICards({ summary, victoriaData }: KPICardsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const cards = [
    {
      title: "Revenue Total",
      value: formatCurrency(summary.revenue_total),
      subtitle: `${summary.total_sales} ventas cerradas`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(summary.pipeline_value),
      subtitle: "En proceso y confirmados",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Conversión Global",
      value: formatPercent(summary.conversion_rate),
      subtitle: `${summary.total_sales} de ${summary.total_leads} leads`,
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Victoria (IA) Attribution",
      value: formatPercent(victoriaData.victoria_attribution_percent),
      subtitle: `${victoriaData.victoria_sales} ventas atribuidas`,
      icon: Sparkles,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-[#192c4d]">
                  {card.value}
                </p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
            <p className="text-sm text-gray-500">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
