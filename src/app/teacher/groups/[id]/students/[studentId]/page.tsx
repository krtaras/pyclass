import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { GRADE_FORMULA_UK } from "@/lib/progress/grade";
import { loadStudentDetail } from "@/lib/teacher/students";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; studentId: string }>;
};

function formatAnswer(answer: string | string[] | null): string {
  if (answer == null) return "—";
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

export default async function TeacherStudentPage({ params }: Props) {
  await requireTeacher();
  const { id, studentId: sid } = await params;
  const groupId = Number(id);
  const studentId = Number(sid);
  if (!Number.isFinite(groupId) || !Number.isFinite(studentId)) notFound();

  const detail = await loadStudentDetail(studentId);
  if (!detail || detail.student.groupId !== groupId) notFound();

  const { student, summary, lessons } = detail;

  return (
    <div
      className="space-y-6"
      data-testid="teacher-student"
      data-student-email={student.email}
      data-grade={summary.grade}
    >
      <div className="space-y-2">
        <Link
          href={`/teacher/groups/${groupId}`}
          className="inline-flex text-sm text-emerald-700 hover:underline"
        >
          ← До групи
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
        <p className="text-sm text-zinc-600 break-all">{student.email}</p>
        <p className="text-sm text-zinc-700">
          Уроки {summary.lessonsCompleted}/{summary.lessonsTotal} · вправи{" "}
          {summary.exerciseSolved}/{summary.exerciseTotal} · квіз{" "}
          {summary.quizCorrect}/{summary.quizTotal} · оцінка{" "}
          <strong data-testid="student-grade">{summary.grade}</strong>
        </p>
        <p className="text-xs text-zinc-500">{GRADE_FORMULA_UK}</p>
      </div>

      {lessons.map((lesson) => (
        <section
          key={lesson.id}
          className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
          data-testid={`detail-lesson-${lesson.id}`}
          data-complete={lesson.complete ? "true" : "false"}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {lesson.order}. {lesson.title}
            </h2>
            <span className="text-sm text-zinc-600">
              {lesson.complete ? "✓ завершено" : `${lesson.percent}%`}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Вправи
            </h3>
            {lesson.exercises.length === 0 ? (
              <p className="text-sm text-zinc-500">Немає вправ.</p>
            ) : (
              <ul className="space-y-3">
                {lesson.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm"
                    data-testid={`detail-exercise-${ex.id}`}
                    data-solved={ex.solved ? "true" : "false"}
                  >
                    <p className="font-medium text-zinc-900">{ex.prompt}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {ex.solved ? "Розвʼязано" : "Не розвʼязано"} · спроб:{" "}
                      {ex.attempts}
                    </p>
                    {ex.lastCode != null && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-emerald-800">
                          Останній код
                        </summary>
                        <pre
                          className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100"
                          data-testid={`detail-code-${ex.id}`}
                        >
                          {ex.lastCode}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Квіз
            </h3>
            {lesson.quiz.length === 0 ? (
              <p className="text-sm text-zinc-500">Немає питань.</p>
            ) : (
              <ul className="space-y-2">
                {lesson.quiz.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm"
                    data-testid={`detail-quiz-${q.id}`}
                    data-correct={
                      q.correct == null ? "none" : q.correct ? "true" : "false"
                    }
                  >
                    <p className="font-medium text-zinc-900">{q.prompt}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {!q.answered
                        ? "Без відповіді"
                        : q.correct
                          ? "Правильно"
                          : "Неправильно"}
                      {q.answered
                        ? ` · відповідь: ${formatAnswer(q.answer)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
