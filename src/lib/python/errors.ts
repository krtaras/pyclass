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
  TimeoutError: "Час вичерпано",
};

export type TranslatedError = {
  title: string;
  body: string;
  line: number | null;
};

function extractLine(raw: string): number | null {
  const patterns = [
    /line (\d+)/i,
    /File "<[^"]+", line (\d+)/,
    /, рядок (\d+)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function extractType(raw: string): string | null {
  const m = raw.match(
    /\b(SyntaxError|IndentationError|TabError|NameError|TypeError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError|RecursionError|TimeoutError)\b/,
  );
  return m?.[1] ?? null;
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

  let detail = raw.trim();
  // Prefer the last non-empty line (usually "TypeError: ...")
  const lines = detail.split("\n").map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? detail;
  const colon = last.indexOf(":");
  if (colon > 0 && /Error$/.test(last.slice(0, colon).trim())) {
    detail = last.slice(colon + 1).trim() || last;
  } else {
    detail = last;
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
