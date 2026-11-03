"use client";

import type { ExerciseTest, RunOutcome } from "./types";

const TIMEOUT_MS = 5000;
const WORKER_URL = "/pyodide-worker.js";

type Pending = {
  resolve: (value: RunOutcome) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class PyodideRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;

  private createWorker(): Worker {
    const worker = new Worker(WORKER_URL);
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "result" && data.id) {
        const p = this.pending.get(data.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(data.id);
        p.resolve(data.result as RunOutcome);
      }
    };
    worker.onerror = (err) => {
      for (const [, p] of this.pending) {
        clearTimeout(p.timer);
        p.resolve({
          ok: false,
          stdout: "",
          stderr: "",
          errorType: "Error",
          message: err.message || "Помилка воркера",
          line: null,
        });
      }
      this.pending.clear();
    };
    return worker;
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker();
      this.ready = new Promise((resolve, reject) => {
        const onMsg = (event: MessageEvent) => {
          if (event.data?.type === "ready") {
            this.worker?.removeEventListener("message", onMsg);
            resolve();
          } else if (event.data?.type === "ready-error") {
            this.worker?.removeEventListener("message", onMsg);
            reject(new Error(event.data.message));
          }
        };
        this.worker!.addEventListener("message", onMsg);
        this.worker!.postMessage({ type: "init" });
      });
    }
    return this.worker;
  }

  /** Terminate the current worker (e.g. after timeout) and recreate on next use. */
  resetWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = null;
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
    }
    this.pending.clear();
  }

  async init(): Promise<void> {
    this.ensureWorker();
    await this.ready;
  }

  async run(code: string, stdin: string | null = null): Promise<RunOutcome> {
    const worker = this.ensureWorker();
    await this.ready;

    const id = `r${++this.seq}`;
    return new Promise<RunOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // Kill hung worker so infinite loops never freeze the page
        this.resetWorker();
        resolve({
          ok: false,
          stdout: "",
          stderr: "",
          errorType: "TimeoutError",
          message: "TimeoutError: execution exceeded 5 seconds",
          line: null,
          timedOut: true,
        });
      }, TIMEOUT_MS);

      this.pending.set(id, {
        resolve,
        reject: () => {},
        timer,
      });

      worker.postMessage({ type: "run", id, code, stdin });
    });
  }

  /** Run one exercise test against student code. */
  async runTest(code: string, test: ExerciseTest): Promise<RunOutcome> {
    if (test.type === "io") {
      return this.run(code, test.input);
    }
    // assert: student code + assert in the same namespace
    const combined = `${code}\n\n# --- перевірки ---\n${test.code}\n`;
    return this.run(combined, null);
  }

  dispose(): void {
    this.resetWorker();
  }
}

let singleton: PyodideRunner | null = null;

export function getPyodideRunner(): PyodideRunner {
  if (typeof window === "undefined") {
    throw new Error("PyodideRunner is browser-only");
  }
  if (!singleton) singleton = new PyodideRunner();
  return singleton;
}
