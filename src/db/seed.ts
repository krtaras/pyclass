import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { groups, users } from "./schema";
import { hashPassword } from "../lib/auth/password";

/**
 * Seeds only the demo group + teacher account.
 * Course content comes from `pnpm content:sync` (versioned files in content/).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const inviteCode = (
    process.env.DEMO_INVITE_CODE ?? "DEMO10A"
  )
    .trim()
    .toUpperCase();
  const teacherEmail = (process.env.TEACHER_EMAIL ?? "").trim().toLowerCase();
  const teacherPassword = process.env.TEACHER_PASSWORD ?? "";
  if (!teacherEmail || !teacherPassword) {
    throw new Error("TEACHER_EMAIL and TEACHER_PASSWORD must be set");
  }

  const sql = neon(url);
  const db = drizzle(sql);

  let [demoGroup] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);

  if (!demoGroup) {
    [demoGroup] = await db
      .insert(groups)
      .values({ name: "Демо-група 10-А", inviteCode })
      .returning();
  }

  const passwordHash = await hashPassword(teacherPassword);
  const [existingTeacher] = await db
    .select()
    .from(users)
    .where(eq(users.email, teacherEmail))
    .limit(1);

  if (existingTeacher) {
    await db
      .update(users)
      .set({
        passwordHash,
        role: "teacher",
        name: existingTeacher.name || "Вчитель",
      })
      .where(eq(users.id, existingTeacher.id));
  } else {
    await db.insert(users).values({
      name: "Вчитель",
      email: teacherEmail,
      passwordHash,
      role: "teacher",
      groupId: null,
    });
  }

  console.log("Seed OK (group + teacher only)", {
    groupId: demoGroup.id,
    inviteCode,
    teacherEmail,
    hint: "Run pnpm content:sync to load course modules",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
