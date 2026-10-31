import { Brain, Clock3, Layers, Sparkles, Target } from "lucide-react";
import { DangerZone } from "@/components/danger-zone";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

const REFERENCE = [
  {
    icon: Target,
    title: "Reviews come first",
    text: "Every due card that fits the daily goal is placed before new questions.",
  },
  {
    icon: Layers,
    title: "New questions are balanced",
    text: "Topic weights and the weekly coverage floor decide what gets introduced.",
  },
  {
    icon: Clock3,
    title: "Ratings set the next date",
    text: "Again returns in 10 minutes; Hard, Good, and Easy grow the interval.",
  },
  {
    icon: Brain,
    title: "The goal is recall",
    text: "Ease and lapses adapt the schedule so hard questions come back sooner.",
  },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header>
        <p className="eyebrow">Preferences</p>
        <h1 className="mt-2 font-serif text-[clamp(2.8rem,6vw,4.2rem)] leading-[0.92] tracking-tight">
          Tune the <span className="italic text-lime-deep">machine</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Adjust workload, topic balance, and the clock. Saving rebuilds today&apos;s pending plan
          without touching completed questions.
        </p>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SettingsForm settings={settings} />

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Quick reference</p>
                <h2 className="mt-1 font-serif text-2xl leading-none">How it decides</h2>
              </div>
              <Sparkles className="h-5 w-5 text-lime-deep" />
            </div>
            <div className="mt-4 space-y-3.5">
              {REFERENCE.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-paper/60 text-lime-deep">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl bg-paper/60 px-3 py-2.5 text-[10px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Keyboard:</span> press 1–4 to rate the active
              question, or S to skip it.
            </div>
          </section>

          <DangerZone />
        </aside>
      </div>
    </div>
  );
}
