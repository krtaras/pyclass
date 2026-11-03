import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, hintRequests } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { generateExerciseHint } from "@/lib/hints/generate";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Потрібен вхід учня." }, { status: 401 });
  }
  const url = new URL(req.url);
  const exerciseId = Number(url.searchParams.get("exerciseId"));
  if (!Number.isFinite(exerciseId) || exerciseId < 1) {
    return NextResponse.json({ error: "Невірна вправа." }, { status: 400 });
  }

  const [ex] = await db
    .select({ id: exercises.id, hintLimit: exercises.hintLimit })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);
  if (!ex) {
    return NextResponse.json({ error: "Вправу не знайдено." }, { status: 404 });
  }

  const [row] = await db
    .select({ n: count() })
    .from(hintRequests)
    .where(
      and(
        eq(hintRequests.userId, session.id),
        eq(hintRequests.exerciseId, exerciseId),
      ),
    );
  const used = Number(row?.n ?? 0);
  const remaining = Math.max(0, ex.hintLimit - used);
  return NextResponse.json({
    hintLimit: ex.hintLimit,
    used,
    remaining,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Потрібен вхід учня." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const exerciseId = Number(raw.exerciseId);
  const studentCode = String(raw.code ?? "").slice(0, 50_000);
  const lastCheckSummary =
    raw.lastCheckSummary == null
      ? null
      : String(raw.lastCheckSummary).slice(0, 4000);

  if (!Number.isFinite(exerciseId) || exerciseId < 1) {
    return NextResponse.json({ error: "Невірна вправа." }, { status: 400 });
  }

  const [ex] = await db
    .select({
      id: exercises.id,
      prompt: exercises.prompt,
      hintLimit: exercises.hintLimit,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);
  if (!ex) {
    return NextResponse.json({ error: "Вправу не знайдено." }, { status: 404 });
  }

  const [row] = await db
    .select({ n: count() })
    .from(hintRequests)
    .where(
      and(
        eq(hintRequests.userId, session.id),
        eq(hintRequests.exerciseId, exerciseId),
      ),
    );
  const used = Number(row?.n ?? 0);
  if (used >= ex.hintLimit) {
    return NextResponse.json(
      {
        error: "Підказки вичерпано для цієї вправи.",
        remaining: 0,
        hintLimit: ex.hintLimit,
        used,
      },
      { status: 429 },
    );
  }

  let hint: string;
  let regenerated = false;
  let usedFallback = false;
  try {
    const result = await generateExerciseHint({
      exercisePrompt: ex.prompt,
      studentCode,
      lastCheckSummary,
    });
    hint = result.hint;
    regenerated = result.regenerated;
    usedFallback = result.usedFallback;
  } catch (err) {
    console.error("hint generation failed", err);
    return NextResponse.json(
      { error: "Не вдалося отримати підказку. Спробуй пізніше." },
      { status: 502 },
    );
  }

  // Log: question = student code (+ optional check), answer = AI hint
  const questionPayload = lastCheckSummary
    ? `Код:\n${studentCode}\n\nПеревірка:\n${lastCheckSummary}`
    : studentCode;

  await db.insert(hintRequests).values({
    userId: session.id,
    exerciseId,
    question: questionPayload.slice(0, 20_000),
    answer: hint.slice(0, 10_000),
  });

  const remaining = Math.max(0, ex.hintLimit - used - 1);
  return NextResponse.json({
    ok: true,
    hint,
    remaining,
    used: used + 1,
    hintLimit: ex.hintLimit,
    regenerated,
    usedFallback,
  });
}
