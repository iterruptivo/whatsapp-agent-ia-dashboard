'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationMetadata } from '@/types/reuniones';

interface ReunionPaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function ReunionPagination({
  pagination,
  onPageChange,
  loading = false,
}: ReunionPaginationProps) {
  const { page, totalPages, total, hasPrev, hasNext } = pagination;

  if (total === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-500 text-sm">No hay reuniones para mostrar</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Botón Anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev || loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium">Anterior</span>
        </button>

        {/* Info de Paginación */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-[#192c4d]">
            Página {page} de {totalPages}
          </p>
          <p className="text-xs text-gray-600">
            {total} {total === 1 ? 'reunión' : 'reuniones'} en total
          </p>
        </div>

        {/* Botón Siguiente */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          aria-label="Página siguiente"
        >
          <span className="font-medium">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-[#1b967a] border-t-transparent rounded-full animate-spin" />
            <span>Cargando reuniones...</span>
          </div>
        </div>
      )}

      {/* Navegación rápida (solo si hay muchas páginas) */}
      {totalPages > 3 && (
        <div className="mt-4 flex justify-center gap-2">
          {/* Primera página */}
          {page > 2 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center text-sm border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                1
              </button>
              {page > 3 && (
                <span className="flex items-center text-gray-400">...</span>
              )}
            </>
          )}

          {/* Páginas cercanas */}
          {[...Array(totalPages)].map((_, idx) => {
            const pageNum = idx + 1;
            if (
              pageNum === page ||
              pageNum === page - 1 ||
              pageNum === page + 1
            ) {
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading || pageNum === page}
                  className={`w-8 h-8 flex items-center justify-center text-sm border rounded-md transition-colors disabled:opacity-50 ${
                    pageNum === page
                      ? 'bg-[#1b967a] text-white border-[#1b967a]'
                      : 'border-gray-300 text-[#192c4d] hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            }
            return null;
          })}

          {/* Última página */}
          {page < totalPages - 1 && (
            <>
              {page < totalPages - 2 && (
                <span className="flex items-center text-gray-400">...</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center text-sm border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
