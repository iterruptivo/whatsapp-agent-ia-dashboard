'use client';

import { useAuth } from '@/lib/auth-context';
import { LogOut, User } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, signOut, loading } = useAuth();

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await signOut();
    }
  };

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
          {!loading && user && (
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
                <div className="text-white">
                  <p className="text-sm font-medium">{user.nombre}</p>
                  <p className="text-xs text-gray-300">{user.rol === 'admin' ? 'Administrador' : 'Vendedor'}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
