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

if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
  console.error("TEACHER_EMAIL/PASSWORD missing from env");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "uk-UA",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const log = [];
  const shot = async (label) => {
    const file = path.join(SHOTS, `step5-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("SHOT", file);
    log.push(file);
  };

  // --- Student blocked from /teacher ---
  // Login as step4 student via API... we don't have password.
  // Instead: signup a throwaway student OR login if we can create one.
  // Brief: "confirm a student session gets blocked from /teacher"
  // Create a temporary student via signup UI, try /teacher, then logout.

  await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="signup-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  const tmpEmail = `block.step5.${Date.now()}@pyclass.test`;
  const tmpPass = `BlockPass${Date.now()}x`;
  await page.getByTestId("signup-name").fill("Блок Тест");
  await page.getByTestId("signup-email").fill(tmpEmail);
  await page.getByTestId("signup-password").fill(tmpPass);
  await page.getByTestId("signup-invite").fill("DEMO10A");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/signup"), { timeout: 45_000 }),
    page.getByTestId("signup-submit").click(),
  ]);
  await page.getByTestId("nav-logout").waitFor();
  log.push("temp student signed up for block check");

  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const blockedUrl = page.url();
  if (blockedUrl.includes("/teacher")) {
    throw new Error("Student should not access /teacher, got " + blockedUrl);
  }
  log.push("student blocked from /teacher → " + blockedUrl);
  await shot("student-blocked");

  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor({ timeout: 30_000 });

  // --- Teacher login ---
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="login-form"]')
        ?.getAttribute("data-ready") === "true",
  );
  await page.getByTestId("login-email").fill(TEACHER_EMAIL);
  await page.getByTestId("login-password").fill(TEACHER_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 }),
    page.getByTestId("login-submit").click(),
  ]);
  await page.getByTestId("nav-teacher").waitFor({ timeout: 30_000 });
  log.push("teacher logged in");

  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page.getByTestId("teacher-home").waitFor();
  await shot("teacher-home");

  // Find DEMO10A group
  const groupLink = page.locator('[data-testid^="group-row-"][data-invite="DEMO10A"]');
  await groupLink.waitFor({ timeout: 15_000 });
  const href = await groupLink.getAttribute("href");
  log.push("demo group href " + href);
  await groupLink.click();
  await page.getByTestId("teacher-group").waitFor();
  await page.getByTestId("group-invite").waitFor();
  const invite = await page.getByTestId("group-invite").innerText();
  if (invite.trim() !== "DEMO10A") throw new Error("Expected DEMO10A, got " + invite);
  await shot("group-desktop");

  // Find step4 student
  const studentRow = page.locator(
    `[data-testid^="student-row-"][data-email="${STUDENT_EMAIL}"]`,
  );
  await studentRow.waitFor({ timeout: 15_000 });
  const lessonsCompleted = await studentRow.getAttribute("data-lessons-completed");
  const grade = await studentRow.getAttribute("data-grade");
  log.push(`student lessonsCompleted=${lessonsCompleted} grade=${grade}`);
  if (lessonsCompleted !== "1") {
    throw new Error("Expected 1 lesson completed, got " + lessonsCompleted);
  }
  if (!grade || Number(grade) < 1) {
    throw new Error("Expected positive grade, got " + grade);
  }

  // Mobile view of group
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("students-cards").waitFor();
  const card = page.locator(
    `[data-testid^="student-card-"][data-email="${STUDENT_EMAIL}"]`,
  );
  await card.waitFor();
  await shot("group-mobile");

  // Student detail
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await studentRow.waitFor();
  await studentRow.locator("a").first().click();
  await page.getByTestId("teacher-student").waitFor();
  const detailEmail = await page
    .getByTestId("teacher-student")
    .getAttribute("data-student-email");
  if (detailEmail !== STUDENT_EMAIL) {
    throw new Error("Detail page wrong student: " + detailEmail);
  }
  const detailGrade = await page.getByTestId("student-grade").innerText();
  log.push("detail grade " + detailGrade);
  // Lesson 1 complete
  const lesson1 = page.getByTestId("detail-lesson-1");
  await lesson1.waitFor();
  const complete = await lesson1.getAttribute("data-complete");
  if (complete !== "true") throw new Error("Lesson 1 should be complete");
  await shot("student-detail");

  // CSV download
  await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
  await page.getByTestId("export-csv").waitFor();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.getByTestId("export-csv").click(),
  ]);
  const csvPath = path.join(SHOTS, "step5-group.csv");
  await download.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, "utf8");
  // Strip BOM for checks
  const body = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  if (csv.charCodeAt(0) !== 0xfeff) {
    throw new Error("CSV missing UTF-8 BOM");
  }
  if (!body.includes(STUDENT_EMAIL)) {
    throw new Error("CSV missing student email");
  }
  if (!body.includes(`,${grade},`) && !body.includes(`"${grade}"`)) {
    // grade column near end — check line
    const line = body.split(/\r?\n/).find((l) => l.includes(STUDENT_EMAIL));
    log.push("csv line: " + line);
    if (!line || !line.includes(String(grade))) {
      throw new Error("CSV missing grade " + grade + " for student");
    }
  }
  if (!body.includes("1,2,") && !body.match(/,1,2,/)) {
    // lessons completed/total — soft check via line
    const line = body.split(/\r?\n/).find((l) => l.includes(STUDENT_EMAIL));
    if (!line || !/,1,2,/.test(line)) {
      log.push("warn: lessons 1/2 pattern not found in " + line);
    }
  }
  log.push("csv saved " + csvPath + " bytes=" + csv.length);
  console.log("CSV_OK", csvPath);

  // Anonymous blocked
  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor({ timeout: 30_000 });
  await page.goto(BASE + "/teacher", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login/, { timeout: 20_000 });
  log.push("anonymous redirected to login");
  await shot("anon-redirect");

  await browser.close();
  console.log("---LOG---");
  for (const l of log) console.log(l);
  console.log("OK");
}

main().catch((err) => {
  console.error("PROOF FAILED", err);
  process.exit(1);
});
