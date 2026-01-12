// ============================================================================
// PÁGINA: Administración de Usuarios
// ============================================================================
// Ruta: /admin/usuarios
// Descripción: CRUD de usuarios del sistema
// Acceso: Solo admin
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import UsuariosClient from '@/components/admin/UsuariosClient';
import {
  getAllUsuarios,
  getUsuariosStats,
  type UsuarioConDatos,
} from '@/lib/actions-usuarios';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConDatos[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    porRol: {} as Record<string, number>,
  });
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated or not admin/superadmin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.rol !== 'superadmin' && user.rol !== 'admin') {
        // Redirect según rol
        if (user.rol === 'vendedor') {
          router.push('/operativo');
        } else {
          router.push('/');
        }
      }
    }
  }, [user, loading, router]);

  // Fetch data
  useEffect(() => {
    if (user && (user.rol === 'superadmin' || user.rol === 'admin')) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [usuariosData, statsData] = await Promise.all([
        getAllUsuarios(),
        getUsuariosStats(),
      ]);
      setUsuarios(usuariosData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Show loading while auth is loading
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Only render for admin/superadmin
  if (user.rol !== 'superadmin' && user.rol !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Administración de Usuarios"
        subtitle="Gestión de usuarios del sistema"
      />

      {/* Contenido */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        ) : (
          <UsuariosClient
            initialUsuarios={usuarios}
            initialStats={stats}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}
