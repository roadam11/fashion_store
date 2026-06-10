export default function AccountLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-8" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-5 mb-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-3 w-full bg-gray-100 rounded mb-2" />
          <div className="h-3 w-3/4 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
