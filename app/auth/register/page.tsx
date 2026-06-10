"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    if (password.length < 6) { setError("הסיסמה חייבת להיות לפחות 6 תווים"); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), password }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error ?? "שגיאה"); return; }
        await signIn("credentials", { email: fd.get("email"), password, redirect: false });
        router.push("/");
        router.refresh();
      } catch { setError("שגיאה בהרשמה"); }
    });
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">הרשמה</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input name="name" required className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input name="email" type="email" required className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input name="password" type="password" required minLength={6} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button type="submit" disabled={pending} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-700 disabled:opacity-50">
            {pending ? "נרשם..." : "הרשמה"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          כבר יש לך חשבון?{" "}
          <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-800 font-medium">כניסה</Link>
        </p>
      </div>
    </div>
  );
}
