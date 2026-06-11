"use client";

export default function CheckoutError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-gray-500 mb-4">אירעה שגיאה בדף התשלום</p>
      <button
        onClick={reset}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        נסה שוב
      </button>
    </div>
  );
}
