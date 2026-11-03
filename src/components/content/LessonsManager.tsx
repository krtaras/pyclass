"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export type LessonRow = {
  id: number;
  title: string;
  order: number;
};

export function LessonsManager({
  moduleId,
  lessons,
}: {
  moduleId: number;
  lessons: LessonRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  async function createLesson() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/content/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setTitle("");
      router.refresh();
      if (data.lesson?.id) {
        router.push(`/teacher/content/lessons/${data.lesson.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function reorder(id: number, direction: "up" | "down") {
    const res = await fetch(`/api/teacher/content/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", direction }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка");
    router.refresh();
  }

  return (
    <div className="space-y-4" data-testid="lessons-manager">
      <form
        method="post"
        action="#"
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end"
        data-ready={ready ? "true" : "false"}
        onSubmit={(e) => {
          e.preventDefault();
          void createLesson();
        }}
      >
        <label className="block flex-1 space-y-1 text-sm">
          <span className="font-medium">Новий урок</span>
          <input
            className="w-full rounded-xl border border-zinc-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва уроку"
            data-testid="lesson-title-input"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || !ready}
          className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          data-testid="lesson-create"
        >
          Створити
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}

      <ul className="space-y-3">
        {lessons.map((l, index) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
            data-testid={`lesson-row-${l.id}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.title}</p>
              <p className="text-xs text-zinc-500">Порядок {l.order}</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
              disabled={index === 0}
              onClick={() => void reorder(l.id, "up")}
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
              disabled={index === lessons.length - 1}
              onClick={() => void reorder(l.id, "down")}
            >
              ↓
            </button>
            <Link
              href={`/teacher/content/lessons/${l.id}`}
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white"
              data-testid={`lesson-edit-${l.id}`}
            >
              Редагувати
            </Link>
            <ConfirmDeleteButton
              testId={`lesson-delete-${l.id}`}
              confirmText="Видалити урок? Якщо є спроби учнів — видалення буде заблоковано."
              onConfirm={async () => {
                const res = await fetch(`/api/teacher/content/lessons/${l.id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Помилка");
                router.refresh();
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
