import { prisma } from "@/lib/db";
import ProductCard from "@/components/shop/ProductCard";
import Link from "next/link";

const CATEGORIES = [
  { slug: "shirts", name: "חולצות", emoji: "👕" },
  { slug: "pants", name: "מכנסיים", emoji: "👖" },
  { slug: "dresses", name: "שמלות", emoji: "👗" },
  { slug: "jackets", name: "ז׳קטים", emoji: "🧥" },
  { slug: "shoes", name: "נעליים", emoji: "👟" },
];

export default async function HomePage() {
  const featured = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { where: { isActive: true }, select: { size: true, color: true, stock: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              הקולקציה
              <br />
              <span className="text-gray-400">החדשה הגיעה</span>
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              מבחר מוצרי אופנה איכותיים לכל עונה ולכל סגנון.
            </p>
            <Link
              href="/products"
              className="inline-block bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              לקניות →
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6">קניה לפי קטגוריה</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">מוצרים חדשים</h2>
          <Link href="/products" className="text-sm text-indigo-600 hover:text-indigo-800">
            ראה הכל →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {featured.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      </section>
    </div>
  );
}
