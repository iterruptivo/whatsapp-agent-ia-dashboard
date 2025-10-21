'use client';

import { useAuth } from '@/lib/auth-context';
import { LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, signOut, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    showDialog({
      title: '¿Cerrar sesión?',
      message: 'Vas a cerrar sesión. Tendrás que volver a iniciar sesión para acceder al dashboard.',
      variant: 'danger',
      confirmText: 'Cerrar Sesión',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await signOut();
      },
    });
  };

  // Debug logging
  useEffect(() => {
    if (isClient) {
      console.log('[DashboardHeader] State:', { isClient, loading, hasUser: !!user, userName: user?.nombre });
    }
  }, [isClient, loading, user]);

  return (
    <header className="bg-secondary shadow-md">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-gray-300 mt-1">{subtitle}</p>
          </div>

          {/* User Info & Logout Section */}
          {isClient ? (
            loading ? (
              // Loading state
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                <span className="hidden sm:inline">Cargando...</span>
              </div>
            ) : user ? (
              // User logged in
              <div className="flex items-center gap-2 sm:gap-4">
                {/* User Info - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                  <div className="text-white">
                    <p className="text-sm font-medium">{user.nombre}</p>
                    <p className="text-xs text-gray-300">
                      {user.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                    </p>
                  </div>
                </div>

                {/* Logout Button - Always visible, icon-only on mobile */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            ) : null
          ) : null}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        onClose={closeDialog}
        onConfirm={config.onConfirm}
        title={config.title}
        message={config.message}
        type={config.type}
        variant={config.variant}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        showCancel={config.showCancel}
      />
    </header>
  );
}
