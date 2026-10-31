import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  lime: "bg-lime-soft text-lime-deep",
  blue: "bg-blue-soft text-blue",
  amber: "bg-amber-soft text-amber",
  coral: "bg-coral-soft text-coral",
  paper: "bg-paper-deep text-ink",
} as const;

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "paper",
  className,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-[1.35rem] border border-line bg-surface p-3.5", className)}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", TONES[tone])}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-0.5 truncate font-serif text-2xl leading-none text-ink">{value}</p>
        {detail ? <p className="mt-1 truncate text-[11px] text-muted">{detail}</p> : null}
      </div>
    </div>
  );
}
