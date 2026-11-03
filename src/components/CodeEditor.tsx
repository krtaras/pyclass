"use client";

import { useCallback, type KeyboardEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export function CodeEditor({ value, onChange, disabled, ariaLabel }: Props) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + "    " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    },
    [onChange, value],
  );

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      spellCheck={false}
      aria-label={ariaLabel ?? "Редактор коду"}
      className="min-h-[180px] w-full resize-y rounded-xl border border-zinc-300 bg-zinc-950 px-3 py-3 font-mono text-sm leading-relaxed text-zinc-100 outline-none ring-emerald-500 focus:ring-2 disabled:opacity-60 sm:min-h-[220px]"
    />
  );
}
