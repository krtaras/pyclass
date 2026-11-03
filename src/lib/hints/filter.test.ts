import { describe, expect, it } from "vitest";
import { looksLikeSolutionCode } from "./filter";

describe("looksLikeSolutionCode", () => {
  it("allows short Ukrainian prose", () => {
    expect(
      looksLikeSolutionCode(
        "Перевір, чи змінна greeting має потрібне значення. Що виводить print?",
      ),
    ).toBe(false);
  });

  it("rejects fenced code blocks", () => {
    expect(
      looksLikeSolutionCode("Ось так:\n```python\nprint(1)\n```"),
    ).toBe(true);
  });

  it("rejects multiple python-looking lines", () => {
    expect(
      looksLikeSolutionCode("greeting = 'Привіт'\nprint(greeting)"),
    ).toBe(true);
  });

  it("allows a single conceptual mention without code lines", () => {
    expect(
      looksLikeSolutionCode(
        "Згадай цикл for: він повторює тіло для кожного елемента range.",
      ),
    ).toBe(false);
  });
});
