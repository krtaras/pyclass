import { describe, expect, it } from "vitest";
import { computeUkrainianGrade, scoreFraction } from "./grade";

describe("scoreFraction", () => {
  it("returns 0 for empty totals", () => {
    expect(scoreFraction(0, 0)).toBe(0);
  });
  it("clamps to [0,1]", () => {
    expect(scoreFraction(2, 2)).toBe(1);
    expect(scoreFraction(1, 2)).toBe(0.5);
    expect(scoreFraction(3, 2)).toBe(1);
  });
});

describe("computeUkrainianGrade", () => {
  it("applies 60/40 weights on the 12-point scale", () => {
    // 0.5 exercise, 0.4 quiz → 0.6*0.5 + 0.4*0.4 = 0.46 → 12*0.46 = 5.52 → 6
    expect(computeUkrainianGrade(0.5, 0.4)).toBe(6);
  });

  it("gives 12 when both perfect", () => {
    expect(computeUkrainianGrade(1, 1)).toBe(12);
  });

  it("gives 0 when both empty/zero", () => {
    expect(computeUkrainianGrade(0, 0)).toBe(0);
  });

  it("weights exercises more than quizzes", () => {
    const exerciseHeavy = computeUkrainianGrade(1, 0); // 12 * 0.6 = 7.2 → 7
    const quizHeavy = computeUkrainianGrade(0, 1); // 12 * 0.4 = 4.8 → 5
    expect(exerciseHeavy).toBe(7);
    expect(quizHeavy).toBe(5);
    expect(exerciseHeavy).toBeGreaterThan(quizHeavy);
  });
});
