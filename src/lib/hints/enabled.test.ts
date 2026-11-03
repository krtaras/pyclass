import { afterEach, describe, expect, it } from "vitest";
import { isHintsEnabled } from "./enabled";

describe("isHintsEnabled", () => {
  const prev = process.env.HINTS_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.HINTS_ENABLED;
    else process.env.HINTS_ENABLED = prev;
  });

  it("is off when unset", () => {
    delete process.env.HINTS_ENABLED;
    expect(isHintsEnabled()).toBe(false);
  });

  it("is off when false", () => {
    process.env.HINTS_ENABLED = "false";
    expect(isHintsEnabled()).toBe(false);
  });

  it("is on only for true", () => {
    process.env.HINTS_ENABLED = "true";
    expect(isHintsEnabled()).toBe(true);
  });
});
