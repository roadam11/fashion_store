"use client";

import { useState, useTransition } from "react";
import {
  createProductAction,
  updateProductAction,
  softDeleteProductAction,
  uploadProductImageAction,
  createVariantAction,
  softDeleteVariantAction,
} from "@/lib/actions/admin";

type Category = { id: string; name: string };
type Variant = { id: string; sku: string; size: string; color: string; stock: number; isActive: boolean };
type Product = { id: string; name: string; description: string; basePrice: number; categoryId: string; images: string[]; isActive: boolean };

type Props =
  | { mode: "create"; categories: Category[]; product?: never; variants?: never }
  | { mode: "edit"; categories: Category[]; product: Product; variants: Variant[] };

export default function AdminProductActions({ mode, categories, product, variants }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(product?.images ?? []);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = await uploadProductImageAction(fd);
      setUploadedUrls((prev) => [...prev, url]);
    } catch {
      setError("העלאת התמונה נכשלה");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      categoryId: fd.get("categoryId") as string,
      description: fd.get("description") as string,
      basePrice: Math.round(parseFloat(fd.get("basePrice") as string) * 100), // ₪ → agorot
      images: uploadedUrls,
    };
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createProductAction(data);
        } else {
          await updateProductAction(product.id, data);
        }
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה");
      }
    });
  }

  async function handleSoftDelete() {
    if (!product || !confirm(`למחוק (soft) את "${product.name}"?`)) return;
    startTransition(async () => {
      await softDeleteProductAction(product.id);
    });
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {mode === "create" ? "+ מוצר חדש" : "ערוך"}
        </button>
        {mode === "edit" && product.isActive && (
          <button
            onClick={handleSoftDelete}
            disabled={pending}
            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            השבת
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold mb-4">{mode === "create" ? "מוצר חדש" : "עריכת מוצר"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מוצר</label>
            <input name="name" required defaultValue={product?.name} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
            <select name="categoryId" required defaultValue={product?.categoryId} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <textarea name="description" required rows={3} defaultValue={product?.description} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מחיר (₪)</label>
            <input name="basePrice" type="number" step="0.01" min="0" required defaultValue={product ? (product.basePrice / 100).toFixed(2) : ""} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תמונות (Cloudinary)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm" />
            {uploading && <p className="text-xs text-gray-400 mt-1">מעלה...</p>}
            {uploadedUrls.length > 0 && (
              <p className="text-xs text-green-600 mt-1">{uploadedUrls.length} תמונות הועלו</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="flex-1 bg-gray-900 text-white text-sm rounded-lg py-2 hover:bg-gray-700 disabled:opacity-50">
              {pending ? "שומר..." : "שמור"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm rounded-lg py-2 hover:bg-gray-50">
              ביטול
            </button>
          </div>
        </form>

        {/* Variant management */}
        {mode === "edit" && variants && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">גרסאות</h3>
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.id} className={`flex items-center justify-between text-xs p-2 rounded-lg ${v.isActive ? "bg-gray-50" : "bg-gray-100 opacity-50"}`}>
                  <span>{v.size} / {v.color} — מלאי: {v.stock}</span>
                  {v.isActive && (
                    <button
                      onClick={() => startTransition(async () => { await softDeleteVariantAction(v.id); })}
                      className="text-red-500 hover:text-red-700"
                    >
                      השבת
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
