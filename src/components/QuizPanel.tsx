"use client";

import { useCallback, useMemo, useState } from "react";
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

  if (questions.length === 0) return null;

  return (
    <section className="space-y-4" data-testid="quiz-section">
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
      : [],
  );

  const canSubmit = useMemo(() => {
    if (answered) return false;
    if (question.kind === "multi") {
      return Array.isArray(draft) && draft.length > 0;
    }
    return typeof draft === "string" && draft.length > 0;
  }, [answered, draft, question.kind]);

  const toggleMulti = useCallback(
    (option: string) => {
      if (answered || !Array.isArray(draft)) return;
      const next = draft.includes(option)
        ? draft.filter((o) => o !== option)
        : [...draft, option];
      onDraft(next);
    },
    [answered, draft, onDraft],
  );

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
          const inputId = `q${question.id}-${option}`;
          const isCorrectOpt = correctSet.has(option);
          const isChosen = chosenSet.has(option);

          let optionClass =
            "flex items-start gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm transition";
          if (answered) {
            if (isCorrectOpt) {
              optionClass +=
                " border-emerald-400 bg-emerald-50 text-emerald-950";
            } else if (isChosen && !isCorrectOpt) {
              optionClass += " border-red-300 bg-red-50 text-red-950";
            } else {
              optionClass += " opacity-70";
            }
          } else {
            optionClass += " hover:border-zinc-300 hover:bg-zinc-50";
          }

          const select = () => {
            if (answered) return;
            if (question.kind === "multi") toggleMulti(option);
            else onDraft(option);
          };

          return (
            <li key={option}>
              <label
                className={optionClass}
                htmlFor={inputId}
                onClick={(e) => {
                  // Ensure React state updates even when the native
                  // radio/checkbox event is swallowed (e.g. in some automation).
                  e.preventDefault();
                  select();
                }}
              >
                {question.kind === "multi" ? (
                  <input
                    id={inputId}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    disabled={answered}
                    checked={
                      Array.isArray(draft) ? draft.includes(option) : false
                    }
                    onChange={select}
                    data-option={option}
                  />
                ) : (
                  <input
                    id={inputId}
                    type="radio"
                    name={`quiz-${question.id}`}
                    className="mt-0.5 h-4 w-4 shrink-0"
                    disabled={answered}
                    checked={draft === option}
                    onChange={select}
                    data-option={option}
                  />
                )}
                <span className="min-w-0 flex-1 break-words font-mono text-[13px] leading-snug sm:text-sm">
                  {option}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {!answered && (
        <button
          type="button"
          disabled={!canSubmit}
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
          <p className="mt-1 text-zinc-800" data-testid={`quiz-explanation-${question.id}`}>
            {question.explanation}
          </p>
        </div>
      )}
    </li>
  );
}
