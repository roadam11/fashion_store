import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrdersForUser } from "@/lib/orders/logic";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "החשבון שלי — Fashion Store" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const orders = await getOrdersForUser(prisma, session.user.id);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "ממתין", PAID: "שולם", PROCESSING: "בעיבוד",
    SHIPPED: "נשלח", DELIVERED: "נמסר", CANCELLED: "בוטל", REFUNDED: "הוחזר",
  };
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">החשבון שלי</h1>
      <p className="text-gray-500 mb-8">{session.user.email}</p>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">היסטוריית הזמנות</h2>
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-4">עדיין אין הזמנות</p>
            <Link href="/products" className="text-indigo-600 hover:text-indigo-800 font-medium">
              לקניות →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-700">
                      <span>{item.productName} — {item.size} / {item.color} × {item.quantity}</span>
                      <span>{formatPrice(item.priceAtTime * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-900">סה״כ</span>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {order.shippingCity}, {order.shippingStreet}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
