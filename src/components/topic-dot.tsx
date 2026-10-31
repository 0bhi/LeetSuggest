import { TOPIC_MAP } from "@/data/topics";
import type { TopicId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopicDot({
  topic,
  className,
}: {
  topic: TopicId;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: TOPIC_MAP[topic]?.color ?? "#777" }}
      aria-hidden
    />
  );
}

export function TopicLabel({
  topic,
  className,
}: {
  topic: TopicId;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <TopicDot topic={topic} />
      {TOPIC_MAP[topic]?.name ?? topic}
    </span>
  );
}
