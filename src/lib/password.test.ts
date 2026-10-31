import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("produces a different hash for the same password", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");
    expect(first).not.toBe(second);
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "bcrypt:abc:def")).toBe(false);
    expect(await verifyPassword("password", "scrypt:abc:def")).toBe(false);
  });
});
