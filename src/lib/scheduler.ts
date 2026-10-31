import type { CardState, Rating } from "@/lib/types";
import { formatInterval, round } from "@/lib/utils";

export interface SchedulerState {
  state: CardState;
  dueAt: string | null;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  learningStep: number;
}

export interface SchedulerOutcome extends SchedulerState {
  state: Exclude<CardState, "new">;
  intervalLabel: string;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const LEARNING_STEPS = [10 / 1440];
const RELEARNING_STEPS = [10 / 1440];
const GRADUATING_INTERVAL = 1;
const EASY_INTERVAL = 4;

export const NEW_CARD_STATE: SchedulerState = {
  state: "new",
  dueAt: null,
  intervalDays: 0,
  easeFactor: INITIAL_EASE,
  repetitions: 0,
  lapses: 0,
  learningStep: 0,
};

function dueAfter(now: Date, days: number) {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

function dueAfterMinutes(now: Date, minutes: number) {
  return new Date(now.getTime() + minutes * MINUTE_MS).toISOString();
}

function capInterval(days: number) {
  return round(Math.min(MAX_INTERVAL_DAYS, Math.max(0, days)), 2);
}

function outcome(
  now: Date,
  state: Exclude<CardState, "new">,
  dueAt: string,
  intervalDays: number,
  easeFactor: number,
  repetitions: number,
  lapses: number,
  learningStep: number
): SchedulerOutcome {
  const labelDays = Math.max(0, (new Date(dueAt).getTime() - now.getTime()) / DAY_MS);
  return {
    state,
    dueAt,
    intervalDays: capInterval(intervalDays),
    easeFactor: round(Math.max(MIN_EASE, easeFactor), 2),
    repetitions,
    lapses,
    learningStep,
    intervalLabel: formatInterval(labelDays),
  };
}

export function rateCard(
  current: SchedulerState,
  rating: Rating,
  now: Date = new Date()
): SchedulerOutcome {
  const ease = current.easeFactor || INITIAL_EASE;
  const interval = current.intervalDays || 0;
  const learningStep = Math.max(0, current.learningStep || 0);

  if (current.state === "new") {
    if (rating === 1) {
      return outcome(now, "learning", dueAfterMinutes(now, 10), 0, ease, 0, 0, 0);
    }
    if (rating === 2) {
      return outcome(now, "learning", dueAfterMinutes(now, 10), 0, ease, 0, 0, 0);
    }
    if (rating === 3) {
      return outcome(now, "review", dueAfter(now, GRADUATING_INTERVAL), GRADUATING_INTERVAL, ease, 1, 0, 0);
    }
    return outcome(now, "review", dueAfter(now, EASY_INTERVAL), EASY_INTERVAL, ease, 1, 0, 0);
  }

  if (current.state === "learning") {
    if (rating === 1) {
      return outcome(now, "learning", dueAfterMinutes(now, 10), 0, ease, current.repetitions + 1, current.lapses, 0);
    }
    if (rating === 2) {
      const step = Math.min(learningStep, LEARNING_STEPS.length - 1);
      const days = LEARNING_STEPS[step] ?? LEARNING_STEPS[0];
      const due = days < 1 ? dueAfterMinutes(now, days * 1440) : dueAfter(now, days);
      return outcome(now, "learning", due, days, ease, current.repetitions + 1, current.lapses, step);
    }
    if (rating === 3) {
      const nextStep = learningStep + 1;
      if (nextStep < LEARNING_STEPS.length) {
        const days = LEARNING_STEPS[nextStep];
        const due = days < 1 ? dueAfterMinutes(now, days * 1440) : dueAfter(now, days);
        return outcome(now, "learning", due, days, ease, current.repetitions + 1, current.lapses, nextStep);
      }
      return outcome(
        now,
        "review",
        dueAfter(now, GRADUATING_INTERVAL),
        GRADUATING_INTERVAL,
        ease,
        current.repetitions + 1,
        current.lapses,
        0
      );
    }
    return outcome(
      now,
      "review",
      dueAfter(now, EASY_INTERVAL),
      EASY_INTERVAL,
      ease,
      current.repetitions + 1,
      current.lapses,
      0
    );
  }

  if (current.state === "relearning") {
    if (rating <= 2) {
      const step = RELEARNING_STEPS[0];
      return outcome(
        now,
        "relearning",
        dueAfterMinutes(now, step * 1440),
        1,
        ease,
        current.repetitions + 1,
        current.lapses,
        0
      );
    }
    if (rating === 3) {
      return outcome(now, "review", dueAfter(now, 1), 1, ease, current.repetitions + 1, current.lapses, 0);
    }
    const nextInterval = Math.max(EASY_INTERVAL, interval);
    return outcome(
      now,
      "review",
      dueAfter(now, nextInterval),
      nextInterval,
      ease + 0.15,
      current.repetitions + 1,
      current.lapses,
      0
    );
  }

  const nextEase = (() => {
    if (rating === 1) return ease - 0.2;
    if (rating === 2) return ease - 0.15;
    if (rating === 4) return ease + 0.15;
    return ease;
  })();

  if (rating === 1) {
    return outcome(
      now,
      "relearning",
      dueAfterMinutes(now, 10),
      1,
      nextEase,
      current.repetitions + 1,
      current.lapses + 1,
      0
    );
  }

  const base = Math.max(1, interval);
  const nextInterval =
    rating === 2 ? base * 1.2 : rating === 3 ? base * Math.max(MIN_EASE, ease) : base * Math.max(MIN_EASE, ease) * 1.3;

  return outcome(
    now,
    "review",
    dueAfter(now, Math.min(MAX_INTERVAL_DAYS, nextInterval)),
    nextInterval,
    nextEase,
    current.repetitions + 1,
    current.lapses,
    0
  );
}

export function previewIntervals(
  current: SchedulerState,
  now: Date = new Date()
): Record<Rating, string> {
  return {
    1: rateCard(current, 1, now).intervalLabel,
    2: rateCard(current, 2, now).intervalLabel,
    3: rateCard(current, 3, now).intervalLabel,
    4: rateCard(current, 4, now).intervalLabel,
  };
}
