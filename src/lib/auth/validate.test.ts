import { describe, expect, it } from "vitest";
import { validateLogin, validateSignup } from "./validate";

describe("validateSignup", () => {
  it("accepts a valid payload", () => {
    const r = validateSignup({
      name: "Оля",
      email: "ola@school.ua",
      password: "password1",
      inviteCode: "demo10a",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe("ola@school.ua");
      expect(r.data.inviteCode).toBe("DEMO10A");
    }
  });

  it("rejects short password and empty invite", () => {
    const r = validateSignup({
      name: "О",
      email: "bad",
      password: "short",
      inviteCode: "",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeTruthy();
      expect(r.errors.email).toBeTruthy();
      expect(r.errors.password).toBeTruthy();
      expect(r.errors.inviteCode).toBeTruthy();
    }
  });
});

describe("validateLogin", () => {
  it("requires email and password", () => {
    const r = validateLogin({ email: "", password: "" });
    expect(r.ok).toBe(false);
  });
});
