/**
 * One-shot cleanup before first full course sync.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { and, eq, like, ne, or, sql } = await import("drizzle-orm");
  const { list, del } = await import("@vercel/blob");
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const {
    exercises,
    groups,
    hintRequests,
    lessons,
    modules,
    quizAttempts,
    quizQuestions,
    submissions,
    users,
  } = schema;

  const keepInvite = (process.env.DEMO_INVITE_CODE ?? "DEMO10A")
    .trim()
    .toUpperCase();

  const testStudents = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "student"),
        or(
          like(users.email, "%step4%"),
          like(users.email, "%step5%"),
          like(users.email, "%step6%"),
          like(users.email, "%step7%"),
          like(users.email, "%step8%"),
          like(users.email, "content1%"),
          like(users.email, "proof%"),
          like(users.email, "api.test%"),
          like(users.email, "block.%"),
          like(users.email, "%@pyclass.test"),
          like(users.email, "%@example.com"),
        ),
      ),
    );

  for (const u of testStudents) {
    await db.delete(submissions).where(eq(submissions.userId, u.id));
    await db.delete(quizAttempts).where(eq(quizAttempts.userId, u.id));
    await db.delete(hintRequests).where(eq(hintRequests.userId, u.id));
    await db.delete(users).where(eq(users.id, u.id));
    console.log("deleted student", u.email, u.id);
  }

  const badGroups = await db
    .select()
    .from(groups)
    .where(
      and(
        ne(groups.inviteCode, keepInvite),
        or(
          like(groups.name, "Клас Step6%"),
          like(groups.name, "%Step6%"),
          like(groups.inviteCode, "STEP6%"),
        ),
      ),
    );
  for (const g of badGroups) {
    await db
      .update(users)
      .set({ groupId: null })
      .where(eq(users.groupId, g.id));
    await db.delete(groups).where(eq(groups.id, g.id));
    console.log("deleted group", g.name, g.inviteCode);
  }

  const allMods = await db.select().from(modules);
  for (const m of allMods) {
    if (m.slug?.startsWith("m0") || m.slug?.startsWith("m1")) continue;
    const les = await db.select().from(lessons).where(eq(lessons.moduleId, m.id));
    let blocked = false;
    for (const l of les) {
      const exs = await db
        .select()
        .from(exercises)
        .where(eq(exercises.lessonId, l.id));
      for (const e of exs) {
        const [sub] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(submissions)
          .where(eq(submissions.exerciseId, e.id));
        if ((sub?.c ?? 0) > 0) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
      const qs = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.lessonId, l.id));
      for (const q of qs) {
        const [att] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(quizAttempts)
          .where(eq(quizAttempts.questionId, q.id));
        if ((att?.c ?? 0) > 0) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    }
    if (blocked) {
      console.log("skip module (has student data)", m.id, m.title, m.slug);
      continue;
    }
    await db.delete(modules).where(eq(modules.id, m.id));
    console.log("deleted module", m.id, m.title, m.slug);
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const listed = await list({ prefix: "pyclass/" });
      for (const b of listed.blobs) {
        const pathname = b.pathname;
        if (
          pathname.includes("demo-for") ||
          pathname.includes("step8") ||
          pathname.includes("proof")
        ) {
          await del(b.url);
          console.log("deleted blob", pathname);
        }
      }
    } catch (err) {
      console.warn("blob cleanup skipped", err);
    }
  } else {
    console.log("BLOB_READ_WRITE_TOKEN missing — skip blob cleanup");
  }

  console.log("cleanup done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
