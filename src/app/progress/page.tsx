import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { loadUserCourseProgress } from "@/lib/progress/load";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/progress");

  const progress = await loadUserCourseProgress(session.id);
  const allLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      order: lessons.order,
      moduleTitle: modules.title,
      moduleOrder: modules.order,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .orderBy(asc(modules.order), asc(lessons.order));

  const byId = new Map(progress.lessons.map((l) => [l.lessonId, l]));

  return (
    <div className="space-y-6" data-testid="progress-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Мій прогрес</h1>
        <p className="text-sm text-zinc-600">
          Привіт, {session.name}! Ось як ти просуваєшся курсом.
        </p>
      </div>

      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
        data-testid="progress-summary"
      >
        <p className="text-sm font-medium text-emerald-900">
          Завершено уроків: {progress.lessonsComplete} з {progress.lessonsTotal}
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-950">
          {progress.percent}%
        </p>
      </div>

      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {allLessons.map((lesson) => {
          const lp = byId.get(lesson.id);
          const complete = lp?.complete ?? false;
          const percent = lp?.percent ?? 0;
          return (
            <li key={lesson.id}>
              <Link
                href={`/lessons/${lesson.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 sm:px-5"
                data-testid={`progress-lesson-${lesson.id}`}
                data-complete={complete ? "true" : "false"}
                data-percent={percent}
              >
                <span
                  className={
                    complete
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm text-white"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700"
                  }
                  aria-hidden
                >
                  {complete ? "✓" : lesson.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Модуль {lesson.moduleOrder}: {lesson.moduleTitle}
                    {lp
                      ? ` · вправи ${lp.exerciseSolved}/${lp.exerciseTotal}, квіз ${lp.quizCorrect}/${lp.quizTotal}`
                      : ""}
                  </p>
                </div>
                <span className="text-sm font-medium text-zinc-600">
                  {complete ? "Готово" : `${percent}%`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
