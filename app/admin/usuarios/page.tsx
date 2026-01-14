// ============================================================================
// PÁGINA: Administración de Usuarios
// ============================================================================
// Ruta: /admin/usuarios
// Descripción: CRUD de usuarios del sistema
// Acceso: Requiere permiso usuarios:read (RBAC)
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
import { canCurrentUser } from '@/lib/permissions/server';
import { isRBACEnabled } from '@/lib/permissions/types';

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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // RBAC: Verificar permiso usuarios:read
  useEffect(() => {
    async function checkAccess() {
      if (!loading && user) {
        // Si RBAC está habilitado, verificar permiso; si no, usar legacy
        if (isRBACEnabled()) {
          const canRead = await canCurrentUser('usuarios', 'read');
          setHasAccess(canRead);
        } else {
          // Fallback legacy: solo admin y superadmin
          const hasLegacyAccess = user.rol === 'admin' || user.rol === 'superadmin';
          setHasAccess(hasLegacyAccess);
        }
      }
    }
    checkAccess();
  }, [user, loading]);

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (hasAccess === false) {
        // Redirect según rol
        if (user.rol === 'vendedor') {
          router.push('/operativo');
        } else {
          router.push('/');
        }
      }
    }
  }, [user, loading, hasAccess, router]);

  // Fetch data
  useEffect(() => {
    if (hasAccess === true) {
      fetchData();
    }
  }, [hasAccess]);

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

  // Show loading while auth is loading or access check is pending
  if (loading || !user || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Only render if has access
  if (hasAccess === false) {
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
