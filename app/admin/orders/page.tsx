import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import AdminOrderStatusForm from "@/components/admin/AdminOrderStatusForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "הזמנות — Admin" };

const ALLOWED_NEXT: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [], CANCELLED: [], REFUNDED: [],
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "ממתין", PAID: "שולם", PROCESSING: "בעיבוד",
  SHIPPED: "נשלח", DELIVERED: "נמסר", CANCELLED: "בוטל", REFUNDED: "הוחזר",
};

export default async function AdminOrdersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const orders = await prisma.order.findMany({
    include: { items: true, user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ניהול הזמנות</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-gray-200 rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-mono text-gray-400">#{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm font-medium text-gray-900">{order.user.name} — {order.user.email}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("he-IL")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatPrice(order.totalAmount)}</span>
                <AdminOrderStatusForm
                  orderId={order.id}
                  currentStatus={order.status}
                  allowedNext={ALLOWED_NEXT[order.status] ?? []}
                  statusLabels={STATUS_LABELS}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              {order.items.map((item) => (
                <div key={item.id}>
                  {item.productName} — {item.size}/{item.color} × {item.quantity} ({formatPrice(item.priceAtTime)})
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center py-16 text-gray-500">אין הזמנות עדיין</p>}
      </div>
    </div>
  );
}
