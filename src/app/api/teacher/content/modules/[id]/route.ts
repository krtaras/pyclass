import { NextResponse } from "next/server";
import { asc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { requireTeacherApi } from "@/lib/auth/teacher-api";
import { BLOCK_MSG, moduleHasStudentData } from "@/lib/content/delete-guards";
import { moduleUpdateSchema } from "@/lib/content/validate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірний модуль." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const action = (body as { action?: string }).action;

  if (action === "reorder") {
    const direction = (body as { direction?: string }).direction;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Невірний напрямок." }, { status: 400 });
    }
    const [current] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);
    if (!current) {
      return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
    }

    let swap: (typeof current) | undefined;
    if (direction === "up") {
      const rows = await db
        .select()
        .from(modules)
        .where(lt(modules.order, current.order))
        .orderBy(asc(modules.order));
      swap = rows.at(-1);
    } else {
      const [row] = await db
        .select()
        .from(modules)
        .where(gt(modules.order, current.order))
        .orderBy(asc(modules.order))
        .limit(1);
      swap = row;
    }
    if (!swap) {
      return NextResponse.json({ ok: true, module: current });
    }
    await db
      .update(modules)
      .set({ order: swap.order })
      .where(eq(modules.id, current.id));
    await db
      .update(modules)
      .set({ order: current.order })
      .where(eq(modules.id, swap.id));
    const [updated] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);
    return NextResponse.json({ ok: true, module: updated });
  }

  const parsed = moduleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Помилка валідації." },
      { status: 400 },
    );
  }
  const [row] = await db
    .update(modules)
    .set({ title: parsed.data.title })
    .where(eq(modules.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "Не знайдено." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, module: row });
}

export async function DELETE(_req: Request, { params }: Props) {
  const auth = await requireTeacherApi();
  if (!auth.ok) return auth.response;
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Невірний модуль." }, { status: 400 });
  }
  if (await moduleHasStudentData(id)) {
    return NextResponse.json({ error: BLOCK_MSG.module }, { status: 409 });
  }
  await db.delete(modules).where(eq(modules.id, id));
  return NextResponse.json({ ok: true });
}
