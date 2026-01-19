import { redirect } from 'next/navigation';

/**
 * Ruta de redirect para mantener compatibilidad con URLs de edición
 * Redirige a la ruta detalle que maneja automáticamente modo edición
 */
export default async function EditarTerrenoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/expansion/terrenos/${id}`);
}
