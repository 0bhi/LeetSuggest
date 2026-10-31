"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Brain, Check, Layers, LoaderCircle, Target } from "lucide-react";
import { completeOnboardingAction } from "@/app/actions";
import type { ActionResult } from "@/lib/action-types";
import type { DailyGoal, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOALS: { value: DailyGoal; label: string; hint: string }[] = [
  { value: 3, label: "Light", hint: "3 questions" },
  { value: 4, label: "Balanced", hint: "4 questions" },
  { value: 5, label: "Ambitious", hint: "5 questions" },
];

const EXTRAS = [
  { value: 0, label: "Sheet only", hint: "No company extras" },
  { value: 20, label: "Occasional", hint: "~1 in 5 new" },
  { value: 40, label: "Stretch", hint: "~2 in 5 new" },
];

function Toggle({
  name,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line bg-paper/55 px-4 py-3.5 transition hover:border-line-strong">
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-lime-deep)]"
      />
    </label>
  );
}

export function OnboardingForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    completeOnboardingAction,
    null
  );
  const [goal, setGoal] = useState<DailyGoal>(settings.dailyGoal);
  const [extras, setExtras] = useState(settings.extrasRate);
  const [coverage, setCoverage] = useState(settings.coverageFloor);
  const [premium, setPremium] = useState(settings.includePremium);
  const timezoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && timezoneRef.current) timezoneRef.current.value = detected;
    } catch {
      // Keep the server default.
    }
  }, []);

  return (
    <form action={formAction} className="card-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Set your rhythm</p>
          <h2 className="mt-1 font-serif text-4xl leading-none tracking-tight">Your daily plan.</h2>
        </div>
        <span className="pill bg-lime-soft text-lime-deep">60 sec</span>
      </div>

      <div className="mt-7 space-y-6">
        <fieldset>
          <legend className="flex items-center gap-2 text-sm font-bold text-ink">
            <Target className="h-4 w-4 text-lime-deep" /> Daily question goal
          </legend>
          <p className="mt-1 text-[11px] text-muted">A realistic cap beats an heroic backlog.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {GOALS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGoal(item.value)}
                className={cn(
                  "rounded-2xl border px-2 py-3 text-center transition",
                  goal === item.value
                    ? "border-ink bg-ink text-paper shadow-sm"
                    : "border-line bg-paper/50 text-ink hover:border-line-strong"
                )}
              >
                <span className="block font-serif text-2xl leading-none">{item.value}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.13em] opacity-75">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <input type="hidden" name="dailyGoal" value={goal} />
        </fieldset>

        <fieldset>
          <legend className="flex items-center gap-2 text-sm font-bold text-ink">
            <Layers className="h-4 w-4 text-blue" /> Company extras
          </legend>
          <p className="mt-1 text-[11px] text-muted">
            Add lightly asked-in-interview questions after a topic is introduced.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {EXTRAS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setExtras(item.value)}
                className={cn(
                  "rounded-2xl border px-2 py-2.5 text-center transition",
                  extras === item.value
                    ? "border-blue bg-blue-soft/70 text-ink"
                    : "border-line bg-paper/50 text-muted hover:border-line-strong"
                )}
              >
                <span className="block text-xs font-bold">{item.label}</span>
                <span className="mt-0.5 block text-[9px] font-medium opacity-70">{item.hint}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="extrasRate" value={extras} />
        </fieldset>

        <div className="space-y-2">
          <Toggle
            name="coverageFloor"
            checked={coverage}
            onChange={setCoverage}
            title="Weekly coverage floor"
            description="Try to touch every DSA topic at least once a week."
          />
          <Toggle
            name="includePremium"
            checked={premium}
            onChange={setPremium}
            title="Include premium questions"
            description="Only turn this on if you have LeetCode Premium."
          />
        </div>

        <div>
          <label htmlFor="timezone" className="flex items-center gap-2 text-sm font-bold text-ink">
            <Brain className="h-4 w-4 text-amber" /> Timezone
          </label>
          <p className="mt-1 text-[11px] text-muted">
            Used to decide what “today” means and when reviews return.
          </p>
          <input
            ref={timezoneRef}
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
            className="input mt-2"
            placeholder="Asia/Kolkata"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {state?.error ? (
        <p className="mt-4 rounded-xl bg-coral-soft px-3 py-2.5 text-xs font-medium text-coral" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn btn-primary mt-6 w-full py-3.5">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {pending ? "Building your plan…" : "Build my plan"}
        {!pending ? <ArrowRight className="ml-auto h-4 w-4" /> : null}
      </button>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-faint">
        Your plan and progress are saved to your account.
      </p>
    </form>
  );
}
