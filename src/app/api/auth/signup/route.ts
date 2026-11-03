import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { validateSignup } from "@/lib/auth/validate";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Некоректний запит." },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;
  const parsed = validateSignup({
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    password: String(raw.password ?? ""),
    inviteCode: String(raw.inviteCode ?? ""),
  });

  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  const { name, email, password, inviteCode } = parsed.data;

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);

  if (!group) {
    return NextResponse.json(
      { errors: { inviteCode: "Невірний код запрошення." } },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { errors: { email: "Цей email уже зареєстровано." } },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "student",
      groupId: group.id,
    })
    .returning();

  if (!user) {
    return NextResponse.json(
      { error: "Не вдалося створити акаунт." },
      { status: 500 },
    );
  }

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    groupId: user.groupId,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
