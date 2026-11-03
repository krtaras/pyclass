import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  lessons,
  quizAttempts,
  quizQuestions,
  submissions,
} from "@/db/schema";
import {
  computeCourseProgress,
  isExerciseSolved,
} from "./progress";
import type { LessonProgressInput } from "./types";

export async function loadCourseProgressInput(
  userId: number,
): Promise<LessonProgressInput[]> {
  const allLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .orderBy(asc(lessons.order));

  if (allLessons.length === 0) return [];

  const lessonIds = allLessons.map((l) => l.id);

  const allExercises = await db
    .select({ id: exercises.id, lessonId: exercises.lessonId })
    .from(exercises)
    .where(inArray(exercises.lessonId, lessonIds));

  const allQuestions = await db
    .select({ id: quizQuestions.id, lessonId: quizQuestions.lessonId })
    .from(quizQuestions)
    .where(inArray(quizQuestions.lessonId, lessonIds));

  const exerciseIds = allExercises.map((e) => e.id);
  const questionIds = allQuestions.map((q) => q.id);

  const userSubs =
    exerciseIds.length === 0
      ? []
      : await db
          .select({
            exerciseId: submissions.exerciseId,
            passed: submissions.passed,
            total: submissions.total,
          })
          .from(submissions)
          .where(
            and(
              eq(submissions.userId, userId),
              inArray(submissions.exerciseId, exerciseIds),
            ),
          );

  const userAttempts =
    questionIds.length === 0
      ? []
      : await db
          .select({
            questionId: quizAttempts.questionId,
            isCorrect: quizAttempts.isCorrect,
          })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.userId, userId),
              inArray(quizAttempts.questionId, questionIds),
            ),
          );

  const solvedExercises = new Set<number>();
  for (const s of userSubs) {
    if (isExerciseSolved(s.passed, s.total)) {
      solvedExercises.add(s.exerciseId);
    }
  }

  const answeredQuestions = new Map<number, boolean>();
  for (const a of userAttempts) {
    const prev = answeredQuestions.get(a.questionId);
    // Prefer correct if any attempt was correct
    answeredQuestions.set(
      a.questionId,
      prev === true || a.isCorrect === true,
    );
  }

  return allLessons.map((lesson) => {
    const exs = allExercises.filter((e) => e.lessonId === lesson.id);
    const qs = allQuestions.filter((q) => q.lessonId === lesson.id);
    return {
      lessonId: lesson.id,
      exercises: exs.map((e) => ({
        exerciseId: e.id,
        solved: solvedExercises.has(e.id),
      })),
      quizQuestions: qs.map((q) => {
        const correct = answeredQuestions.get(q.id);
        return {
          questionId: q.id,
          answered: correct !== undefined,
          correct: correct === true,
        };
      }),
    };
  });
}

export async function loadUserCourseProgress(userId: number) {
  const input = await loadCourseProgressInput(userId);
  return computeCourseProgress(input);
}
