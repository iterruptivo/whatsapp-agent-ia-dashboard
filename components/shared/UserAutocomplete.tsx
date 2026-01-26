'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface UserAutocompleteProps {
  usuarios: Usuario[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  allowedRoles?: string[];
  disabled?: boolean;
  excludeIds?: string[];
}

export default function UserAutocomplete({
  usuarios,
  value,
  onChange,
  placeholder = 'Buscar usuario...',
  allowedRoles,
  disabled = false,
  excludeIds = [],
}: UserAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar usuarios por roles permitidos y excluir IDs
  const filteredUsuarios = usuarios.filter(u => {
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(u.rol)) return false;
    if (excludeIds.includes(u.id)) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const codigo = u.email?.split('@')[0] || '';
    return (
      u.nombre?.toLowerCase().includes(searchLower) ||
      codigo.toLowerCase().includes(searchLower)
    );
  });

  // Usuario seleccionado
  const selectedUser = usuarios.find(u => u.id === value);
  const getCodigo = (email: string) => email?.split('@')[0] || '';

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (userId: string) => {
    onChange(userId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center border rounded-lg px-3 py-2 cursor-pointer transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white hover:border-[#1b967a]'
        } ${isOpen ? 'border-[#1b967a] ring-2 ring-[#1b967a]/20' : 'border-gray-300'}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {isOpen ? (
          <div className="flex items-center flex-1 gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 outline-none text-sm bg-transparent min-w-0"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center flex-1 gap-2 min-w-0">
            {selectedUser ? (
              <span className="text-sm text-gray-900 truncate">
                {selectedUser.nombre}{' '}
                <span className="text-gray-500">({getCodigo(selectedUser.email)})</span>
              </span>
            ) : (
              <span className="text-sm text-gray-400 truncate">{placeholder}</span>
            )}
          </div>
        )}

        {value && !disabled ? (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 rounded flex-shrink-0 ml-1"
            type="button"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredUsuarios.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500 text-center">
              {search ? 'No se encontraron usuarios' : 'Sin usuarios disponibles'}
            </div>
          ) : (
            filteredUsuarios.map(u => (
              <div
                key={u.id}
                className={`px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  u.id === value
                    ? 'bg-[#1b967a] text-white'
                    : 'hover:bg-[#1b967a]/10'
                }`}
                onClick={() => handleSelect(u.id)}
              >
                <span className="font-medium">{u.nombre}</span>
                <span className={u.id === value ? 'text-white/80 ml-1' : 'text-gray-500 ml-1'}>
                  ({getCodigo(u.email)})
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
