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

const ERROR_TYPES =
  /(SyntaxError|IndentationError|TabError|NameError|TypeError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError|RecursionError|AssertionError|TimeoutError)/;

function extractLine(raw: string): number | null {
  const patterns = [
    /File "<exec>", line (\d+)/,
    /File "<[^"]+", line (\d+)/,
    /line (\d+)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function extractType(raw: string): string | null {
  const m = raw.match(ERROR_TYPES);
  return m?.[1] ?? null;
}

function unwrapDetail(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (ERROR_TYPES.test(line.split(":")[0] ?? "")) return line;
  }
  return lines[lines.length - 1] ?? raw.trim();
}

/** Translate a Python traceback / error string into a clear Ukrainian message. */
export function translatePythonError(
  raw: string,
  options?: {
    timedOut?: boolean;
    line?: number | null;
    errorType?: string | null;
  },
): TranslatedError {
  if (options?.timedOut) {
    return {
      title: "Час вичерпано",
      body: "Програма працювала довше ніж 5 секунд (можливо, нескінченний цикл). Спробуй ще раз.",
      line: options.line ?? null,
    };
  }

  const line = options?.line ?? extractLine(raw);
  const preferred =
    options?.errorType && ERROR_TYPES.test(options.errorType)
      ? options.errorType
      : null;
  const errorType = preferred ?? extractType(raw) ?? "Error";
  const title = TYPE_MESSAGES[errorType] ?? "Помилка виконання";

  const last = unwrapDetail(raw);
  const colon = last.indexOf(":");
  let detail = last;
  if (colon > 0 && ERROR_TYPES.test(last.slice(0, colon).trim())) {
    detail = last.slice(colon + 1).trim() || last;
  }

  if (
    errorType === "AssertionError" &&
    (!detail || detail === "AssertionError" || detail === "PythonError")
  ) {
    detail = "твердження виявилось хибним";
  }

  // Avoid showing bare "PythonError" when we know a better type
  if (detail === "PythonError" && errorType !== "Error") {
    detail = title.toLowerCase();
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
