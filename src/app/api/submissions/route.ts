import { NextResponse } from "next/server";
import { db } from "@/db";
import { exercises, submissions } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { isExerciseSolved } from "@/lib/progress/progress";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Потрібен вхід." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const exerciseId = Number(raw.exerciseId);
  const code = String(raw.code ?? "");
  const passed = Number(raw.passed);
  const total = Number(raw.total);

  if (!Number.isFinite(exerciseId) || exerciseId < 1) {
    return NextResponse.json({ error: "Невірна вправа." }, { status: 400 });
  }
  if (code.length > 50_000) {
    return NextResponse.json({ error: "Код занадто довгий." }, { status: 400 });
  }
  if (!Number.isFinite(passed) || !Number.isFinite(total) || total < 0 || passed < 0) {
    return NextResponse.json({ error: "Невірні результати тестів." }, { status: 400 });
  }

  const [ex] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);
  if (!ex) {
    return NextResponse.json({ error: "Вправу не знайдено." }, { status: 404 });
  }

  const [row] = await db
    .insert(submissions)
    .values({
      userId: session.id,
      exerciseId,
      code,
      passed,
      total,
    })
    .returning();

  return NextResponse.json({
    ok: true,
    submission: {
      id: row!.id,
      exerciseId,
      passed,
      total,
      solved: isExerciseSolved(passed, total),
    },
  });
}
