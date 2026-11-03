export type IoTest = {
  type: "io";
  input: string;
  output: string;
  /** When true, show input/expected in the UI and reveal очікувалось/отримано on failure. */
  visible?: boolean;
};

export type AssertTest = {
  type: "assert";
  code: string;
  /** When true, show a short description; assert code itself stays hidden unless visible. */
  visible?: boolean;
  /** Optional student-facing label for a visible assert. */
  label?: string;
};

export type ExerciseTest = IoTest | AssertTest;

export type RunOutcome =
  | {
      ok: true;
      stdout: string;
      stderr: string;
    }
  | {
      ok: false;
      stdout: string;
      stderr: string;
      errorType: string;
      message: string;
      line: number | null;
      timedOut?: boolean;
    };

export type TestRunResult = {
  index: number;
  passed: boolean;
  /** Ukrainian summary shown to the student. */
  summary: string;
  /** Extra detail (очікувалось/отримано) when the test is visible. */
  detail?: string;
};

export type CheckReport = {
  passed: number;
  total: number;
  results: TestRunResult[];
  allPassed: boolean;
};

/** Seam for step 4 auth — call when a check finishes. */
export type SubmissionPayload = {
  exerciseId: number;
  code: string;
  passed: number;
  total: number;
};
