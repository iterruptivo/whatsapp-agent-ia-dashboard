// ============================================================================
// COMPONENT: LocalesClientWrapper (Tab Navigation Wrapper)
// ============================================================================
// Descripción: Wrapper con navegación por tabs para Gestión de Locales
// Features: 3 sub-tabs con role-based access control
// ============================================================================

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Proyecto } from '@/lib/db';
import type { Local } from '@/lib/locales';
import TabButton from '../shared/TabButton';
import LocalesGestionTab from './LocalesGestionTab';
import ControlPagosTab from './ControlPagosTab';
import ComisionesTab from './ComisionesTab';

type TabType = 'gestion' | 'pagos' | 'comisiones';

interface LocalesClientWrapperProps {
  initialLocales: Local[];
  totalLocales: number;
  proyectos: Proyecto[];
  initialStats: {
    verde: number;
    amarillo: number;
    naranja: number;
    rojo: number;
    total: number;
  };
}

export default function LocalesClientWrapper({
  initialLocales,
  totalLocales,
  proyectos,
  initialStats,
}: LocalesClientWrapperProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('gestion');

  // Determinar qué tabs mostrar según el rol
  const canViewPagos = user?.rol === 'admin' || user?.rol === 'jefe_ventas';

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-3 flex-wrap">
          {/* Tab 1: Gestión de Locales (todos los roles) */}
          <TabButton
            label="Gestión de Locales"
            isActive={activeTab === 'gestion'}
            onClick={() => setActiveTab('gestion')}
          />

          {/* Tab 2: Control de Pagos (solo admin y jefe_ventas) */}
          {canViewPagos && (
            <TabButton
              label="Control de Pagos"
              isActive={activeTab === 'pagos'}
              onClick={() => setActiveTab('pagos')}
            />
          )}

          {/* Tab 3: Comisiones (todos los roles) */}
          <TabButton
            label="Comisiones"
            isActive={activeTab === 'comisiones'}
            onClick={() => setActiveTab('comisiones')}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'gestion' && (
        <LocalesGestionTab
          initialLocales={initialLocales}
          totalLocales={totalLocales}
          proyectos={proyectos}
          initialStats={initialStats}
        />
      )}

      {activeTab === 'pagos' && canViewPagos && <ControlPagosTab />}

      {activeTab === 'comisiones' && <ComisionesTab />}
    </div>
  );
}
