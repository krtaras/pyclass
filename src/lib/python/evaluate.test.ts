import { describe, expect, it } from "vitest";
import {
  buildCheckReport,
  compareStdout,
  evaluateSingleTest,
  normalizeStdout,
} from "./evaluate";
import type { ExerciseTest, RunOutcome } from "./types";

const ioVisible: ExerciseTest = {
  type: "io",
  input: "",
  output: "Привіт",
  visible: true,
};

const ioHidden: ExerciseTest = {
  type: "io",
  input: "",
  output: "secret",
};

const assertTest: ExerciseTest = {
  type: "assert",
  code: "assert x == 1",
};

describe("normalizeStdout / compareStdout", () => {
  it("trims trailing whitespace", () => {
    expect(normalizeStdout("a  \n b\t\n")).toBe("a\n b");
    expect(compareStdout("Привіт\n", "Привіт")).toBe(true);
    expect(compareStdout("Привіт ", "Привіт")).toBe(true);
  });
});

describe("evaluateSingleTest", () => {
  it("passes a correct io solution", () => {
    const outcome: RunOutcome = {
      ok: true,
      stdout: "Привіт\n",
      stderr: "",
    };
    const r = evaluateSingleTest(ioVisible, 0, outcome, 2);
    expect(r.passed).toBe(true);
    expect(r.summary).toContain("пройдено");
  });

  it("fails wrong output with Ukrainian detail when visible", () => {
    const outcome: RunOutcome = {
      ok: true,
      stdout: "Hello",
      stderr: "",
    };
    const r = evaluateSingleTest(ioVisible, 1, outcome, 3);
    expect(r.passed).toBe(false);
    expect(r.summary).toMatch(/Тест 2 з 3 не пройшов/);
    expect(r.detail).toContain("Очікувалось:");
    expect(r.detail).toContain("Отримано:");
    expect(r.detail).toContain("Привіт");
    expect(r.detail).toContain("Hello");
  });

  it("hides expected/actual for hidden io tests", () => {
    const outcome: RunOutcome = { ok: true, stdout: "nope", stderr: "" };
    const r = evaluateSingleTest(ioHidden, 0, outcome, 1);
    expect(r.passed).toBe(false);
    expect(r.detail).toBeUndefined();
    expect(r.summary).not.toContain("secret");
  });

  it("fails with Ukrainian message on exception", () => {
    const outcome: RunOutcome = {
      ok: false,
      stdout: "",
      stderr: "",
      errorType: "NameError",
      message: "NameError: name 'greeting' is not defined",
      line: 1,
    };
    const r = evaluateSingleTest(assertTest, 0, outcome, 1);
    expect(r.passed).toBe(false);
    expect(r.summary).toContain("Невідоме імʼя");
    expect(r.detail).toContain("рядок 1");
  });

  it("handles timeout", () => {
    const outcome: RunOutcome = {
      ok: false,
      stdout: "",
      stderr: "",
      errorType: "TimeoutError",
      message: "TimeoutError: execution exceeded 5 seconds",
      line: null,
      timedOut: true,
    };
    const r = evaluateSingleTest(ioVisible, 0, outcome, 1);
    expect(r.passed).toBe(false);
    expect(r.summary).toContain("Час вичерпано");
    expect(r.detail).toContain("5 секунд");
  });

  it("passes assert when run succeeds", () => {
    const outcome: RunOutcome = { ok: true, stdout: "", stderr: "" };
    const r = evaluateSingleTest(assertTest, 0, outcome, 1);
    expect(r.passed).toBe(true);
  });
});

describe("buildCheckReport", () => {
  it("aggregates pass counts for a correct solution", () => {
    const tests: ExerciseTest[] = [assertTest, ioVisible];
    const outcomes: RunOutcome[] = [
      { ok: true, stdout: "", stderr: "" },
      { ok: true, stdout: "Привіт", stderr: "" },
    ];
    const report = buildCheckReport(tests, outcomes);
    expect(report.allPassed).toBe(true);
    expect(report.passed).toBe(2);
    expect(report.total).toBe(2);
  });
});
