import type { HeatmapDay } from "@/lib/types";
import { formatDateHeading } from "@/lib/dates";

function colorFor(count: number) {
  if (count <= 0) return "var(--color-paper-deep)";
  if (count === 1) return "#e0f5a5";
  if (count <= 3) return "#c9f36a";
  if (count <= 5) return "#a9d94a";
  return "#7b9a2d";
}

export function Heatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) return null;
  const first = days[0].date;
  const leading = new Date(`${first}T12:00:00.000Z`).getUTCDay();
  const cells: (HeatmapDay | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];

  return (
    <section className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Consistency</p>
          <h2 className="mt-1 font-serif text-2xl leading-none">Review heatmap</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">
          <span>Less</span>
          {[0, 1, 2, 4, 6].map((count) => (
            <span
              key={count}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: colorFor(count) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1 no-scrollbar">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={`Review activity over ${days.length} days`}
        >
          {cells.map((day, index) =>
            day ? (
              <span
                key={day.date}
                className="h-3 w-3 rounded-[3px] transition hover:ring-2 hover:ring-ink/30 sm:h-3.5 sm:w-3.5"
                style={{ backgroundColor: colorFor(day.count) }}
                title={`${formatDateHeading(day.date)} · ${day.count} review${day.count === 1 ? "" : "s"}`}
              />
            ) : (
              <span key={`pad-${index}`} className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] font-medium text-faint">
        <span>{formatDateHeading(days[0].date)}</span>
        <span>{formatDateHeading(days[days.length - 1].date)}</span>
      </div>
    </section>
  );
}
