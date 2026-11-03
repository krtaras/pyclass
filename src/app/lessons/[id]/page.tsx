import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { Markdown } from "@/components/Markdown";
import { VideoEmbed } from "@/components/VideoEmbed";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LessonPage({ params }: Props) {
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

  const { lesson, moduleTitle, moduleOrder } = row;

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

      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500">
        Вправи й квізи зʼявляться в наступних кроках.
      </p>
    </article>
  );
}
