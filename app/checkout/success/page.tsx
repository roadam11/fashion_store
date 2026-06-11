import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrderById } from "@/lib/orders/logic";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import OrderStatusPoller from "./OrderStatusPoller";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "אישור הזמנה — Fashion Store" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/account");

  // Ownership check — getOrderById returns null if order doesn't belong to this user
  const order = await getOrderById(prisma, orderId, session.user.id);
  if (!order) redirect("/account");

  const isPending = order.status === "PENDING";
  const isSuccess = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
  const isAttention = order.status === "NEEDS_ATTENTION";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      {/* ── PENDING: payment still processing ────────────────────────────── */}
      {isPending && (
        <>
          <OrderStatusPoller />
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">מעבד את התשלום…</h1>
            <p className="text-gray-500 text-sm">הדף יתרענן אוטומטית. אנא המתן.</p>
          </div>
        </>
      )}

      {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
      {isSuccess && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ההזמנה אושרה!</h1>
          <p className="text-gray-500 text-sm">תודה על הרכישה</p>
        </div>
      )}

      {/* ── NEEDS ATTENTION ──────────────────────────────────────────────── */}
      {isAttention && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">אירעה בעיה עם ההזמנה</h1>
          <p className="text-gray-500 text-sm">
            התשלום התקבל אך המלאי אזל. צוות שירות הלקוחות יצור קשר לטיפול בנושא.
          </p>
        </div>
      )}

      {/* ── Order details (shown for non-pending states) ──────────────────── */}
      {!isPending && (
        <div className="border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 font-mono">
                #{order.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(order.createdAt).toLocaleDateString("he-IL")}
              </p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-700">
                <span>
                  {item.productName}{" "}
                  <span className="text-gray-400">
                    {item.size} / {item.color} × {item.quantity}
                  </span>
                </span>
                <span className="mr-4 font-medium">
                  {formatPrice(item.priceAtTime * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="text-sm font-semibold text-gray-900">סה״כ</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            {order.shippingCity}, {order.shippingStreet}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/account"
          className="flex-1 text-center bg-gray-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-gray-700 transition-colors"
        >
          הזמנות שלי
        </Link>
        <Link
          href="/products"
          className="flex-1 text-center border border-gray-300 text-sm font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
        >
          המשך קניות
        </Link>
      </div>
    </div>
  );
}
