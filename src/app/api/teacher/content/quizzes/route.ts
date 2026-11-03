import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, quizQuestions } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { quizCreateSchema } from "@/lib/content/validate";
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
  const parsed = quizCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }
  const [lesson] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.id, parsed.data.lessonId))
    .limit(1);
  if (!lesson) {
    return NextResponse.json({ error: "Урок не знайдено." }, { status: 404 });
  }

  const [row] = await db
    .insert(quizQuestions)
    .values({
      slug: teacherSlug("quiz", parsed.data.prompt),
      lessonId: parsed.data.lessonId,
      kind: parsed.data.kind,
      prompt: parsed.data.prompt,
      code: null,
      options: ["Варіант 1", "Варіант 2"],
      correct: "Варіант 1",
      explanation: "",
      repoManaged: false,
    })
    .returning();

  return NextResponse.json({ ok: true, question: row });
}
