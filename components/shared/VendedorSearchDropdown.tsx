// ============================================================================
// COMPONENT: VendedorSearchDropdown
// ============================================================================
// Descripción: Dropdown con búsqueda para seleccionar vendedor
// Uso: Asignación de vendedores en leads, locales, etc.
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';

export interface VendedorOption {
  id: string;
  nombre: string;
  rol?: string; // 'vendedor' | 'vendedor_caseta'
  activo?: boolean;
}

interface VendedorSearchDropdownProps {
  vendedores: VendedorOption[];
  value: string | null;
  onChange: (vendedorId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean; // Muestra spinner mientras se procesa
  showRolBadge?: boolean;
  allowClear?: boolean; // Permite "Sin Asignar"
  clearLabel?: string;
  className?: string;
  size?: 'sm' | 'md'; // sm para tablas, md para modales
}

export default function VendedorSearchDropdown({
  vendedores,
  value,
  onChange,
  placeholder = 'Seleccionar vendedor...',
  disabled = false,
  isLoading = false,
  showRolBadge = true,
  allowClear = true,
  clearLabel = '-- Sin Asignar --',
  className = '',
  size = 'md',
}: VendedorSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calcular dirección y posición del dropdown al abrir
  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 280; // Altura aproximada del dropdown

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Abrir hacia arriba si no hay espacio suficiente abajo y hay más espacio arriba
    const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setOpenDirection(shouldOpenUp ? 'up' : 'down');
    // Dropdown 50% más ancho que el trigger, alineado a la izquierda
    const dropdownWidth = rect.width * 1.5;

    setDropdownPosition({
      top: shouldOpenUp ? rect.top - dropdownHeight : rect.bottom + 4,
      left: rect.left,
      width: dropdownWidth,
    });
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalcular posición en scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Obtener vendedor seleccionado
  const selectedVendedor = vendedores.find(v => v.id === value);

  // Filtrar vendedores por búsqueda
  const filteredVendedores = vendedores
    .filter(v => v.activo !== false) // Solo activos (si tiene el campo)
    .filter(v => v.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const handleSelect = (vendedorId: string) => {
    onChange(vendedorId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Estilos según tamaño
  const sizeStyles = {
    sm: {
      trigger: 'px-2 py-1 text-sm',
      dropdown: 'max-h-60',
      searchInput: 'py-1.5 text-sm',
      option: 'px-3 py-2 text-sm',
    },
    md: {
      trigger: 'px-4 py-2.5',
      dropdown: 'max-h-80',
      searchInput: 'py-2',
      option: 'px-4 py-2.5',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && !isLoading) {
            if (!isOpen) {
              calculatePosition();
            }
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled || isLoading}
        className={`w-full ${styles.trigger} text-left border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors flex items-center justify-between ${
          disabled || isLoading ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className={selectedVendedor ? 'text-gray-900' : 'text-gray-500'}>
          {isLoading ? 'Guardando...' : selectedVendedor ? selectedVendedor.nombre : placeholder}
        </span>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown - Fixed position para evitar clipping por overflow de padres */}
      {isOpen && (
        <div
          className={`fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg ${styles.dropdown} overflow-hidden`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar vendedor..."
                className={`w-full pl-9 pr-3 ${styles.searchInput} border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="max-h-52 overflow-y-auto">
            {/* Opción para limpiar */}
            {allowClear && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full ${styles.option} text-left hover:bg-gray-50 transition-colors border-b border-gray-100 text-gray-500`}
              >
                {clearLabel}
              </button>
            )}

            {/* Vendedores */}
            {filteredVendedores.map((vendedor) => (
              <button
                key={vendedor.id}
                type="button"
                onClick={() => handleSelect(vendedor.id)}
                className={`w-full ${styles.option} text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  value === vendedor.id ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate">{vendedor.nombre}</span>
                  {showRolBadge && vendedor.rol && (
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {vendedor.rol === 'vendedor' ? 'Vendedor' : 'Vendedor Caseta'}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {/* Empty state */}
            {filteredVendedores.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">
                No se encontraron vendedores
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
