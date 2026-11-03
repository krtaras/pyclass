/* global importScripts, loadPyodide */
let pyodide = null;
let loading = null;

async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (!loading) {
    loading = (async () => {
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js");
      const pd = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
      });
      pyodide = pd;
      return pd;
    })();
  }
  return loading;
}

function extractError(err) {
  const message = String(err && err.message ? err.message : err);
  let line = null;
  const m =
    message.match(/File "<[^"]+", line (\d+)/) || message.match(/line (\d+)/i);
  if (m) line = Number(m[1]);
  let errorType = "Error";
  const t = message.match(
    /\b(SyntaxError|IndentationError|TabError|NameError|TypeError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError|RecursionError)\b/,
  );
  if (t) errorType = t[1];
  return { message, line, errorType };
}

async function runPython(code, stdin) {
  const pd = await ensurePyodide();
  const stdinText = stdin == null ? "" : String(stdin);

  // Isolate each run: fresh stdin/stdout/stderr
  pd.globals.set("_pyclass_stdin", stdinText);
  pd.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
sys.stdin = StringIO(_pyclass_stdin)
`);

  try {
    await pd.runPythonAsync(code);
    const stdout = pd.runPython("sys.stdout.getvalue()");
    const stderr = pd.runPython("sys.stderr.getvalue()");
    return {
      ok: true,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  } catch (err) {
    let stdout = "";
    let stderr = "";
    try {
      stdout = String(pd.runPython("sys.stdout.getvalue()") ?? "");
      stderr = String(pd.runPython("sys.stderr.getvalue()") ?? "");
    } catch {
      /* ignore */
    }
    const { message, line, errorType } = extractError(err);
    return {
      ok: false,
      stdout,
      stderr,
      errorType,
      message,
      line,
    };
  }
}

self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type === "init") {
    try {
      await ensurePyodide();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({
        type: "ready-error",
        message: String(err && err.message ? err.message : err),
      });
    }
    return;
  }

  if (data.type === "run") {
    const { id, code, stdin } = data;
    try {
      const result = await runPython(code, stdin ?? null);
      self.postMessage({ type: "result", id, result });
    } catch (err) {
      self.postMessage({
        type: "result",
        id,
        result: {
          ok: false,
          stdout: "",
          stderr: "",
          errorType: "Error",
          message: String(err && err.message ? err.message : err),
          line: null,
        },
      });
    }
  }
};
