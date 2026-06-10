import Link from "next/link";
import { auth } from "@/lib/auth";
import { ShoppingBag, User, Menu } from "lucide-react";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
            FASHION
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              כל המוצרים
            </Link>
            <Link href="/products?category=shirts" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              חולצות
            </Link>
            <Link href="/products?category=dresses" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              שמלות
            </Link>
            <Link href="/products?category=jackets" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              ז׳קטים
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <div className="flex items-center gap-4">
                {session.user.role === "ADMIN" && (
                  <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    ניהול
                  </Link>
                )}
                <Link href="/account" className="text-gray-600 hover:text-gray-900">
                  <User className="h-5 w-5" />
                </Link>
              </div>
            ) : (
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                כניסה
              </Link>
            )}
            <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
