import { NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { lessonCreateSchema } from "@/lib/content/validate";
import { teacherSlug } from "@/lib/content/slug";

export async function POST(req: Request) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }
  const parsed = lessonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }

  const [mod] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.id, parsed.data.moduleId))
    .limit(1);
  if (!mod) {
    return NextResponse.json({ error: "Модуль не знайдено." }, { status: 404 });
  }

  const [agg] = await db
    .select({ m: max(lessons.order) })
    .from(lessons)
    .where(eq(lessons.moduleId, parsed.data.moduleId));
  const order = (agg?.m ?? 0) + 1;

  const [row] = await db
    .insert(lessons)
    .values({
      slug: teacherSlug("lesson", parsed.data.title),
      moduleId: parsed.data.moduleId,
      title: parsed.data.title,
      order,
      bodyMarkdown: "",
      videoUrl: null,
      videoKind: null,
      repoManaged: false,
    })
    .returning();

  return NextResponse.json({ ok: true, lesson: row });
}
