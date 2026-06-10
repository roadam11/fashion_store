import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import AdminProductActions from "@/components/admin/AdminProductActions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "מוצרים — Admin" };

export default async function AdminProductsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ניהול מוצרים</h1>
        <AdminProductActions categories={categories} mode="create" />
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className={`border rounded-xl p-5 ${product.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  {!product.isActive && (
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">מושבת</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{product.category.name} · {formatPrice(product.basePrice)} · {product._count.variants} גרסאות</p>
                {product.images.length > 0 && (
                  <p className="text-xs text-indigo-500 mt-0.5">{product.images.length} תמונות</p>
                )}
              </div>
              <AdminProductActions
                product={{ id: product.id, name: product.name, description: product.description, basePrice: product.basePrice, categoryId: product.categoryId, images: product.images, isActive: product.isActive }}
                categories={categories}
                variants={product.variants}
                mode="edit"
              />
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-center py-16 text-gray-500">אין מוצרים</p>}
      </div>
    </div>
  );
}
