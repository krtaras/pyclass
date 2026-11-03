import type {
  CourseProgress,
  LessonProgress,
  LessonProgressInput,
} from "./types";

/**
 * A lesson is complete when every exercise is solved and every quiz question
 * has been answered (correct or not).
 */
export function computeLessonProgress(
  input: LessonProgressInput,
): LessonProgress {
  const exerciseTotal = input.exercises.length;
  const exerciseSolved = input.exercises.filter((e) => e.solved).length;
  const quizTotal = input.quizQuestions.length;
  const quizAnswered = input.quizQuestions.filter((q) => q.answered).length;
  const quizCorrect = input.quizQuestions.filter((q) => q.correct).length;

  const exercisesDone =
    exerciseTotal === 0 || exerciseSolved === exerciseTotal;
  const quizDone = quizTotal === 0 || quizAnswered === quizTotal;
  const complete = exercisesDone && quizDone;

  const parts = exerciseTotal + quizTotal;
  const done = exerciseSolved + quizAnswered;
  const percent = parts === 0 ? 100 : Math.round((done / parts) * 100);

  return {
    lessonId: input.lessonId,
    exerciseSolved,
    exerciseTotal,
    quizCorrect,
    quizAnswered,
    quizTotal,
    complete,
    percent,
  };
}

export function computeCourseProgress(
  lessons: LessonProgressInput[],
): CourseProgress {
  const computed = lessons.map(computeLessonProgress);
  const lessonsTotal = computed.length;
  const lessonsComplete = computed.filter((l) => l.complete).length;
  const percent =
    lessonsTotal === 0
      ? 0
      : Math.round(
          computed.reduce((sum, l) => sum + l.percent, 0) / lessonsTotal,
        );
  return {
    lessons: computed,
    lessonsComplete,
    lessonsTotal,
    percent,
  };
}

export function isExerciseSolved(passed: number, total: number): boolean {
  return total > 0 && passed >= total;
}
