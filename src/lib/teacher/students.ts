import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  hintRequests,
  lessons,
  quizAttempts,
  quizQuestions,
  submissions,
  users,
} from "@/db/schema";
import {
  computeCourseProgress,
  isExerciseSolved,
} from "@/lib/progress/progress";
import type { LessonProgressInput } from "@/lib/progress/types";
import {
  computeUkrainianGrade,
  scoreFraction,
} from "@/lib/progress/grade";
import type { GroupCsvRow } from "./csv";

export type Catalog = {
  lessons: { id: number; title: string; order: number }[];
  exercises: { id: number; lessonId: number; prompt: string }[];
  questions: {
    id: number;
    lessonId: number;
    prompt: string;
    kind: string;
  }[];
};

export type StudentRow = {
  id: number;
  name: string;
  email: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  exerciseSolved: number;
  exerciseTotal: number;
  quizCorrect: number;
  quizTotal: number;
  hintsUsed: number;
  exerciseScore: number;
  quizScore: number;
  grade: number;
  lastActivity: Date | null;
};

export async function loadCatalog(): Promise<Catalog> {
  const allLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      order: lessons.order,
    })
    .from(lessons)
    .orderBy(asc(lessons.order));

  const allExercises = await db
    .select({
      id: exercises.id,
      lessonId: exercises.lessonId,
      prompt: exercises.prompt,
    })
    .from(exercises)
    .orderBy(asc(exercises.id));

  const allQuestions = await db
    .select({
      id: quizQuestions.id,
      lessonId: quizQuestions.lessonId,
      prompt: quizQuestions.prompt,
      kind: quizQuestions.kind,
    })
    .from(quizQuestions)
    .orderBy(asc(quizQuestions.id));

  return {
    lessons: allLessons,
    exercises: allExercises,
    questions: allQuestions,
  };
}

function buildProgressInput(
  catalog: Catalog,
  solvedExercises: Set<number>,
  answeredQuestions: Map<number, boolean>,
): LessonProgressInput[] {
  return catalog.lessons.map((lesson) => {
    const exs = catalog.exercises.filter((e) => e.lessonId === lesson.id);
    const qs = catalog.questions.filter((q) => q.lessonId === lesson.id);
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

export async function loadGroupStudents(
  groupId: number,
): Promise<StudentRow[]> {
  const catalog = await loadCatalog();
  const students = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.groupId, groupId), eq(users.role, "student")))
    .orderBy(asc(users.name));

  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const exerciseIds = catalog.exercises.map((e) => e.id);
  const questionIds = catalog.questions.map((q) => q.id);

  const allSubs =
    exerciseIds.length === 0
      ? []
      : await db
          .select({
            userId: submissions.userId,
            exerciseId: submissions.exerciseId,
            passed: submissions.passed,
            total: submissions.total,
            createdAt: submissions.createdAt,
          })
          .from(submissions)
          .where(
            and(
              inArray(submissions.userId, studentIds),
              inArray(submissions.exerciseId, exerciseIds),
            ),
          );

  const allAttempts =
    questionIds.length === 0
      ? []
      : await db
          .select({
            userId: quizAttempts.userId,
            questionId: quizAttempts.questionId,
            isCorrect: quizAttempts.isCorrect,
            createdAt: quizAttempts.createdAt,
          })
          .from(quizAttempts)
          .where(
            and(
              inArray(quizAttempts.userId, studentIds),
              inArray(quizAttempts.questionId, questionIds),
            ),
          );

  const allHints =
    exerciseIds.length === 0
      ? []
      : await db
          .select({
            userId: hintRequests.userId,
            exerciseId: hintRequests.exerciseId,
            createdAt: hintRequests.createdAt,
          })
          .from(hintRequests)
          .where(
            and(
              inArray(hintRequests.userId, studentIds),
              inArray(hintRequests.exerciseId, exerciseIds),
            ),
          );

  return students.map((student) => {
    const solved = new Set<number>();
    let lastActivity: Date | null = null;
    let hintsUsed = 0;

    for (const s of allSubs) {
      if (s.userId !== student.id) continue;
      if (isExerciseSolved(s.passed, s.total)) solved.add(s.exerciseId);
      if (!lastActivity || s.createdAt > lastActivity) {
        lastActivity = s.createdAt;
      }
    }

    const answered = new Map<number, boolean>();
    for (const a of allAttempts) {
      if (a.userId !== student.id) continue;
      const prev = answered.get(a.questionId);
      answered.set(a.questionId, prev === true || a.isCorrect === true);
      if (!lastActivity || a.createdAt > lastActivity) {
        lastActivity = a.createdAt;
      }
    }

    for (const h of allHints) {
      if (h.userId !== student.id) continue;
      hintsUsed += 1;
      if (!lastActivity || h.createdAt > lastActivity) {
        lastActivity = h.createdAt;
      }
    }

    const progress = computeCourseProgress(
      buildProgressInput(catalog, solved, answered),
    );
    const exerciseSolved = progress.lessons.reduce(
      (n, l) => n + l.exerciseSolved,
      0,
    );
    const exerciseTotal = progress.lessons.reduce(
      (n, l) => n + l.exerciseTotal,
      0,
    );
    const quizCorrect = progress.lessons.reduce(
      (n, l) => n + l.quizCorrect,
      0,
    );
    const quizTotal = progress.lessons.reduce((n, l) => n + l.quizTotal, 0);
    const exerciseScore = scoreFraction(exerciseSolved, exerciseTotal);
    const quizScore = scoreFraction(quizCorrect, quizTotal);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      lessonsCompleted: progress.lessonsComplete,
      lessonsTotal: progress.lessonsTotal,
      exerciseSolved,
      exerciseTotal,
      quizCorrect,
      quizTotal,
      hintsUsed,
      exerciseScore,
      quizScore,
      grade: computeUkrainianGrade(exerciseScore, quizScore),
      lastActivity,
    };
  });
}

