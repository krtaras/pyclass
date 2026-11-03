import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, lessons, modules, quizQuestions } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/teacher";
import { LessonEditor } from "@/components/content/LessonEditor";
import type { ExerciseTest } from "@/lib/python/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lessonId: string }> };

export default async function TeacherLessonEditPage({ params }: Props) {
  await requireTeacher();
  const lessonId = Number((await params).lessonId);
  if (!Number.isFinite(lessonId)) notFound();

  const [row] = await db
    .select({
      lesson: lessons,
      moduleTitle: modules.title,
      moduleId: modules.id,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) notFound();

  const exs = await db
    .select()
    .from(exercises)
    .where(eq(exercises.lessonId, lessonId))
    .orderBy(asc(exercises.id));

  const qs = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, lessonId))
    .orderBy(asc(quizQuestions.id));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/teacher/content/modules/${row.moduleId}`}
          className="text-sm text-emerald-700 hover:underline"
        >
          ← {row.moduleTitle}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Редагування уроку
        </h1>
      </div>
      <LessonEditor
        lesson={{
          id: row.lesson.id,
          title: row.lesson.title,
          bodyMarkdown: row.lesson.bodyMarkdown,
          videoUrl: row.lesson.videoUrl,
          videoKind: row.lesson.videoKind,
        }}
        exercises={exs.map((e) => ({
          id: e.id,
          prompt: e.prompt,
          starterCode: e.starterCode,
          hintLimit: e.hintLimit,
          tests: e.tests as ExerciseTest[],
        }))}
        questions={qs.map((q) => ({
          id: q.id,
          kind: q.kind,
          prompt: q.prompt,
          code: q.code,
          options: (q.options ?? []) as string[],
          correct: q.correct as string | string[],
          explanation: q.explanation,
        }))}
      />
    </div>
  );
}
