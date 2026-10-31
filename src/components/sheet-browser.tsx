"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleDashed,
  ExternalLink,
  ListFilter,
  LoaderCircle,
  Lock,
  Search,
} from "lucide-react";
import { markKnownAction } from "@/app/actions";
import { TOPICS } from "@/data/topics";
import { dueLabel, localDateString } from "@/lib/dates";
import type { Card, Difficulty, Problem, TopicId } from "@/lib/types";
import { cn, formatInterval } from "@/lib/utils";
import { TopicLabel } from "@/components/topic-dot";

type Tab = "sheet" | "extras" | "all";
type StatusFilter = "all" | "new" | "learning" | "review" | "known";
type StatusKey = Exclude<StatusFilter, "all">;

const STATUS_STYLES: Record<StatusKey, string> = {
  new: "bg-paper-deep text-muted",
  learning: "bg-amber-soft text-amber",
  review: "bg-blue-soft text-blue",
  known: "bg-lime-soft text-lime-deep",
};

const STATUS_LABELS: Record<StatusKey, string> = {
  new: "New",
  learning: "Learning",
  review: "Review",
  known: "Known",
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "text-lime-deep",
  Medium: "text-amber",
  Hard: "text-coral",
};

function statusFor(card: Card | undefined, known: boolean): StatusKey {
  if (known || card?.known) return "known";
  if (!card) return "new";
  if (card.state === "learning" || card.state === "relearning") return "learning";
  return "review";
}

