import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowDown, Check, Layers, Sparkles, Target } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding-form";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";

const PROOF = [
  { value: "146", label: "LeetCode problems from Striver’s SDE sheet" },
  { value: "306", label: "company-tagged extras across 17 topics" },
  { value: "SM-2", label: "spaced repetition, tuned for interviews" },
];

export default async function OnboardingPage() {
  await connection();
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (settings.onboardingComplete) redirect("/");

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-lime/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-surface/90 blur-3xl" />

      <div className="absolute right-5 top-5 z-10 flex items-center gap-2 text-[10px] font-medium text-faint">
        <span className="hidden max-w-[14rem] truncate sm:inline">{user.email}</span>
        <SignOutButton compact />
      </div>

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1280px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-12">
        <section className="animate-rise">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-[1.05rem] bg-ink font-serif text-2xl text-lime shadow-sm">
              L
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-lime" />
            </span>
            <span className="font-serif text-[1.65rem] leading-none tracking-tight">LeetSuggest</span>
          </div>

          <p className="mt-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            <Sparkles className="h-3.5 w-3.5 text-lime-deep" />
            Interview prep, without the spreadsheet
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-[clamp(3.2rem,7.5vw,5.8rem)] leading-[0.87] tracking-tight text-ink">
            Study less <span className="italic text-lime-deep">randomly</span>.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
            A daily set of LeetCode questions that remembers what you’ve solved, balances what
            you’ve neglected, and brings questions back right before you forget them.
          </p>

          <div className="mt-8 grid max-w-lg gap-2 sm:grid-cols-3">
            {PROOF.map((item) => (
              <div key={item.value} className="rounded-2xl border border-line/80 bg-surface/55 p-3.5">
                <p className="font-serif text-2xl leading-none">{item.value}</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 max-w-lg space-y-3">
            {[
              {
                icon: Target,
                title: "Reviews come first",
                text: "Due cards fill the plan before any new question.",
              },
              {
                icon: Layers,
                title: "Topics stay balanced",
                text: "Weights follow interview frequency, with a weekly coverage floor.",
              },
              {
                icon: Check,
                title: "You rate, it remembers",
                text: "Again, Hard, Good, or Easy updates the next appearance.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-line bg-surface text-lime-deep">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-9 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint lg:flex">
            <ArrowDown className="h-3.5 w-3.5" />
            Set your rhythm on the right
          </p>
        </section>

        <section className="animate-rise lg:pl-4" style={{ animationDelay: "120ms" }}>
          <OnboardingForm settings={settings} />
        </section>
      </div>
    </div>
  );
}
