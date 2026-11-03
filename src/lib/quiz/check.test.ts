import { describe, expect, it } from "vitest";
import { checkQuizAnswer } from "./check";

describe("checkQuizAnswer — single", () => {
  const q = {
    kind: "single" as const,
    correct: "Виводить текст на екран",
  };

  it("marks the correct option as correct", () => {
    const r = checkQuizAnswer(q, "Виводить текст на екран");
    expect(r.isCorrect).toBe(true);
    expect(r.correctOptions).toEqual(["Виводить текст на екран"]);
  });

  it("marks a wrong option as incorrect", () => {
    const r = checkQuizAnswer(q, "Запускає програму");
    expect(r.isCorrect).toBe(false);
  });
});

describe("checkQuizAnswer — multi", () => {
  const q = {
    kind: "multi" as const,
    correct: ["10 > 5", "10 == 10", "10 != 7"],
  };

  it("accepts an exact match regardless of order", () => {
    const r = checkQuizAnswer(q, ["10 != 7", "10 > 5", "10 == 10"]);
    expect(r.isCorrect).toBe(true);
  });

  it("rejects a partial selection", () => {
    const r = checkQuizAnswer(q, ["10 > 5", "10 == 10"]);
    expect(r.isCorrect).toBe(false);
  });

  it("rejects extras beyond the correct set", () => {
    const r = checkQuizAnswer(q, [
      "10 > 5",
      "10 == 10",
      "10 != 7",
      "10 < 3",
    ]);
    expect(r.isCorrect).toBe(false);
  });
});

describe("checkQuizAnswer — output", () => {
  const q = {
    kind: "output" as const,
    correct: "5",
  };

  it("accepts the correct printed value", () => {
    expect(checkQuizAnswer(q, "5").isCorrect).toBe(true);
  });

  it("rejects a wrong printed value", () => {
    expect(checkQuizAnswer(q, "23").isCorrect).toBe(false);
  });
});

describe("checkQuizAnswer — jsonb number coercion", () => {
  it("matches option \"5\" when correct was stored as number 5", () => {
    const q = { kind: "output" as const, correct: 5 as unknown as string };
    expect(checkQuizAnswer(q, "5").isCorrect).toBe(true);
  });
});
