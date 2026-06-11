export default function CheckoutLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="h-8 bg-gray-100 rounded w-32 mb-8 animate-pulse" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 rounded w-40 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="mt-10 lg:mt-0">
          <div className="h-4 bg-gray-100 rounded w-32 mb-4 animate-pulse" />
          <div className="border border-gray-100 rounded-xl p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
