import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import {
  BLOCK_MSG,
  exerciseHasSubmissions,
} from "@/lib/content/delete-guards";
import { exerciseUpdateSchema } from "@/lib/content/validate";
import type { ExerciseTest } from "@/lib/python/types";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірна вправа." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const parsed = exerciseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }

  const tests = parsed.data.tests as ExerciseTest[];
  const [row] = await db
    .update(exercises)
    .set({
      prompt: parsed.data.prompt,
      starterCode: parsed.data.starterCode,
      hintLimit: parsed.data.hintLimit,
      tests,
    })
    .where(eq(exercises.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, exercise: row });
}

export async function DELETE(_req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірна вправа." }, { status: 400 });
  }
  if (await exerciseHasSubmissions(id)) {
    return NextResponse.json({ error: BLOCK_MSG.exercise }, { status: 409 });
  }
  await db.delete(exercises).where(eq(exercises.id, id));
  return NextResponse.json({ ok: true });
}
