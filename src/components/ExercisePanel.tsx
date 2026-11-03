"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import {
  buildCheckReport,
  publicTestHint,
} from "@/lib/python/evaluate";
import { translatePythonError } from "@/lib/python/errors";
import { getPyodideRunner } from "@/lib/python/runner";
import type {
  CheckReport,
  ExerciseTest,
  RunOutcome,
  SubmissionPayload,
} from "@/lib/python/types";

export type ExercisePanelProps = {
  exerciseId: number;
  prompt: string;
  starterCode: string;
  tests: ExerciseTest[];
  /** Latest saved code from a previous submission, if any. */
  initialCode?: string;
  hintLimit?: number;
  initialHintsUsed?: number;
  /** Seam for step 4 — called after «Перевірити». */
  onCheckComplete?: (payload: SubmissionPayload) => void;
};

type RunView =
  | { kind: "idle" }
  | { kind: "running"; mode: "run" | "check" }
  | { kind: "run"; outcome: RunOutcome }
  | { kind: "check"; report: CheckReport };

function summarizeCheck(report: CheckReport): string {
  const lines = [`Пройдено ${report.passed} з ${report.total} тестів.`];
  for (const r of report.results) {
    if (r.passed) continue;
    lines.push(r.detail ? `${r.summary} — ${r.detail}` : r.summary);
  }
  return lines.join("\n");
}

export function ExercisePanel({
  exerciseId,
  prompt,
  starterCode,
  tests,
  initialCode,
  hintLimit = 0,
  initialHintsUsed = 0,
  onCheckComplete,
}: ExercisePanelProps) {
  const [code, setCode] = useState(initialCode ?? starterCode);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<RunView>({ kind: "idle" });
  const [hintsUsed, setHintsUsed] = useState(initialHintsUsed);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [lastCheckSummary, setLastCheckSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const runner = getPyodideRunner();
    runner
      .init()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Не вдалося завантажити Python",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const examples = useMemo(
    () =>
      tests
        .map((t, i) => ({ hint: publicTestHint(t, i), index: i }))
        .filter((x): x is { hint: string; index: number } => Boolean(x.hint)),
    [tests],
  );

  const hintsEnabled = hintLimit > 0;
  const remaining = Math.max(0, hintLimit - hintsUsed);
  const busy = view.kind === "running" || hintBusy;

  const handleRun = useCallback(async () => {
    setView({ kind: "running", mode: "run" });
    const runner = getPyodideRunner();
    const outcome = await runner.run(code, null);
    setView({ kind: "run", outcome });
  }, [code]);

  const handleCheck = useCallback(async () => {
    setView({ kind: "running", mode: "check" });
    const runner = getPyodideRunner();
    const outcomes: RunOutcome[] = [];
    for (const test of tests) {
      const outcome = await runner.runTest(code, test);
      outcomes.push(outcome);
      // If timed out, worker was already reset; continue with remaining tests
      // using a fresh worker on next call.
    }
    const report = buildCheckReport(tests, outcomes);
    setView({ kind: "check", report });
    setLastCheckSummary(summarizeCheck(report));
    onCheckComplete?.({
      exerciseId,
      code,
      passed: report.passed,
      total: report.total,
    });
  }, [code, exerciseId, onCheckComplete, tests]);

  const handleHint = useCallback(async () => {
    if (!hintsEnabled || remaining <= 0 || hintBusy) return;
    setHintBusy(true);
    setHintError(null);
    try {
      const res = await fetch("/api/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          code,
          lastCheckSummary,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hint?: string;
        remaining?: number;
        used?: number;
        error?: string;
      };
      if (!res.ok || !data.hint) {
        setHintError(data.error ?? "Не вдалося отримати підказку.");
        if (typeof data.used === "number") setHintsUsed(data.used);
        return;
      }
      setHintText(data.hint);
      if (typeof data.used === "number") setHintsUsed(data.used);
    } catch {
      setHintError("Мережева помилка. Спробуй ще раз.");
    } finally {
      setHintBusy(false);
    }
  }, [code, exerciseId, hintBusy, hintsEnabled, lastCheckSummary, remaining]);

  return (
    <section
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
      data-exercise-id={exerciseId}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">Вправа</h2>
        <p className="text-sm text-zinc-700 sm:text-base">{prompt}</p>
      </div>

      {examples.length > 0 && (
        <div className="space-y-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-800">Приклади</p>
          {examples.map((ex) => (
            <pre
              key={ex.index}
              className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-xs text-zinc-800"
            >
              {ex.hint}
            </pre>
          ))}
        </div>
      )}

      <CodeEditor value={code} onChange={setCode} disabled={busy} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={!ready || busy}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {view.kind === "running" && view.mode === "run"
            ? "Запуск…"
            : "Запустити"}
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!ready || busy}
          className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {view.kind === "running" && view.mode === "check"
            ? "Перевірка…"
            : "Перевірити"}
        </button>
        {hintsEnabled && (
          <button
            type="button"
            onClick={handleHint}
            disabled={busy || remaining <= 0}
            className="rounded-full border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
            data-testid="hint-button"
          >
            {hintBusy ? "Підказка…" : "Підказка"}
          </button>
        )}
        {!ready && !loadError && (
          <span className="self-center text-xs text-zinc-500">
            Завантаження Python…
          </span>
        )}
        {loadError && (
          <span className="self-center text-xs text-red-600">{loadError}</span>
        )}
      </div>

      {hintsEnabled && (
        <p className="text-xs text-zinc-600" data-testid="hint-remaining">
          {remaining > 0
            ? `Залишилось підказок: ${remaining}`
            : "Підказки вичерпано для цієї вправи."}
        </p>
      )}

      {hintError && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          data-testid="hint-error"
        >
          {hintError}
        </p>
      )}

      {hintText && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          data-testid="hint-text"
        >
          <p className="mb-1 font-medium text-amber-900">Підказка</p>
          <p className="whitespace-pre-wrap">{hintText}</p>
        </div>
      )}

      {view.kind === "run" && <RunResultView outcome={view.outcome} />}
      {view.kind === "check" && <CheckResultView report={view.report} />}
    </section>
  );
}

