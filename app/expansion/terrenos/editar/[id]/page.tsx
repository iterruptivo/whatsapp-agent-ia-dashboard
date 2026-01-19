import { redirect } from 'next/navigation';

/**
 * Ruta de redirect para mantener compatibilidad con URLs de edición
 * Redirige a la ruta detalle que maneja automáticamente modo edición
 */
export default function EditarTerrenoPage({ params }: { params: { id: string } }) {
  redirect(`/expansion/terrenos/${params.id}`);
}
