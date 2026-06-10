"use client";

export default function ProductsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">אירעה שגיאה בטעינת המוצרים</h2>
      <p className="text-sm text-gray-500 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
      >
        נסה שוב
      </button>
    </div>
  );
}
