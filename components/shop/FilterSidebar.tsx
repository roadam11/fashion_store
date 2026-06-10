"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

type Category = { slug: string; name: string };

type Props = {
  categories: Category[];
  sizes: string[];
  colors: string[];
};

export default function FilterSidebar({ categories, sizes, colors }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const current = {
    category: searchParams.get("category"),
    size: searchParams.get("size"),
    color: searchParams.get("color"),
  };

  const hasFilters = current.category || current.size || current.color;

  return (
    <aside className="w-full">
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="w-full mb-4 text-xs text-indigo-600 hover:text-indigo-800 text-right underline"
        >
          נקה פילטרים
        </button>
      )}

      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">קטגוריה</h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setFilter("category", null)}
                className={`text-sm w-full text-right ${!current.category ? "font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                כל המוצרים
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.slug}>
                <button
                  onClick={() => setFilter("category", current.category === cat.slug ? null : cat.slug)}
                  className={`text-sm w-full text-right ${current.category === cat.slug ? "font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">מידה</h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => setFilter("size", current.size === size ? null : size)}
                className={`px-3 py-1 text-xs border rounded-md transition-colors ${
                  current.size === size
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 hover:border-gray-600 text-gray-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">צבע</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setFilter("color", current.color === color ? null : color)}
                className={`px-3 py-1 text-xs border rounded-md transition-colors ${
                  current.color === color
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 hover:border-gray-600 text-gray-700"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
