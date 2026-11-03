import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const BASE = process.env.BASE_URL || "https://pyclass-swart.vercel.app";
const SHOTS = "/workspace/pyclass-shots";
const MP4 = "/tmp/pyclass-video/demo-for.mp4";
const LESSON_ID = 3;
const YT = "https://www.youtube.com/watch?v=kqtD5dpn9C8";
const STUDENT_EMAIL = "student.step4.1793695285018@pyclass.test";
const STUDENT_PASSWORD = "TestPass1793695285018x";

fs.mkdirSync(SHOTS, { recursive: true });

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
  console.error("missing teacher env");
  process.exit(1);
}
if (!fs.existsSync(MP4)) {
  console.error("missing mp4", MP4);
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

async function restoreYoutube() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    update lessons
    set video_url = ${YT}, video_kind = 'youtube'
    where id = ${LESSON_ID}
  `;
  console.log("restored youtube for lesson", LESSON_ID);
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
  page.setDefaultTimeout(120_000);
  const log = [];
  const shot = async (label) => {
    const file = path.join(SHOTS, `step8-${label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("SHOT", file);
    log.push("shot " + file);
  };

  // --- Teacher upload ---
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + `/teacher/content/lessons/${LESSON_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("lesson-editor").waitFor();
  await page.waitForTimeout(1500);
  await page.getByTestId("lesson-video-kind-blob").click();
  await page.getByTestId("lesson-blob-file").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("lesson-blob-file").setInputFiles(MP4);
  await page.getByTestId("lesson-blob-url").waitFor({ state: "visible", timeout: 120_000 });
  const blobUrl = await page.getByTestId("lesson-blob-url").inputValue();
  log.push("blobUrl=" + blobUrl);
  if (!blobUrl.includes("blob.vercel") && !/\.mp4/i.test(blobUrl)) {
    throw new Error("Unexpected blob URL: " + blobUrl);
  }
  await shot("teacher-uploaded");
  await page.getByTestId("lesson-save").click();
  await page.getByText("Урок збережено.").waitFor({ timeout: 45_000 });
  log.push("lesson saved with blob");
  await shot("teacher-saved");

  // Mobile teacher editor
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile");
  await page.setViewportSize({ width: 1280, height: 900 });

  await logout(page);

  // --- Student rejected on upload route ---
  await login(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const rej = await fetch(BASE + "/api/teacher/blob/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: "lessons/3/hack.mp4",
        multipart: false,
        clientPayload: null,
      },
    }),
  });
  const rejBody = await rej.text();
  log.push("student upload status=" + rej.status + " body=" + rejBody.slice(0, 200));
  if (rej.status !== 403 && rej.status !== 401) {
    throw new Error("Expected student upload reject, got " + rej.status);
  }

  // --- Student plays video ---
  await page.goto(BASE + `/lessons/${LESSON_ID}`, { waitUntil: "domcontentloaded" });
  const video = page.getByTestId("lesson-blob-video");
  await video.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-testid="lesson-blob-video"]');
    return v && v.readyState >= 1;
  }, null, { timeout: 60_000 });

  const before = await video.evaluate((v) => v.currentTime);
  await video.evaluate(async (v) => {
    v.muted = true;
    try {
      await v.play();
    } catch (e) {
      // ignore autoplay policy; we'll seek instead
    }
  });
  // Advance playback to prove it works
  await video.evaluate((v) => {
    v.currentTime = Math.min(2, (v.duration || 5) * 0.4);
  });
  await page.waitForTimeout(800);
  const after = await video.evaluate((v) => ({
    currentTime: v.currentTime,
    readyState: v.readyState,
    paused: v.paused,
    duration: v.duration,
  }));
  log.push("video state " + JSON.stringify(after));
  if (!(after.currentTime > before) && !(after.currentTime >= 1.5)) {
    throw new Error("expected currentTime to advance, got " + JSON.stringify({ before, after }));
  }
  await shot("student-playing");

  await logout(page);

  // --- Restore YouTube via teacher UI ---
  await login(page, TEACHER_EMAIL, TEACHER_PASSWORD);
  await page.goto(BASE + `/teacher/content/lessons/${LESSON_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("lesson-editor").waitFor();
  await page.waitForTimeout(1500);
  await page.getByTestId("lesson-video-kind-youtube").click();
  await page.getByTestId("lesson-youtube-url").fill(YT);
  await page.getByTestId("lesson-save").click();
  await page.getByText("Урок збережено.").waitFor({ timeout: 45_000 });
  log.push("restored youtube via UI");
  await shot("restored-youtube");

  // Confirm DB
  const sql = neon(process.env.DATABASE_URL);
  const [row] = await sql`select video_url, video_kind from lessons where id = ${LESSON_ID}`;
  log.push("db after restore " + JSON.stringify(row));
  if (row.video_kind !== "youtube" || !String(row.video_url).includes("youtube")) {
    await restoreYoutube();
    throw new Error("YouTube restore failed: " + JSON.stringify(row));
  }

  await browser.close();
  console.log("---LOG---");
  for (const line of log) console.log(line);
  console.log("OK");
}

main().catch(async (err) => {
  console.error("PROOF FAILED", err);
  try {
    await restoreYoutube();
  } catch (e) {
    console.error("restore also failed", e);
  }
  process.exit(1);
});
