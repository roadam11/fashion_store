import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";

type Props = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  images: string[];
  category: { name: string; slug: string };
  variants: { size: string; color: string; stock: number }[];
};

export default function ProductCard({ id, slug, name, basePrice, images, category, variants }: Props) {
  const inStock = variants.some((v) => v.stock > 0);
  const mainImage = images[0] ?? null;

  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden mb-3">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20 select-none">{category.name[0]}</span>
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded">אזל המלאי</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-500">{category.name}</p>
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-1">
          {name}
        </h3>
        <p className="text-sm font-semibold text-gray-900">{formatPrice(basePrice)}</p>
      </div>
    </Link>
  );
}
