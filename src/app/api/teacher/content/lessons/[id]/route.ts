import { NextResponse } from "next/server";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { BLOCK_MSG, lessonHasStudentData } from "@/lib/content/delete-guards";
import {
  lessonUpdateSchema,
  resolveLessonVideo,
} from "@/lib/content/validate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірний урок." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const action = (body as { action?: string }).action;
  if (action === "reorder") {
    const direction = (body as { direction?: string }).direction;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Невірний напрямок." }, { status: 400 });
    }
    const [current] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
    }
    let swap: (typeof current) | undefined;
    if (direction === "up") {
      const rows = await db
        .select()
        .from(lessons)
        .where(
          and(
            eq(lessons.moduleId, current.moduleId),
            lt(lessons.order, current.order),
          ),
        )
        .orderBy(asc(lessons.order));
      swap = rows.at(-1);
    } else {
      const [row] = await db
        .select()
        .from(lessons)
        .where(
          and(
            eq(lessons.moduleId, current.moduleId),
            gt(lessons.order, current.order),
          ),
        )
        .orderBy(asc(lessons.order))
        .limit(1);
      swap = row;
    }
    if (!swap) return NextResponse.json({ ok: true, lesson: current });
    await db
      .update(lessons)
      .set({ order: swap.order })
      .where(eq(lessons.id, current.id));
    await db
      .update(lessons)
      .set({ order: current.order })
      .where(eq(lessons.id, swap.id));
    const [updated] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);
    return NextResponse.json({ ok: true, lesson: updated });
  }

  const parsed = lessonUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }
  const video = resolveLessonVideo(parsed.data);
  const [row] = await db
    .update(lessons)
    .set({
      title: parsed.data.title,
      bodyMarkdown: parsed.data.bodyMarkdown,
      videoUrl: video.videoUrl,
      videoKind: video.videoKind,
      repoManaged: false,
    })
    .where(eq(lessons.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lesson: row });
}

export async function DELETE(_req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірний урок." }, { status: 400 });
  }
  if (await lessonHasStudentData(id)) {
    return NextResponse.json({ error: BLOCK_MSG.lesson }, { status: 409 });
  }
  await db.delete(lessons).where(eq(lessons.id, id));
  return NextResponse.json({ ok: true });
}