function RunResultView({ outcome }: { outcome: RunOutcome }) {
  if (!outcome.ok) {
    const t = translatePythonError(outcome.message, {
      timedOut: outcome.timedOut,
      line: outcome.line,
      errorType: outcome.errorType,
    });
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        data-testid="run-error"
      >
        <p className="font-semibold">{t.title}</p>
        <p className="mt-1 whitespace-pre-wrap">{t.body}</p>
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-zinc-950 p-3 font-mono text-sm text-zinc-100"
      data-testid="run-stdout"
    >
      <p className="mb-1 text-xs uppercase tracking-wide text-zinc-400">Вивід</p>
      <pre className="whitespace-pre-wrap">
        {outcome.stdout || "(порожньо)"}
      </pre>
    </div>
  );
}

function CheckResultView({ report }: { report: CheckReport }) {
  return (
    <div className="space-y-2" data-testid="check-report">
      <p
        className={
          report.allPassed
            ? "text-sm font-semibold text-emerald-700"
            : "text-sm font-semibold text-amber-800"
        }
        data-testid="check-summary"
      >
        {report.allPassed
          ? `Усі тести пройдено (${report.passed} з ${report.total})`
          : `Пройдено ${report.passed} з ${report.total}`}
      </p>
      <ul className="space-y-2">
        {report.results.map((r) => (
          <li
            key={r.index}
            data-testid={`test-result-${r.index}`}
            data-passed={r.passed ? "true" : "false"}
            className={
              r.passed
                ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
                : "rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            }
          >
            <p className="font-medium">{r.summary}</p>
            {r.detail && (
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs opacity-90">
                {r.detail}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
