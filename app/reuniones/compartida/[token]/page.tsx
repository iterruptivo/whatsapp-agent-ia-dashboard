// ============================================================================
// PAGE: Reunión Compartida (Acceso Público)
// ============================================================================
// Ruta: /reuniones/compartida/[token]
// Acceso público mediante link token (sin autenticación)
// ============================================================================

import { notFound } from 'next/navigation';
import { getReunionPorToken } from '@/lib/actions-reuniones';
import ReunionPublicaView from '@/components/reuniones/ReunionPublicaView';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ReunionCompartidaPage({ params }: PageProps) {
  const { token } = await params;

  // Obtener reunión por token
  const result = await getReunionPorToken(token);

  if (!result.success || !result.data) {
    notFound();
  }

  const { reunion, actionItems } = result.data;

  return <ReunionPublicaView reunion={reunion} actionItems={actionItems} />;
}
