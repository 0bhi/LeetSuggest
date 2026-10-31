"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { loginAction, registerAction } from "@/app/auth-actions";
import type { ActionResult } from "@/lib/action-types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isLogin ? loginAction : registerAction,
    null
  );
  const Icon = isLogin ? LogIn : UserPlus;

  return (
    <form action={formAction} className="card-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{isLogin ? "Welcome back" : "Create your account"}</p>
          <h1 className="mt-1 font-serif text-4xl leading-none tracking-tight">
            {isLogin ? "Sign in." : "Get started."}
          </h1>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-soft text-lime-deep">
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {isLogin
          ? "Your plan, streak, and review history are saved to your account."
          : "Progress is stored on your account, so you can continue from any device."}
      </p>

      <div className="mt-6 space-y-4">
        {isLogin ? null : (
          <div>
            <label htmlFor="name" className="text-xs font-bold text-ink">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              className="input mt-1.5"
              placeholder="Ada Lovelace"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-xs font-bold text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="input mt-1.5"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-bold text-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={200}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="input mt-1.5"
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
          />
        </div>

        {isLogin ? null : (
          <div>
            <label htmlFor="confirmPassword" className="text-xs font-bold text-ink">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              className="input mt-1.5"
              placeholder="Repeat your password"
            />
          </div>
        )}
      </div>

      {state?.error ? (
        <p className="mt-4 rounded-xl bg-coral-soft px-3 py-2.5 text-xs font-medium text-coral" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn btn-primary mt-6 w-full py-3.5">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {pending
          ? isLogin
            ? "Signing in…"
            : "Creating account…"
          : isLogin
            ? "Sign in"
            : "Create account"}
        {!pending ? <ArrowRight className="ml-auto h-4 w-4" /> : null}
      </button>

      <p className="mt-4 text-center text-[11px] text-muted">
        {isLogin ? "New here?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-semibold text-ink underline decoration-lime-deep/50 decoration-2 underline-offset-4 hover:decoration-lime-deep"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