export function SheetBrowser({
  problems,
  sheetSlugs,
  cards,
  timezone,
}: {
  problems: Problem[];
  sheetSlugs: string[];
  cards: Card[];
  timezone: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sheet");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [topic, setTopic] = useState<TopicId | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(48);
  const [knownOverrides, setKnownOverrides] = useState<Set<string>>(() => new Set());
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = localDateString(new Date(), timezone);

  const sheetSet = useMemo(() => new Set(sheetSlugs), [sheetSlugs]);
  const cardBySlug = useMemo(() => new Map(cards.map((card) => [card.slug, card])), [cards]);
  const knownSlugs = useMemo(() => {
    const slugs = new Set(cards.filter((card) => card.known).map((card) => card.slug));
    for (const slug of knownOverrides) slugs.add(slug);
    return slugs;
  }, [cards, knownOverrides]);

  const counts = useMemo(
    () => ({
      sheet: sheetSlugs.length,
      extras: problems.length - sheetSlugs.length,
      all: problems.length,
    }),
    [problems.length, sheetSlugs.length]
  );

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return problems
      .filter((problem) => {
        if (tab === "sheet" && !sheetSet.has(problem.slug)) return false;
        if (tab === "extras" && sheetSet.has(problem.slug)) return false;
        if (topic !== "all" && problem.topic !== topic) return false;
        if (difficulty !== "all" && problem.difficulty !== difficulty) return false;
        if (needle) {
          const haystack = `${problem.title} ${problem.slug} ${problem.pattern ?? ""} ${problem.companies.join(" ")}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        const card = cardBySlug.get(problem.slug);
        const status = statusFor(card, knownSlugs.has(problem.slug));
        if (statusFilter !== "all" && status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aSheet = sheetSet.has(a.slug);
        const bSheet = sheetSet.has(b.slug);
        if (aSheet !== bSheet) return aSheet ? -1 : 1;
        if (aSheet && bSheet) return (a.sheetOrder ?? 0) - (b.sheetOrder ?? 0);
        return (b.frequency ?? 0) - (a.frequency ?? 0);
      });
  }, [
    cardBySlug,
    deferredQuery,
    difficulty,
    knownSlugs,
    problems,
    sheetSet,
    statusFilter,
    tab,
    topic,
  ]);

  const shown = filtered.slice(0, visibleCount);

  function handleKnown(slug: string) {
    if (knownSlugs.has(slug) || isPending) return;
    setPendingSlug(slug);
    setError(null);
    startTransition(async () => {
      const result = await markKnownAction(slug);
      if (!result.ok) {
        setError(result.error ?? "Could not mark this question known.");
      } else {
        setKnownOverrides((current) => new Set(current).add(slug));
        router.refresh();
      }
      setPendingSlug(null);
    });
  }

  function resetFilters() {
    setQuery("");
    setTopic("all");
    setDifficulty("all");
    setStatusFilter("all");
    setTab("sheet");
    setVisibleCount(48);
  }

  return (
    <section className="card-surface overflow-hidden">
      <div className="border-b border-line/80 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full gap-1 rounded-full border border-line bg-paper-deep/40 p-1 xl:w-auto">
            {(
              [
                ["sheet", "Striver sheet", counts.sheet],
                ["extras", "Company extras", counts.extras],
                ["all", "All", counts.all],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setVisibleCount(48);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold transition xl:flex-none",
                  tab === value ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                {label}
                <span className={cn("tabular-nums text-[10px]", tab === value ? "text-paper/60" : "text-faint")}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(48);
              }}
              placeholder="Search title, pattern, company…"
              className="input h-10 rounded-full py-0 pl-10 text-xs"
              aria-label="Search questions"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-faint">
            <ListFilter className="h-3.5 w-3.5" />
            Filter
          </span>
          <select
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value as TopicId | "all");
              setVisibleCount(48);
            }}
            className="h-9 rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-ink outline-none focus:border-lime-deep"
            aria-label="Filter by topic"
          >
            <option value="all">All topics</option>
            {TOPICS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(event) => {
              setDifficulty(event.target.value as Difficulty | "all");
              setVisibleCount(48);
            }}
            className="h-9 rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-ink outline-none focus:border-lime-deep"
            aria-label="Filter by difficulty"
          >
            <option value="all">Any difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setVisibleCount(48);
            }}
            className="h-9 rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-ink outline-none focus:border-lime-deep"
            aria-label="Filter by status"
          >
            <option value="all">Any status</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="review">Review</option>
            <option value="known">Known</option>
          </select>
          <span className="ml-auto text-[10px] font-semibold tabular-nums text-faint">
            {filtered.length} {filtered.length === 1 ? "question" : "questions"}
          </span>
        </div>

        {error ? (
          <p className="mt-2 rounded-xl bg-coral-soft px-3 py-2 text-xs font-medium text-coral" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-line/60">
        {shown.length > 0 ? (
          shown.map((problem) => {
            const card = cardBySlug.get(problem.slug);
            const known = knownSlugs.has(problem.slug);
            const status = statusFor(card, known);
            const isRowPending = pendingSlug === problem.slug;
            const isSheet = sheetSet.has(problem.slug);
            return (
              <article
                key={problem.slug}
                className="group grid gap-2.5 px-3.5 py-3 transition hover:bg-paper/55 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3.5 sm:px-4"
              >
                <div className="flex items-center gap-2 sm:block">
                  {status === "known" ? (
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full bg-lime-soft text-lime-deep"
                      title="Known"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleKnown(problem.slug)}
                      disabled={isRowPending}
                      className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-faint transition hover:border-lime-deep hover:bg-lime-soft hover:text-lime-deep disabled:opacity-50"
                      title="Mark as known"
                      aria-label={`Mark ${problem.title} as known`}
                    >
                      {isRowPending ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CircleDashed className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint sm:hidden">
                    {isSheet ? `Sheet #${problem.sheetOrder}` : "Company extra"}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={problem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[13px] font-semibold text-ink decoration-lime-deep/40 decoration-2 underline-offset-4 hover:underline sm:text-sm"
                    >
                      {problem.title}
                    </Link>
                    {problem.isPremium ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber">
                        <Lock className="h-2.5 w-2.5" /> Premium
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-muted">
                    <TopicLabel topic={problem.topic} />
                    <span className="text-line-strong">·</span>
                    <span className={DIFFICULTY_STYLES[problem.difficulty]}>{problem.difficulty}</span>
                    {problem.pattern ? (
                      <>
                        <span className="text-line-strong">·</span>
                        <span className="truncate">{problem.pattern}</span>
                      </>
                    ) : null}
                    {problem.source === "company" && problem.companies.length > 0 ? (
                      <>
                        <span className="text-line-strong">·</span>
                        <span className="truncate">{problem.companies.slice(0, 3).join(" / ")}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.11em]",
                        STATUS_STYLES[status]
                      )}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                    {card && status !== "known" ? (
                      <span className="hidden text-[10px] tabular-nums text-faint md:inline">
                        {status === "review" && card.dueAt
                          ? dueLabel(card.dueAt, today, timezone)
                          : status === "learning"
                            ? "Same-day step"
                            : `Every ${formatInterval(card.intervalDays)}`}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={problem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-7 w-7 place-items-center rounded-full text-faint transition hover:bg-paper-deep hover:text-ink"
                    aria-label={`Open ${problem.title} on LeetCode`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-paper-deep text-muted">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <p className="font-serif text-2xl">No questions match.</p>
              <p className="mt-1 text-xs text-muted">Loosen a filter or clear the search.</p>
            </div>
            <button type="button" onClick={resetFilters} className="btn btn-ghost px-3.5 py-2 text-xs">
              Reset filters
            </button>
          </div>
        )}
      </div>

      {visibleCount < filtered.length ? (
        <div className="border-t border-line/70 p-4 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 60)}
            className="btn btn-ghost px-4 py-2 text-xs"
          >
            Show more <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
