"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionResult } from "@/lib/action-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function registerAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const name = field(formData, "name").trim();
  const email = normalizeEmail(field(formData, "email"));
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");

  if (name.length < 1 || name.length > 80) {
    return { ok: false, error: "Enter your name (up to 80 characters)." };
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8 || password.length > 200) {
    return { ok: false, error: "Use a password with at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "The passwords do not match." };
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, name, passwordHash);
    await startSession(user.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    console.error("[auth] registration failed", error);
    return { ok: false, error: "Could not create your account. Please try again." };
  }

  redirect("/onboarding");
}

export async function loginAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = normalizeEmail(field(formData, "email"));
  const password = field(formData, "password");

  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    return { ok: false, error: "Enter your email and password." };
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { ok: false, error: "Incorrect email or password." };
    }
    await startSession(user.id);
  } catch (error) {
    console.error("[auth] sign in failed", error);
    return { ok: false, error: "Could not sign you in. Please try again." };
  }

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
