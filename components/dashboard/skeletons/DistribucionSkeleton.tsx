'use client';

export default function DistribucionSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gray-200" />
            <div className="text-gray-300 text-lg">→</div>
            <div className="w-20 h-20 rounded-full bg-gray-200" />
          </div>
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
