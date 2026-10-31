import { describe, expect, it } from "vitest";
import { NEW_CARD_STATE, previewIntervals, rateCard, type SchedulerState } from "./scheduler";

const now = new Date("2026-10-29T12:00:00.000Z");

function reviewState(overrides: Partial<SchedulerState> = {}): SchedulerState {
  return {
    state: "review",
    dueAt: "2026-10-29T12:00:00.000Z",
    intervalDays: 10,
    easeFactor: 2.5,
    repetitions: 5,
    lapses: 1,
    learningStep: 0,
    ...overrides,
  };
}

describe("scheduler", () => {
  it("sends a new card rated Again to a 10 minute learning step", () => {
    const result = rateCard(NEW_CARD_STATE, 1, now);
    expect(result.state).toBe("learning");
    expect(result.dueAt).toBe("2026-10-29T12:10:00.000Z");
    expect(result.intervalLabel).toBe("10m");
    expect(result.repetitions).toBe(0);
  });

  it("graduates a new card rated Good in one day", () => {
    const result = rateCard(NEW_CARD_STATE, 3, now);
    expect(result.state).toBe("review");
    expect(result.dueAt).toBe("2026-10-30T12:00:00.000Z");
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.easeFactor).toBe(2.5);
  });

  it("gives a new card rated Easy a four day head start", () => {
    const result = rateCard(NEW_CARD_STATE, 4, now);
    expect(result.state).toBe("review");
    expect(result.dueAt).toBe("2026-11-02T12:00:00.000Z");
    expect(result.intervalLabel).toBe("4d");
  });

  it("graduates from learning after Good", () => {
    const result = rateCard(
      {
        ...NEW_CARD_STATE,
        state: "learning",
        dueAt: "2026-10-29T12:10:00.000Z",
      },
      3,
      now
    );
    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(1);
  });

  it("multiplies a review interval by ease on Good", () => {
    const result = rateCard(reviewState(), 3, now);
    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(25);
    expect(result.dueAt).toBe("2026-11-23T12:00:00.000Z");
    expect(result.repetitions).toBe(6);
    expect(result.easeFactor).toBe(2.5);
  });

  it("applies a 1.2x multiplier and lowers ease on Hard", () => {
    const result = rateCard(reviewState(), 2, now);
    expect(result.intervalDays).toBe(12);
    expect(result.easeFactor).toBe(2.35);
  });

  it("applies a 1.3x bonus and raises ease on Easy", () => {
    const result = rateCard(reviewState(), 4, now);
    expect(result.intervalDays).toBe(32.5);
    expect(result.easeFactor).toBe(2.65);
  });

  it("moves a lapsed review into relearning on Again", () => {
    const result = rateCard(reviewState(), 1, now);
    expect(result.state).toBe("relearning");
    expect(result.dueAt).toBe("2026-10-29T12:10:00.000Z");
    expect(result.lapses).toBe(2);
    expect(result.easeFactor).toBe(2.3);
  });

  it("never lowers ease below 1.3", () => {
    const result = rateCard(reviewState({ easeFactor: 1.3 }), 1, now);
    expect(result.easeFactor).toBe(1.3);
  });

  it("graduates from relearning on Good", () => {
    const result = rateCard(reviewState({ state: "relearning" }), 3, now);
    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(1);
  });

  it("caps intervals at one year", () => {
    const result = rateCard(reviewState({ intervalDays: 300 }), 3, now);
    expect(result.intervalDays).toBe(365);
  });

  it("previews every rating for a new card", () => {
    expect(previewIntervals(NEW_CARD_STATE, now)).toEqual({
      1: "10m",
      2: "10m",
      3: "1d",
      4: "4d",
    });
  });
});
