"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as {
        error?: string;
        group?: { id: number };
      };
      if (!res.ok) {
        setError(data.error ?? "Не вдалося створити групу.");
        return;
      }
      setName("");
      router.refresh();
      if (data.group) router.push(`/teacher/groups/${data.group.id}`);
    } catch {
      setError("Помилка мережі.");
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
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:p-5"
      data-testid="create-group-form"
      data-ready={ready ? "true" : "false"}
    >
      <label className="block flex-1 space-y-1 text-sm">
        <span className="font-medium text-zinc-800">Нова група</span>
        <input
          type="text"
          name="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Наприклад, 10-Б"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2"
          data-testid="create-group-name"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !ready}
        className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        data-testid="create-group-submit"
      >
        {busy ? "Створення…" : "Створити"}
      </button>
      {error && (
        <p className="text-sm text-red-700 sm:basis-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
