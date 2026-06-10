import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!product) return { title: "מוצר לא נמצא" };
  return { title: `${product.name} — Fashion Store`, description: product.description };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
  });

  if (!product) notFound();

  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const colors = [...new Set(product.variants.map((v) => v.color))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-900">בית</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-gray-900">מוצרים</Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-gray-900">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image placeholder */}
        <div className="aspect-[3/4] bg-stone-100 rounded-2xl flex items-center justify-center">
          <span className="text-8xl opacity-20">{product.category.name[0]}</span>
        </div>

        {/* Product info */}
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-900 mb-6">{formatPrice(product.basePrice)}</p>

          <p className="text-gray-600 text-sm leading-relaxed mb-8">{product.description}</p>

          {/* Size selector */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">מידה</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const hasStock = product.variants.some((v) => v.size === size && v.stock > 0);
                return (
                  <span
                    key={size}
                    className={`px-4 py-2 border rounded-lg text-sm ${
                      hasStock
                        ? "border-gray-300 text-gray-900"
                        : "border-gray-200 text-gray-400 line-through cursor-not-allowed"
                    }`}
                  >
                    {size}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Color selector */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">צבע</h3>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const hasStock = product.variants.some((v) => v.color === color && v.stock > 0);
                return (
                  <span
                    key={color}
                    className={`px-4 py-2 border rounded-lg text-sm ${
                      hasStock
                        ? "border-gray-300 text-gray-900"
                        : "border-gray-200 text-gray-400 line-through cursor-not-allowed"
                    }`}
                  >
                    {color}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Add to cart — wired in Phase 3 */}
          <button
            disabled
            className="w-full py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            הוסף לעגלה
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">בחר מידה וצבע להוספה לעגלה</p>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {product.variants.some((v) => v.stock > 0) ? "✓ במלאי" : "✗ אזל מהמלאי"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
