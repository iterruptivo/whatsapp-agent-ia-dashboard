// ============================================================================
// PAGE: Analytics Dashboard
// ============================================================================
// Dashboard de analytics con métricas de uso del sistema
// ============================================================================

import { Metadata } from 'next';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics - EcoPlaza Dashboard',
  description: 'Métricas de uso del sistema',
};

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
