import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Flame,
  Info,
  LibraryBig,
  Sparkles,
  Target,
} from "lucide-react";
import { BacklogBanner } from "@/components/backlog-banner";
import { PlanItemCard } from "@/components/plan-item-card";
import { ProgressRing } from "@/components/progress-ring";
import { RatingBadge } from "@/components/rating-badge";
import { StatCard } from "@/components/stat-card";
import { WeeklyBalance } from "@/components/weekly-balance";
import { requireUser } from "@/lib/auth";
import { getTodayData } from "@/lib/db";
import { formatFullDate } from "@/lib/dates";
import type { PlanItemView } from "@/lib/types";
import { percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function DoneRow({ item }: { item: PlanItemView }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface/55 px-3.5 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime-soft text-lime-deep">
        <Check className="h-3.5 w-3.5" strokeWidth={2.7} />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={item.problem.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[13px] font-semibold text-ink/75 hover:text-ink hover:underline"
        >
          {item.problem.title}
        </Link>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-faint">
          {item.kind} · {item.problem.topic.replaceAll("-", " ")}
        </p>
      </div>
      <RatingBadge rating={item.rating} />
    </div>
  );
}

export default async function TodayPage() {
  const user = await requireUser();
  const data = await getTodayData(user.id);
  const pending = data.items.filter((item) => item.status === "pending");
  const available = pending.filter((item) => item.isAvailable);
  const waiting = pending.filter((item) => !item.isAvailable);
  const done = data.items.filter((item) => item.status === "done");
  const primaryId = available[0]?.id;
  const goalMet = data.doneCount >= data.goal;
  const sheetPct = percent(data.sheetCompleted, data.sheetTotal);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            <p className="eyebrow">{formatFullDate(data.date)}</p>
          </div>
          <h1 className="mt-2 font-serif text-[clamp(2.8rem,7vw,4.6rem)] leading-[0.9] tracking-tight text-ink">
            Today&apos;s <span className="italic text-lime-deep">plan</span>.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Reviews first, then the highest-leverage new questions. Keep the streak alive, not your
            anxiety.
          </p>
        </div>

        <div className="card-surface flex shrink-0 items-center gap-4 p-4 pr-5">
          <ProgressRing value={data.doneCount} total={data.goal} size={104} label="Daily goal" />
          <div className="max-w-[8.5rem]">
            <p className="eyebrow">Status</p>
            <p className="mt-1 font-serif text-2xl leading-none">
              {goalMet ? "Goal met." : data.doneCount === 0 ? "Fresh slate." : "In motion."}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {pending.length > 0
                ? `${pending.length} ${pending.length === 1 ? "question" : "questions"} still on deck.`
                : "Nothing left on today’s list."}
            </p>
            {data.bonusCount > 0 ? (
              <span className="mt-2 inline-flex rounded-full bg-lime-soft px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-lime-deep">
                +{data.bonusCount} bonus
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          label="Streak"
          value={`${data.streak} ${data.streak === 1 ? "day" : "days"}`}
          detail={data.streak > 0 ? "Keep it warm" : "Start today"}
          icon={Flame}
          tone="coral"
        />
        <StatCard
          label="Due today"
          value={data.allDueCount}
          detail={data.backlogCount > 0 ? `${data.backlogCount} in backlog` : "All within reach"}
          icon={CalendarClock}
          tone="blue"
        />
        <StatCard
          label="Sheet"
          value={`${data.sheetCompleted}/${data.sheetTotal}`}
          detail={`${sheetPct}% complete`}
          icon={LibraryBig}
          tone="lime"
        />
        <StatCard
          label="New pool"
          value={data.newRemaining}
          detail={`${data.freeSheetRemaining} free sheet left`}
          icon={Target}
          tone="amber"
        />
      </div>

      {data.backlogCount > 0 ? (
        <div className="mt-5">
          <BacklogBanner count={data.backlogCount} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        <div className="min-w-0">
          {data.note ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-line/70 bg-surface/55 px-3.5 py-3 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
              <p>{data.note}</p>
            </div>
          ) : null}

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Now</p>
                <h2 className="mt-1 font-serif text-3xl leading-none">On deck</h2>
              </div>
              <span className="pill">
                {available.length} ready · {waiting.length} later
              </span>
            </div>

            {available.length > 0 ? (
              <div className="space-y-3">
                {available.map((item, index) => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    primary={item.id === primaryId}
                  />
                ))}
              </div>
            ) : (
              <div className="card-surface flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-soft text-lime-deep">
                    <Check className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl leading-none">
                      {waiting.length > 0 ? "Nothing to rate right now." : "You’re all caught up."}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {waiting.length > 0
                        ? "A same-day review is waiting for its next appearance. It will unlock automatically."
                        : "Enjoy the quiet. Browse the sheet if you want a bonus question."}
                    </p>
                  </div>
                </div>
                <Link href="/sheet" className="btn btn-lime shrink-0">
                  Browse sheet <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>

          {waiting.length > 0 ? (
            <section className="mt-7">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Later today</p>
                  <h2 className="mt-1 font-serif text-2xl leading-none">Returning</h2>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
                  Unlocks automatically
                </span>
              </div>
              <div className="space-y-3">
                {waiting.map((item, index) => (
                  <PlanItemCard key={item.id} item={item} index={available.length + index} />
                ))}
              </div>
            </section>
          ) : null}

          {done.length > 0 ? (
            <section className="mt-7">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Done today
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {done.length} completed
                </span>
              </div>
              <div className="space-y-1.5">
                {done.map((item) => (
                  <DoneRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <WeeklyBalance weekly={data.weekly} />

          <section className="card-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Sheet progress</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">Striver 179</h2>
              </div>
              <ProgressRing value={data.sheetCompleted} total={data.sheetTotal} size={74} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-paper/80 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-faint">Free left</p>
                <p className="mt-1 font-serif text-xl leading-none">{data.freeSheetRemaining}</p>
              </div>
              <div className="rounded-xl bg-paper/80 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-faint">New pool</p>
                <p className="mt-1 font-serif text-xl leading-none">{data.newRemaining}</p>
              </div>
            </div>
            <Link
              href="/sheet"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-muted transition hover:text-ink"
            >
              Open the sheet <ArrowRight className="h-3 w-3" />
            </Link>
          </section>

          <section className="rounded-[1.6rem] border border-lime-deep/20 bg-lime-soft/45 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lime-deep" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-lime-deep">
                The rhythm
              </p>
            </div>
            <ol className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-lime-deep">01</span>
                Reviews clear the forgetting curve first.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-lime-deep">02</span>
                New picks close your weekly topic deficits.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-lime-deep">03</span>
                Rate honestly. Easy means you could teach it.
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
