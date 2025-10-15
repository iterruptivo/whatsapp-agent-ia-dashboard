import OperativoClient from '@/components/dashboard/OperativoClient';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { getAllLeads } from '@/lib/db';

// CRITICAL: Disable Next.js caching to show fresh data from database
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OperativoPage() {
  // Calculate default date range (last 90 days) in Lima timezone
  const now = new Date();

  // Set to Lima timezone (UTC-5) - end of today
  const dateTo = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  dateTo.setHours(23, 59, 59, 999);

  // 90 days ago - start of day (temporary: capture all test leads)
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - 90);
  dateFrom.setHours(0, 0, 0, 0);

  // Fetch leads with 30-day filter (server-side)
  const leads = await getAllLeads(dateFrom, dateTo);

  // Format dates for input fields (YYYY-MM-DD)
  const dateFromString = dateFrom.toISOString().split('T')[0];
  const dateToString = dateTo.toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      {/* Header with logout button */}
      <DashboardHeader title="Dashboard Operativo" subtitle="Gestión de Leads - Proyecto Trapiche" />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OperativoClient
          initialLeads={leads}
          initialDateFrom={dateFromString}
          initialDateTo={dateToString}
        />
      </main>
    </div>
  );
}
