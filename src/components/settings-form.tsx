"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { saveSettingsAction } from "@/app/actions";
import { DEFAULT_WEIGHTS, TOPICS } from "@/data/topics";
import type { ActionResult } from "@/lib/action-types";
import type { DailyGoal, Settings, TopicId } from "@/lib/types";
import { cn, percent } from "@/lib/utils";

const GOALS: { value: DailyGoal; label: string; hint: string }[] = [
  { value: 3, label: "Light", hint: "3/day" },
  { value: 4, label: "Balanced", hint: "4/day" },
  { value: 5, label: "Ambitious", hint: "5/day" },
];

function ToggleRow({
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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line bg-paper/45 px-4 py-3 transition hover:border-line-strong">
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

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveSettingsAction,
    null
  );
  const [goal, setGoal] = useState<DailyGoal>(settings.dailyGoal);
  const [extras, setExtras] = useState(settings.extrasRate);
  const [coverage, setCoverage] = useState(settings.coverageFloor);
  const [premium, setPremium] = useState(settings.includePremium);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [weights, setWeights] = useState<Record<TopicId, number>>({ ...settings.weights });

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);

  function setWeight(topic: TopicId, value: number) {
    setWeights((current) => ({ ...current, [topic]: value }));
  }

  return (
    <form action={formAction} className="space-y-5">
      <section className="card-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Daily rhythm</p>
            <h2 className="mt-1 font-serif text-3xl leading-none">Workload</h2>
          </div>
          <span className="pill bg-lime-soft text-lime-deep">{goal} / day</span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-ink">Daily question goal</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
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
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="extrasRate" className="text-xs font-bold text-ink">
              Company extras rate
            </label>
            <span className="pill bg-blue-soft text-blue">{extras}%</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Chance that a new question is a company extra instead of a sheet question.
          </p>
          <input
            id="extrasRate"
            name="extrasRate"
            type="range"
            min={0}
            max={60}
            step={5}
            value={extras}
            onChange={(event) => setExtras(Number(event.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-deep accent-[var(--color-lime-deep)]"
          />
          <div className="mt-1 flex justify-between text-[9px] font-semibold text-faint">
            <span>Sheet only</span>
            <span>Balanced</span>
            <span>Stretch</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <ToggleRow
            name="coverageFloor"
            checked={coverage}
            onChange={setCoverage}
            title="Weekly coverage floor"
            description="Nudge at least one question from every topic into each week."
          />
          <ToggleRow
            name="includePremium"
            checked={premium}
            onChange={setPremium}
            title="Include premium questions"
            description="Add LeetCode Premium problems to the eligible pool."
          />
        </div>
      </section>

      <section className="card-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Clock</p>
            <h2 className="mt-1 font-serif text-3xl leading-none">Timezone</h2>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Defines the calendar day for plans, streaks, and due reviews. Use an IANA name.
        </p>
        <input
          name="timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="input mt-3"
          placeholder="Asia/Kolkata"
          autoComplete="off"
          spellCheck={false}
        />
      </section>

      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Balance</p>
            <h2 className="mt-1 font-serif text-3xl leading-none">Topic weights</h2>
          </div>
          <button
            type="button"
            onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
            className="btn btn-ghost px-3 py-1.5 text-[10px]"
          >
            <RotateCcw className="h-3 w-3" /> Reset to defaults
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Higher weight means more new questions from that topic. Values are relative; the planner
          normalizes them into weekly shares.
        </p>

        <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {TOPICS.map((topic) => {
            const value = weights[topic.id] ?? 0;
            const share = totalWeight > 0 ? percent(value, totalWeight) : 0;
            return (
              <div key={topic.id}>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`weight.${topic.id}`} className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: topic.color }}
                    />
                    <span className="truncate">{topic.name}</span>
                  </label>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted">
                    {value.toFixed(1)} · {share}%
                  </span>
                </div>
                <input
                  id={`weight.${topic.id}`}
                  name={`weight.${topic.id}`}
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={value}
                  onChange={(event) => setWeight(topic.id, Number(event.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-deep"
                  style={{ accentColor: topic.color }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-[76px] z-20 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg shadow-ink/5 backdrop-blur sm:bottom-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px]">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-faint" />
          {state?.error ? (
            <span className="truncate font-medium text-coral" role="alert">
              {state.error}
            </span>
          ) : state?.ok ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-lime-deep">
              <Check className="h-3.5 w-3.5" /> {state.message ?? "Saved."}
            </span>
          ) : (
            <span className="text-muted">Changes rebuild today&apos;s pending plan.</span>
          )}
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary shrink-0 px-4 py-2.5 text-xs">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
