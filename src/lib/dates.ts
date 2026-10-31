import { differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function localDateString(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function localDayBounds(date: string, timezone: string) {
  const start = fromZonedTime(`${date}T00:00:00.000`, timezone);
  const end = fromZonedTime(`${date}T23:59:59.999`, timezone);
  return { start, end };
}

export function addDaysToDateString(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function diffCalendarDays(later: string, earlier: string): number {
  return differenceInCalendarDays(
    new Date(`${later}T12:00:00.000Z`),
    new Date(`${earlier}T12:00:00.000Z`)
  );
}

export function formatShortDate(iso: string | Date, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "MMM d");
}

export function formatLongDate(iso: string | Date, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "EEEE, MMMM d");
}

export function formatDateHeading(date: string): string {
  return formatInTimeZone(new Date(`${date}T12:00:00.000Z`), "UTC", "MMM d");
}

export function formatFullDate(date: string): string {
  return formatInTimeZone(new Date(`${date}T12:00:00.000Z`), "UTC", "EEEE, MMMM d");
}

export function formatWeekday(date: string): string {
  return formatInTimeZone(new Date(`${date}T12:00:00.000Z`), "UTC", "EEE");
}

export function formatDayNumber(date: string): string {
  return formatInTimeZone(new Date(`${date}T12:00:00.000Z`), "UTC", "d");
}

export function dueLabel(dueAt: string | null, today: string, timezone: string): string {
  if (!dueAt) return "Not scheduled";
  const dueDate = localDateString(new Date(dueAt), timezone);
  const days = diffCalendarDays(today, dueDate);
  if (days > 0) return `Overdue ${days}d`;
  if (days === 0) return "Due today";
  if (days === -1) return "Due tomorrow";
  return `Due in ${Math.abs(days)}d`;
}

export function timeUntil(iso: string, now: Date): string {
  const diff = new Date(iso).getTime() - now.getTime();
  if (diff <= 0) return "now";
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  return `${hours}h`;
}

export function startOfWeekSunday(date: string): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value.toISOString().slice(0, 10);
}
