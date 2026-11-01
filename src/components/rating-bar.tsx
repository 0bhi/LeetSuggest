"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { rateQuestionAction, skipQuestionAction } from "@/app/actions";
import type { Rating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { timeUntil } from "@/lib/dates";

const RATINGS: { value: Rating; label: string; classes: string }[] = [
  { value: 1, label: "Again", classes: "border-coral/25 bg-coral-soft/80 text-coral hover:bg-coral hover:text-white" },
  { value: 2, label: "Hard", classes: "border-amber/25 bg-amber-soft/80 text-amber hover:bg-amber hover:text-white" },
  { value: 3, label: "Good", classes: "border-lime-deep/25 bg-lime-soft/80 text-lime-deep hover:bg-lime-deep hover:text-white" },
  { value: 4, label: "Easy", classes: "border-blue/25 bg-blue-soft/80 text-blue hover:bg-blue hover:text-white" },
];

export function RatingBar({
  slug,
  intervals,
  disabled = false,
  primary = false,
  onRated,
}: {
  slug: string;
  intervals: Record<Rating, string>;
  disabled?: boolean;
  primary?: boolean;
  onRated?: (rating: Rating) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Rating | null>(null);

  const rate = useCallback(
    (rating: Rating) => {
      if (disabled || isPending) return;
      setError(null);
      startTransition(async () => {
        const result = await rateQuestionAction(slug, rating);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(rating);
        onRated?.(rating);
        router.refresh();
      });
    },
    [disabled, isPending, onRated, router, slug, startTransition]
  );

  useEffect(() => {
    if (!primary || disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "1") rate(1);
      if (event.key === "2") rate(2);
      if (event.key === "3") rate(3);
      if (event.key === "4") rate(4);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, primary, rate]);

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {RATINGS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => rate(item.value)}
            disabled={disabled || isPending}
            className={cn(
              "group relative flex min-h-[3.15rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition duration-200 disabled:pointer-events-none disabled:opacity-50",
              item.classes
            )}
            aria-label={`Rate ${item.label}, next review in ${intervals[item.value]}`}
          >
            <span className="flex items-center gap-1 text-xs font-bold">
              {isPending && saved === item.value ? (
                <LoaderCircle className="h-3 w-3 animate-spin" />
              ) : null}
              {item.label}
            </span>
            <span className="text-[10px] font-medium opacity-75">{intervals[item.value]}</span>
            {primary ? (
              <span className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full border border-line bg-surface text-[8px] font-bold text-muted group-hover:grid">
                {item.value}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {primary ? (
        <p className="mt-2 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-faint sm:block">
          Press 1–4 to rate
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-medium text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SkipButton({ id, primary = false }: { id: string; primary?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const skip = useCallback(() => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await skipQuestionAction(id);
      if (!result.ok) {
        setError(result.error ?? "Could not skip.");
        return;
      }
      router.refresh();
    });
  }, [id, isPending, router, startTransition]);

  useEffect(() => {
    if (!primary) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [primary, skip]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={skip}
        className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint transition hover:text-coral disabled:opacity-50"
      >
        {isPending ? "Skipping…" : "Skip"}
      </button>
      {error ? <span className="max-w-28 text-right text-[10px] text-coral">{error}</span> : null}
    </div>
  );
}

export function SameDayCountdown({ to, prefix = "Back in" }: { to: string; prefix?: string }) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    refreshed.current = false;
    const tick = () => {
      const now = new Date();
      if (new Date(to).getTime() <= now.getTime()) {
        if (!refreshed.current) {
          refreshed.current = true;
          router.refresh();
        }
        return;
      }
      setLabel(timeUntil(to, now));
    };
    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, [router, to]);

  return (
    <span>
      {prefix} {label ?? "later today"}
    </span>
  );
}
