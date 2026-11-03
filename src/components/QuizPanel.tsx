"use client";

import { useEffect, useMemo, useState } from "react";
import { checkQuizAnswer } from "@/lib/quiz/check";
import type {
  QuizAnswer,
  QuizAttemptPayload,
  QuizQuestion,
} from "@/lib/quiz/types";

export type QuizPanelProps = {
  questions: QuizQuestion[];
  /** Seam for step 4 — fired once when the student submits an answer. */
  onAttempt?: (payload: QuizAttemptPayload) => void;
};

type QuestionState =
  | { status: "pending"; draft: QuizAnswer }
  | {
      status: "answered";
      answer: QuizAnswer;
      isCorrect: boolean;
      correctOptions: string[];
    };

function emptyDraft(kind: QuizQuestion["kind"]): QuizAnswer {
  return kind === "multi" ? [] : "";
}

export function QuizPanel({ questions, onAttempt }: QuizPanelProps) {
  const initial = useMemo(() => {
    const map: Record<number, QuestionState> = {};
    for (const q of questions) {
      map[q.id] = { status: "pending", draft: emptyDraft(q.kind) };
    }
    return map;
  }, [questions]);

  const [states, setStates] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (questions.length === 0) return null;

  return (
    <section
      className="space-y-4"
      data-testid="quiz-section"
      data-quiz-ready={ready ? "true" : "false"}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">Квіз</h2>
        <p className="text-sm text-zinc-600">
          Відповідай на питання. Після відповіді правильний варіант і пояснення
          зʼявляться одразу.
        </p>
      </div>

      <ol className="space-y-4">
        {questions.map((q, index) => (
          <QuizQuestionCard
            key={q.id}
            question={q}
            index={index}
            state={states[q.id]!}
            onDraft={(draft) =>
              setStates((prev) => ({
                ...prev,
                [q.id]: { status: "pending", draft },
              }))
            }
            onSubmit={(answer) => {
              const result = checkQuizAnswer(q, answer);
              setStates((prev) => ({
                ...prev,
                [q.id]: {
                  status: "answered",
                  answer,
                  isCorrect: result.isCorrect,
                  correctOptions: result.correctOptions,
                },
              }));
              onAttempt?.({
                questionId: q.id,
                answer,
                isCorrect: result.isCorrect,
              });
            }}
          />
        ))}
      </ol>
    </section>
  );
}

function QuizQuestionCard({
  question,
  index,
  state,
  onDraft,
  onSubmit,
}: {
  question: QuizQuestion;
  index: number;
  state: QuestionState;
  onDraft: (draft: QuizAnswer) => void;
  onSubmit: (answer: QuizAnswer) => void;
}) {
  const answered = state.status === "answered";
  const draft = state.status === "pending" ? state.draft : state.answer;
  const correctSet = new Set(
    state.status === "answered" ? state.correctOptions : [],
  );
  const chosenSet = new Set(
    answered
      ? Array.isArray(state.answer)
        ? state.answer
        : [state.answer]
      : Array.isArray(draft)
        ? draft
        : draft
          ? [draft]
          : [],
  );

  const canSubmit = !answered && (
    question.kind === "multi"
      ? Array.isArray(draft) && draft.length > 0
      : typeof draft === "string" && draft.length > 0
  );

  function select(option: string) {
    if (answered) return;
    if (question.kind === "multi") {
      const current = Array.isArray(draft) ? draft : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      onDraft(next);
      return;
    }
    onDraft(option);
  }

  return (
    <li
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid={`quiz-question-${question.id}`}
      data-kind={question.kind}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Питання {index + 1}
        {question.kind === "output"
          ? " · що виведе код"
          : question.kind === "multi"
            ? " · кілька відповідей"
            : " · одна відповідь"}
      </p>
      <p className="mt-1 font-medium text-zinc-900">{question.prompt}</p>

      {question.kind === "output" && question.code && (
        <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-950 p-3 font-mono text-sm text-zinc-100">
          {question.code}
        </pre>
      )}

      <ul className="mt-3 space-y-2" role="list">
        {question.options.map((option) => {
          const isCorrectOpt = correctSet.has(option);
          const isChosen = chosenSet.has(option);

          let optionClass =
            "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition";
          if (answered) {
            if (isCorrectOpt) {
              optionClass +=
                " border-emerald-400 bg-emerald-50 text-emerald-950";
            } else if (isChosen && !isCorrectOpt) {
              optionClass += " border-red-300 bg-red-50 text-red-950";
            } else {
              optionClass += " border-zinc-200 opacity-70";
            }
          } else if (isChosen) {
            optionClass +=
              " border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-200";
          } else {
            optionClass +=
              " border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50";
          }

          return (
            <li key={option}>
              <button
                type="button"
                className={optionClass}
                disabled={answered}
                aria-pressed={isChosen}
                data-option={option}
                onClick={() => select(option)}
              >
                <span
                  aria-hidden
                  className={
                    question.kind === "multi"
                      ? `mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          isChosen
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-zinc-400 bg-white"
                        }`
                      : `mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isChosen
                            ? "border-emerald-600 bg-emerald-600"
                            : "border-zinc-400 bg-white"
                        }`
                  }
                >
                  {question.kind === "multi" && isChosen ? "✓" : null}
                  {question.kind !== "multi" && isChosen ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 break-words font-mono text-[13px] leading-snug sm:text-sm">
                  {option}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!answered && (
        <button
          type="button"
          disabled={!canSubmit}
          data-testid={`quiz-submit-${question.id}`}
          onClick={() => onSubmit(draft)}
          className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Відповісти
        </button>
      )}

      {answered && (
        <div
          className={
            state.isCorrect
              ? "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
              : "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950"
          }
          data-testid={`quiz-feedback-${question.id}`}
          data-correct={state.isCorrect ? "true" : "false"}
        >
          <p className="font-semibold">
            {state.isCorrect ? "Правильно!" : "Неправильно"}
          </p>
          <p
            className="mt-1 text-zinc-800"
            data-testid={`quiz-explanation-${question.id}`}
          >
            {question.explanation}
          </p>
        </div>
      )}
    </li>
  );
}
