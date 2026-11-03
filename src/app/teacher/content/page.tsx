import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/teacher";
import { ModulesManager } from "@/components/content/ModulesManager";

export const dynamic = "force-dynamic";

export default async function TeacherContentPage() {
  await requireTeacher();

  const allModules = await db
    .select()
    .from(modules)
    .orderBy(asc(modules.order));

  const counts = await db
    .select({
      moduleId: lessons.moduleId,
      n: count(lessons.id),
    })
    .from(lessons)
    .groupBy(lessons.moduleId);
  const byModule = new Map(counts.map((c) => [c.moduleId, Number(c.n)]));

  return (
    <div className="space-y-6" data-testid="teacher-content">
      <div className="space-y-1">
        <Link href="/teacher" className="text-sm text-emerald-700 hover:underline">
          ← Кабінет
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Контент курсу</h1>
        <p className="text-sm text-zinc-600">
          Модулі, уроки, вправи й квізи. Видалення блокується, якщо є спроби
          учнів.
        </p>
      </div>
      <ModulesManager
        modules={allModules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          lessonCount: byModule.get(m.id) ?? 0,
        }))}
      />
    </div>
  );
}
