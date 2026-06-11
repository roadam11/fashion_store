import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCartItems } from "@/lib/cart/logic";
import { getSavedAddresses } from "@/lib/checkout/logic";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import CheckoutForm from "./CheckoutForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "תשלום — Fashion Store" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/checkout");

  const { cancelled } = await searchParams;

  const userId = session.user.id;

  const [cartItems, savedAddresses] = await Promise.all([
    getCartItems(prisma, { userId }),
    getSavedAddresses(prisma, userId),
  ]);

  if (cartItems.length === 0) redirect("/cart?empty=true");

  const lines = cartItems.map((item) => ({
    id: item.id,
    productName: item.variant.product.name,
    size: item.variant.size,
    color: item.variant.color,
    quantity: item.quantity,
    price: item.variant.priceOverride ?? item.variant.product.basePrice,
    image: item.variant.product.images[0] ?? null,
  }));

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">תשלום</h1>

      {cancelled === "true" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          התשלום בוטל — העגלה שלך שמורה, תוכל לנסות שוב
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        {/* Address form — RTL: this column appears on the right */}
        <div>
          <CheckoutForm savedAddresses={savedAddresses} />
        </div>

        {/* Order summary */}
        <div className="mt-10 lg:mt-0">
          <h2 className="text-base font-semibold text-gray-900 mb-4">סיכום הזמנה</h2>
          <div className="border border-gray-200 rounded-xl p-5 space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm text-gray-700">
                <span>
                  {line.productName}{" "}
                  <span className="text-gray-400">
                    {line.size} / {line.color} × {line.quantity}
                  </span>
                </span>
                <span className="font-medium whitespace-nowrap mr-4">
                  {formatPrice(line.price * line.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">סה״כ לתשלום</span>
              <span className="font-bold text-gray-900 text-lg">{formatPrice(total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            המחירים כוללים מע״מ • תשלום מאובטח דרך Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
