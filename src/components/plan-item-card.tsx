import Link from "next/link";
import {
  ArrowUpRight,
  Building,
  Check,
  Clock3,
  Lock,
} from "lucide-react";
import type { PlanItemView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RatingBadge } from "@/components/rating-badge";
import { RatingBar, SameDayCountdown, SkipButton } from "@/components/rating-bar";
import { TopicLabel } from "@/components/topic-dot";

const DIFFICULTY_STYLES = {
  Easy: "bg-lime-soft text-lime-deep",
  Medium: "bg-amber-soft text-amber",
  Hard: "bg-coral-soft text-coral",
} as const;

export function PlanItemCard({
  item,
  index,
  primary = false,
}: {
  item: PlanItemView;
  index: number;
  primary?: boolean;
}) {
  const { problem } = item;
  const done = item.status === "done";
  const waiting = item.status === "pending" && !item.isAvailable;
  const companies = problem.companies.slice(0, 3);

  return (
    <article
      className={cn(
        "card-surface animate-rise relative overflow-hidden p-4 sm:p-5",
        primary && "ring-2 ring-lime/80",
        done && "bg-surface/65"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {primary ? <span className="absolute inset-y-0 left-0 w-1 bg-lime" /> : null}

      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-bold tabular-nums",
            done
              ? "border-lime-deep/20 bg-lime-soft text-lime-deep"
              : waiting
                ? "border-line bg-paper-deep text-muted"
                : "border-line bg-paper text-ink"
          )}
        >
          {done ? (
            <Check className="h-4 w-4" strokeWidth={2.6} />
          ) : waiting ? (
            <Clock3 className="h-4 w-4" strokeWidth={2} />
          ) : (
            String(index + 1).padStart(2, "0")
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                item.kind === "review"
                  ? "bg-blue-soft text-blue"
                  : "bg-lime-soft text-lime-deep"
              )}
            >
              {item.kind === "review" ? "Review" : "New"}
            </span>
            <TopicLabel topic={problem.topic} className="text-[11px] font-medium text-muted" />
            <span className="text-line-strong">·</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                DIFFICULTY_STYLES[problem.difficulty]
              )}
            >
              {problem.difficulty}
            </span>
            {problem.isPremium ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber">
                <Lock className="h-2.5 w-2.5" />
                Premium
              </span>
            ) : null}
            {problem.source === "company" ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-faint">
                <Building className="h-2.5 w-2.5" />
                Company
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={cn(
                  "font-serif text-[1.55rem] leading-[1.08] tracking-tight sm:text-[1.75rem]",
                  done ? "text-ink/65" : "text-ink"
                )}
              >
                <Link
                  href={problem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="decoration-lime-deep/40 decoration-2 underline-offset-4 hover:underline"
                >
                  {problem.title}
                </Link>
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.reason}</p>
              {companies.length > 0 ? (
                <p className="mt-1 text-[11px] font-medium text-faint">
                  Asked at {companies.join(" · ")}
                  {problem.companies.length > 3 ? ` +${problem.companies.length - 3}` : ""}
                </p>
              ) : problem.pattern ? (
                <p className="mt-1 text-[11px] font-medium text-faint">Pattern · {problem.pattern}</p>
              ) : null}
            </div>
            <Link
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-ink hover:text-ink sm:grid"
              aria-label={`Open ${problem.title} on LeetCode`}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-3.5">
            {done ? (
              <div className="flex flex-wrap items-center gap-2">
                <RatingBadge rating={item.rating} done />
                <span className="text-[11px] font-medium text-muted">Complete for today</span>
              </div>
            ) : waiting ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-paper/70 px-3 py-2.5 text-xs text-muted">
                <Clock3 className="h-3.5 w-3.5 text-faint" />
                {item.availableAfter ? (
                  <SameDayCountdown to={item.availableAfter} />
                ) : (
                  <span>Available later today</span>
                )}
                {item.rating ? (
                  <RatingBadge rating={item.rating} className="ml-auto" />
                ) : null}
              </div>
            ) : (
              <RatingBar
                slug={item.slug}
                intervals={item.nextIntervals}
                primary={primary}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
          {problem.topic.replaceAll("-", " ")}
        </span>
        <div className="flex items-center gap-3">
          <Link
            href={problem.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition hover:text-ink sm:hidden"
          >
            Solve <ArrowUpRight className="h-3 w-3" />
          </Link>
          {!done ? <SkipButton id={item.id} primary={primary} /> : null}
        </div>
      </div>
    </article>
  );
}
