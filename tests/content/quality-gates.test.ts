import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { COURSE_MODULES } from "../../content/course";
import {
  checkCodeAgainstTests,
  normalizeStdout,
  runPythonCpython,
} from "../../src/lib/content-sync/run-python";

type Solutions = Record<string, { correct: string; wrong: string }>;

const solutions: Solutions = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/solutions.json"), "utf8"),
);

describe("course structure", () => {
  test("modules 1–10 present with 4–6 lessons each", () => {
    expect(COURSE_MODULES).toHaveLength(10);
    for (const m of COURSE_MODULES) {
      expect(m.lessons.length).toBeGreaterThanOrEqual(4);
      expect(m.lessons.length).toBeLessThanOrEqual(6);
      for (const l of m.lessons) {
        expect(l.exercises.length).toBeGreaterThanOrEqual(2);
        expect(l.quizzes.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("exercise quality gates", () => {
  for (const mod of COURSE_MODULES) {
    for (const les of mod.lessons) {
      for (const ex of les.exercises) {
        test(`${ex.slug}: solution passes, starter & wrong fail`, () => {
          const sol = solutions[ex.slug];
          expect(sol, `missing solution fixture for ${ex.slug}`).toBeTruthy();
          expect(ex.tests.length).toBeGreaterThanOrEqual(3);
          expect(ex.tests.some((t) => t.visible)).toBe(true);

          const good = checkCodeAgainstTests(sol.correct, ex.tests);
          expect(
            good.allPassed,
            `${ex.slug} correct failed: ${JSON.stringify(good.results)}`,
          ).toBe(true);

          const starter = checkCodeAgainstTests(ex.starterCode, ex.tests);
          expect(
            starter.allPassed,
            `${ex.slug} starter unexpectedly passed all`,
          ).toBe(false);

          const bad = checkCodeAgainstTests(sol.wrong, ex.tests);
          expect(
            bad.allPassed,
            `${ex.slug} wrong unexpectedly passed all`,
          ).toBe(false);
        });
      }
    }
  }
});

describe("quiz quality gates", () => {
  for (const mod of COURSE_MODULES) {
    for (const les of mod.lessons) {
      for (const q of les.quizzes) {
        if (q.kind === "single") {
          test(`${q.slug}: exactly one correct option`, () => {
            expect(typeof q.correct).toBe("string");
            const hits = q.options.filter((o) => o === q.correct);
            expect(hits).toHaveLength(1);
          });
        }
        if (q.kind === "output") {
          test(`${q.slug}: marked answer equals real stdout`, () => {
            expect(q.code, `${q.slug} missing code`).toBeTruthy();
            const run = runPythonCpython(q.code!, null);
            expect(run.ok, `${q.slug} code error: ${"message" in run ? run.message : run.stderr}`).toBe(
              true,
            );
            const actual = normalizeStdout(run.stdout);
            const marked = normalizeStdout(String(q.correct));
            expect(actual).toBe(marked);
            expect(q.options.map((o) => normalizeStdout(o))).toContain(actual);
          });
        }
      }
    }
  }
});
