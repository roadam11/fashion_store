"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-lg font-semibold text-gray-900">משהו השתבש</h2>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
      >
        נסה שוב
      </button>
    </div>
  );
}
