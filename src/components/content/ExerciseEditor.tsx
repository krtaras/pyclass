"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ExerciseTest } from "@/lib/python/types";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ReferenceChecker } from "./ReferenceChecker";

export type ExerciseDTO = {
  id: number;
  prompt: string;
  starterCode: string;
  hintLimit: number;
  tests: ExerciseTest[];
};

type DraftTest =
  | { type: "io"; input: string; output: string; visible: boolean }
  | { type: "assert"; code: string; visible: boolean; label: string };

function toDraft(t: ExerciseTest): DraftTest {
  if (t.type === "io") {
    return {
      type: "io",
      input: t.input,
      output: t.output,
      visible: Boolean(t.visible),
    };
  }
  return {
    type: "assert",
    code: t.code,
    visible: Boolean(t.visible),
    label: t.label ?? "",
  };
}

function fromDraft(t: DraftTest): ExerciseTest {
  if (t.type === "io") {
    return {
      type: "io",
      input: t.input,
      output: t.output,
      visible: t.visible,
    };
  }
  return {
    type: "assert",
    code: t.code,
    visible: t.visible,
    ...(t.label ? { label: t.label } : {}),
  };
}

export function ExerciseEditor({
  lessonId,
  exercises,
}: {
  lessonId: number;
  exercises: ExerciseDTO[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, {
    prompt: string;
    starterCode: string;
    hintLimit: number;
    tests: DraftTest[];
  }>>(() => {
    const map: Record<number, {
      prompt: string;
      starterCode: string;
      hintLimit: number;
      tests: DraftTest[];
    }> = {};
    for (const ex of exercises) {
      map[ex.id] = {
        prompt: ex.prompt,
        starterCode: ex.starterCode,
        hintLimit: ex.hintLimit,
        tests: ex.tests.map(toDraft),
      };
    }
    return map;
  });


  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const ex of exercises) {
        if (!next[ex.id]) {
          next[ex.id] = {
            prompt: ex.prompt,
            starterCode: ex.starterCode,
            hintLimit: ex.hintLimit,
            tests: ex.tests.map(toDraft),
          };
        }
      }
      return next;
    });
  }, [exercises]);

  async function createExercise() {
    setError(null);
    const res = await fetch("/api/teacher/content/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, prompt: "Нова вправа" }),
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
    const res = await fetch(`/api/teacher/content/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: d.prompt,
        starterCode: d.starterCode,
        hintLimit: d.hintLimit,
        tests: d.tests.map(fromDraft),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Помилка");
      return;
    }
    router.refresh();
  }

  function update(id: number, patch: Partial<(typeof drafts)[number]>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, ...patch },
    }));
  }

  return (
    <section className="space-y-4" data-testid="exercises-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Вправи</h2>
        <button
          type="button"
          onClick={() => void createExercise()}
          className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          data-testid="exercise-create"
        >
          Додати вправу
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {exercises.length === 0 && (
        <p className="text-sm text-zinc-500">Поки немає вправ.</p>
      )}

      {exercises.map((ex) => {
        const d = drafts[ex.id];
        if (!d) return null;
        return (
          <div
            key={ex.id}
            className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            data-testid={`exercise-editor-${ex.id}`}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Умова</span>
              <textarea
                className="min-h-20 w-full rounded-xl border border-zinc-300 p-3"
                value={d.prompt}
                onChange={(e) => update(ex.id, { prompt: e.target.value })}
                data-testid={`exercise-prompt-${ex.id}`}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Стартовий код</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-zinc-300 p-3 font-mono text-sm"
                value={d.starterCode}
                onChange={(e) => update(ex.id, { starterCode: e.target.value })}
                data-testid={`exercise-starter-${ex.id}`}
              />
            </label>
            <label className="block space-y-1 text-sm sm:w-40">
              <span className="font-medium">Ліміт підказок</span>
              <input
                type="number"
                min={0}
                max={20}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={d.hintLimit}
                onChange={(e) =>
                  update(ex.id, { hintLimit: Number(e.target.value) || 0 })
                }
              />
            </label>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Тести</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs"
                    data-testid={`exercise-add-io-${ex.id}`}
                    onClick={() =>
                      update(ex.id, {
                        tests: [
                          ...d.tests,
                          { type: "io", input: "", output: "", visible: true },
                        ],
                      })
                    }
                  >
                    + io
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs"
                    data-testid={`exercise-add-assert-${ex.id}`}
                    onClick={() =>
                      update(ex.id, {
                        tests: [
                          ...d.tests,
                          {
                            type: "assert",
                            code: "assert True",
                            visible: false,
                            label: "",
                          },
                        ],
                      })
                    }
                  >
                    + assert
                  </button>
                </div>
              </div>

              {d.tests.map((t, ti) => (
                <div
                  key={ti}
                  className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                  data-testid={`exercise-test-${ex.id}-${ti}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase text-zinc-500">
                      {t.type === "io" ? "io" : "assert"} · тест {ti + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={t.visible}
                          onChange={(e) => {
                            const tests = d.tests.slice();
                            tests[ti] = { ...t, visible: e.target.checked };
                            update(ex.id, { tests });
                          }}
                          data-testid={`exercise-test-visible-${ex.id}-${ti}`}
                        />
                        Видимий учню
                      </label>
                      <button
                        type="button"
                        className="text-xs text-red-700"
                        onClick={() => {
                          const tests = d.tests.filter((_, i) => i !== ti);
                          update(ex.id, { tests });
                        }}
                      >
                        Прибрати
                      </button>
                    </div>
                  </div>
                  {t.type === "io" ? (
                    <>
                      <label className="block space-y-1 text-xs">
                        <span>stdin</span>
                        <textarea
                          className="min-h-16 w-full rounded-lg border border-zinc-300 p-2 font-mono"
                          value={t.input}
                          onChange={(e) => {
                            const tests = d.tests.slice();
                            tests[ti] = { ...t, input: e.target.value };
                            update(ex.id, { tests });
                          }}
                        />
                      </label>
                      <label className="block space-y-1 text-xs">
                        <span>очікуваний stdout</span>
                        <textarea
                          className="min-h-16 w-full rounded-lg border border-zinc-300 p-2 font-mono"
                          value={t.output}
                          onChange={(e) => {
                            const tests = d.tests.slice();
                            tests[ti] = { ...t, output: e.target.value };
                            update(ex.id, { tests });
                          }}
                          data-testid={`exercise-test-output-${ex.id}-${ti}`}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block space-y-1 text-xs">
                      <span>assert / код перевірки</span>
                      <textarea
                        className="min-h-16 w-full rounded-lg border border-zinc-300 p-2 font-mono"
                        value={t.code}
                        onChange={(e) => {
                          const tests = d.tests.slice();
                          tests[ti] = { ...t, code: e.target.value };
                          update(ex.id, { tests });
                        }}
                        data-testid={`exercise-test-code-${ex.id}-${ti}`}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <ReferenceChecker tests={d.tests.map(fromDraft)} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                data-testid={`exercise-save-${ex.id}`}
                onClick={() => void save(ex.id)}
              >
                Зберегти вправу
              </button>
              <ConfirmDeleteButton
                testId={`exercise-delete-${ex.id}`}
                confirmText="Видалити вправу? Якщо є спроби учнів — буде заблоковано."
                onConfirm={async () => {
                  const res = await fetch(
                    `/api/teacher/content/exercises/${ex.id}`,
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
