import { spawnSync } from "node:child_process";
import type { ExerciseTest, RunOutcome } from "@/lib/python/types";
import {
  buildCheckReport,
  normalizeStdout,
} from "@/lib/python/evaluate";

const TIMEOUT_MS = 5000;

/**
 * Run Python code with optional stdin using system CPython.
 * Semantics aligned with the browser Pyodide runner for io/assert tests.
 */
export function runPythonCpython(
  code: string,
  stdin: string | null,
): RunOutcome {
  const result = spawnSync("python3", ["-c", code], {
    input: stdin ?? undefined,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (result.error) {
    const timedOut =
      (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
    return {
      ok: false,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      errorType: timedOut ? "TimeoutError" : "Error",
      message: result.error.message,
      line: null,
      timedOut,
    };
  }

  if (result.status === 0) {
    return {
      ok: true,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  const stderr = result.stderr ?? "";
  const errMatch = stderr.match(/(\w+Error): (.+)/);
  const lineMatch = stderr.match(/line (\d+)/);
  return {
    ok: false,
    stdout: result.stdout ?? "",
    stderr,
    errorType: errMatch?.[1] ?? "Error",
    message: errMatch ? `${errMatch[1]}: ${errMatch[2]}` : stderr.trim(),
    line: lineMatch ? Number(lineMatch[1]) : null,
  };
}

export function runExerciseTest(
  code: string,
  test: ExerciseTest,
): RunOutcome {
  if (test.type === "io") {
    return runPythonCpython(code, test.input);
  }
  const combined = `${code}\n\n# --- перевірки ---\n${test.code}\n`;
  return runPythonCpython(combined, null);
}

export function checkCodeAgainstTests(code: string, tests: ExerciseTest[]) {
  const outcomes = tests.map((t) => runExerciseTest(code, t));
  return buildCheckReport(tests, outcomes);
}

export { normalizeStdout };
