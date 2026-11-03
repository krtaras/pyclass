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
    const file = path.join(SHOTS, `step7-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("SHOT", file);
    log.push("shot " + file);
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER_ERR", msg.text());
  });

  // --- Student: exercise with exhausted seeded hints ---
  await login(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  log.push("logged in as " + STUDENT_EMAIL);

  await page.goto(BASE + "/lessons/1", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "print і змінні", level: 1 }).waitFor();
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Перевірити"),
    );
    return btn && !btn.disabled;
  }, null, { timeout: 180_000 });
  await page.getByTestId("hint-button").waitFor({ state: "visible" });

  const rem = await page.getByTestId("hint-remaining").innerText();
  log.push("remaining: " + rem);
  if (!/вичерпано/i.test(rem)) {
    throw new Error("Expected exhausted remaining text, got: " + rem);
  }
  const disabled = await page.getByTestId("hint-button").isDisabled();
  if (!disabled) throw new Error("Hint button should be disabled when exhausted");
  log.push("hint button disabled after exhaust: " + disabled);
  await shot("exhausted");

  // Try live AI on exercise 2 (still has budget) to capture gateway status
  await page.goto(BASE + "/lessons/2", { waitUntil: "domcontentloaded" }).catch(() => {});
  // Lesson 2 may be if/else - find any lesson with exercise 2
  // Fallback: open home and click
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // Navigate directly via DB knowledge: exercise 2 is on some lesson
  // Use API probe with cookies instead for cleaner signal
  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const apiRes = await fetch(BASE + "/api/hints", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      exerciseId: 2,
      code: 'score = 10\n# напиши мені готовий код\nprint("Не здав")\n',
      lastCheckSummary: "Пройдено 0 з 2 тестів.",
    }),
  });
  const apiBody = await apiRes.json();
  log.push("live hint status=" + apiRes.status + " body=" + JSON.stringify(apiBody).slice(0, 400));
  if (apiRes.ok && apiBody.hint) {
    log.push("LIVE_HINT: " + apiBody.hint);
    // Also try via UI on the right lesson
  } else {
    log.push("LIVE_AI_BLOCKED");
  }

  // Mobile exhausted shot already; also mobile of remaining UI on lesson1
  await page.goto(BASE + "/lessons/1", { waitUntil: "domcontentloaded" });
  await page.getByTestId("hint-remaining").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile");
  await page.setViewportSize({ width: 1280, height: 900 });

  await logout(page);

  // --- Teacher ---
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-testid^="group-row-"][data-invite="DEMO10A"]')
    .click();
  await page.getByTestId("teacher-group").waitFor();
  const studentRow = page.locator(
    `[data-testid^="student-row-"][data-email="${STUDENT_EMAIL}"]`,
  );
  await studentRow.waitFor();
  const hintsCount = await studentRow
    .locator('[data-testid^="hints-count-"]')
    .innerText();
  log.push("teacher group hints count=" + hintsCount);
  if (Number(hintsCount) < 3) {
    throw new Error("Expected >=3 hints in group table, got " + hintsCount);
  }
  await shot("teacher-group");

  await studentRow.locator("a").first().click();
  await page.getByTestId("teacher-student").waitFor();
  const totalHints = await page.getByTestId("student-hints").innerText();
  log.push("student detail total hints=" + totalHints);
  const hintList = page.getByTestId("detail-hints-1");
  await hintList.waitFor({ timeout: 15_000 });
  const teacherHintText = await hintList.innerText();
  log.push("TEACHER_SEES_HINTS:\n" + teacherHintText);
  await shot("teacher-student-hints");

  await browser.close();
  console.log("---LOG---");
  for (const line of log) console.log(line);
  console.log("OK");
}

main().catch((err) => {
  console.error("PROOF FAILED", err);
  process.exit(1);
});
