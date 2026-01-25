'use client';

export default function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200"
        >
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-300 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
