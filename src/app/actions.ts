"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_WEIGHTS, TOPIC_IDS } from "@/data/topics";
import { requireUser } from "@/lib/auth";
import {
  addBacklogReview,
  ensureTodayPlan,
  exportData,
  getSettings,
  isValidTimezone,
  markProblemKnown,
  ratePlanItem,
  resetAll,
  resetProgress,
  skipPlanItem,
  updateSettings,
} from "@/lib/db";
import type {
  ActionResult,
  AddBacklogResult,
  ExportActionResult,
  RateActionResult,
} from "@/lib/action-types";
import type { DailyGoal, Rating, TopicId } from "@/lib/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/sheet");
  revalidatePath("/progress");
  revalidatePath("/settings");
}

export async function rateQuestionAction(slug: string, rating: number): Promise<RateActionResult> {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    return { ok: false, error: "Invalid question." };
  }
  if (![1, 2, 3, 4].includes(rating)) {
    return { ok: false, error: "Invalid rating." };
  }
  const user = await requireUser();
  try {
    const result = await ratePlanItem(user.id, slug, rating as Rating);
    revalidateApp();
    return { ok: true, pending: result.pending, dueAt: result.dueAt };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function skipQuestionAction(id: string): Promise<ActionResult> {
  if (typeof id !== "string" || id.length === 0 || id.length > 100) {
    return { ok: false, error: "Invalid plan item." };
  }
  const user = await requireUser();
  try {
    await skipPlanItem(user.id, id);
    revalidateApp();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function markKnownAction(slug: string): Promise<ActionResult> {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    return { ok: false, error: "Invalid question." };
  }
  const user = await requireUser();
  try {
    await markProblemKnown(user.id, slug);
    revalidateApp();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function addBacklogReviewAction(): Promise<AddBacklogResult> {
  const user = await requireUser();
  try {
    const item = await addBacklogReview(user.id);
    revalidateApp();
    return item ? { ok: true } : { ok: false, error: "There is no backlog left to add." };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function rebuildPlanAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await ensureTodayPlan(user.id, { force: true });
    revalidateApp();
    return { ok: true, message: "Today's plan was rebuilt." };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function saveSettingsAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const current = await getSettings(user.id);
    const goal = Number(formData.get("dailyGoal"));
    const extras = Number(formData.get("extrasRate"));
    const timezone = String(formData.get("timezone") ?? "").trim();
    if (timezone && !isValidTimezone(timezone)) {
      return { ok: false, error: "Choose a valid IANA timezone, for example Asia/Kolkata." };
    }
    const weights = { ...current.weights };
    for (const topic of TOPIC_IDS) {
      const raw = formData.get(`weight.${topic}`);
      if (raw != null) {
        weights[topic as TopicId] = Math.max(0, Math.min(20, Number(raw) || 0));
      }
    }
    if (!Object.values(weights).some((value) => value > 0)) {
      return { ok: false, error: "Keep at least one topic weight above zero." };
    }
    const dailyGoal = ([3, 4, 5].includes(goal) ? goal : current.dailyGoal) as DailyGoal;
    await updateSettings(user.id, {
      dailyGoal,
      extrasRate: Math.max(0, Math.min(100, Math.round(Number.isFinite(extras) ? extras : current.extrasRate))),
      timezone: timezone || current.timezone,
      includePremium: formData.get("includePremium") === "on",
      coverageFloor: formData.get("coverageFloor") === "on",
      weights,
    });
    await ensureTodayPlan(user.id, { force: true });
    revalidateApp();
    return { ok: true, message: "Settings saved. Today's plan is updated." };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function completeOnboardingAction(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const current = await getSettings(user.id);
    const goal = Number(formData.get("dailyGoal"));
    const extras = Number(formData.get("extrasRate"));
    const timezone = String(formData.get("timezone") ?? "").trim();
    if (timezone && !isValidTimezone(timezone)) {
      return { ok: false, error: "That timezone is not valid. Try a value like Asia/Kolkata." };
    }
    const dailyGoal = ([3, 4, 5].includes(goal) ? goal : current.dailyGoal) as DailyGoal;
    await updateSettings(user.id, {
      dailyGoal,
      extrasRate: [0, 20, 40].includes(extras) ? extras : current.extrasRate,
      timezone: timezone || current.timezone,
      includePremium: formData.get("includePremium") === "on",
      coverageFloor: formData.get("coverageFloor") === "on",
      weights: current.weights ?? DEFAULT_WEIGHTS,
      onboardingComplete: true,
    });
    await ensureTodayPlan(user.id, { force: true });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  revalidateApp();
  redirect("/");
}

export async function resetProgressAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await resetProgress(user.id);
    await ensureTodayPlan(user.id, { force: true });
    revalidateApp();
    return { ok: true, message: "Progress reset. A fresh plan is ready." };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function resetEverythingAction(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await resetAll(user.id);
    revalidateApp();
    revalidatePath("/onboarding");
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  redirect("/onboarding");
}

export async function exportDataAction(): Promise<ExportActionResult> {
  const user = await requireUser();
  try {
    const data = await exportData(user.id);
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      filename: `leetsuggest-${stamp}.json`,
      json: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
