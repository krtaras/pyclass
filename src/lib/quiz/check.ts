import type { QuizAnswer, QuizCheckResult, QuizQuestion } from "./types";

function asSortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "uk"));
}

export function normalizeCorrect(correct: string | string[]): string[] {
  return asSortedUnique(Array.isArray(correct) ? correct : [correct]);
}

export function normalizeAnswer(answer: QuizAnswer): string[] {
  return asSortedUnique(Array.isArray(answer) ? answer : [answer]);
}

/**
 * Pure answer checker.
 * - single / output: exact string match against the correct option
 * - multi: exact set match (order-independent); partial selection is wrong
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

  // single + output
  const isCorrect =
    given.length === 1 &&
    correctOptions.length === 1 &&
    given[0] === correctOptions[0];
  return { isCorrect, correctOptions };
}
