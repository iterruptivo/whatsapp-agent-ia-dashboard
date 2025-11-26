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
import { getSelectedProyectoId } from '@/lib/server-utils';

export const dynamic = 'force-dynamic'; // Evitar cache agresivo de Next.js 15

export default async function LocalesPage() {
  // SESIÓN 55: Obtener proyecto seleccionado desde cookie
  const selectedProyectoId = await getSelectedProyectoId();

  // Fetch inicial de datos (filtrado por proyecto seleccionado)
  const [
    { data: locales, count: totalLocales },
    proyectos,
    stats
  ] = await Promise.all([
    getAllLocales({
      page: 1,
      pageSize: 10000,
      proyectoId: selectedProyectoId || undefined // SESIÓN 55: Filtrar por proyecto
    }),
    getAllProyectos(),
    getLocalesStats(selectedProyectoId || undefined), // SESIÓN 55: Stats del proyecto
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
