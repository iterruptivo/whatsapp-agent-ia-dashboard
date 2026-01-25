'use client';

interface TableSkeletonProps {
  rows?: number;
  title?: string;
}

export default function TableSkeleton({ rows = 5, title = 'Cargando...' }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded" />
            <div className="h-5 w-48 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>

        {/* Table header */}
        <div className="flex gap-4 py-2 border-b border-gray-200 mb-2">
          <div className="h-3 w-8 bg-gray-200 rounded" />
          <div className="h-3 flex-1 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>

        {/* Table rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-dotted border-gray-100">
            <div className="h-4 w-8 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-3 w-16 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-6 w-12 bg-gray-300 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