export function studentRowsToCsv(rows: StudentRow[]): GroupCsvRow[] {
  return rows.map((r) => ({
    name: r.name,
    email: r.email,
    lessonsCompleted: r.lessonsCompleted,
    lessonsTotal: r.lessonsTotal,
    exerciseSolved: r.exerciseSolved,
    exerciseTotal: r.exerciseTotal,
    quizCorrect: r.quizCorrect,
    quizTotal: r.quizTotal,
    hintsUsed: r.hintsUsed,
    grade: r.grade,
    lastActivity: r.lastActivity ? r.lastActivity.toISOString() : "",
  }));
}

export type StudentDetail = {
  student: { id: number; name: string; email: string; groupId: number | null };
  lessons: {
    id: number;
    title: string;
    order: number;
    complete: boolean;
    percent: number;
    exercises: {
      id: number;
      prompt: string;
      solved: boolean;
      attempts: number;
      lastCode: string | null;
      hintsUsed: number;
      hints: { answer: string; createdAt: Date }[];
    }[];
    quiz: {
      id: number;
      prompt: string;
      kind: string;
      answered: boolean;
      correct: boolean | null;
      answer: string | string[] | null;
    }[];
  }[];
  summary: StudentRow;
};

export async function loadStudentDetail(
  studentId: number,
): Promise<StudentDetail | null> {
  const [student] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      groupId: users.groupId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  if (!student || student.role !== "student") return null;

  const catalog = await loadCatalog();
  const exerciseIds = catalog.exercises.map((e) => e.id);
  const questionIds = catalog.questions.map((q) => q.id);

  const subs =
    exerciseIds.length === 0
      ? []
      : await db
          .select()
          .from(submissions)
          .where(
            and(
              eq(submissions.userId, studentId),
              inArray(submissions.exerciseId, exerciseIds),
            ),
          )
          .orderBy(desc(submissions.createdAt));

  const attempts =
    questionIds.length === 0
      ? []
      : await db
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.userId, studentId),
              inArray(quizAttempts.questionId, questionIds),
            ),
          )
          .orderBy(desc(quizAttempts.createdAt));

  const hintRows =
    exerciseIds.length === 0
      ? []
      : await db
          .select({
            exerciseId: hintRequests.exerciseId,
            answer: hintRequests.answer,
            createdAt: hintRequests.createdAt,
          })
          .from(hintRequests)
          .where(
            and(
              eq(hintRequests.userId, studentId),
              inArray(hintRequests.exerciseId, exerciseIds),
            ),
          )
          .orderBy(desc(hintRequests.createdAt));

  const hintsByExercise = new Map<
    number,
    { answer: string; createdAt: Date }[]
  >();
  for (const h of hintRows) {
    const list = hintsByExercise.get(h.exerciseId) ?? [];
    list.push({ answer: h.answer, createdAt: h.createdAt });
    hintsByExercise.set(h.exerciseId, list);
  }

  const solved = new Set<number>();
  const attemptCount = new Map<number, number>();
  const lastCode = new Map<number, string>();
  let lastActivity: Date | null = null;

  for (const s of subs) {
    attemptCount.set(
      s.exerciseId,
      (attemptCount.get(s.exerciseId) ?? 0) + 1,
    );
    if (!lastCode.has(s.exerciseId)) lastCode.set(s.exerciseId, s.code);
    if (isExerciseSolved(s.passed, s.total)) solved.add(s.exerciseId);
    if (!lastActivity || s.createdAt > lastActivity) lastActivity = s.createdAt;
  }

  const answered = new Map<number, boolean>();
  const latestAnswer = new Map<number, string | string[]>();
  for (const a of attempts) {
    if (!answered.has(a.questionId)) {
      answered.set(a.questionId, a.isCorrect);
      latestAnswer.set(a.questionId, a.answer as string | string[]);
    } else if (a.isCorrect) {
      answered.set(a.questionId, true);
    }
    if (!lastActivity || a.createdAt > lastActivity) lastActivity = a.createdAt;
  }

  for (const h of hintRows) {
    if (!lastActivity || h.createdAt > lastActivity) lastActivity = h.createdAt;
  }

  // Prefer "any correct" for answered map consistency with progress
  for (const a of attempts) {
    if (a.isCorrect) answered.set(a.questionId, true);
  }

  const progressInput = buildProgressInput(catalog, solved, answered);
  const progress = computeCourseProgress(progressInput);
  const byLesson = new Map(progress.lessons.map((l) => [l.lessonId, l]));

  const exerciseSolved = progress.lessons.reduce(
    (n, l) => n + l.exerciseSolved,
    0,
  );
  const exerciseTotal = progress.lessons.reduce(
    (n, l) => n + l.exerciseTotal,
    0,
  );
  const quizCorrect = progress.lessons.reduce((n, l) => n + l.quizCorrect, 0);
  const quizTotal = progress.lessons.reduce((n, l) => n + l.quizTotal, 0);
  const exerciseScore = scoreFraction(exerciseSolved, exerciseTotal);
  const quizScore = scoreFraction(quizCorrect, quizTotal);

  const summary: StudentRow = {
    id: student.id,
    name: student.name,
    email: student.email,
    lessonsCompleted: progress.lessonsComplete,
    lessonsTotal: progress.lessonsTotal,
    exerciseSolved,
    exerciseTotal,
    quizCorrect,
    quizTotal,
    hintsUsed: hintRows.length,
    exerciseScore,
    quizScore,
    grade: computeUkrainianGrade(exerciseScore, quizScore),
    lastActivity,
  };

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      groupId: student.groupId,
    },
    summary,
    lessons: catalog.lessons.map((lesson) => {
      const lp = byLesson.get(lesson.id)!;
      const exs = catalog.exercises.filter((e) => e.lessonId === lesson.id);
      const qs = catalog.questions.filter((q) => q.lessonId === lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        complete: lp.complete,
        percent: lp.percent,
        exercises: exs.map((e) => ({
          id: e.id,
          prompt: e.prompt,
          solved: solved.has(e.id),
          attempts: attemptCount.get(e.id) ?? 0,
          lastCode: lastCode.get(e.id) ?? null,
          hintsUsed: (hintsByExercise.get(e.id) ?? []).length,
          hints: hintsByExercise.get(e.id) ?? [],
        })),
        quiz: qs.map((q) => {
          const ans = answered.get(q.id);
          return {
            id: q.id,
            prompt: q.prompt,
            kind: q.kind,
            answered: ans !== undefined,
            correct: ans === undefined ? null : ans,
            answer: latestAnswer.get(q.id) ?? null,
          };
        }),
      };
    }),
  };
}
