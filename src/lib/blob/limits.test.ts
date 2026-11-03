import { describe, expect, it } from "vitest";
import { MAX_LESSON_VIDEO_BYTES } from "./limits";

describe("MAX_LESSON_VIDEO_BYTES", () => {
  it("is about 50 MB", () => {
    expect(MAX_LESSON_VIDEO_BYTES).toBe(50 * 1024 * 1024);
  });
});
