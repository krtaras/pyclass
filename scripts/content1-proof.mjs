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

const stamp = Date.now();
const email = `content1.${stamp}@pyclass.test`;
const password = `TestPass${stamp}x`;
const name = "Контент Тест";

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
  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("Перевірити"),
      );
      return btn && !btn.disabled;
    },
    null,
    { timeout: 180_000 },
  );
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const lessons = await sql`
    select l.id, l.slug, l.title, m.slug as module_slug, m.title as module_title, m."order" as module_order
    from lessons l
    join modules m on m.id = l.module_id
    where m.slug in ('m01-intro','m02-variables','m03-conditions','m04-loops')
    order by m."order", l."order"
  `;
  const byMod = {};
  for (const l of lessons) {
    (byMod[l.module_slug] ||= []).push(l);
  }
  const pick = Object.keys(byMod)
    .sort()
    .map((k) => byMod[k][0]);
  console.log(
    "picked lessons",
    pick.map((l) => `${l.module_slug}:${l.id}:${l.title}`),
  );

  // solutions for first exercise of each picked lesson
  const sols = JSON.parse(
    fs.readFileSync("tests/fixtures/solutions.json", "utf8"),
  );

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
  const log = [];
  let shotIdx = 0;
  const shot = async (label) => {
    shotIdx += 1;
    const file = path.join(
      SHOTS,
      `content1-${String(shotIdx).padStart(2, "0")}-${label}.png`,
    );
    await page.screenshot({ path: file, fullPage: true });
    console.log("SHOT", file);
    log.push("shot " + file);
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
  log.push("signed up " + email);
  await shot("after-signup");

  // Visit one lesson per module
  for (const les of pick) {
    await page.goto(BASE + `/lessons/${les.id}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await waitPyodide(page);
    log.push(`opened ${les.slug}`);

    // video
    const iframe = page.locator('iframe[src*="youtube"], iframe[src*="youtu"]');
    const videoCount = await iframe.count();
    if (videoCount > 0) {
      log.push(`video ok ${les.slug}`);
    } else {
      // may be empty videoUrl
      const hasVideo = await sql`select video_url from lessons where id=${les.id}`;
      if (hasVideo[0]?.video_url) {
        throw new Error("Expected youtube iframe for " + les.slug);
      }
      log.push(`video empty ok ${les.slug}`);
    }

    // first exercise for this lesson
    const [ex] = await sql`
      select id, slug, starter_code from exercises where lesson_id=${les.id} order by id limit 1
    `;
    const sol = sols[ex.slug];
    if (!sol) throw new Error("no sol for " + ex.slug);

    const panel = page.locator(`[data-exercise-id="${ex.id}"]`);
    await panel.waitFor();
    const ta = panel.locator("textarea");
    const checkBtn = panel.getByRole("button", { name: "Перевірити" });

    await ta.fill(sol.wrong);
    await checkBtn.click();
    await panel.getByTestId("check-report").waitFor({ state: "visible", timeout: 90_000 });
    const wrongSummary = await panel.getByTestId("check-summary").innerText();
    log.push(`${ex.slug} wrong: ${wrongSummary}`);
    if (/Усі тести/.test(wrongSummary)) {
      throw new Error("wrong passed for " + ex.slug);
    }

    await ta.fill(sol.correct);
    await checkBtn.click();
    await page.waitForFunction(
      (id) => {
        const root = document.querySelector(`[data-exercise-id="${id}"]`);
        const el = root?.querySelector('[data-testid="check-summary"]');
        return el && /Усі тести/.test(el.textContent || "");
      },
      ex.id,
      { timeout: 90_000 },
    );
    log.push(`${ex.slug} correct`);

    // answer first quiz if present
    const quizSection = page.getByTestId("quiz-section");
    if (await quizSection.count()) {
      await page.waitForFunction(
        () => document.querySelector('[data-quiz-ready="true"]'),
        null,
        { timeout: 30_000 },
      );
      const [q] = await sql`
        select id, kind, correct, options from quiz_questions where lesson_id=${les.id} order by id limit 1
      `;
      const qCard = page.getByTestId(`quiz-question-${q.id}`);
      await qCard.waitFor();
      const correct = Array.isArray(q.correct) ? q.correct[0] : q.correct;
      const opt = String(correct);
      const byAttr = qCard.locator(`button[data-option="${opt.replace(/"/g, '\\"')}"]`);
      if (await byAttr.count()) {
        await byAttr.first().click();
      } else {
        await qCard.getByRole("button", { name: opt, exact: true }).click();
      }
      // for multi may need more — just submit single/output
      await page.getByTestId(`quiz-submit-${q.id}`).click();
      await page.getByTestId(`quiz-feedback-${q.id}`).waitFor({ timeout: 30_000 });
      log.push(`quiz ${q.id} answered`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await shot(`lesson-${les.module_slug}-mobile`);
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  // Teacher: content editor + student progress
  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor();
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + "/teacher/content", { waitUntil: "domcontentloaded" });
  await page.getByTestId("modules-manager").waitFor({ timeout: 30_000 });
  const cards = page.locator('[data-testid^="module-card-"]');
  const n = await cards.count();
  log.push("teacher modules visible: " + n);
  if (n < 4) throw new Error("Expected >=4 modules, got " + n);
  await shot("teacher-content");

  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  const group = page.locator('[data-testid^="group-row-"][data-invite="DEMO10A"]');
  await group.click();
  await page.waitForURL(/\/teacher\/groups\//);
  // open student
  const studentLink = page.locator(`a[href*="/students/"]`).filter({ hasText: name }).first();
  if (await studentLink.count()) {
    await studentLink.click();
  } else {
    // try table row
    await page.getByText(email).first().click();
  }
  await page.getByTestId("teacher-student").waitFor({ timeout: 30_000 });
  await shot("teacher-student-progress");
  log.push("teacher saw student progress");

  await browser.close();

  // delete test student
  const users = await sql`select id from users where email=${email}`;
  if (users[0]) {
    const uid = users[0].id;
    await sql`delete from submissions where user_id=${uid}`;
    await sql`delete from quiz_attempts where user_id=${uid}`;
    await sql`delete from hint_requests where user_id=${uid}`;
    await sql`delete from users where id=${uid}`;
    log.push("deleted test student " + email);
  }

  console.log("---LOG---");
  for (const line of log) console.log(line);
  console.log("OK");
}

main().catch((err) => {
  console.error("PROOF FAILED", err);
  process.exit(1);
});
