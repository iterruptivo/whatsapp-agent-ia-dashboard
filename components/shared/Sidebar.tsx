// ============================================================================
// COMPONENT: Sidebar Menu
// ============================================================================
// Descripción: Menú lateral responsive con navegación role-based
// Features: Overlay, animación slide-in, ESC key, click outside
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { X, LayoutDashboard, Users, Home } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Menú items basado en rol
  const menuItems =
    user?.rol === 'admin'
      ? [
          { href: '/', label: 'Dashboard Gerencial', icon: LayoutDashboard },
          { href: '/operativo', label: 'Dashboard Operativo', icon: Users },
          { href: '/locales', label: 'Gestión de Locales', icon: Home },
        ]
      : user?.rol === 'vendedor'
      ? [
          { href: '/operativo', label: 'Dashboard Operativo', icon: Users },
          { href: '/locales', label: 'Gestión de Locales', icon: Home },
        ]
      : [
          // jefe_ventas y vendedor_caseta solo ven Locales
          { href: '/locales', label: 'Gestión de Locales', icon: Home },
        ];

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
          <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-primary text-white">
            {user?.rol === 'admin'
              ? 'Administrador'
              : user?.rol === 'vendedor'
              ? 'Vendedor'
              : user?.rol === 'jefe_ventas'
              ? 'Jefe de Ventas'
              : 'Vendedor Caseta'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
