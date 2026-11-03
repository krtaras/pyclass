import { eq } from "drizzle-orm";
import { COURSE_MODULES } from "../../../content/course";
import type { ContentModule } from "../../../content/types";
import { db } from "@/db";
import {
  exercises,
  lessons,
  modules,
  quizQuestions,
} from "@/db/schema";

export type SyncReport = {
  modulesUpserted: number;
  modulesSkippedTeacher: number;
  lessonsUpserted: number;
  lessonsSkippedTeacher: number;
  exercisesUpserted: number;
  exercisesSkippedTeacher: number;
  quizzesUpserted: number;
  quizzesSkippedTeacher: number;
};

function videoKind(url: string | null): "youtube" | "blob" | null {
  if (!url) return null;
  if (url.includes("youtu")) return "youtube";
  return "blob";
}

/**
 * Idempotent upsert of repo course content by stable slugs.
 *
 * Safe option (see content/README.md):
 * - repo_managed=true → overwrite from repo
 * - repo_managed=false → skip (teacher UI edits)
 * - never deletes rows (preserves student submissions)
 */
export async function syncCourseContent(
  course: ContentModule[] = COURSE_MODULES,
): Promise<SyncReport> {
  const report: SyncReport = {
    modulesUpserted: 0,
    modulesSkippedTeacher: 0,
    lessonsUpserted: 0,
    lessonsSkippedTeacher: 0,
    exercisesUpserted: 0,
    exercisesSkippedTeacher: 0,
    quizzesUpserted: 0,
    quizzesSkippedTeacher: 0,
  };

  for (const mod of course) {
    const [existingMod] = await db
      .select()
      .from(modules)
      .where(eq(modules.slug, mod.slug))
      .limit(1);

    let moduleId: number;
    if (!existingMod) {
      const [row] = await db
        .insert(modules)
        .values({
          slug: mod.slug,
          title: mod.title,
          order: mod.order,
          repoManaged: true,
        })
        .returning();
      moduleId = row!.id;
      report.modulesUpserted++;
    } else if (!existingMod.repoManaged) {
      moduleId = existingMod.id;
      report.modulesSkippedTeacher++;
    } else {
      await db
        .update(modules)
        .set({ title: mod.title, order: mod.order, repoManaged: true })
        .where(eq(modules.id, existingMod.id));
      moduleId = existingMod.id;
      report.modulesUpserted++;
    }

    for (const les of mod.lessons) {
      const [existingLes] = await db
        .select()
        .from(lessons)
        .where(eq(lessons.slug, les.slug))
        .limit(1);

      let lessonId: number;
      const vUrl = les.videoUrl || null;
      const vKind = videoKind(vUrl);

      if (!existingLes) {
        const [row] = await db
          .insert(lessons)
          .values({
            slug: les.slug,
            moduleId,
            order: les.order,
            title: les.title,
            bodyMarkdown: les.bodyMarkdown,
            videoUrl: vUrl,
            videoKind: vKind,
            repoManaged: true,
          })
          .returning();
        lessonId = row!.id;
        report.lessonsUpserted++;
      } else if (!existingLes.repoManaged) {
        lessonId = existingLes.id;
        report.lessonsSkippedTeacher++;
      } else {
        await db
          .update(lessons)
          .set({
            moduleId,
            order: les.order,
            title: les.title,
            bodyMarkdown: les.bodyMarkdown,
            videoUrl: vUrl,
            videoKind: vKind,
            repoManaged: true,
          })
          .where(eq(lessons.id, existingLes.id));
        lessonId = existingLes.id;
        report.lessonsUpserted++;
      }

      for (const ex of les.exercises) {
        const [existingEx] = await db
          .select()
          .from(exercises)
          .where(eq(exercises.slug, ex.slug))
          .limit(1);
        if (!existingEx) {
          await db.insert(exercises).values({
            slug: ex.slug,
            lessonId,
            prompt: ex.prompt,
            starterCode: ex.starterCode,
            tests: ex.tests,
            hintLimit: ex.hintLimit ?? 3,
            repoManaged: true,
          });
          report.exercisesUpserted++;
        } else if (!existingEx.repoManaged) {
          report.exercisesSkippedTeacher++;
        } else {
          await db
            .update(exercises)
            .set({
              lessonId,
              prompt: ex.prompt,
              starterCode: ex.starterCode,
              tests: ex.tests,
              hintLimit: ex.hintLimit ?? 3,
              repoManaged: true,
            })
            .where(eq(exercises.id, existingEx.id));
          report.exercisesUpserted++;
        }
      }

      for (const q of les.quizzes) {
        const [existingQ] = await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.slug, q.slug))
          .limit(1);
        if (!existingQ) {
          await db.insert(quizQuestions).values({
            slug: q.slug,
            lessonId,
            kind: q.kind,
            prompt: q.prompt,
            code: q.code ?? null,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
            repoManaged: true,
          });
          report.quizzesUpserted++;
        } else if (!existingQ.repoManaged) {
          report.quizzesSkippedTeacher++;
        } else {
          await db
            .update(quizQuestions)
            .set({
              lessonId,
              kind: q.kind,
              prompt: q.prompt,
              code: q.code ?? null,
              options: q.options,
              correct: q.correct,
              explanation: q.explanation,
              repoManaged: true,
            })
            .where(eq(quizQuestions.id, existingQ.id));
          report.quizzesUpserted++;
        }
      }
    }
  }

  return report;
}
