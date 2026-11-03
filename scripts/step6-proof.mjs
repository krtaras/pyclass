import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = process.env.BASE_URL || "https://pyclass-swart.vercel.app";
const SHOTS = "/workspace/pyclass-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
const STUDENT_EMAIL = "student.step4.1793695285018@pyclass.test";
const STUDENT_PASSWORD = "TestPass1793695285018x";

const LESSON_TITLE = "Демо: цикл for";
const LESSON_BODY = `## Цикл for

Цикл \`for\` повторює дії для кожного елемента послідовності.

\`\`\`python
for i in range(1, 4):
    print(i)
\`\`\`

\`range(1, 4)\` дає числа 1, 2 і 3. Тіло циклу виконується тричі.
`;
const YT = "https://www.youtube.com/watch?v=kqtD5dpn9C8";
const EX_PROMPT =
  'Виведи числа 1, 2 і 3 — кожне з нового рядка — за допомогою циклу for і range.';
const EX_STARTER = "# допиши цикл for\n";
const REF_CODE = "for i in range(1, 4):\n    print(i)\n";
const EX_SOLUTION = REF_CODE;

if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
  console.error("missing teacher env");
  process.exit(1);
}

async function login(page, email, password) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="login-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

async function logout(page) {
  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor({ timeout: 30_000 });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "uk-UA",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  const log = [];
  const shot = async (label) => {
    const file = path.join(SHOTS, `step6-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("SHOT", file);
    log.push(file);
  };

  // --- Teacher: create group via UI ---
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page.getByTestId("teacher-home").waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="create-group-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  const groupName = `Клас Step6 ${Date.now()}`;
  await page.getByTestId("create-group-name").fill(groupName);
  await Promise.all([
    page.waitForURL(/\/teacher\/groups\/\d+/, { timeout: 45_000 }),
    page.getByTestId("create-group-submit").click(),
  ]);
  await page.getByTestId("teacher-group").waitFor();
  const invite = await page.getByTestId("group-invite").innerText();
  log.push(`created group ${groupName} invite=${invite}`);
  await shot("group-created");

  // --- Content: create demo lesson ---
  await page.goto(BASE + "/teacher/content", { waitUntil: "domcontentloaded" });
  await page.getByTestId("modules-manager").waitFor();
  // Open first module (Основи Python)
  const openBtn = page.locator('[data-testid^="module-open-"]').first();
  await openBtn.click();
  await page.getByTestId("lessons-manager").waitFor();

  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="lessons-manager"] form')
        ?.getAttribute("data-ready") === "true",
  );
  await page.getByTestId("lesson-title-input").fill(LESSON_TITLE);
  await page.getByTestId("lesson-create").click();
  await page.getByTestId("lesson-editor").waitFor({ timeout: 60_000 });
  const lessonEditUrl = page.url();
  const lessonId = lessonEditUrl.match(/lessons\/(\d+)/)[1];
  log.push("lesson id " + lessonId);

  await page.getByTestId("lesson-edit-title").fill(LESSON_TITLE);
  await page.getByTestId("lesson-body").fill(LESSON_BODY);
  await page.getByTestId("lesson-youtube-url").fill(YT);
  await page.getByTestId("lesson-preview-toggle").click();
  await page.getByTestId("lesson-preview").waitFor();
  await shot("lesson-preview");
  await page.getByTestId("lesson-preview-toggle").click();
  await page.getByTestId("lesson-save").click();
  await page.getByText("Урок збережено.").waitFor({ timeout: 20_000 });

  // Exercise
  await page.getByTestId("exercise-create").click();
  await page.waitForSelector('[data-testid^="exercise-editor-"]', {
    timeout: 30_000,
  });
  const exEditor = page.locator('[data-testid^="exercise-editor-"]').first();
  const exId = (await exEditor.getAttribute("data-testid")).replace(
    "exercise-editor-",
    "",
  );
  log.push("exercise id " + exId);

  await page.getByTestId(`exercise-prompt-${exId}`).fill(EX_PROMPT);
  await page.getByTestId(`exercise-starter-${exId}`).fill(EX_STARTER);

  // Default has 1 assert test — turn into io visible + assert hidden
  // Remove default if needed and add two tests
  // Easier: edit the default assert to our hidden assert, add io
  await page.getByTestId(`exercise-add-io-${exId}`).click();
  // Now we may have assert + io. Configure them.
  // test 0 might be assert, test 1 io — make test0 assert hidden, test1 io visible with output
  const test0 = page.getByTestId(`exercise-test-${exId}-0`);
  await test0.waitFor();
  // If first is assert from default:
  const code0 = page.getByTestId(`exercise-test-code-${exId}-0`);
  if (await code0.count()) {
    await code0.fill("assert True  # прихований смоук-тест");
    const vis0 = page.getByTestId(`exercise-test-visible-${exId}-0`);
    if (await vis0.isChecked()) await vis0.uncheck();
  }
  // Find io test — last one
  const testsCount = await page.locator(`[data-testid^="exercise-test-${exId}-"]`).count();
  const ioIndex = testsCount - 1;
  await page
    .getByTestId(`exercise-test-output-${exId}-${ioIndex}`)
    .fill("1\n2\n3");
  const visIo = page.getByTestId(`exercise-test-visible-${exId}-${ioIndex}`);
  if (!(await visIo.isChecked())) await visIo.check();

  // Ensure we have exactly meaningful 2 tests: if more than 2, remove extras later
  // Reference check
  await page.getByTestId("reference-code").fill(REF_CODE);
  // Wait python ready on reference checker
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="reference-run"]');
    return btn && !btn.disabled;
  }, null, { timeout: 180_000 });
  await page.getByTestId("reference-run").click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="reference-summary"]');
    return el && /усі тести|з /i.test(el.textContent || "");
  }, null, { timeout: 90_000 });
  const refSummary = await page.getByTestId("reference-summary").innerText();
  log.push("reference: " + refSummary);
  if (!/усі тести/i.test(refSummary)) {
    throw new Error("Reference solution should pass all tests: " + refSummary);
  }
  await shot("reference-pass");

  await page.getByTestId(`exercise-save-${exId}`).click();
  await page.waitForTimeout(1000);

  // Quiz
  await page.getByTestId("quiz-create").click();
  await page.waitForSelector('[data-testid^="quiz-editor-"]', { timeout: 30_000 });
  const quizEditor = page.locator('[data-testid^="quiz-editor-"]').first();
  const qId = (await quizEditor.getAttribute("data-testid")).replace(
    "quiz-editor-",
    "",
  );
  await page.getByTestId(`quiz-prompt-${qId}`).fill("Що повертає range(1, 4) у циклі for?");
  await page.getByTestId(`quiz-option-${qId}-0`).fill("1, 2, 3");
  await page.getByTestId(`quiz-option-${qId}-1`).fill("1, 2, 3, 4");
  await page.getByTestId(`quiz-correct-${qId}-0`).check();
  await page
    .getByTestId(`quiz-explanation-${qId}`)
    .fill("range(1, 4) дає числа від 1 включно до 4 виключно.");
  await page.getByTestId(`quiz-save-${qId}`).click();
  await page.waitForTimeout(1000);
  await shot("lesson-editor-done");

  // Mobile shot of editor
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("lesson-editor-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });

  await logout(page);

  // --- Student solves new lesson ---
  await login(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await page.goto(BASE + `/lessons/${lessonId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: LESSON_TITLE, level: 1 }).waitFor();
  const checkBtn = page.getByRole("button", { name: "Перевірити" });
  await checkBtn.waitFor();
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Перевірити"),
    );
    return btn && !btn.disabled;
  }, null, { timeout: 180_000 });

  await page.locator("textarea").first().fill(EX_SOLUTION);
  await checkBtn.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="check-summary"]');
    return el && /Усі тести/.test(el.textContent || "");
  }, null, { timeout: 90_000 });
  log.push("student exercise ok");

  await page.getByTestId("quiz-section").waitFor();
  await page.waitForFunction(
    () => document.querySelector('[data-quiz-ready="true"]'),
  );
  const qCard = page.locator('[data-testid^="quiz-question-"]').first();
  await qCard.locator('button[data-option="1, 2, 3"]').click();
  const qTestId = await qCard.getAttribute("data-testid");
  const qNum = qTestId.replace("quiz-question-", "");
  await page.getByTestId(`quiz-submit-${qNum}`).click();
  await page.getByTestId(`quiz-feedback-${qNum}`).waitFor();
  log.push("student quiz ok");
  await shot("student-solved");
  await page.waitForTimeout(1500);

  await logout(page);

  // --- Teacher sees progress ---
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  // Open DEMO10A group (student is there)
  await page.locator('[data-testid^="group-row-"][data-invite="DEMO10A"]').click();
  await page.getByTestId("teacher-group").waitFor();
  const studentRow = page.locator(
    `[data-testid^="student-row-"][data-email="${STUDENT_EMAIL}"]`,
  );
  await studentRow.waitFor();
  const lessonsCompleted = await studentRow.getAttribute("data-lessons-completed");
  log.push("teacher sees lessonsCompleted=" + lessonsCompleted);
  // After demo lesson complete: lessons 1 (print) + new for-loop = 2 of 3 total?
  // Original: 2 lessons. We added 1 → 3 total. Student completed lesson1 before + new = 2.
  if (Number(lessonsCompleted) < 2) {
    throw new Error("Expected at least 2 lessons completed, got " + lessonsCompleted);
  }
  await studentRow.locator("a").first().click();
  await page.getByTestId("teacher-student").waitFor();
  await page.getByTestId(`detail-lesson-${lessonId}`).waitFor();
  const complete = await page
    .getByTestId(`detail-lesson-${lessonId}`)
    .getAttribute("data-complete");
  if (complete !== "true") {
    throw new Error("New lesson should be complete on student detail");
  }
  await shot("teacher-sees-progress");

  await browser.close();
  console.log("---LOG---");
  for (const line of log) console.log(line);
  console.log("LESSON_ID", lessonId);
  console.log("OK");
}

main().catch((err) => {
  console.error("PROOF FAILED", err);
  process.exit(1);
});
