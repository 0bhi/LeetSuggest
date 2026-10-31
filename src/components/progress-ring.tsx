import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  total,
  size = 120,
  label,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, value / total) : 0;
  const dash = circumference * progress;

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} of ${total}${label ? ` ${label}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-paper-deep)"
          strokeWidth="7"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-lime-deep)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-[2rem] leading-none tracking-tight text-ink">
          {value}
          <span className="text-base text-muted">/{total}</span>
        </div>
        {label ? (
          <div className="mt-1 max-w-[80%] text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
}
