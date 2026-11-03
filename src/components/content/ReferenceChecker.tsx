"use client";

import { useCallback, useEffect, useState } from "react";
import { buildCheckReport } from "@/lib/python/evaluate";
import { getPyodideRunner } from "@/lib/python/runner";
import type { CheckReport, ExerciseTest, RunOutcome } from "@/lib/python/types";

export function ReferenceChecker({ tests }: { tests: ExerciseTest[] }) {
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPyodideRunner()
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

  const run = useCallback(async () => {
    setBusy(true);
    setReport(null);
    try {
      const runner = getPyodideRunner();
      const outcomes: RunOutcome[] = [];
      for (const test of tests) {
        outcomes.push(await runner.runTest(code, test));
      }
      setReport(buildCheckReport(tests, outcomes));
    } finally {
      setBusy(false);
    }
  }, [code, tests]);

  return (
    <div
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
      data-testid="reference-checker"
    >
      <p className="text-sm font-medium text-amber-950">
        Перевірити еталоном (код не зберігається)
      </p>
      <textarea
        className="min-h-28 w-full rounded-xl border border-amber-300 bg-white p-3 font-mono text-sm"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Встав еталонний розвʼязок…"
        data-testid="reference-code"
      />
      <button
        type="button"
        disabled={!ready || busy || tests.length === 0}
        onClick={() => void run()}
        className="rounded-full bg-amber-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        data-testid="reference-run"
      >
        {busy ? "Перевірка…" : "Перевірити еталоном"}
      </button>
      {!ready && !loadError && (
        <span className="ml-2 text-xs text-amber-800">Завантаження Python…</span>
      )}
      {loadError && <p className="text-sm text-red-700">{loadError}</p>}
      {report && (
        <p
          className={
            report.allPassed
              ? "text-sm font-semibold text-emerald-800"
              : "text-sm font-semibold text-red-800"
          }
          data-testid="reference-summary"
        >
          {report.allPassed
            ? `Еталон пройшов усі тести (${report.passed}/${report.total})`
            : `Еталон: ${report.passed} з ${report.total}`}
        </p>
      )}
    </div>
  );
}
