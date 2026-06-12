"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToCartAction } from "@/lib/actions/cart";

type Variant = {
  id: string;
  size: string;
  color: string;
  stock: number;
  priceOverride: number | null;
};

export default function ProductClient({ variants }: { variants: Variant[] }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Set(variants.map((v) => v.color))];

  // Which sizes have any stock at all
  const sizeHasStock = (size: string) =>
    variants.some((v) => v.size === size && v.stock > 0);

  // If a size is selected, only show colors available for that size
  const colorAvailable = (color: string) => {
    if (selectedSize) {
      const v = variants.find((v) => v.size === selectedSize && v.color === color);
      return !!v && v.stock > 0;
    }
    return variants.some((v) => v.color === color && v.stock > 0);
  };

  const selectedVariant =
    selectedSize && selectedColor
      ? variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null
      : null;

  const canAdd = !!selectedVariant && selectedVariant.stock > 0 && !pending;

  function handleSizeClick(size: string) {
    if (!sizeHasStock(size)) return;
    setSelectedSize(size);
    // Clear color if it's no longer available for the new size
    if (selectedColor) {
      const stillValid = variants.some(
        (v) => v.size === size && v.color === selectedColor && v.stock > 0
      );
      if (!stillValid) setSelectedColor(null);
    }
  }

  function handleColorClick(color: string) {
    if (!colorAvailable(color)) return;
    setSelectedColor(color);
  }

  function handleAddToCart() {
    if (!selectedVariant) return;
    startTransition(async () => {
      try {
        await addToCartAction(selectedVariant.id, 1);
        toast.success("נוסף לעגלה!", { duration: 2000 });
        router.refresh(); // re-renders Navbar cart badge
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "שגיאה בהוספה לעגלה");
      }
    });
  }

  return (
    <div>
      {/* Size selector */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">מידה</h3>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const inStock = sizeHasStock(size);
            const active = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                disabled={!inStock}
                onClick={() => handleSizeClick(size)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all
                  ${active
                    ? "bg-gray-900 text-white border-gray-900"
                    : inStock
                    ? "border-gray-300 text-gray-900 hover:border-gray-900"
                    : "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                  }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color selector */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">צבע</h3>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const available = colorAvailable(color);
            const active = selectedColor === color;
            return (
              <button
                key={color}
                type="button"
                disabled={!available}
                onClick={() => handleColorClick(color)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all
                  ${active
                    ? "bg-gray-900 text-white border-gray-900"
                    : available
                    ? "border-gray-300 text-gray-900 hover:border-gray-900"
                    : "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                  }`}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add to cart */}
      <button
        type="button"
        disabled={!canAdd}
        onClick={handleAddToCart}
        className="w-full py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 active:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "מוסיף..." : "הוסף לעגלה"}
      </button>

      {!selectedSize && !selectedColor && (
        <p className="text-xs text-gray-400 text-center mt-2">בחר מידה וצבע להוספה לעגלה</p>
      )}
      {selectedSize && !selectedColor && (
        <p className="text-xs text-gray-400 text-center mt-2">בחר צבע להוספה לעגלה</p>
      )}
      {!selectedSize && selectedColor && (
        <p className="text-xs text-gray-400 text-center mt-2">בחר מידה להוספה לעגלה</p>
      )}
    </div>
  );
}
