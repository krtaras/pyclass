import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  lessons,
  quizAttempts,
  quizQuestions,
  submissions,
} from "@/db/schema";

/**
 * Delete policy (step 6): block deletion when student data references the
 * content. Clear Ukrainian error; no silent cascade of submissions.
 */

export async function exerciseHasSubmissions(
  exerciseId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(submissions)
    .where(eq(submissions.exerciseId, exerciseId));
  return Number(row?.n ?? 0) > 0;
}

export async function questionHasAttempts(
  questionId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(quizAttempts)
    .where(eq(quizAttempts.questionId, questionId));
  return Number(row?.n ?? 0) > 0;
}

export async function lessonHasStudentData(
  lessonId: number,
): Promise<boolean> {
  const exs = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.lessonId, lessonId));
  const qs = await db
    .select({ id: quizQuestions.id })
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, lessonId));

  if (exs.length > 0) {
    const [s] = await db
      .select({ n: count() })
      .from(submissions)
      .where(
        inArray(
          submissions.exerciseId,
          exs.map((e) => e.id),
        ),
      );
    if (Number(s?.n ?? 0) > 0) return true;
  }
  if (qs.length > 0) {
    const [a] = await db
      .select({ n: count() })
      .from(quizAttempts)
      .where(
        inArray(
          quizAttempts.questionId,
          qs.map((q) => q.id),
        ),
      );
    if (Number(a?.n ?? 0) > 0) return true;
  }
  return false;
}

export async function moduleHasStudentData(
  moduleId: number,
): Promise<boolean> {
  const modsLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));
  for (const l of modsLessons) {
    if (await lessonHasStudentData(l.id)) return true;
  }
  return false;
}

export const BLOCK_MSG = {
  exercise:
    "Неможливо видалити: є спроби учнів з цієї вправи. Спочатку залиш вправу або очисти дані.",
  question:
    "Неможливо видалити: є відповіді учнів на це питання.",
  lesson:
    "Неможливо видалити урок: є спроби або відповіді учнів. Видали повʼязані дані або залиш урок.",
  module:
    "Неможливо видалити модуль: у його уроках є спроби учнів.",
} as const;
