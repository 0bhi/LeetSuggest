import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function formatInterval(days: number) {
  if (!Number.isFinite(days) || days <= 0) return "now";
  const minutes = days * 24 * 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  if (days < 30) return `${round(days)}d`;
  if (days < 365) return `${round(days / 30)}mo`;
  return `${round(days / 365)}y`;
}

export function plural(count: number, singular: string, pluralForm?: string) {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
