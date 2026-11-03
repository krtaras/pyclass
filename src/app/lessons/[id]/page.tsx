import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { exercises, hintRequests, lessons, modules, quizAttempts, quizQuestions, submissions } from "@/db/schema";
import { Markdown } from "@/components/Markdown";
import { VideoEmbed } from "@/components/VideoEmbed";
import { LessonInteractive } from "@/components/LessonInteractive";
import { getSession } from "@/lib/auth/session";
import type { ExerciseTest } from "@/lib/python/types";
import type { QuizQuestion } from "@/lib/quiz/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LessonPage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    const { id } = await params;
    redirect(`/login?next=/lessons/${id}`);
  }

  const { id } = await params;
  const lessonId = Number(id);
  if (!Number.isFinite(lessonId)) notFound();

  const [row] = await db
    .select({
      lesson: lessons,
      moduleTitle: modules.title,
      moduleOrder: modules.order,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!row) notFound();

  const lessonExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.lessonId, lessonId))
    .orderBy(asc(exercises.id));

  const lessonQuiz = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, lessonId))
    .orderBy(asc(quizQuestions.id));

  const exerciseIds = lessonExercises.map((e) => e.id);
  const questionIds = lessonQuiz.map((q) => q.id);

  // Latest submission code per exercise for this user
  const latestCode = new Map<number, string>();
  if (exerciseIds.length > 0) {
    const subs = await db
      .select({
        exerciseId: submissions.exerciseId,
        code: submissions.code,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, session.id),
          inArray(submissions.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(submissions.createdAt));
    for (const s of subs) {
      if (!latestCode.has(s.exerciseId)) {
        latestCode.set(s.exerciseId, s.code);
      }
    }
  }

  // Hint request counts per exercise for this user
  const hintsUsed = new Map<number, number>();
  if (exerciseIds.length > 0) {
    const hintRows = await db
      .select({
        exerciseId: hintRequests.exerciseId,
      })
      .from(hintRequests)
      .where(
        and(
          eq(hintRequests.userId, session.id),
          inArray(hintRequests.exerciseId, exerciseIds),
        ),
      );
    for (const h of hintRows) {
      hintsUsed.set(h.exerciseId, (hintsUsed.get(h.exerciseId) ?? 0) + 1);
    }
  }

  // Latest attempt per question for this user
  const savedAttempts: {
    questionId: number;
    answer: string | string[];
    isCorrect: boolean;
  }[] = [];
  if (questionIds.length > 0) {
    const attempts = await db
      .select({
        questionId: quizAttempts.questionId,
        answer: quizAttempts.answer,
        isCorrect: quizAttempts.isCorrect,
        createdAt: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, session.id),
          inArray(quizAttempts.questionId, questionIds),
        ),
      )
      .orderBy(desc(quizAttempts.createdAt));
    const seen = new Set<number>();
    for (const a of attempts) {
      if (seen.has(a.questionId)) continue;
      seen.add(a.questionId);
      savedAttempts.push({
        questionId: a.questionId,
        answer: a.answer as string | string[],
        isCorrect: a.isCorrect,
      });
    }
  }

  const { lesson, moduleTitle, moduleOrder } = row;

  const quizProps: QuizQuestion[] = lessonQuiz.map((q) => {
    const correctRaw = q.correct as string | string[] | number | number[];
    const correct = Array.isArray(correctRaw)
      ? correctRaw.map(String)
      : String(correctRaw);
    return {
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      code: q.code,
      options: ((q.options ?? []) as Array<string | number>).map(String),
      correct,
      explanation: q.explanation,
    };
  });

  return (
    <article className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex text-sm text-emerald-700 hover:underline"
        >
          ← До курсу
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Модуль {moduleOrder}: {moduleTitle}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {lesson.title}
        </h1>
      </div>

      <VideoEmbed
        url={lesson.videoUrl}
        kind={lesson.videoKind}
        title={lesson.title}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <Markdown content={lesson.bodyMarkdown} />
      </section>

      <LessonInteractive
        exercises={lessonExercises.map((ex) => ({
          id: ex.id,
          prompt: ex.prompt,
          starterCode: ex.starterCode,
          tests: ex.tests as ExerciseTest[],
          initialCode: latestCode.get(ex.id),
          hintLimit: ex.hintLimit,
          initialHintsUsed: hintsUsed.get(ex.id) ?? 0,
        }))}
        questions={quizProps}
        savedAttempts={savedAttempts}
      />
    </article>
  );
}
