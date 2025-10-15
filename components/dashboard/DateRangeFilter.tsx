'use client';

import { Calendar, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClear: () => void;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  defaultDateFrom = '',
  defaultDateTo = '',
}: DateRangeFilterProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasActiveFilter = dateFrom || dateTo;
  const isDefaultRange =
    dateFrom === defaultDateFrom && dateTo === defaultDateTo && defaultDateFrom && defaultDateTo;

  // Solo mostrar botón si el usuario cambió las fechas (NO es el rango por defecto)
  const showClearButton = hasActiveFilter && !isDefaultRange;

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Reset after animation
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left side: Date filters */}
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            <span className="text-sm font-medium text-gray-700">Filtrar por fecha:</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="date-from" className="text-sm text-gray-600">
                Desde:
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="date-to" className="text-sm text-gray-600">
                Hasta:
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {showClearButton && (
              <button
                onClick={onClear}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <X size={16} />
                Limpiar Selección
              </button>
            )}
          </div>
        </div>

        {/* Right side: Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Actualizar datos desde la base de datos"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {hasActiveFilter && (
        <div className="w-full mt-2 text-xs text-gray-500">
          {isDefaultRange ? (
            <span className="text-gray-600">
              Mostrando leads de los últimos 30 días por defecto
            </span>
          ) : (
            <>
              Mostrando leads capturados{' '}
              {dateFrom && dateTo
                ? `entre ${dateFrom.split('-').reverse().join('/')} y ${dateTo.split('-').reverse().join('/')}`
                : dateFrom
                ? `desde ${dateFrom.split('-').reverse().join('/')}`
                : `hasta ${dateTo.split('-').reverse().join('/')}`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
