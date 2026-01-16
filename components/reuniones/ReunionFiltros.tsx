'use client';

import { Filter, X, Check, ChevronsUpDown, Search } from 'lucide-react';
import { ReunionEstado } from '@/types/reuniones';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from 'cmdk';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

interface ReunionFiltrosProps {
  fechaDesde: string;
  fechaHasta: string;
  estado: ReunionEstado | 'todos';
  createdByFilter: 'all' | 'mine' | string;
  onFechaDesdeChange: (fecha: string) => void;
  onFechaHastaChange: (fecha: string) => void;
  onEstadoChange: (estado: ReunionEstado | 'todos') => void;
  onCreatedByFilterChange: (filter: 'all' | 'mine' | string) => void;
  onLimpiar: () => void;
  loading?: boolean;
}

// Componente Combobox para filtro de usuarios
interface ComboboxUsuariosProps {
  usuarios: Usuario[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function ComboboxUsuarios({ usuarios, value, onChange, disabled, loading }: ComboboxUsuariosProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Manejar montaje del componente (para evitar hidratación mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Actualizar posición en scroll/resize
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Obtener label del valor seleccionado
  const getSelectedLabel = () => {
    if (value === 'mine') return 'Mis reuniones';
    if (value === 'all') return 'Todas';
    const usuario = usuarios.find((u) => u.id === value);
    return usuario ? usuario.nombre : 'Seleccionar...';
  };

  // Filtrar usuarios por búsqueda
  const filteredUsuarios = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // TODO: Implementar contadores desde el backend
  // const contadores = { mine: 3, all: 47, [userId]: 12 }

  // Renderizar el dropdown
  const renderDropdown = () => {
    if (!open || disabled || loading || !mounted) return null;

    const dropdownContent = (
      <div
        ref={dropdownRef}
        className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
        }}
      >
        <Command className="rounded-md" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <CommandInput
              placeholder="Buscar usuario..."
              value={search}
              onValueChange={setSearch}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandGroup>
              <CommandItem
                value="mine"
                onSelect={() => {
                  onChange('mine');
                  setOpen(false);
                  setSearch('');
                }}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span className="text-yellow-500">★</span>
                  <span>Mis reuniones</span>
                </span>
                {value === 'mine' && <Check className="w-4 h-4 text-[#1b967a]" />}
              </CommandItem>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                  setSearch('');
                }}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span className="text-yellow-500">★</span>
                  <span>Todas</span>
                </span>
                {value === 'all' && <Check className="w-4 h-4 text-[#1b967a]" />}
              </CommandItem>
            </CommandGroup>

            {usuarios.length > 0 && (
              <>
                <CommandSeparator className="h-px bg-gray-200 my-1" />
                <CommandGroup heading="USUARIOS" className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                  {filteredUsuarios.length > 0 ? (
                    filteredUsuarios.map((usuario) => (
                      <CommandItem
                        key={usuario.id}
                        value={usuario.id}
                        onSelect={() => {
                          onChange(usuario.id);
                          setOpen(false);
                          setSearch('');
                        }}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{usuario.nombre}</span>
                          <span className="text-xs text-gray-500">{usuario.email}</span>
                        </div>
                        {value === usuario.id && <Check className="w-4 h-4 text-[#1b967a]" />}
                      </CommandItem>
                    ))
                  ) : (
                    <CommandEmpty className="px-3 py-2 text-sm text-gray-500">
                      No se encontraron usuarios
                    </CommandEmpty>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && !loading && setOpen(!open)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm bg-white text-left flex items-center justify-between"
      >
        <span className={value === 'mine' || value === 'all' ? '' : 'text-gray-900'}>
          {getSelectedLabel()}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-gray-400" />
      </button>

      {renderDropdown()}
    </div>
  );
}

export default function ReunionFiltros({
  fechaDesde,
  fechaHasta,
  estado,
  createdByFilter,
  onFechaDesdeChange,
  onFechaHastaChange,
  onEstadoChange,
  onCreatedByFilterChange,
  onLimpiar,
  loading = false,
}: ReunionFiltrosProps) {
  const { user, selectedProyecto } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Determinar si puede ver filtro de creador
  const esAdminRol = user && ['superadmin', 'admin', 'gerencia'].includes(user.rol);

  // Cargar lista de usuarios creadores
  useEffect(() => {
    if (!esAdminRol || !selectedProyecto) return;

    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        const response = await fetch(
          `/api/usuarios?activos_only=true&con_reuniones=true&proyecto_id=${selectedProyecto.id}`
        );
        const data = await response.json();
        if (data.success) {
          setUsuarios(data.usuarios);
        }
      } catch (error) {
        console.error('Error fetching usuarios:', error);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    fetchUsuarios();
  }, [esAdminRol, selectedProyecto]);

  const tienesFiltrosActivos =
    fechaDesde !== '' ||
    fechaHasta !== '' ||
    estado !== 'todos' ||
    (createdByFilter !== 'all' && createdByFilter !== 'mine');

  return (
    <div>
      {/* Filtros Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Fecha Desde */}
        <div>
          <label
            htmlFor="fecha-desde"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Fecha Desde
          </label>
          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* Fecha Hasta */}
        <div>
          <label
            htmlFor="fecha-hasta"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Fecha Hasta
          </label>
          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            disabled={loading}
            min={fechaDesde || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* Estado */}
        <div>
          <label
            htmlFor="estado"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Estado
          </label>
          <select
            id="estado"
            value={estado}
            onChange={(e) =>
              onEstadoChange(e.target.value as ReunionEstado | 'todos')
            }
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          >
            <option value="todos">Todos</option>
            <option value="subiendo">Subiendo</option>
            <option value="procesando">Procesando</option>
            <option value="completado">Completado</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Filtro Creador - Solo para admin/gerencia */}
        {esAdminRol && (
          <div>
            <label
              htmlFor="created-by-filter"
              className="block text-sm font-medium text-[#192c4d] mb-1"
            >
              Ver reuniones de
            </label>
            <ComboboxUsuarios
              usuarios={usuarios}
              value={createdByFilter}
              onChange={onCreatedByFilterChange}
              disabled={loading}
              loading={loadingUsuarios}
            />
          </div>
        )}

        {/* Botón Limpiar */}
        {tienesFiltrosActivos && (
          <div className="flex items-end">
            <button
              onClick={onLimpiar}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-[#1b967a] border border-gray-300 rounded-md hover:border-[#1b967a] transition-colors disabled:opacity-50"
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
              <span>Limpiar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
