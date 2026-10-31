"use client";

import { useTransition } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth-actions";
import { cn } from "@/lib/utils";

export function SignOutButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
        })
      }
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50",
        compact
          ? "h-8 w-8 border border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
          : "px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:bg-paper-deep/60 hover:text-ink",
        className
      )}
      aria-label="Sign out"
    >
      {pending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      {compact ? null : "Sign out"}
    </button>
  );
}
