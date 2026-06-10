"use client";
export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h2 className="text-lg font-semibold mb-4">שגיאה בטעינת החשבון</h2>
      <button onClick={reset} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg">נסה שוב</button>
    </div>
  );
}
