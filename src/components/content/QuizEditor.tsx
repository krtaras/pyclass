"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export type QuizDTO = {
  id: number;
  kind: "single" | "multi" | "output";
  prompt: string;
  code: string | null;
  options: string[];
  correct: string | string[];
  explanation: string;
};

type Draft = {
  kind: "single" | "multi" | "output";
  prompt: string;
  code: string;
  options: string[];
  correct: string[];
  explanation: string;
};

function toDraft(q: QuizDTO): Draft {
  const correct = Array.isArray(q.correct)
    ? q.correct.map(String)
    : [String(q.correct)];
  return {
    kind: q.kind,
    prompt: q.prompt,
    code: q.code ?? "",
    options: (q.options ?? []).map(String),
    correct,
    explanation: q.explanation,
  };
}

export function QuizEditor({
  lessonId,
  questions,
}: {
  lessonId: number;
  questions: QuizDTO[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const map: Record<number, Draft> = {};
    for (const q of questions) map[q.id] = toDraft(q);
    return map;
  });


  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const q of questions) {
        if (!next[q.id]) next[q.id] = toDraft(q);
      }
      return next;
    });
  }, [questions]);

  async function create(kind: Draft["kind"] = "single") {
    setError(null);
    const res = await fetch("/api/teacher/content/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, kind, prompt: "Нове питання" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Помилка");
      return;
    }
    router.refresh();
  }

  async function save(id: number) {
    setError(null);
    const d = drafts[id];
    if (!d) return;
    const correct =
      d.kind === "multi" ? d.correct : d.correct[0] ?? "";
    const res = await fetch(`/api/teacher/content/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: d.kind,
        prompt: d.prompt,
        code: d.code || null,
        options: d.options,
        correct,
        explanation: d.explanation,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Помилка");
      return;
    }
    router.refresh();
  }

  function update(id: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  }

  return (
    <section className="space-y-4" data-testid="quiz-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Квіз</h2>
        <button
          type="button"
          onClick={() => void create("single")}
          className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          data-testid="quiz-create"
        >
          Додати питання
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {questions.map((q) => {
        const d = drafts[q.id];
        if (!d) return null;
        return (
          <div
            key={q.id}
            className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            data-testid={`quiz-editor-${q.id}`}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Тип</span>
              <select
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={d.kind}
                onChange={(e) =>
                  update(q.id, {
                    kind: e.target.value as Draft["kind"],
                  })
                }
                data-testid={`quiz-kind-${q.id}`}
              >
                <option value="single">Одна відповідь</option>
                <option value="multi">Кілька відповідей</option>
                <option value="output">Що виведе код</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Питання</span>
              <textarea
                className="min-h-16 w-full rounded-xl border border-zinc-300 p-3"
                value={d.prompt}
                onChange={(e) => update(q.id, { prompt: e.target.value })}
                data-testid={`quiz-prompt-${q.id}`}
              />
            </label>
            {d.kind === "output" && (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Код</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-zinc-300 p-3 font-mono text-sm"
                  value={d.code}
                  onChange={(e) => update(q.id, { code: e.target.value })}
                  data-testid={`quiz-code-${q.id}`}
                />
              </label>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Варіанти</h3>
                <button
                  type="button"
                  className="text-xs text-emerald-800"
                  onClick={() =>
                    update(q.id, {
                      options: [...d.options, `Варіант ${d.options.length + 1}`],
                    })
                  }
                >
                  + варіант
                </button>
              </div>
              {d.options.map((opt, oi) => (
                <div key={oi} className="flex flex-wrap items-center gap-2">
                  <input
                    type={d.kind === "multi" ? "checkbox" : "radio"}
                    name={`correct-${q.id}`}
                    checked={d.correct.includes(opt)}
                    onChange={(e) => {
                      if (d.kind === "multi") {
                        const next = e.target.checked
                          ? [...d.correct, opt]
                          : d.correct.filter((c) => c !== opt);
                        update(q.id, { correct: next });
                      } else {
                        update(q.id, { correct: [opt] });
                      }
                    }}
                    data-testid={`quiz-correct-${q.id}-${oi}`}
                  />
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    value={opt}
                    onChange={(e) => {
                      const options = d.options.slice();
                      const old = options[oi]!;
                      options[oi] = e.target.value;
                      const correct = d.correct.map((c) =>
                        c === old ? e.target.value : c,
                      );
                      update(q.id, { options, correct });
                    }}
                    data-testid={`quiz-option-${q.id}-${oi}`}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-700"
                    onClick={() => {
                      const removed = d.options[oi]!;
                      update(q.id, {
                        options: d.options.filter((_, i) => i !== oi),
                        correct: d.correct.filter((c) => c !== removed),
                      });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <p className="text-xs text-zinc-500">
                Познач правильні варіанти зліва.
              </p>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Пояснення</span>
              <textarea
                className="min-h-16 w-full rounded-xl border border-zinc-300 p-3"
                value={d.explanation}
                onChange={(e) => update(q.id, { explanation: e.target.value })}
                data-testid={`quiz-explanation-${q.id}`}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                data-testid={`quiz-save-${q.id}`}
                onClick={() => void save(q.id)}
              >
                Зберегти питання
              </button>
              <ConfirmDeleteButton
                testId={`quiz-delete-${q.id}`}
                confirmText="Видалити питання? Якщо є відповіді учнів — буде заблоковано."
                onConfirm={async () => {
                  const res = await fetch(
                    `/api/teacher/content/quizzes/${q.id}`,
                    { method: "DELETE" },
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Помилка");
                  router.refresh();
                }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
