import { describe, expect, it } from "vitest";
import { formatWrongOutput, translatePythonError } from "./errors";

describe("translatePythonError", () => {
  it("translates SyntaxError with line", () => {
    const t = translatePythonError(
      'File "<exec>", line 2\n  print(\nSyntaxError: unexpected EOF while parsing',
    );
    expect(t.title).toBe("Синтаксична помилка");
    expect(t.line).toBe(2);
    expect(t.body).toContain("рядок 2");
    expect(t.body).toMatch(/unexpected EOF|Синтаксична/);
  });

  it("translates NameError", () => {
    const t = translatePythonError("NameError: name 'foo' is not defined");
    expect(t.title).toBe("Невідоме імʼя");
    expect(t.body).toContain("foo");
    expect(t.body).toContain("Якщо це твоя функція");
    expect(t.body).toContain("def foo");
  });

  it("translates TypeError", () => {
    const t = translatePythonError(
      'TypeError: can only concatenate str (not "int") to str',
    );
    expect(t.title).toBe("Помилка типу");
  });

  it("translates ValueError", () => {
    const t = translatePythonError("ValueError: invalid literal for int()");
    expect(t.title).toBe("Неправильне значення");
  });

  it("translates ZeroDivisionError", () => {
    const t = translatePythonError("ZeroDivisionError: division by zero");
    expect(t.title).toBe("Ділення на нуль");
  });

  it("translates IndentationError", () => {
    const t = translatePythonError(
      'File "<exec>", line 3\n    print(1)\nIndentationError: unexpected indent',
    );
    expect(t.title).toBe("Помилка відступів");
    expect(t.line).toBe(3);
  });

  it("translates AssertionError", () => {
    const t = translatePythonError("AssertionError: ");
    expect(t.title).toBe("Перевірка не пройшла");
  });

  it("unwraps Pyodide PythonError wrapper", () => {
    const t = translatePythonError(
      'PythonError: Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\nAssertionError: ',
    );
    expect(t.title).toBe("Перевірка не пройшла");
    expect(t.line).toBe(3);
  });


  it("uses preferred errorType when message is thin", () => {
    const t = translatePythonError("PythonError", {
      errorType: "AssertionError",
      line: 2,
    });
    expect(t.title).toBe("Перевірка не пройшла");
    expect(t.body).toContain("рядок 2");
  });

  it("handles timeout", () => {
    const t = translatePythonError("anything", { timedOut: true });
    expect(t.title).toBe("Час вичерпано");
    expect(t.body).toContain("5 секунд");
  });
});

describe("formatWrongOutput", () => {
  it("shows очікувалось / отримано", () => {
    const s = formatWrongOutput("Привіт", "Hello");
    expect(s).toContain("Очікувалось:");
    expect(s).toContain("Отримано:");
    expect(s).toContain("Привіт");
    expect(s).toContain("Hello");
  });
});
