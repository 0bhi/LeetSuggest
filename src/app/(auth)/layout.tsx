import { CheckCircle2, Layers, Sparkles, Target } from "lucide-react";

const PROOF = [
  {
    icon: Target,
    title: "Reviews come first",
    text: "Due questions fill your daily plan before any new material.",
  },
  {
    icon: Layers,
    title: "Topics stay balanced",
    text: "Weights follow interview frequency, with a weekly coverage floor.",
  },
  {
    icon: CheckCircle2,
    title: "It remembers for you",
    text: "Every rating schedules the next appearance with spaced repetition.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-lime/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-surface/90 blur-3xl" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1180px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-12">
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
          <h2 className="mt-3 max-w-xl font-serif text-[clamp(3.2rem,7.5vw,5.8rem)] leading-[0.87] tracking-tight text-ink">
            Study less <span className="italic text-lime-deep">randomly</span>.
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
            A daily set of LeetCode questions that remembers what you&apos;ve solved, balances what
            you&apos;ve neglected, and brings questions back right before you forget them.
          </p>

          <div className="mt-9 max-w-lg space-y-3">
            {PROOF.map((step) => {
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
        </section>

        <section className="animate-rise lg:pl-4" style={{ animationDelay: "120ms" }}>
          {children}
        </section>
      </div>
    </div>
  );
}
