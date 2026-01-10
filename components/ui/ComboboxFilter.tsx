// ============================================================================
// COMPONENT: ComboboxFilter
// ============================================================================
// Descripción: Combobox con autocomplete para filtros - UX nivel mundial 2026
// Basado en cmdk (usado por Linear, Vercel, Raycast)
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxFilterProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export default function ComboboxFilter({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay resultados',
  className = '',
}: ComboboxFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Encuentra el label del valor seleccionado
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Cierra el dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus en el input de búsqueda cuando se abre
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Maneja la selección
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearch('');
  };

  // Limpia la selección
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center justify-between gap-2 w-full min-w-[160px]
          px-4 py-2.5 border rounded-lg bg-white text-left text-sm
          font-semibold transition-all duration-200 whitespace-nowrap
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          ${open ? 'ring-2 ring-primary border-transparent' : 'border-gray-200'}
          ${value ? 'text-gray-900' : 'text-gray-500'}
        `}
      >
        <span className="truncate">{displayValue}</span>
        <div className="flex items-center gap-1.5">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
              title="Limpiar"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Panel - Fixed position for better visibility */}
      {open && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              pointerEvents: 'auto',
              top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 4 : 0,
              left: containerRef.current ? containerRef.current.getBoundingClientRect().left : 0,
              minWidth: containerRef.current ? Math.max(containerRef.current.getBoundingClientRect().width, 280) : 280,
              maxWidth: '90vw',
            }}
          >
            <Command className="w-full" shouldFilter={true}>
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-base outline-none placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Options List - Increased max height */}
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-base text-gray-500">
                  {emptyMessage}
                </Command.Empty>

                {/* Option: Clear / All */}
                <Command.Item
                  value="__clear__"
                  onSelect={() => handleSelect('')}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-base
                    transition-colors duration-100
                    ${!value ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}
                    data-[selected=true]:bg-gray-100
                  `}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {!value && <Check className="w-4 h-4" />}
                  </div>
                  <span className="font-medium">{placeholder}</span>
                </Command.Item>

                <div className="h-px bg-gray-100 my-2" />

                {/* Options */}
                {options.map((option) => (
                  <Command.Item
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-base
                      transition-colors duration-100
                      ${value === option.value ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}
                      data-[selected=true]:bg-gray-100
                    `}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {value === option.value && <Check className="w-4 h-4" />}
                    </div>
                    <span className="truncate">{option.label}</span>
                  </Command.Item>
                ))}
              </Command.List>

              {/* Footer with count */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">
                  {options.length} opciones disponibles
                </span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </div>
  );
}
