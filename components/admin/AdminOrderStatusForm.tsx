"use client";

import { useTransition } from "react";
import { updateOrderStatusAction } from "@/lib/actions/admin";

type Props = {
  orderId: string;
  currentStatus: string;
  allowedNext: string[];
  statusLabels: Record<string, string>;
};

export default function AdminOrderStatusForm({ orderId, currentStatus, allowedNext, statusLabels }: Props) {
  const [pending, startTransition] = useTransition();

  if (allowedNext.length === 0) {
    return (
      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
        {statusLabels[currentStatus] ?? currentStatus}
      </span>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (!newStatus) return;
    startTransition(async () => {
      try {
        await updateOrderStatusAction(orderId, newStatus);
      } catch (err) {
        alert(`שגיאה: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    });
  }

  return (
    <select
      onChange={handleChange}
      defaultValue=""
      disabled={pending}
      className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white disabled:opacity-50"
    >
      <option value="" disabled>{statusLabels[currentStatus] ?? currentStatus}</option>
      {allowedNext.map((s) => (
        <option key={s} value={s}>{statusLabels[s] ?? s}</option>
      ))}
    </select>
  );
}
