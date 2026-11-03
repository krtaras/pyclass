import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, lessons } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { exerciseCreateSchema } from "@/lib/content/validate";

export async function POST(req: Request) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }
  const parsed = exerciseCreateSchema.safeParse(body);
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
    .insert(exercises)
    .values({
      lessonId: parsed.data.lessonId,
      prompt: parsed.data.prompt,
      starterCode: "",
      tests: [{ type: "assert", code: "assert True", visible: false }],
      hintLimit: 3,
    })
    .returning();

  return NextResponse.json({ ok: true, exercise: row });
}
