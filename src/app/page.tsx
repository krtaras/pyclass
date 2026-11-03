import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { modules, lessons } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allModules = await db
    .select()
    .from(modules)
    .orderBy(asc(modules.order));

  const allLessons = await db
    .select()
    .from(lessons)
    .orderBy(asc(lessons.order));

  const lessonsByModule = new Map<number, typeof allLessons>();
  for (const lesson of allLessons) {
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Курс Python
        </h1>
        <p className="max-w-prose text-sm text-zinc-600 sm:text-base">
          Короткі уроки українською: пояснення, відео, вправи й квізи. Почни з
          першого модуля.
        </p>
      </section>

      {allModules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          Поки що немає модулів. Запусти сід бази даних.
        </p>
      ) : (
        <div className="space-y-6">
          {allModules.map((mod) => {
            const modLessons = lessonsByModule.get(mod.id) ?? [];
            return (
              <section
                key={mod.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Модуль {mod.order}
                  </p>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {mod.title}
                  </h2>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {modLessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50 active:bg-zinc-100 sm:px-5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                          {lesson.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-900">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-zinc-500">Урок</p>
                        </div>
                        <span aria-hidden className="text-zinc-400">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
