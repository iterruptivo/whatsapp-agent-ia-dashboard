// ============================================================================
// COMPONENT: Sidebar Menu
// ============================================================================
// Descripción: Menú lateral responsive con navegación role-based
// Features: Overlay, animación slide-in, ESC key, click outside, submenús
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { X, LayoutDashboard, Users, Home, ChevronDown, ChevronRight, DollarSign, Settings, FileText, Zap } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: any;
}

interface MenuCategory {
  label: string;
  icon: any;
  items: MenuItem[];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Estado para controlar qué categorías están expandidas
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['finanzas']);

  // Toggle categoría expandida/colapsada
  const toggleCategory = (categoryLabel: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryLabel)
        ? prev.filter((cat) => cat !== categoryLabel)
        : [...prev, categoryLabel]
    );
  };

  // Estructura de menú basado en rol
  // Puede tener items directos O categorías con subitems
  const getMenuStructure = () => {
    // Construir items de Finanzas según el rol
    const finanzasItems: MenuItem[] = [
      { href: '/locales', label: 'Gestión de Locales', icon: Home }
    ];

    // Control de Pagos: Solo admin y jefe_ventas
    if (user?.rol === 'admin' || user?.rol === 'jefe_ventas') {
      finanzasItems.push({ href: '/control-pagos', label: 'Control de Pagos', icon: FileText });
    }

    // Comisiones: Todos los roles
    finanzasItems.push({ href: '/comisiones', label: 'Comisiones', icon: DollarSign });

    const finanzasCategory: MenuCategory = {
      label: 'Finanzas',
      icon: DollarSign,
      items: finanzasItems,
    };

    if (user?.rol === 'admin') {
      return {
        directItems: [
          { href: '/', label: 'Dashboard Gerencial', icon: LayoutDashboard },
          { href: '/operativo', label: 'Dashboard Operativo', icon: Users },
        ],
        categories: [finanzasCategory],
        bottomItems: [
          { href: '/repulse', label: 'Repulse', icon: Zap },
          { href: '/configuracion-proyectos', label: 'Configurar Proyectos', icon: Settings },
        ],
      };
    }

    if (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta') {
      return {
        directItems: [{ href: '/operativo', label: 'Dashboard Operativo', icon: Users }],
        categories: [finanzasCategory],
        bottomItems: [] as MenuItem[],
      };
    }

    // jefe_ventas tiene acceso a Repulse
    if (user?.rol === 'jefe_ventas') {
      return {
        directItems: [],
        categories: [finanzasCategory],
        bottomItems: [
          { href: '/repulse', label: 'Repulse', icon: Zap },
        ],
      };
    }

    // coordinador solo ve Finanzas (locales, comisiones, etc)
    if (user?.rol === 'coordinador') {
      return {
        directItems: [],
        categories: [finanzasCategory],
        bottomItems: [] as MenuItem[],
      };
    }

    // finanzas SOLO ve Control de Pagos (sin categorías, item directo)
    if (user?.rol === 'finanzas') {
      return {
        directItems: [
          { href: '/control-pagos', label: 'Control de Pagos', icon: FileText },
        ],
        categories: [],
        bottomItems: [] as MenuItem[],
      };
    }

    // Fallback (no debería llegar aquí si el rol está definido)
    return {
      directItems: [],
      categories: [finanzasCategory],
      bottomItems: [] as MenuItem[],
    };
  };

  const menuStructure = getMenuStructure();

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
              : user?.rol === 'vendedor_caseta'
              ? 'Vendedor Caseta'
              : user?.rol === 'coordinador'
              ? 'Coordinador'
              : 'Finanzas'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {/* Items Directos (sin categoría) */}
          {menuStructure.directItems.map((item) => {
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

          {/* Categorías con Submenús */}
          {menuStructure.categories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories.includes(category.label.toLowerCase());
            const hasActiveItem = category.items.some((item) => pathname === item.href);

            return (
              <div key={category.label} className="space-y-1">
                {/* Category Header (Clickable para expandir/colapsar) */}
                <button
                  onClick={() => toggleCategory(category.label.toLowerCase())}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    hasActiveItem && !isExpanded
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-5 h-5" />
                    <span className="font-medium">{category.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Subitems (Visible cuando expandido) */}
                {isExpanded && (
                  <div className="ml-4 space-y-1 animate-fadeIn">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigate(item.href)}
                          data-menu-item={item.href.replace('/', '')}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                            isActive
                              ? 'bg-primary text-white shadow-md'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Items (renderizados al final, después de categorías) */}
          {menuStructure.bottomItems && menuStructure.bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                data-menu-item={item.href.replace('/', '')}
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
