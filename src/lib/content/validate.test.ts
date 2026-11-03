import { describe, expect, it } from "vitest";
import {
  exerciseUpdateSchema,
  lessonUpdateSchema,
  quizUpdateSchema,
  resolveLessonVideo,
} from "./validate";

describe("exerciseUpdateSchema", () => {
  it("accepts io + assert tests", () => {
    const r = exerciseUpdateSchema.safeParse({
      prompt: "Зроби щось",
      starterCode: "x = 1\n",
      hintLimit: 3,
      tests: [
        { type: "io", input: "", output: "1", visible: true },
        { type: "assert", code: "assert x == 1", visible: false },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty tests", () => {
    const r = exerciseUpdateSchema.safeParse({
      prompt: "Зроби",
      starterCode: "",
      hintLimit: 1,
      tests: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("quizUpdateSchema", () => {
  it("requires exactly one correct for single", () => {
    const bad = quizUpdateSchema.safeParse({
      kind: "single",
      prompt: "Що?",
      options: ["а", "б"],
      correct: ["а", "б"],
      explanation: "",
    });
    expect(bad.success).toBe(false);

    const good = quizUpdateSchema.safeParse({
      kind: "single",
      prompt: "Що?",
      options: ["а", "б"],
      correct: "а",
      explanation: "тому що",
    });
    expect(good.success).toBe(true);
  });

  it("allows multiple correct for multi", () => {
    const r = quizUpdateSchema.safeParse({
      kind: "multi",
      prompt: "Які?",
      options: ["а", "б", "в"],
      correct: ["а", "в"],
      explanation: "",
    });
    expect(r.success).toBe(true);
  });

  it("requires code for output kind", () => {
    const r = quizUpdateSchema.safeParse({
      kind: "output",
      prompt: "Що виведе?",
      options: ["1", "2"],
      correct: "1",
      explanation: "",
      code: null,
    });
    expect(r.success).toBe(false);
  });

  it("requires at least 2 options", () => {
    const r = quizUpdateSchema.safeParse({
      kind: "single",
      prompt: "?",
      options: ["тільки"],
      correct: "тільки",
      explanation: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("lessonUpdateSchema + resolveLessonVideo", () => {
  it("accepts youtube url", () => {
    const r = lessonUpdateSchema.safeParse({
      title: "Урок",
      bodyMarkdown: "## Привіт",
      videoUrl: "https://www.youtube.com/watch?v=abc",
      videoKind: "youtube",
      blobUrl: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const v = resolveLessonVideo(r.data);
      expect(v.videoKind).toBe("youtube");
    }
  });
});
