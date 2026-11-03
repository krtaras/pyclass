import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, users } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/teacher";
import { CreateGroupForm } from "@/components/CreateGroupForm";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  await requireTeacher();

  const allGroups = await db
    .select()
    .from(groups)
    .orderBy(asc(groups.name));

  const counts = await db
    .select({
      groupId: users.groupId,
      n: count(users.id),
    })
    .from(users)
    .where(eq(users.role, "student"))
    .groupBy(users.groupId);

  const countByGroup = new Map(
    counts
      .filter((c) => c.groupId != null)
      .map((c) => [c.groupId as number, Number(c.n)]),
  );

  return (
    <div className="space-y-6" data-testid="teacher-home">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Кабінет учителя</h1>
        <p className="text-sm text-zinc-600">
          Групи, коди запрошення та прогрес учнів.
        </p>
        <Link
          href="/teacher/content"
          className="inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          data-testid="nav-content"
        >
          Редактор контенту
        </Link>
      </div>

      <CreateGroupForm />

      {allGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          Поки немає груп. Створи першу вище.
        </p>
      ) : (
        <ul
          className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          data-testid="groups-list"
        >
          {allGroups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/teacher/groups/${g.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 sm:px-5"
                data-testid={`group-row-${g.id}`}
                data-invite={g.inviteCode}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{g.name}</p>
                  <p className="text-xs text-zinc-500">
                    Код:{" "}
                    <span className="font-mono tracking-wide">
                      {g.inviteCode}
                    </span>
                    {" · "}
                    учнів: {countByGroup.get(g.id) ?? 0}
                  </p>
                </div>
                <span className="text-zinc-400" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
