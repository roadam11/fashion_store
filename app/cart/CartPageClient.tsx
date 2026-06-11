"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCartItemAction, removeCartItemAction } from "@/lib/actions/cart";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";

type CartItem = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    size: string;
    color: string;
    priceOverride: number | null;
    product: {
      name: string;
      images: string[];
      basePrice: number;
    };
  };
};

export default function CartPageClient({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleQtyChange(cartItemId: string, newQty: number) {
    startTransition(async () => {
      if (newQty < 1) {
        await removeCartItemAction(cartItemId);
      } else {
        await updateCartItemAction(cartItemId, newQty);
      }
      router.refresh();
    });
  }

  function handleRemove(cartItemId: string) {
    startTransition(async () => {
      await removeCartItemAction(cartItemId);
      router.refresh();
    });
  }

  return (
    <div className={`space-y-4 ${pending ? "opacity-60 pointer-events-none" : ""}`}>
      {items.map((item) => {
        const price = item.variant.priceOverride ?? item.variant.product.basePrice;
        const image = item.variant.product.images[0];
        return (
          <div key={item.id} className="flex gap-4 border border-gray-200 rounded-xl p-4">
            {image && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={image}
                  alt={item.variant.product.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {item.variant.product.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.variant.size} / {item.variant.color}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {formatPrice(price * item.quantity)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm hover:bg-gray-50"
              >
                −
              </button>
              <span className="text-sm w-5 text-center">{item.quantity}</span>
              <button
                onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-sm hover:bg-gray-50"
              >
                +
              </button>
              <button
                onClick={() => handleRemove(item.id)}
                className="mr-2 text-xs text-red-500 hover:text-red-700"
              >
                הסר
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
