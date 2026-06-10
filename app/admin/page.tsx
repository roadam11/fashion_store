import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/admin/logic";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "לוח בקרה — Admin" };

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  // Revenue and counts computed server-side in agorot; formatted here for display
  const stats = await getDashboardStats(prisma);

  const cards = [
    { label: "הכנסות (הזמנות פעילות)", value: formatPrice(stats.revenueAgorot), color: "bg-green-50 border-green-200" },
    { label: "סה״כ הזמנות", value: String(stats.totalOrders), color: "bg-blue-50 border-blue-200" },
    { label: "מוצרים פעילים", value: String(stats.activeProducts), color: "bg-indigo-50 border-indigo-200" },
    { label: "משתמשים רשומים", value: String(stats.totalUsers), color: "bg-purple-50 border-purple-200" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-full">ADMIN</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className={`border rounded-xl p-5 ${c.color}`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/products" className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors">
          <h2 className="font-semibold text-gray-900 mb-1">ניהול מוצרים</h2>
          <p className="text-sm text-gray-500">הוסף, ערוך ונהל מוצרים וגרסאות</p>
        </Link>
        <Link href="/admin/orders" className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors">
          <h2 className="font-semibold text-gray-900 mb-1">ניהול הזמנות</h2>
          <p className="text-sm text-gray-500">עדכן סטטוס הזמנות ועקוב אחר משלוחים</p>
        </Link>
      </div>
    </div>
  );
}
