import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addBacklogReview,
  createUser,
  ensurePlanForDate,
  getPlanItems,
  getProgressData,
  getSettings,
  getSheetData,
  getTodayData,
  markProblemKnown,
  query,
  ratePlanItem,
  resetProgress,
  setDatabaseDriverForTests,
  skipPlanItem,
  unmarkProblemKnown,
  updateSettings,
  type DatabaseDriver,
} from "./db";
import { localDateString } from "./dates";
import type { AppUser } from "./types";

let pg: PGlite;
let user: AppUser;

beforeAll(async () => {
  pg = new PGlite();
  const driver: DatabaseDriver = {
    async query(sql, args) {
      const result = await pg.query(sql, args as unknown[]);
      return result.rows as Record<string, unknown>[];
    },
    async transaction(statements) {
      await pg.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.query(statement.sql, statement.args ?? []);
        }
      });
    },
  };
  setDatabaseDriverForTests(driver);
  user = await createUser("vitest@example.com", "Vitest learner", "scrypt:test:test");
});

afterAll(async () => {
  setDatabaseDriverForTests(null);
  await pg.close();
});

describe("database study loop", () => {
  it("runs onboarding, planning, rating, skip, known, backlog, and reset", async () => {
    const initial = await getSettings(user.id);
    expect(initial.onboardingComplete).toBe(false);

    const updated = await updateSettings(user.id, {
      onboardingComplete: true,
      timezone: "Asia/Kolkata",
      dailyGoal: 4,
    });
    expect(updated.onboardingComplete).toBe(true);
    expect(updated.dailyGoal).toBe(4);

    const today = localDateString(new Date(), "Asia/Kolkata");
    const plan = await ensurePlanForDate(user.id, today, { force: true });
    expect(plan).toHaveLength(4);
    expect(plan.every((item) => item.status === "pending")).toBe(true);

    const firstData = await getTodayData(user.id);
    expect(firstData.items).toHaveLength(4);
    expect(firstData.doneCount).toBe(0);
    expect(firstData.goal).toBe(4);

    const first = plan[0];
    const good = await ratePlanItem(user.id, first.slug, 3);
    expect(good.pending).toBe(false);

    const afterGood = await getTodayData(user.id);
    expect(afterGood.doneCount).toBe(1);
    const firstCard = (await getSheetData(user.id)).cards.find(
      (card) => card.slug === first.slug
    );
    expect(firstCard?.state).toBe("review");
    expect(firstCard?.intervalDays).toBeGreaterThanOrEqual(1);

    const second = afterGood.items.find(
      (item) => item.status === "pending" && item.slug !== first.slug
    );
    expect(second).toBeDefined();
    const again = await ratePlanItem(user.id, second!.slug, 1);
    expect(again.pending).toBe(true);
    await expect(ratePlanItem(user.id, second!.slug, 3)).rejects.toThrow(/not available/i);

    const afterAgain = await getTodayData(user.id);
    const againItem = afterAgain.items.find((item) => item.slug === second!.slug);
    expect(againItem?.status).toBe("pending");
    expect(againItem?.isAvailable).toBe(false);

    const third = afterAgain.items.find(
      (item) => item.status === "pending" && item.slug !== second!.slug
    );
    expect(third).toBeDefined();
    await skipPlanItem(user.id, third!.id);

    const afterSkip = await getTodayData(user.id);
    expect(afterSkip.items.some((item) => item.slug === third!.slug)).toBe(false);
    expect(afterSkip.items.filter((item) => item.status === "pending")).toHaveLength(3);

    const sheet = await getSheetData(user.id);
    const currentPlanSlugs = new Set((await getPlanItems(user.id, today)).map((item) => item.slug));
    const existingSlugs = new Set(sheet.cards.map((card) => card.slug));
    const knownCandidate = sheet.problems.find(
      (problem) =>
        sheet.sheetSlugs.includes(problem.slug) &&
        !currentPlanSlugs.has(problem.slug) &&
        !existingSlugs.has(problem.slug)
    );
    expect(knownCandidate).toBeDefined();
    await markProblemKnown(user.id, knownCandidate!.slug);

    const afterKnown = await getSheetData(user.id);
    const knownCard = afterKnown.cards.find((card) => card.slug === knownCandidate!.slug);
    expect(knownCard?.known).toBe(true);
    expect(knownCard?.state).toBe("known");

    await unmarkProblemKnown(user.id, knownCandidate!.slug);
    const afterUnmark = await getSheetData(user.id);
    expect(afterUnmark.cards.some((card) => card.slug === knownCandidate!.slug)).toBe(false);
    await markProblemKnown(user.id, knownCandidate!.slug);

    const afterKnownSlugs = new Set(
      (await getPlanItems(user.id, today)).map((item) => item.slug)
    );
    const existingAfterKnown = new Set(afterKnown.cards.map((card) => card.slug));
    const backlogCandidate = afterKnown.problems.find(
      (problem) =>
        afterKnown.sheetSlugs.includes(problem.slug) &&
        !afterKnownSlugs.has(problem.slug) &&
        !existingAfterKnown.has(problem.slug)
    );
    expect(backlogCandidate).toBeDefined();
    await ratePlanItem(user.id, backlogCandidate!.slug, 3);
    await query("UPDATE cards SET due_at = ? WHERE user_id = ? AND slug = ?", [
      new Date().toISOString(),
      user.id,
      backlogCandidate!.slug,
    ]);

    const added = await addBacklogReview(user.id);
    expect(added?.slug).toBe(backlogCandidate!.slug);

    const afterBacklog = await getTodayData(user.id);
    expect(afterBacklog.items.some((item) => item.slug === backlogCandidate!.slug)).toBe(true);
    expect(afterBacklog.bonusCount).toBe(1);

    const progress = await getProgressData(user.id);
    expect(progress.reviewsTotal).toBe(3);
    expect(progress.sheetCompleted).toBeGreaterThanOrEqual(3);
    expect(progress.retention).toBe(67);

    await resetProgress(user.id);
    const resetCards = (await getSheetData(user.id)).cards;
    expect(resetCards).toHaveLength(0);
    const resetData = await getTodayData(user.id);
    expect(resetData.items).toHaveLength(4);
    expect(resetData.doneCount).toBe(0);
  });
});
