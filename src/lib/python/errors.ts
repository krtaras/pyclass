const TYPE_MESSAGES: Record<string, string> = {
  SyntaxError: "Синтаксична помилка",
  IndentationError: "Помилка відступів",
  TabError: "Помилка відступів (змішані пробіли й таби)",
  NameError: "Невідоме імʼя",
  TypeError: "Помилка типу",
  ValueError: "Неправильне значення",
  ZeroDivisionError: "Ділення на нуль",
  IndexError: "Індекс поза межами",
  KeyError: "Немає такого ключа",
  AttributeError: "Немає такого атрибута",
  RecursionError: "Занадто глибока рекурсія",
  AssertionError: "Перевірка не пройшла",
  TimeoutError: "Час вичерпано",
};

export type TranslatedError = {
  title: string;
  body: string;
  line: number | null;
};

function extractLine(raw: string): number | null {
  const patterns = [
    /File "<[^"]+", line (\d+)/,
    /line (\d+)/i,
    /, рядок (\d+)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

const ERROR_TYPES =
  /(SyntaxError|IndentationError|TabError|NameError|TypeError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError|RecursionError|AssertionError|TimeoutError)/;

function extractType(raw: string): string | null {
  const m = raw.match(ERROR_TYPES);
  return m?.[1] ?? null;
}

/** Prefer the most specific Error: line from a Pyodide PythonError wrapper. */
function unwrapDetail(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Prefer last line that looks like "SomeError: ..."
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (ERROR_TYPES.test(line.split(":")[0] ?? "")) return line;
  }
  return lines[lines.length - 1] ?? raw.trim();
}

/** Translate a Python traceback / error string into a clear Ukrainian message. */
export function translatePythonError(
  raw: string,
  options?: { timedOut?: boolean; line?: number | null },
): TranslatedError {
  if (options?.timedOut) {
    return {
      title: "Час вичерпано",
      body: "Програма працювала довше ніж 5 секунд (можливо, нескінченний цикл). Спробуй ще раз.",
      line: options.line ?? null,
    };
  }

  const line = options?.line ?? extractLine(raw);
  const errorType = extractType(raw) ?? "Error";
  const title = TYPE_MESSAGES[errorType] ?? "Помилка виконання";

  const last = unwrapDetail(raw);
  const colon = last.indexOf(":");
  let detail = last;
  if (colon > 0 && ERROR_TYPES.test(last.slice(0, colon).trim())) {
    detail = last.slice(colon + 1).trim() || last;
  }

  // Assertion with empty message
  if (errorType === "AssertionError" && (!detail || detail === "AssertionError")) {
    detail = "твердження виявилось хибним";
  }

  const linePart = line != null ? ` (рядок ${line})` : "";
  return {
    title,
    body: `${title}${linePart}: ${detail}`,
    line,
  };
}

export function formatWrongOutput(expected: string, actual: string): string {
  return `Очікувалось:\n${expected}\n\nОтримано:\n${actual}`;
}
