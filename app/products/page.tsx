import { prisma } from "@/lib/db";
import { catalogParamsSchema } from "@/lib/validations/product";
import ProductCard from "@/components/shop/ProductCard";
import FilterSidebar from "@/components/shop/FilterSidebar";
import Pagination from "@/components/shop/Pagination";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "כל המוצרים — Fashion Store" };

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = catalogParamsSchema.parse({
    category: raw.category,
    size: raw.size,
    color: raw.color,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    page: raw.page,
    q: raw.q,
  });

  const variantWhere = {
    isActive: true,
    stock: { gt: 0 },
    ...(params.size && { size: params.size }),
    ...(params.color && { color: params.color }),
  };

  const productWhere = {
    isActive: true,
    ...(params.category && { category: { slug: params.category } }),
    ...(params.q && { name: { contains: params.q, mode: "insensitive" as const } }),
    variants: { some: variantWhere },
  };

  const [products, total, categories, allVariants] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          select: { size: true, color: true, stock: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where: productWhere }),
    prisma.category.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { size: true, color: true },
      distinct: ["size", "color"],
    }),
  ]);

  const sizes = [...new Set(allVariants.map((v) => v.size))].sort();
  const colors = [...new Set(allVariants.map((v) => v.color))].sort();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {params.category
            ? categories.find((c) => c.slug === params.category)?.name ?? "מוצרים"
            : "כל המוצרים"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{total} מוצרים</p>
      </div>

      <div className="flex gap-10">
        <div className="hidden lg:block w-52 shrink-0">
          <FilterSidebar categories={categories} sizes={sizes} colors={colors} />
        </div>

        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              לא נמצאו מוצרים התואמים לסינון שנבחר.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {products.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          )}
          <Pagination page={params.page} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
