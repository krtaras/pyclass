import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { buildGroupCsv } from "@/lib/teacher/csv";
import {
  loadGroupStudents,
  studentRowsToCsv,
} from "@/lib/teacher/students";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Немає доступу." }, { status: 403 });
  }

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: "Невірна група." }, { status: 400 });
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return NextResponse.json({ error: "Групу не знайдено." }, { status: 404 });
  }

  const students = await loadGroupStudents(groupId);
  const csv = buildGroupCsv(studentRowsToCsv(students));
  const filename = `pyclass-group-${group.inviteCode}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
