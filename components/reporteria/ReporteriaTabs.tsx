'use client';

/**
 * ReporteriaTabs - Tab system for Reporteria page
 * Session 74 - Sistema de Cruce de Ventas
 *
 * Two tabs:
 * 1. Leads por Vendedor (existing functionality)
 * 2. Cruce de Ventas (cross-match sales with leads)
 */

import { useState } from 'react';
import { Users, FileSpreadsheet } from 'lucide-react';

export type ReporteriaTab = 'leads_vendedor' | 'atribucion_ia';

interface ReporteriaTabsProps {
  activeTab: ReporteriaTab;
  onTabChange: (tab: ReporteriaTab) => void;
  userRole: string;
}

export default function ReporteriaTabs({
  activeTab,
  onTabChange,
  userRole
}: ReporteriaTabsProps) {
  const tabs = [
    {
      id: 'leads_vendedor' as ReporteriaTab,
      label: 'Leads por Vendedor',
      icon: Users,
      description: 'Análisis de leads por vendedor',
    },
    {
      id: 'atribucion_ia' as ReporteriaTab,
      label: 'Cruce de Ventas',
      icon: FileSpreadsheet,
      description: 'Cruza ventas con leads para verificar su origen',
    },
  ];

  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
              transition-all duration-200 ease-in-out
              ${isActive
                ? 'bg-white text-[#1b967a] shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#1b967a]' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.id === 'leads_vendedor' ? 'Leads' : 'Cruce'}</span>
          </button>
        );
      })}
    </div>
  );
}
