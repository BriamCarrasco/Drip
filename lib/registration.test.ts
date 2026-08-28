import { afterEach, describe, expect, it } from "vitest";
import { isRegistrationEnabled } from "@/lib/registration";

afterEach(() => {
  delete process.env.REGISTRATION_ENABLED;
});

describe("isRegistrationEnabled", () => {
  it("defaults to enabled when the variable is unset", () => {
    delete process.env.REGISTRATION_ENABLED;
    expect(isRegistrationEnabled()).toBe(true);
  });

  it("is disabled only for an explicit false", () => {
    process.env.REGISTRATION_ENABLED = "false";
    expect(isRegistrationEnabled()).toBe(false);
    process.env.REGISTRATION_ENABLED = "FALSE";
    expect(isRegistrationEnabled()).toBe(false);
  });

  it("stays enabled for any other value", () => {
    process.env.REGISTRATION_ENABLED = "true";
    expect(isRegistrationEnabled()).toBe(true);
    process.env.REGISTRATION_ENABLED = "1";
    expect(isRegistrationEnabled()).toBe(true);
  });
});
