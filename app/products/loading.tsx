export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] bg-gray-200 rounded-xl animate-pulse mb-3" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mb-1" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
