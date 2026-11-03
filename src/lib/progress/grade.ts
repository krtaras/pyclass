/**
 * Ukrainian 12-point grade from overall exercise and quiz scores.
 *
 * Formula (documented in the teacher UI):
 *   round(12 × (0.6 × exerciseScore + 0.4 × quizScore))
 *
 * where exerciseScore = solvedExercises / totalExercises (0 if none),
 * and quizScore = correctAnswers / totalQuestions (0 if none).
 * Scores are fractions in [0, 1].
 */
export function computeUkrainianGrade(
  exerciseScore: number,
  quizScore: number,
): number {
  const ex = clamp01(exerciseScore);
  const quiz = clamp01(quizScore);
  return Math.round(12 * (0.6 * ex + 0.4 * quiz));
}

export function scoreFraction(correctOrSolved: number, total: number): number {
  if (total <= 0) return 0;
  return clamp01(correctOrSolved / total);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export const GRADE_FORMULA_UK =
  "Оцінка: round(12 × (0.6×вправи + 0.4×квіз)), шкала 12 балів.";
