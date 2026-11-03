import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts, quizQuestions } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { checkQuizAnswer } from "@/lib/quiz/check";

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
  const questionId = Number(raw.questionId);
  const answer = raw.answer as string | string[];

  if (!Number.isFinite(questionId) || questionId < 1) {
    return NextResponse.json({ error: "Невірне питання." }, { status: 400 });
  }
  if (typeof answer !== "string" && !Array.isArray(answer)) {
    return NextResponse.json({ error: "Невірна відповідь." }, { status: 400 });
  }

  const [question] = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.id, questionId))
    .limit(1);

  if (!question) {
    return NextResponse.json({ error: "Питання не знайдено." }, { status: 404 });
  }

  // Re-check server-side; never trust client isCorrect
  const correctRaw = question.correct as string | string[] | number | number[];
  const correct = Array.isArray(correctRaw)
    ? correctRaw.map(String)
    : String(correctRaw);
  const result = checkQuizAnswer(
    { kind: question.kind, correct },
    Array.isArray(answer) ? answer.map(String) : String(answer),
  );

  const [row] = await db
    .insert(quizAttempts)
    .values({
      userId: session.id,
      questionId,
      answer: Array.isArray(answer) ? answer.map(String) : String(answer),
      isCorrect: result.isCorrect,
    })
    .returning();

  return NextResponse.json({
    ok: true,
    attempt: {
      id: row!.id,
      questionId,
      isCorrect: result.isCorrect,
      correctOptions: result.correctOptions,
    },
  });
}
