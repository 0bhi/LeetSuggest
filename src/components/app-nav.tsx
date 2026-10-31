"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  LibraryBig,
  Settings2,
  Sparkles,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/sheet", label: "Sheet", icon: LibraryBig },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span
        className={cn(
          "relative grid shrink-0 place-items-center rounded-[1.05rem] bg-ink font-serif text-lime shadow-sm transition group-hover:-rotate-3",
          compact ? "h-9 w-9 text-lg" : "h-11 w-11 text-2xl"
        )}
      >
        L
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-lime" />
      </span>
      <span className={cn("font-serif leading-none tracking-tight", compact ? "text-2xl" : "text-[1.65rem]")}>
        LeetSuggest
      </span>
    </Link>
  );
}

export function SidebarNav({ user }: { user: AppUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[258px] shrink-0 flex-col border-r border-line/80 px-5 py-7 lg:flex">
      <div className="px-2">
        <Brand />
        <p className="mt-3 pl-[3.25rem] text-xs font-medium text-muted">A calmer way to grind.</p>
      </div>

      <nav className="mt-11 flex flex-col gap-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition",
                active
                  ? "bg-lime text-ink shadow-sm"
                  : "text-muted hover:bg-paper-deep/70 hover:text-ink"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition",
                  active ? "text-ink" : "text-faint group-hover:text-ink"
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {item.label}
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ink/70" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[1.4rem] border border-lime-deep/20 bg-lime-soft/55 p-4">
        <div className="flex items-center gap-2 text-ink">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-[0.13em]">Daily rhythm</p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Reviews come first. New questions fill the rest, weighted by interview frequency.
        </p>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-line bg-surface/70 p-3.5">
        <p className="truncate text-xs font-semibold text-ink">{user.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-faint">{user.email}</p>
        <SignOutButton className="mt-2 -ml-1" />
      </div>
    </aside>
  );
}

export function MobileNav({ user }: { user: AppUser }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/80 bg-paper/88 px-5 py-3 backdrop-blur-md lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-2">
          <span className="pill max-w-[9rem] truncate bg-surface/80">{user.name}</span>
          <SignOutButton compact />
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_-25px_rgba(27,33,24,0.45)] backdrop-blur-md lg:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition",
                  active ? "bg-lime/80 text-ink" : "text-muted hover:bg-paper-deep/60"
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
