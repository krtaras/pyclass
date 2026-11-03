import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { generateInviteCode } from "@/lib/teacher/invite";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Немає доступу." }, { status: 403 });
  }

  const rows = await db.select().from(groups).orderBy(asc(groups.name));
  return NextResponse.json({ groups: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Немає доступу." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Назва групи має мати щонайменше 2 символи." },
      { status: 400 },
    );
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Назва задовга." }, { status: 400 });
  }

  let inviteCode = generateInviteCode(8);
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode))
      .limit(1);
    if (!existing) break;
    inviteCode = generateInviteCode(8);
  }

  const [row] = await db
    .insert(groups)
    .values({ name, inviteCode })
    .returning();

  return NextResponse.json({ ok: true, group: row });
}
