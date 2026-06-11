import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getCartItems } from "@/lib/cart/logic";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import CartPageClient from "./CartPageClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "עגלת קניות — Fashion Store" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;

  const session = await auth();
  let owner: { userId: string } | { sessionId: string };
  if (session?.user?.id) {
    owner = { userId: session.user.id };
  } else {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    if (!sessionId) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">
          <p className="mb-4">העגלה ריקה</p>
          <Link href="/products" className="text-indigo-600 hover:text-indigo-800 font-medium">
            לקניות →
          </Link>
        </div>
      );
    }
    owner = { sessionId };
  }

  const items = await getCartItems(prisma, owner);

  const total = items.reduce((sum, item) => {
    const price = item.variant.priceOverride ?? item.variant.product.basePrice;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">עגלת קניות</h1>

      {empty === "true" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          העגלה ריקה — הוסף מוצרים לפני המעבר לתשלום
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="mb-4">העגלה ריקה</p>
          <Link href="/products" className="text-indigo-600 hover:text-indigo-800 font-medium">
            לקניות →
          </Link>
        </div>
      ) : (
        <>
          <CartPageClient items={items} />
          <div className="mt-6 border-t border-gray-200 pt-6 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">סה״כ</span>
            <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
          </div>
          {session?.user && (
            <div className="mt-4">
              <Link
                href="/checkout"
                className="block w-full bg-gray-900 text-white text-center text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 transition-colors"
              >
                מעבר לתשלום
              </Link>
            </div>
          )}
          {!session?.user && (
            <div className="mt-4">
              <Link
                href="/auth/login?callbackUrl=/checkout"
                className="block w-full bg-gray-900 text-white text-center text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 transition-colors"
              >
                כניסה לחשבון לתשלום
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
