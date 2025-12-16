'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface SearchDropdownProps {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}

export default function SearchDropdown({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  allowClear = true,
  clearLabel = '-- Ninguno --',
  className = '',
  size = 'md',
  label,
}: SearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Para usar createPortal necesitamos estar en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 280;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    const dropdownWidth = rect.width;

    setDropdownPosition({
      top: shouldOpenUp ? rect.top - dropdownHeight : rect.bottom + 4,
      left: rect.left,
      width: dropdownWidth,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only process if dropdown is open
      if (!isOpen) return;

      const target = event.target as Node;

      // Check if click is inside the container (button area)
      if (containerRef.current?.contains(target)) {
        return; // Click inside container, do nothing
      }

      // Check if click is inside the dropdown menu
      if (dropdownRef.current?.contains(target)) {
        return; // Click inside dropdown, do nothing
      }

      // Click is outside both - close the dropdown
      setIsOpen(false);
      setSearchTerm('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const sizeStyles = {
    sm: {
      trigger: 'px-2 py-1 text-sm',
      dropdown: 'max-h-60',
      searchInput: 'py-1.5 text-sm',
      option: 'px-3 py-2 text-sm',
    },
    md: {
      trigger: 'px-3 py-2',
      dropdown: 'max-h-80',
      searchInput: 'py-2',
      option: 'px-4 py-2.5',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (!isOpen) {
                calculatePosition();
              }
              setIsOpen(!isOpen);
            }
          }}
          disabled={disabled}
          className={`w-full ${styles.trigger} text-left border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors flex items-center justify-between ${
            disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
          }`}
        >
          <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && isMounted && createPortal(
          <div
            ref={dropdownRef}
            className={`fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl ${styles.dropdown} overflow-hidden`}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className={`w-full pl-9 pr-3 ${styles.searchInput} border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {allowClear && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleSelect('')}
                  className={`w-full ${styles.option} text-left hover:bg-gray-50 transition-colors border-b border-gray-100 text-gray-500`}
                >
                  {clearLabel}
                </button>
              )}

              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full ${styles.option} text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    value === option.value ? 'bg-primary/5 font-medium' : ''
                  }`}
                >
                  <span className="text-gray-900">{option.label}</span>
                </button>
              ))}

              {filteredOptions.length === 0 && (
                <p className="px-4 py-4 text-sm text-gray-500 text-center">
                  No se encontraron opciones
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
