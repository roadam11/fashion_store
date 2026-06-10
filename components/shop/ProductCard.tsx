import Link from "next/link";
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

const CARD_COLORS = [
  "bg-stone-100", "bg-slate-100", "bg-zinc-100",
  "bg-neutral-200", "bg-gray-100", "bg-rose-50",
  "bg-sky-50", "bg-amber-50",
];

export default function ProductCard({ id, slug, name, basePrice, category, variants }: Props) {
  const inStock = variants.some((v) => v.stock > 0);
  const uniqueColors = [...new Set(variants.map((v) => v.color))];
  const colorIndex = Math.abs(id.charCodeAt(0) + id.charCodeAt(1)) % CARD_COLORS.length;

  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className={`relative aspect-[3/4] ${CARD_COLORS[colorIndex]} rounded-xl overflow-hidden mb-3`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl opacity-20 select-none">{category.name[0]}</span>
        </div>
        {!inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded">אזל המלאי</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {uniqueColors.slice(0, 4).map((color) => (
            <span
              key={color}
              title={color}
              className="w-3 h-3 rounded-full border border-white/60 bg-gray-400"
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-gray-500">{category.name}</p>
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {name}
        </h3>
        <p className="text-sm font-semibold text-gray-900">{formatPrice(basePrice)}</p>
      </div>
    </Link>
  );
}
