'use client';

export default function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="animate-pulse">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="flex items-center justify-center h-48">
              <div className="w-32 h-32 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
