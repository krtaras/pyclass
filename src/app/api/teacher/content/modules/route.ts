import { NextResponse } from "next/server";
import { asc, max } from "drizzle-orm";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { moduleCreateSchema } from "@/lib/content/validate";
import { teacherSlug } from "@/lib/content/slug";

export async function GET() {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const rows = await db.select().from(modules).orderBy(asc(modules.order));
  return NextResponse.json({ modules: rows });
}

export async function POST(req: Request) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }
  const parsed = moduleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }

  const [agg] = await db.select({ m: max(modules.order) }).from(modules);
  const order = (agg?.m ?? 0) + 1;
  const [row] = await db
    .insert(modules)
    .values({
      slug: teacherSlug("mod", parsed.data.title),
      title: parsed.data.title,
      order,
      repoManaged: false,
    })
    .returning();
  return NextResponse.json({ ok: true, module: row });
}
