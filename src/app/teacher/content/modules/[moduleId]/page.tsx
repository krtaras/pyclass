import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/teacher";
import { LessonsManager } from "@/components/content/LessonsManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ moduleId: string }> };

export default async function TeacherModulePage({ params }: Props) {
  await requireTeacher();
  const moduleId = Number((await params).moduleId);
  if (!Number.isFinite(moduleId)) notFound();

  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!mod) notFound();

  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(asc(lessons.order));

  return (
    <div className="space-y-6" data-testid="teacher-module">
      <div className="space-y-1">
        <Link
          href="/teacher/content"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Контент
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{mod.title}</h1>
        <p className="text-sm text-zinc-600">Уроки модуля</p>
      </div>
      <LessonsManager
        moduleId={mod.id}
        lessons={rows.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
        }))}
      />
    </div>
  );
}
