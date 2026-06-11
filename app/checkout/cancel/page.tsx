import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "תשלום בוטל — Fashion Store" };

export default function CheckoutCancelPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
        <span className="text-2xl">✕</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">התשלום בוטל</h1>
      <p className="text-gray-500 text-sm mb-8">
        לא בוצע חיוב. העגלה שלך שמורה — תוכל לנסות שוב בכל עת.
      </p>
      <div className="flex gap-3">
        <Link
          href="/checkout"
          className="flex-1 bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 transition-colors"
        >
          נסה שוב
        </Link>
        <Link
          href="/cart"
          className="flex-1 border border-gray-300 text-sm font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
        >
          חזור לעגלה
        </Link>
      </div>
    </div>
  );
}
