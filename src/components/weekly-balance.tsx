import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TOPIC_MAP } from "@/data/topics";
import type { WeeklyTopicStat } from "@/lib/types";
import { TopicDot } from "@/components/topic-dot";

export function WeeklyBalance({ weekly }: { weekly: WeeklyTopicStat[] }) {
  const top = weekly
    .slice()
    .sort((a, b) => b.target - a.target || b.weightPct - a.weightPct)
    .slice(0, 6);

  return (
    <section className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Weekly balance</p>
          <h2 className="mt-1 font-serif text-2xl leading-none">Last 7 days</h2>
        </div>
        <span className="pill">Coverage</span>
      </div>

      <div className="mt-5 space-y-3.5">
        {top.map((item) => {
          const meta = TOPIC_MAP[item.topic];
          const progress =
            item.target > 0 ? Math.min(100, Math.round((item.count / item.target) * 100)) : 0;
          return (
            <div key={item.topic}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink-soft">
                  <TopicDot topic={item.topic} />
                  <span className="truncate">{meta.shortName}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {item.count}
                  <span className="text-faint"> / {Math.max(1, Math.round(item.target))}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: meta.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/progress"
        className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-muted transition hover:text-ink"
      >
        All topics <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
