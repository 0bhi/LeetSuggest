import { Check } from "lucide-react";
import { ratingLabel } from "@/lib/planner";
import type { Rating } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<Rating, string> = {
  1: "bg-coral-soft text-coral",
  2: "bg-amber-soft text-amber",
  3: "bg-lime-soft text-lime-deep",
  4: "bg-blue-soft text-blue",
};

export function RatingBadge({
  rating,
  done = false,
  className,
}: {
  rating: Rating | null;
  done?: boolean;
  className?: string;
}) {
  if (!rating) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em]",
        STYLES[rating],
        className
      )}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
      {ratingLabel(rating)}
    </span>
  );
}
