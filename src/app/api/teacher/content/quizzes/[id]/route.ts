import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import {
  BLOCK_MSG,
  questionHasAttempts,
} from "@/lib/content/delete-guards";
import { quizUpdateSchema } from "@/lib/content/validate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірне питання." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const parsed = quizUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }

  const correct =
    parsed.data.kind === "multi"
      ? (Array.isArray(parsed.data.correct)
          ? parsed.data.correct
          : [parsed.data.correct]
        ).map(String)
      : Array.isArray(parsed.data.correct)
        ? String(parsed.data.correct[0])
        : String(parsed.data.correct);

  const [row] = await db
    .update(quizQuestions)
    .set({
      kind: parsed.data.kind,
      prompt: parsed.data.prompt,
      code: parsed.data.code ?? null,
      options: parsed.data.options,
      correct,
      explanation: parsed.data.explanation,
      repoManaged: false,
    })
    .where(eq(quizQuestions.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, question: row });
}

export async function DELETE(_req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірне питання." }, { status: 400 });
  }
  if (await questionHasAttempts(id)) {
    return NextResponse.json({ error: BLOCK_MSG.question }, { status: 409 });
  }
  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  return NextResponse.json({ ok: true });
}
