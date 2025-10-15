import OperativoClient from '@/components/dashboard/OperativoClient';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { getAllLeads } from '@/lib/db';

export default async function OperativoPage() {
  // Calculate default date range (last 30 days) in Lima timezone
  const now = new Date();

  // Set to Lima timezone (UTC-5) - end of today
  const dateTo = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  dateTo.setHours(23, 59, 59, 999);

  // 30 days ago - start of day
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - 30);
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
