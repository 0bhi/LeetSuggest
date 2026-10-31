import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
  getUserBySessionTokenHash,
} from "@/lib/db";
import type { AppUser } from "@/lib/types";

const SESSION_COOKIE = "leetsuggest_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await createSession(hashToken(token), userId, expiresAt.toISOString());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionTokenHash(hashToken(token));
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await deleteSession(hashToken(token));
    } catch (error) {
      console.error("[auth] could not delete session", error);
    }
  }
  store.delete(SESSION_COOKIE);
}
