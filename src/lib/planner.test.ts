import { describe, expect, it } from "vitest";
import { TOPIC_IDS } from "@/data/topics";
import type { Problem, TopicId } from "@/lib/types";
import { planDay, type DueCard, type PlannerInput } from "./planner";

function zeroRecord<T>(value: T): Record<TopicId, T> {
  return Object.fromEntries(TOPIC_IDS.map((topic) => [topic, value])) as Record<TopicId, T>;
}

function makeProblem(
  slug: string,
  topic: TopicId,
  source: Problem["source"] = "sheet",
  overrides: Partial<Problem> = {}
): Problem {
  return {
    id: slug,
    slug,
    title: slug,
    sheetTitle: source === "sheet" ? slug : null,
    url: `https://leetcode.com/problems/${slug}/`,
    difficulty: "Medium",
    isPremium: false,
    topic,
    pattern: null,
    leetcodeTopics: [],
    source,
    sheetOrder: source === "sheet" ? 1 : null,
    companies: source === "company" ? ["Amazon"] : [],
    frequency: source === "company" ? 50 : null,
    ...overrides,
  };
}

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  const weights = zeroRecord(0);
  weights.arrays = 1;
  return {
    date: "2026-10-29",
    dailyGoal: 4,
    extrasRate: 20,
    includePremium: false,
    coverageFloor: true,
    weights,
    problems: [],
    seenSlugs: new Set(),
    dueCards: [],
    weeklyCounts: zeroRecord(0),
    lastNewAt: zeroRecord<string | null>(null),
    sheetIntroduced: zeroRecord(0),
    excludeSlugs: new Set(),
    filledCount: 0,
    now: new Date("2026-10-29T12:00:00.000Z"),
    seed: "test",
    ...overrides,
  };
}

function due(slug: string, topic: TopicId, dueAt = "2026-10-29T08:00:00.000Z"): DueCard {
  return {
    slug,
    topic,
    dueAt,
    intervalDays: 5,
    easeFactor: 2.5,
    state: "review",
    dueLabel: "Due today",
  };
}

