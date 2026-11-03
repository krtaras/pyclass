"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export type ModuleRow = {
  id: number;
  title: string;
  order: number;
  lessonCount: number;
};

export function ModulesManager({ modules }: { modules: ModuleRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [renaming, setRenaming] = useState<Record<number, string>>({});

  useEffect(() => setReady(true), []);

  async function createModule() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/content/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setTitle("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: number, body: unknown) {
    const res = await fetch(`/api/teacher/content/modules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");
    router.refresh();
  }

  return (
    <div className="space-y-4" data-testid="modules-manager">
      <form
        method="post"
        action="#"
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end"
        data-ready={ready ? "true" : "false"}
        onSubmit={(e) => {
          e.preventDefault();
          void createModule();
        }}
      >
        <label className="block flex-1 space-y-1 text-sm">
          <span className="font-medium">Новий модуль</span>
          <input
            className="w-full rounded-xl border border-zinc-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва модуля"
            data-testid="module-title-input"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || !ready}
          className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          data-testid="module-create"
        >
          Створити
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}

      <ul className="space-y-3">
        {modules.map((m, index) => (
          <li
            key={m.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            data-testid={`module-card-${m.id}`}
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium"
                  value={renaming[m.id] ?? m.title}
                  onChange={(e) =>
                    setRenaming((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  data-testid={`module-rename-${m.id}`}
                />
                <p className="text-xs text-zinc-500">
                  Порядок {m.order} · уроків: {m.lessonCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
                  disabled={index === 0}
                  data-testid={`module-up-${m.id}`}
                  onClick={() => void patch(m.id, { action: "reorder", direction: "up" })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
                  disabled={index === modules.length - 1}
                  data-testid={`module-down-${m.id}`}
                  onClick={() =>
                    void patch(m.id, { action: "reorder", direction: "down" })
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
                  data-testid={`module-save-${m.id}`}
                  onClick={() =>
                    void patch(m.id, {
                      title: renaming[m.id] ?? m.title,
                    })
                  }
                >
                  Зберегти
                </button>
                <Link
                  href={`/teacher/content/modules/${m.id}`}
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  data-testid={`module-open-${m.id}`}
                >
                  Уроки
                </Link>
                <ConfirmDeleteButton
                  testId={`module-delete-${m.id}`}
                  confirmText="Видалити модуль і всі його уроки? Якщо є спроби учнів — видалення буде заблоковано."
                  onConfirm={async () => {
                    const res = await fetch(
                      `/api/teacher/content/modules/${m.id}`,
                      { method: "DELETE" },
                    );
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Помилка");
                    router.refresh();
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
