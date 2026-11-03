"use client";

import { useState } from "react";

export function ConfirmDeleteButton({
  label = "Видалити",
  confirmText,
  onConfirm,
  testId,
}: {
  label?: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        data-testid={testId}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
      <p className="text-red-900">{confirmText}</p>
      {error && <p className="text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-full bg-red-700 px-3 py-1.5 text-white disabled:opacity-50"
          data-testid={testId ? `${testId}-confirm` : undefined}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onConfirm();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Помилка");
              setBusy(false);
            }
          }}
        >
          Так, видалити
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5"
          onClick={() => setOpen(false)}
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}
