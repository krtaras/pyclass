import { describe, expect, it } from "vitest";
import { buildGroupCsv, escapeCsvCell } from "./csv";

describe("escapeCsvCell", () => {
  it("quotes commas and quotes", () => {
    expect(escapeCsvCell('а, "б"')).toBe('"а, ""б"""');
  });
});

describe("buildGroupCsv", () => {
  it("starts with UTF-8 BOM and includes Cyrillic headers", () => {
    const csv = buildGroupCsv([
      {
        name: "Оля",
        email: "ola@school.ua",
        lessonsCompleted: 1,
        lessonsTotal: 2,
        exerciseSolved: 1,
        exerciseTotal: 2,
        quizCorrect: 2,
        quizTotal: 5,
        hintsUsed: 3,
        grade: 6,
        lastActivity: "2026-11-03T10:00:00.000Z",
      },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Імʼя");
    expect(csv).toContain("Оля");
    expect(csv).toContain("Підказки");
    expect(csv).toContain(",3,");
    expect(csv).toContain("ola@school.ua");
    expect(csv).toContain(",6,");
  });
});
