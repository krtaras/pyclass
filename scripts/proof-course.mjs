/**
 * Full-course browser proof: every lesson, exercise, quiz on prod.
 * Usage: pnpm proof:course
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const BASE = process.env.BASE_URL || "https://pyclass-swart.vercel.app";
const SHOTS = "/workspace/pyclass-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
  console.error("missing teacher env");
  process.exit(1);
}

const sols = JSON.parse(
  fs.readFileSync("tests/fixtures/solutions.json", "utf8"),
);

const stamp = Date.now();
const email = `content2.${stamp}@pyclass.test`;
const password = `TestPass${stamp}x`;
const name = "Курс Повний";

const failures = [];
const log = [];

function note(msg) {
  console.log(msg);
  log.push(msg);
}

async function login(page, em, pw) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="login-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  await page.getByTestId("login-email").fill(em);
  await page.getByTestId("login-password").fill(pw);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

async function waitPyodide(page) {
  const btn = page.getByRole("button", { name: "Перевірити" }).first();
  await btn.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const buttons = [...document.querySelectorAll("button")];
      const check = buttons.find((b) =>
        (b.textContent || "").includes("Перевірити"),
      );
      return check && !check.disabled;
    },
    null,
    { timeout: 180_000 },
  );
}

async function answerQuiz(page, q) {
  const card = page.getByTestId(`quiz-question-${q.id}`);
  await card.waitFor({ timeout: 30_000 });
  const kind = q.kind;
  let correct = q.correct;
  if (kind === "multi") {
    const opts = Array.isArray(correct) ? correct : [correct];
    for (const opt of opts) {
      const btn = card.locator(`button[data-option="${opt}"]`);
      if (await btn.count()) await btn.click();
      else await card.getByRole("button", { name: String(opt), exact: true }).click();
    }
  } else {
    const opt = Array.isArray(correct) ? correct[0] : correct;
    const btn = card.locator(`button[data-option="${opt}"]`);
    if (await btn.count()) await btn.click();
    else await card.getByRole("button", { name: String(opt), exact: true }).click();
  }
  await page.getByTestId(`quiz-submit-${q.id}`).click();
  await page.getByTestId(`quiz-feedback-${q.id}`).waitFor({ timeout: 30_000 });
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const lessons = await sql`
    select l.id, l.slug, l.title, l.video_url, l.body_markdown,
           m.slug as module_slug, m.title as module_title, m."order" as module_order, l."order" as lesson_order
    from lessons l
    join modules m on m.id = l.module_id
    order by m."order", l."order"
  `;
  note(`lessons in DB: ${lessons.length}`);
  if (lessons.length < 50) {
    throw new Error("Expected full course synced, got " + lessons.length);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "uk-UA",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  let shotN = 0;
  const shot = async (label) => {
    shotN += 1;
    const file = path.join(
      SHOTS,
      `content2-${String(shotN).padStart(2, "0")}-${label}.png`,
    );
    await page.screenshot({ path: file, fullPage: true });
    note("SHOT " + file);
  };

  // Signup
  await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="signup-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-invite").fill("DEMO10A");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/signup"), { timeout: 45_000 }),
    page.getByTestId("signup-submit").click(),
  ]);
  await page.getByTestId("nav-logout").waitFor({ timeout: 30_000 });
  note("signed up " + email);
  await shot("after-signup");

  for (let li = 0; li < lessons.length; li++) {
    const les = lessons[li];
    note(`== [${li + 1}/${lessons.length}] ${les.module_slug} / ${les.slug}`);
    await page.goto(BASE + `/lessons/${les.id}`, {
      waitUntil: "domcontentloaded",
    });
    try {
      await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 30_000 });
      const bodyOk = await page.evaluate(() => {
        const article = document.querySelector("article, .prose, main");
        return (article?.textContent || "").trim().length > 40;
      });
      if (!bodyOk) {
        failures.push(`${les.slug}: explanation too short / missing`);
      }

      if (les.video_url) {
        const yt = page.locator('iframe[src*="youtu"], iframe[src*="youtube"]');
        const blob = page.locator('[data-testid="lesson-blob-video"], video');
        const has =
          (await yt.count()) > 0 || (await blob.count()) > 0;
        if (!has) {
          failures.push(`${les.slug}: video set but no iframe/video`);
        }
      }

      const exercises = await sql`
        select id, slug from exercises where lesson_id=${les.id} order by id
      `;
      if (exercises.length === 0) {
        failures.push(`${les.slug}: no exercises`);
      } else {
        await waitPyodide(page);
      }

      for (const ex of exercises) {
        const sol = sols[ex.slug];
        if (!sol) {
          failures.push(`${ex.slug}: missing solution fixture`);
          continue;
        }
        const panel = page.locator(`[data-exercise-id="${ex.id}"]`);
        await panel.waitFor({ timeout: 30_000 });
        const ta = panel.locator("textarea");
        await ta.fill(sol.correct);
        await panel.getByRole("button", { name: "Перевірити" }).click();
        try {
          await page.waitForFunction(
            (id) => {
              const root = document.querySelector(
                `[data-exercise-id="${id}"]`,
              );
              const el = root?.querySelector('[data-testid="check-summary"]');
              return el && /Усі тести/.test(el.textContent || "");
            },
            ex.id,
            { timeout: 120_000 },
          );
          note(`  OK exercise ${ex.slug}`);
        } catch (err) {
          const summary = await panel
            .getByTestId("check-summary")
            .innerText()
            .catch(() => "(no summary)");
          failures.push(`${ex.slug}: solution did not pass — ${summary}`);
          note(`  FAIL exercise ${ex.slug}: ${summary}`);
        }
      }

      const quizzes = await sql`
        select id, kind, correct, options from quiz_questions
        where lesson_id=${les.id} order by id
      `;
      if (quizzes.length) {
        await page.waitForFunction(
          () => document.querySelector('[data-quiz-ready="true"]'),
          null,
          { timeout: 30_000 },
        );
      }
      for (const q of quizzes) {
        try {
          await answerQuiz(page, q);
          note(`  OK quiz ${q.id}`);
        } catch (err) {
          failures.push(`${les.slug} quiz ${q.id}: ${err.message}`);
          note(`  FAIL quiz ${q.id}: ${err.message}`);
        }
      }

      if (li === 0) {
        await page.setViewportSize({ width: 390, height: 844 });
        await shot("lesson-m01-mobile");
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      if (les.module_slug === "m05-strings" && les.lesson_order === 1) {
        await shot("lesson-m05");
      }
      if (les.module_slug === "m10-project" && les.lesson_order === 6) {
        await shot("lesson-m10-wrapup");
      }
    } catch (err) {
      failures.push(`${les.slug}: page error ${err.message}`);
      note(`  FAIL page ${err.message}`);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/progress", { waitUntil: "domcontentloaded" });
  await page.getByTestId("progress-page").waitFor({ timeout: 30_000 });
  await shot("progress-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });

  // Teacher check
  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor();
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + "/teacher/content", { waitUntil: "domcontentloaded" });
  await page.getByTestId("modules-manager").waitFor();
  const modCount = await page.locator('[data-testid^="module-card-"]').count();
  note("teacher modules: " + modCount);
  if (modCount < 10) failures.push("teacher content modules < 10: " + modCount);
  await shot("teacher-content");

  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-testid^="group-row-"][data-invite="DEMO10A"]')
    .click();
  await page.waitForURL(/\/teacher\/groups\//);
  const studentLink = page.locator(`a[href*="/students/"]`).filter({
    hasText: name,
  });
  if (await studentLink.count()) {
    await studentLink.first().click();
  } else {
    await page.getByText(email).first().click();
  }
  await page.getByTestId("teacher-student").waitFor({ timeout: 30_000 });
  const gradeText = await page.getByTestId("student-grade").innerText();
  note("teacher grade: " + gradeText);
  if (gradeText.trim() !== "12") {
    failures.push("expected grade 12, got " + gradeText);
  }
  await shot("teacher-grade-12");

  await browser.close();

  // cleanup student
  const users = await sql`select id from users where email=${email}`;
  if (users[0]) {
    const uid = users[0].id;
    await sql`delete from submissions where user_id=${uid}`;
    await sql`delete from quiz_attempts where user_id=${uid}`;
    await sql`delete from hint_requests where user_id=${uid}`;
    await sql`delete from users where id=${uid}`;
    note("deleted test student " + email);
  }

  console.log("---FAILURES---");
  for (const f of failures) console.log(f);
  console.log("---LOG TAIL---");
  for (const line of log.slice(-30)) console.log(line);
  if (failures.length) {
    console.error(`PROOF FAILED: ${failures.length} issues`);
    process.exit(1);
  }
  console.log("PROOF OK");
}

main().catch((err) => {
  console.error("PROOF CRASHED", err);
  process.exit(1);
});
