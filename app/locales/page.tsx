// ============================================================================
// PÁGINA: Gestión de Locales en Venta
// ============================================================================
// Ruta: /locales
// Descripción: Dashboard para gestionar locales con estados en tiempo real
// Acceso: Admin + Vendedor (ambos pueden ver y cambiar estados)
// ============================================================================

import { redirect } from 'next/navigation';
import { getAllLocales, getLocalesStats } from '@/lib/locales';
import { getAllProyectos } from '@/lib/db';
import LocalesClient from '@/components/locales/LocalesClient';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export const dynamic = 'force-dynamic'; // Evitar cache agresivo de Next.js 15

export default async function LocalesPage() {
  // Fetch inicial de datos
  const [
    { data: locales, count: totalLocales },
    proyectos,
    stats
  ] = await Promise.all([
    getAllLocales({ page: 1, pageSize: 50 }),
    getAllProyectos(),
    getLocalesStats(),
  ]);

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Gestión de Locales"
        subtitle="Control de estados en tiempo real"
      />

      {/* Client Component con Realtime */}
      <div className="max-w-[1400px] mx-auto p-6">
        <LocalesClient
          initialLocales={locales}
          totalLocales={totalLocales}
          proyectos={proyectos}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
