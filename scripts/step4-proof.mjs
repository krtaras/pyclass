import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "https://pyclass-swart.vercel.app";
const SHOTS = "/workspace/pyclass-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = Date.now();
const email = `student.step4.${stamp}@pyclass.test`;
const password = `TestPass${stamp}x`;
const name = "Тест Учень";
const invite = "DEMO10A";

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
    const file = path.join(SHOTS, `step4-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    log.push(`shot ${file}`);
    console.log("SHOT", file);
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER_ERR", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE_ERR", err.message));

  // 1) Home public
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Курс Python" }).waitFor();
  await shot("home-public");

  // Unauthenticated lesson redirect
  await page.goto(BASE + "/lessons/1", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login/, { timeout: 20_000 });
  log.push("unauth lesson redirected to login");

  // 2) Signup via UI
  await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await page.getByTestId("signup-form").waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="signup-form"]')?.getAttribute('data-ready') === 'true');
  await page.getByTestId("signup-name").fill(name);
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-invite").fill(invite);
  await shot("signup-filled");

  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/signup"), { timeout: 45_000 }),
    page.getByTestId("signup-submit").click(),
  ]);
  await page.getByTestId("nav-logout").waitFor({ timeout: 30_000 });
  log.push("signed up as " + email);
  await shot("after-signup");

  // 3) Open lesson 1
  await page.goto(BASE + "/lessons/1", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /print/ }).waitFor();
  const checkBtn = page.getByRole("button", { name: "Перевірити" });
  await checkBtn.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Перевірити"),
    );
    return btn && !btn.disabled;
  }, null, { timeout: 180_000 });
  log.push("lesson 1 ready");
  await shot("lesson1-ready");

  const ta = page.locator("textarea").first();
  await ta.waitFor();

  // Wrong solution
  await ta.fill('greeting = "Хай"\nprint(greeting)\n');
  await checkBtn.click();
  await page.getByTestId("check-report").waitFor({ state: "visible", timeout: 90_000 });
  const wrongSummary = await page.getByTestId("check-summary").innerText();
  log.push("wrong: " + wrongSummary);
  if (/Усі тести/.test(wrongSummary)) throw new Error("Expected wrong to fail");
  await shot("wrong");

  // Correct solution
  await ta.fill('greeting = "Привіт"\nprint(greeting)\n');
  await checkBtn.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="check-summary"]');
    return el && /Усі тести/.test(el.textContent || "");
  }, null, { timeout: 90_000 });
  const okSummary = await page.getByTestId("check-summary").innerText();
  log.push("correct: " + okSummary);
  await shot("correct");

  // Quiz
  await page.getByTestId("quiz-section").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => document.querySelector('[data-quiz-ready="true"]'),
    null,
    { timeout: 30_000 },
  );

  const qCards = page.locator('[data-testid^="quiz-question-"]');
  const q1 = qCards.nth(0);
  await q1.locator('button[data-option="Виводить текст на екран"]').click();
  const q1Id = (await q1.getAttribute("data-testid")).replace("quiz-question-", "");
  await page.getByTestId(`quiz-submit-${q1Id}`).click();
  await page.getByTestId(`quiz-feedback-${q1Id}`).waitFor();
  log.push("quiz1 ok");

  const q2 = qCards.nth(1);
  await q2.locator('button[data-option="5"]').click();
  const q2Id = (await q2.getAttribute("data-testid")).replace("quiz-question-", "");
  await page.getByTestId(`quiz-submit-${q2Id}`).click();
  await page.getByTestId(`quiz-feedback-${q2Id}`).waitFor();
  log.push("quiz2 ok");
  await shot("quiz-answered");

  // Wait for persistence fetches
  await page.waitForTimeout(2000);

  // Reload — confirm persistence
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId(`quiz-feedback-${q1Id}`).waitFor({ timeout: 30_000 });
  const explanation = await page.getByTestId(`quiz-explanation-${q1Id}`).innerText();
  await ta.waitFor();
  // Wait for python ready again so textarea is interactive with saved value
  await page.waitForTimeout(500);
  const codeVal = await ta.inputValue();
  log.push("reload explanation: " + explanation.slice(0, 80));
  log.push("reload code: " + JSON.stringify(codeVal.slice(0, 60)));
  if (!codeVal.includes("Привіт")) {
    throw new Error("Exercise code not persisted on reload: " + codeVal);
  }
  await shot("after-reload");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId(`quiz-feedback-${q1Id}`).waitFor({ timeout: 30_000 });
  await shot("mobile");

  // Logout
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByTestId("nav-logout").click();
  await page.getByTestId("nav-login").waitFor({ timeout: 30_000 });
  log.push("logged out");
  await shot("logged-out");

  // Login again
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector('[data-testid="login-form"]')?.getAttribute('data-ready') === 'true');
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 }),
    page.getByTestId("login-submit").click(),
  ]);
  await page.getByTestId("nav-logout").waitFor({ timeout: 30_000 });
  log.push("logged back in");

  // Progress on course page
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("home-progress-summary").waitFor({ timeout: 30_000 });
  const homeProg = await page.getByTestId("home-progress-summary").innerText();
  log.push("home progress: " + homeProg);
  const lesson1 = page.getByTestId("home-lesson-1");
  const complete = await lesson1.getAttribute("data-complete");
  const percent = await lesson1.getAttribute("data-percent");
  log.push(`lesson1 complete=${complete} percent=${percent}`);
  if (complete !== "true") {
    throw new Error(`Expected lesson 1 complete, got complete=${complete} percent=${percent}`);
  }
  await shot("home-progress");

  await page.goto(BASE + "/progress", { waitUntil: "domcontentloaded" });
  await page.getByTestId("progress-summary").waitFor();
  const summary = (await page.getByTestId("progress-summary").innerText()).replace(/\n/g, " | ");
  log.push("progress page: " + summary);
  await shot("progress-page");

  await browser.close();

  console.log("---LOG---");
  for (const line of log) console.log(line);
  console.log("---EMAIL---");
  console.log(email);
  console.log("OK");
}

main().catch(async (err) => {
  console.error("PROOF FAILED", err);
  process.exit(1);
});
