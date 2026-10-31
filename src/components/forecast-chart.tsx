import type { ForecastDay } from "@/lib/types";
import { formatDateHeading } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ForecastChart({ forecast }: { forecast: ForecastDay[] }) {
  const max = Math.max(1, ...forecast.map((day) => day.count));
  const total = forecast.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Next 14 days</p>
          <h2 className="mt-1 font-serif text-2xl leading-none">Review forecast</h2>
        </div>
        <span className="pill bg-paper-deep text-muted">{total} due</span>
      </div>

      <div className="mt-5 flex h-40 items-end gap-1 sm:gap-1.5">
        {forecast.map((day) => (
          <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span
              className={cn(
                "text-[9px] font-bold tabular-nums",
                day.count > 0 ? "text-muted" : "text-faint/50"
              )}
            >
              {day.count}
            </span>
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-300",
                day.isToday ? "bg-lime-deep" : day.count > 0 ? "bg-blue/45" : "bg-paper-deep"
              )}
              style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }}
              title={`${formatDateHeading(day.date)} · ${day.count} due`}
            />
            <span
              className={cn(
                "truncate text-[8px] font-semibold uppercase tracking-[0.05em]",
                day.isToday ? "text-ink" : "text-faint"
              )}
            >
              {day.isToday ? "Today" : day.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-faint">
        Reviews already scheduled. New questions are added on top when each day arrives.
      </p>
    </section>
  );
}