describe("planner", () => {
  it("puts reviews before new questions", () => {
    const problems = [
      makeProblem("array-new", "arrays", "sheet", { sheetOrder: 2 }),
      makeProblem("dp-new", "dynamic-programming", "sheet", { sheetOrder: 2 }),
    ];
    const input = makeInput({
      problems,
      dueCards: [due("array-due", "arrays"), due("dp-due", "dynamic-programming")],
      seenSlugs: new Set(["array-due", "dp-due"]),
    });
    const plan = planDay(input);
    expect(plan.items.map((item) => item.slug)).toEqual([
      "array-due",
      "dp-due",
      "array-new",
      "dp-new",
    ]);
    expect(plan.items[0].kind).toBe("review");
    expect(plan.items[0].reason).toContain("Due today");
    expect(plan.backlogCount).toBe(0);
  });

  it("caps reviews at the remaining daily slots and reports backlog", () => {
    const dueCards = Array.from({ length: 6 }, (_, index) =>
      due(`due-${index}`, "arrays", `2026-10-29T0${index}:00:00.000Z`)
    );
    const plan = planDay(makeInput({ dueCards, dailyGoal: 4 }));
    expect(plan.items).toHaveLength(4);
    expect(plan.items.every((item) => item.kind === "review")).toBe(true);
    expect(plan.backlogCount).toBe(2);
  });

  it("accounts for slots already filled today", () => {
    const plan = planDay(
      makeInput({
        dueCards: [due("due-1", "arrays"), due("due-2", "graphs")],
        filledCount: 3,
        dailyGoal: 4,
      })
    );
    expect(plan.items).toHaveLength(1);
    expect(plan.backlogCount).toBe(1);
  });

  it("gives every topic weekly coverage before repeating a topic", () => {
    const problems = [
      makeProblem("arrays-1", "arrays"),
      makeProblem("dp-1", "dynamic-programming"),
      makeProblem("graphs-1", "graphs"),
      makeProblem("strings-1", "strings"),
    ];
    const weights = zeroRecord(1);
    const plan = planDay(
      makeInput({
        problems,
        weights,
        coverageFloor: true,
        dailyGoal: 4,
      })
    );
    expect(plan.items).toHaveLength(4);
    expect(new Set(plan.items.map((item) => item.slug)).size).toBe(4);
    expect(plan.items.every((item) => item.reason?.includes("Weekly coverage"))).toBe(true);
  });

  it("never schedules two new questions from one topic on the same day", () => {
    const problems = [
      makeProblem("arrays-1", "arrays"),
      makeProblem("arrays-2", "arrays", "sheet", { sheetOrder: 2 }),
      makeProblem("dp-1", "dynamic-programming"),
    ];
    const plan = planDay(
      makeInput({
        problems,
        weights: zeroRecord(1),
        dailyGoal: 4,
      })
    );
    expect(plan.items).toHaveLength(2);
    expect(new Set(plan.items.map((item) => item.slug)).size).toBe(2);
  });

  it("forces a sheet question on a topic's first exposure", () => {
    const problems = [
      makeProblem("sheet-pick", "arrays"),
      makeProblem("extra-pick", "arrays", "company"),
    ];
    const plan = planDay(
      makeInput({
        problems,
        extrasRate: 100,
        dailyGoal: 1,
      })
    );
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].slug).toBe("sheet-pick");
  });

  it("stretches to a company question after a topic is established", () => {
    const problems = [
      makeProblem("sheet-pick", "arrays"),
      makeProblem("extra-pick", "arrays", "company"),
    ];
    const weeklyCounts = zeroRecord(0);
    weeklyCounts.arrays = 1;
    const sheetIntroduced = zeroRecord(0);
    sheetIntroduced.arrays = 1;
    const plan = planDay(
      makeInput({
        problems,
        extrasRate: 100,
        dailyGoal: 1,
        coverageFloor: false,
        weeklyCounts,
        sheetIntroduced,
      })
    );
    expect(plan.items[0].slug).toBe("extra-pick");
    expect(plan.items[0].kind).toBe("new");
    if (plan.items[0].kind === "new") {
      expect(plan.items[0].reason).toContain("Stretch");
    }
  });

  it("does not use company extras when extrasRate is zero", () => {
    const plan = planDay(
      makeInput({
        problems: [makeProblem("extra-only", "arrays", "company")],
        extrasRate: 0,
        dailyGoal: 1,
      })
    );
    expect(plan.items).toHaveLength(0);
  });

  it("respects the premium filter", () => {
    const plan = planDay(
      makeInput({
        problems: [
          makeProblem("free-pick", "arrays"),
          makeProblem("premium-pick", "arrays", "sheet", {
            isPremium: true,
            sheetOrder: 0,
          }),
        ],
        dailyGoal: 1,
      })
    );
    expect(plan.items[0].slug).toBe("free-pick");
  });

  it("favours a topic with a larger weekly deficit", () => {
    const problems = [
      makeProblem("arrays-pick", "arrays"),
      makeProblem("dp-pick", "dynamic-programming"),
    ];
    const weights = zeroRecord(0);
    weights.arrays = 1;
    weights["dynamic-programming"] = 10;
    const sheetIntroduced = zeroRecord(1);
    const plan = planDay(
      makeInput({
        problems,
        weights,
        coverageFloor: false,
        dailyGoal: 1,
        sheetIntroduced,
      })
    );
    expect(plan.items[0].slug).toBe("dp-pick");
  });

  it("excludes questions that already have a plan item", () => {
    const plan = planDay(
      makeInput({
        problems: [makeProblem("array-1", "arrays"), makeProblem("array-2", "arrays", "sheet", { sheetOrder: 2 })],
        dueCards: [due("array-due", "arrays")],
        excludeSlugs: new Set(["array-1", "array-due"]),
        dailyGoal: 1,
      })
    );
    expect(plan.items[0].slug).toBe("array-2");
  });

  it("is deterministic for a given day and seed", () => {
    const problems = [
      makeProblem("extra-a", "arrays", "company", { frequency: 90 }),
      makeProblem("extra-b", "arrays", "company", { frequency: 80 }),
      makeProblem("extra-c", "arrays", "company", { frequency: 70 }),
    ];
    const weeklyCounts = zeroRecord(0);
    weeklyCounts.arrays = 1;
    const sheetIntroduced = zeroRecord(1);
    const input = makeInput({
      problems,
      extrasRate: 100,
      dailyGoal: 1,
      coverageFloor: false,
      weeklyCounts,
      sheetIntroduced,
    });
    expect(planDay(input).items[0].slug).toBe(planDay(input).items[0].slug);
  });
});
