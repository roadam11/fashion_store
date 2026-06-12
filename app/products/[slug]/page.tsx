import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import ProductClient from "./ProductClient";

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

  const inStock = product.variants.some((v) => v.stock > 0);
  const mainImage = product.images[0] ?? null;

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
        {/* Product image */}
        <div className="aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden relative">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-20">{product.category.name[0]}</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-900 mb-6">{formatPrice(product.basePrice)}</p>
          <p className="text-gray-600 text-sm leading-relaxed mb-8">{product.description}</p>

          {/* Interactive size/color/add-to-cart */}
          <ProductClient variants={product.variants} />

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {inStock ? "✓ במלאי" : "✗ אזל מהמלאי"}
            </p>
          </div>
        </div>
      </div>

      {/* Additional images */}
      {product.images.length > 1 && (
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {product.images.slice(1).map((img, i) => (
            <div key={i} className="aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden relative">
              <Image
                src={img}
                alt={`${product.name} ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
