import type { QuizAnswer, QuizCheckResult, QuizQuestion } from "./types";

function asSortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "uk"));
}

function toStringList(value: string | string[] | number | number[]): string[] {
  const list = Array.isArray(value) ? value : [value];
  return asSortedUnique(list.map((v) => String(v)));
}

export function normalizeCorrect(correct: string | string[]): string[] {
  return toStringList(correct);
}

export function normalizeAnswer(answer: QuizAnswer): string[] {
  return toStringList(answer);
}

/**
 * Pure answer checker.
 * - single / output: exact string match against the correct option
 * - multi: exact set match (order-independent); partial selection is wrong
 *
 * Values are coerced with String() so jsonb numbers like 5 still match option "5".
 */
export function checkQuizAnswer(
  question: Pick<QuizQuestion, "kind" | "correct">,
  answer: QuizAnswer,
): QuizCheckResult {
  const correctOptions = normalizeCorrect(question.correct);
  const given = normalizeAnswer(answer);

  if (question.kind === "multi") {
    const isCorrect =
      given.length === correctOptions.length &&
      given.every((v, i) => v === correctOptions[i]);
    return { isCorrect, correctOptions };
  }

  const isCorrect =
    given.length === 1 &&
    correctOptions.length === 1 &&
    given[0] === correctOptions[0];
  return { isCorrect, correctOptions };
}
