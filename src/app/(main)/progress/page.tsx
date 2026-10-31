import { Brain, CalendarDays, Flame, RotateCcw, Target } from "lucide-react";
import { ForecastChart } from "@/components/forecast-chart";
import { Heatmap } from "@/components/heatmap";
import { ProgressRing } from "@/components/progress-ring";
import { RatingBadge } from "@/components/rating-badge";
import { StatCard } from "@/components/stat-card";
import { TopicDot } from "@/components/topic-dot";
import { TOPIC_MAP } from "@/data/topics";
import { formatShortDate } from "@/lib/dates";
import { requireUser } from "@/lib/auth";
import { getProgressData, getSettings } from "@/lib/db";
import { percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DIFFICULTY_META = [
  { key: "Easy", label: "Easy", bar: "bg-lime-deep" },
  { key: "Medium", label: "Medium", bar: "bg-amber" },
  { key: "Hard", label: "Hard", bar: "bg-coral" },
] as const;

export default async function ProgressPage() {
  const user = await requireUser();
  const [progress, settings] = await Promise.all([
    getProgressData(user.id),
    getSettings(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header>
        <p className="eyebrow">Your history</p>
        <h1 className="mt-2 font-serif text-[clamp(2.8rem,6vw,4.2rem)] leading-[0.92] tracking-tight">
          Small reviews, <span className="italic text-lime-deep">compounding</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Every rating feeds the schedule. The goal isn&apos;t a perfect streak; it&apos;s a memory
          that survives the interview.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${progress.streak}d`}
          detail={progress.streak === 1 ? "one day in a row" : "days in a row"}
          icon={Flame}
          tone="amber"
        />
        <StatCard
          label="Reviews logged"
          value={progress.reviewsTotal}
          detail={`${progress.dueToday} due today · ${progress.backlog} backlog`}
          icon={RotateCcw}
          tone="blue"
        />
        <StatCard
          label="Recall rate"
          value={progress.retention === null ? "—" : `${progress.retention}%`}
          detail={progress.retention === null ? "rate a few reviews first" : "Good or Easy ratings"}
          icon={Brain}
          tone="lime"
        />
        <StatCard
          label="Active days"
          value={progress.activeDays}
          detail="days with at least one review"
          icon={CalendarDays}
          tone="paper"
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Heatmap days={progress.heatmap} />
          <ForecastChart forecast={progress.forecast} />

          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Coverage</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">Topic mastery</h2>
              </div>
              <span className="pill bg-paper-deep text-muted">17 topics</span>
            </div>

            <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
              {progress.topics.map((topic) => {
                const meta = TOPIC_MAP[topic.topic];
                const pct = percent(topic.completed, topic.total);
                return (
                  <div key={topic.topic}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink">
                        <TopicDot topic={topic.topic} />
                        <span className="truncate">{meta?.name ?? topic.topic}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted">
                        {topic.completed}/{topic.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: meta?.color ?? "var(--color-lime-deep)" }}
                      />
                    </div>
                    <p className="mt-1 text-[9px] font-medium text-faint">
                      {topic.weeklyCount}/{topic.weeklyTarget} this week · {topic.weightPct}% weight
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">The sheet</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">Completion</h2>
              </div>
              <Target className="h-5 w-5 text-lime-deep" />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <ProgressRing
                value={progress.sheetCompleted}
                total={progress.sheetTotal}
                size={112}
                label="Striver sheet"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Free problems</p>
                  <p className="mt-0.5 font-serif text-xl leading-none">
                    {progress.sheetFreeCompleted}
                    <span className="text-xs text-muted">/{progress.sheetFreeTotal}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Company extras</p>
                  <p className="mt-0.5 font-serif text-xl leading-none">
                    {progress.extrasAttempted}
                    <span className="text-xs text-muted">/{progress.extrasTotal}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full rounded-full bg-lime-deep"
                style={{ width: `${percent(progress.sheetFreeCompleted, progress.sheetFreeTotal)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-faint">
              A card is created the first time you rate a question.
            </p>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Mix</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">Difficulty</h2>
              </div>
              <span className="pill bg-paper-deep text-muted">Sheet</span>
            </div>
            <div className="mt-4 space-y-3.5">
              {DIFFICULTY_META.map((item) => {
                const stats = progress.difficulty[item.key];
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-ink">{item.label}</span>
                      <span className="tabular-nums text-muted">
                        {stats.completed}/{stats.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                      <div
                        className={`h-full rounded-full ${item.bar}`}
                        style={{ width: `${percent(stats.completed, stats.total)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Latest</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">Recent reviews</h2>
              </div>
              <span className="pill bg-paper-deep text-muted">{progress.reviewsTotal}</span>
            </div>

            {progress.recentReviews.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {progress.recentReviews.map((review) => (
                  <li key={`${review.slug}-${review.reviewedAt}`} className="flex items-start gap-2.5">
                    <TopicDot topic={review.topic} className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold leading-snug text-ink">{review.title}</p>
                      <p className="mt-0.5 text-[9px] font-medium text-faint">
                        {formatShortDate(review.reviewedAt, settings.timezone)}
                      </p>
                    </div>
                    <RatingBadge rating={review.rating} className="shrink-0 px-2 py-0.5 text-[8px]" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-paper/60 px-3 py-4 text-center text-[11px] leading-relaxed text-muted">
                No reviews yet. Rate your first question and the history starts here.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
