import { formatWrongOutput, translatePythonError } from "./errors";
import type {
  CheckReport,
  ExerciseTest,
  RunOutcome,
  TestRunResult,
} from "./types";

/** Trim trailing whitespace on each line and the whole string (for stdout compare). */
export function normalizeStdout(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

export function compareStdout(actual: string, expected: string): boolean {
  return normalizeStdout(actual) === normalizeStdout(expected);
}

/**
 * Build a single test result from a prior run outcome.
 * Pure: no Pyodide — unit-testable with mocked RunOutcome values.
 */
export function evaluateSingleTest(
  test: ExerciseTest,
  index: number,
  outcome: RunOutcome,
  total: number,
): TestRunResult {
  const label = `Тест ${index + 1} з ${total}`;

  if (!outcome.ok) {
    if (outcome.timedOut) {
      const t = translatePythonError(outcome.message, { timedOut: true });
      return {
        index,
        passed: false,
        summary: `${label} не пройшов: ${t.title}`,
        detail: t.body,
      };
    }
    const t = translatePythonError(outcome.message, {
      line: outcome.line,
      errorType: outcome.errorType,
    });
    return {
      index,
      passed: false,
      summary: `${label} не пройшов: ${t.title}`,
      detail: t.body,
    };
  }

  if (test.type === "io") {
    const passed = compareStdout(outcome.stdout, test.output);
    if (passed) {
      return { index, passed: true, summary: `${label} пройдено` };
    }
    const result: TestRunResult = {
      index,
      passed: false,
      summary: `${label} не пройшов`,
    };
    if (test.visible) {
      result.detail = formatWrongOutput(
        normalizeStdout(test.output),
        normalizeStdout(outcome.stdout),
      );
      result.summary = `${label} не пройшов: неправильний вивід`;
    }
    return result;
  }

  // assert: success if run completed without exception
  return { index, passed: true, summary: `${label} пройдено` };
}

export function buildCheckReport(
  tests: ExerciseTest[],
  outcomes: RunOutcome[],
): CheckReport {
  if (tests.length !== outcomes.length) {
    throw new Error("tests and outcomes length mismatch");
  }
  const results = tests.map((test, i) =>
    evaluateSingleTest(test, i, outcomes[i]!, tests.length),
  );
  const passed = results.filter((r) => r.passed).length;
  return {
    passed,
    total: tests.length,
    results,
    allPassed: passed === tests.length,
  };
}

/** Public view of a test for the UI (never includes assert code unless visible). */
export function publicTestHint(test: ExerciseTest, index: number): string | null {
  if (!test.visible) return null;
  if (test.type === "io") {
    const input = test.input ? `Ввід: ${JSON.stringify(test.input)}\n` : "";
    return `Приклад ${index + 1}\n${input}Очікуваний вивід:\n${test.output}`;
  }
  return test.label ?? `Перевірка ${index + 1}`;
}
