"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers, LoaderCircle } from "lucide-react";
import { addBacklogReviewAction } from "@/app/actions";

export function BacklogBanner({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-[1.4rem] border border-amber/25 bg-amber-soft/45 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-soft text-amber">
          <Layers className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            {count} {count === 1 ? "review is" : "reviews are"} waiting behind today&apos;s cap.
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Keep the daily plan light, or pull one backlog review into today.
          </p>
          {error ? <p className="mt-1 text-xs font-medium text-coral">{error}</p> : null}
        </div>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await addBacklogReviewAction();
            if (!result.ok) {
              setError(result.error ?? "Could not add a backlog review.");
              return;
            }
            router.refresh();
          });
        }}
        className="btn btn-ghost shrink-0 self-start bg-surface/70 px-3.5 py-2 text-xs sm:self-center"
      >
        {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
        Add one
      </button>
    </div>
  );
}
