import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireTeacher } from "@/lib/auth/teacher";
import { GRADE_FORMULA_UK } from "@/lib/progress/grade";
import { loadGroupStudents } from "@/lib/teacher/students";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatActivity(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function TeacherGroupPage({ params }: Props) {
  await requireTeacher();
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) notFound();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) notFound();

  const students = await loadGroupStudents(groupId);

  return (
    <div className="space-y-6" data-testid="teacher-group" data-group-id={group.id}>
      <div className="space-y-2">
        <Link
          href="/teacher"
          className="inline-flex text-sm text-emerald-700 hover:underline"
        >
          ← До груп
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
        <p className="text-sm text-zinc-600">
          Код запрошення:{" "}
          <span
            className="font-mono font-semibold tracking-wide text-zinc-900"
            data-testid="group-invite"
          >
            {group.inviteCode}
          </span>
        </p>
        <p className="text-xs text-zinc-500" data-testid="grade-formula">
          {GRADE_FORMULA_UK}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={`/teacher/groups/${group.id}/export`}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            data-testid="export-csv"
          >
            Завантажити CSV
          </a>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          У цій групі ще немає учнів.
        </p>
      ) : (
        <>
          {/* Desktop / scrollable table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm sm:block">
            <table className="min-w-full text-left text-sm" data-testid="students-table">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Імʼя</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Уроки</th>
                  <th className="px-4 py-3 font-medium">Вправи</th>
                  <th className="px-4 py-3 font-medium">Квіз</th>
                  <th className="px-4 py-3 font-medium">Підказки</th>
                  <th className="px-4 py-3 font-medium">Оцінка</th>
                  <th className="px-4 py-3 font-medium">Активність</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {students.map((s) => (
                  <tr
                    key={s.id}
                    data-testid={`student-row-${s.id}`}
                    data-email={s.email}
                    data-grade={s.grade}
                    data-lessons-completed={s.lessonsCompleted}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/teacher/groups/${group.id}/students/${s.id}`}
                        className="font-medium text-emerald-800 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{s.email}</td>
                    <td className="px-4 py-3">
                      {s.lessonsCompleted}/{s.lessonsTotal}
                    </td>
                    <td className="px-4 py-3">
                      {s.exerciseSolved}/{s.exerciseTotal}
                    </td>
                    <td className="px-4 py-3">
                      {s.quizCorrect}/{s.quizTotal}
                    </td>
                    <td className="px-4 py-3" data-testid={`hints-count-${s.id}`}>
                      {s.hintsUsed}
                    </td>
                    <td className="px-4 py-3 font-semibold">{s.grade}</td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatActivity(s.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 sm:hidden" data-testid="students-cards">
            {students.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                data-testid={`student-card-${s.id}`}
                data-email={s.email}
                data-grade={s.grade}
              >
                <Link
                  href={`/teacher/groups/${group.id}/students/${s.id}`}
                  className="font-semibold text-emerald-800"
                >
                  {s.name}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500 break-all">{s.email}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-500">Уроки</dt>
                    <dd>
                      {s.lessonsCompleted}/{s.lessonsTotal}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Вправи</dt>
                    <dd>
                      {s.exerciseSolved}/{s.exerciseTotal}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Квіз</dt>
                    <dd>
                      {s.quizCorrect}/{s.quizTotal}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Підказки</dt>
                    <dd data-testid={`hints-count-mobile-${s.id}`}>{s.hintsUsed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Оцінка</dt>
                    <dd className="font-semibold">{s.grade}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-zinc-500">
                  Активність: {formatActivity(s.lastActivity)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
