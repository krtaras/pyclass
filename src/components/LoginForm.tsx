"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function submit() {
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: Record<string, string>;
        ok?: boolean;
      };
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setFormError(data.error ?? "Не вдалося увійти.");
        return;
      }
      router.refresh();
      router.push(nextPath || "/");
    } catch {
      setFormError("Помилка мережі. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      method="post"
      action="#"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="login-form"
      data-ready={ready ? "true" : "false"}
    >
      <div>
        <h1 className="text-xl font-bold">Вхід</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Немає акаунта?{" "}
          <Link href="/signup" className="text-emerald-700 hover:underline">
            Зареєструйся
          </Link>
        </p>
      </div>

      {formError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {formError}
        </p>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-800">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          data-testid="login-email"
        />
        {errors.email && (
          <span className="text-xs text-red-600">{errors.email}</span>
        )}
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-800">Пароль</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          data-testid="login-password"
        />
        {errors.password && (
          <span className="text-xs text-red-600">{errors.password}</span>
        )}
      </label>

      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        data-testid="login-submit"
      >
        {busy ? "Вхід…" : "Увійти"}
      </button>
    </form>
  );
}
