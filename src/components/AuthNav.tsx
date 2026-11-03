"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AuthNavUser = {
  name: string;
  role: "student" | "teacher";
};

export function AuthNav({ user }: { user: AuthNavUser | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/login"
          className="text-zinc-600 hover:text-zinc-900"
          data-testid="nav-login"
        >
          Увійти
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-emerald-700 px-3 py-1.5 font-medium text-white"
          data-testid="nav-signup"
        >
          Реєстрація
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-3 text-sm">
      <Link
        href="/progress"
        className="text-zinc-600 hover:text-zinc-900"
        data-testid="nav-progress"
      >
        Мій прогрес
      </Link>
      <span className="hidden max-w-[9rem] truncate text-zinc-500 sm:inline" title={user.name}>
        {user.name}
      </span>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        data-testid="nav-logout"
      >
        Вийти
      </button>
    </nav>
  );
}
