"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: Record<string, string>;
        ok?: boolean;
      };
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setFormError(data.error ?? "Не вдалося створити акаунт.");
        return;
      }
      router.refresh();
      router.push("/");
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
      data-testid="signup-form"
      data-ready={ready ? "true" : "false"}
    >
      <div>
        <h1 className="text-xl font-bold">Реєстрація учня</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Уже є акаунт?{" "}
          <Link href="/login" className="text-emerald-700 hover:underline">
            Увійди
          </Link>
        </p>
      </div>

      {formError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {formError}
        </p>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-800">Імʼя</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          data-testid="signup-name"
        />
        {errors.name && (
          <span className="text-xs text-red-600">{errors.name}</span>
        )}
      </label>

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
          data-testid="signup-email"
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          data-testid="signup-password"
        />
        {errors.password && (
          <span className="text-xs text-red-600">{errors.password}</span>
        )}
        <span className="text-xs text-zinc-500">Мінімум 8 символів</span>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-800">Код запрошення групи</span>
        <input
          type="text"
          name="inviteCode"
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 uppercase tracking-wide"
          data-testid="signup-invite"
          placeholder="DEMO10A"
        />
        {errors.inviteCode && (
          <span className="text-xs text-red-600">{errors.inviteCode}</span>
        )}
      </label>

      <button
        type="submit"
        disabled={busy || !ready}
        className="w-full rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        data-testid="signup-submit"
      >
        {busy ? "Створення…" : "Створити акаунт"}
      </button>
    </form>
  );
}
