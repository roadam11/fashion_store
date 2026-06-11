"use client";

import { useState, useTransition } from "react";
import { shippingAddressSchema } from "@/lib/validations/checkout";
import {
  createCheckoutSessionAction,
  createCheckoutFromSavedAddressAction,
  saveAddressAction,
} from "@/lib/actions/checkout";

type SavedAddress = {
  id: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  phone: string;
};

const FIELD_LABELS: Record<string, string> = {
  street: "כתובת",
  city: "עיר",
  zipCode: "מיקוד",
  country: "מדינה",
  phone: "טלפון",
};

export default function CheckoutForm({
  savedAddresses,
}: {
  savedAddresses: SavedAddress[];
}) {
  const [useNewAddress, setUseNewAddress] = useState(savedAddresses.length === 0);
  const [selectedId, setSelectedId] = useState<string>(savedAddresses[0]?.id ?? "");
  const [saveNew, setSaveNew] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddressSelect(id: string) {
    if (id === "__new__") {
      setUseNewAddress(true);
    } else {
      setUseNewAddress(false);
      setSelectedId(id);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!useNewAddress && selectedId) {
      startTransition(async () => {
        try {
          const { url } = await createCheckoutFromSavedAddressAction(selectedId);
          window.location.href = url;
        } catch (err) {
          setError(err instanceof Error ? err.message : "שגיאה בביצוע התשלום");
        }
      });
      return;
    }

    const fd = new FormData(e.currentTarget);
    const raw = {
      street: (fd.get("street") as string) ?? "",
      city: (fd.get("city") as string) ?? "",
      zipCode: (fd.get("zipCode") as string) ?? "",
      country: (fd.get("country") as string) || "Israel",
      phone: (fd.get("phone") as string) ?? "",
    };

    const result = shippingAddressSchema.safeParse(raw);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errs[field] = issue.message || `שדה ${FIELD_LABELS[field] ?? field} שגוי`;
      });
      setFieldErrors(errs);
      return;
    }

    const address = result.data;
    startTransition(async () => {
      try {
        if (saveNew) await saveAddressAction(address);
        const { url } = await createCheckoutSessionAction(address);
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בביצוע התשלום");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">כתובת למשלוח</h2>

      {/* Saved address selector */}
      {savedAddresses.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            כתובות שמורות
          </label>
          <div className="space-y-2">
            {savedAddresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                  !useNewAddress && selectedId === addr.id
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="addressChoice"
                  value={addr.id}
                  checked={!useNewAddress && selectedId === addr.id}
                  onChange={() => handleAddressSelect(addr.id)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm text-gray-700">
                  {addr.street}, {addr.city}{" "}
                  <span className="text-gray-400">{addr.zipCode}</span>
                  <br />
                  <span className="text-gray-400 text-xs">{addr.phone}</span>
                </span>
              </label>
            ))}
            <label
              className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                useNewAddress
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="addressChoice"
                value="__new__"
                checked={useNewAddress}
                onChange={() => handleAddressSelect("__new__")}
                className="shrink-0"
              />
              <span className="text-sm text-gray-700">+ כתובת חדשה</span>
            </label>
          </div>
        </div>
      )}

      {/* New address form */}
      {useNewAddress && (
        <div className="space-y-4 pt-1">
          <AddressField name="street" label="כתובת" placeholder="הרצל 1" error={fieldErrors.street} />
          <AddressField name="city" label="עיר" placeholder="תל אביב" error={fieldErrors.city} />
          <div className="grid grid-cols-2 gap-4">
            <AddressField name="zipCode" label="מיקוד" placeholder="6100000" error={fieldErrors.zipCode} />
            <AddressField name="phone" label="טלפון" placeholder="050-1234567" error={fieldErrors.phone} type="tel" />
          </div>
          <input type="hidden" name="country" value="Israel" />

          {/* Option to save new address */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveNew}
              onChange={(e) => setSaveNew(e.target.checked)}
              className="rounded"
            />
            שמור כתובת זו לשימוש עתידי
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gray-900 text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-gray-700 disabled:opacity-50 transition-colors mt-2"
      >
        {pending ? "מעבד..." : "המשך לתשלום"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        תועבר לדף תשלום מאובטח של Stripe
      </p>
    </form>
  );
}

function AddressField({
  name,
  label,
  placeholder,
  error,
  type = "text",
}: {
  name: string;
  label: string;
  placeholder: string;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={name === "phone" ? "tel" : name}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
          error ? "border-red-400" : "border-gray-300"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
