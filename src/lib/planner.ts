import { TOPIC_IDS, TOPIC_MAP } from "@/data/topics";
import type { Problem, Rating, TopicId } from "@/lib/types";
import { round } from "@/lib/utils";

export interface DueCard {
  slug: string;
  topic: TopicId;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  state: "learning" | "review" | "relearning";
  dueLabel: string;
}

export interface PlannerInput {
  date: string;
  dailyGoal: number;
  extrasRate: number;
  includePremium: boolean;
  coverageFloor: boolean;
  weights: Record<TopicId, number>;
  problems: Problem[];
  seenSlugs: Set<string>;
  dueCards: DueCard[];
  weeklyCounts: Record<TopicId, number>;
  lastNewAt: Record<TopicId, string | null>;
  sheetIntroduced: Record<TopicId, number>;
  excludeSlugs: Set<string>;
  filledCount: number;
  now: Date;
  seed?: string;
}

export interface PlannedNewItem {
  slug: string;
  kind: "new";
  reason: string;
  source: Problem["source"];
}

export interface PlannedReviewItem {
  slug: string;
  kind: "review";
  reason: string;
}

export interface PlannerResult {
  items: Array<PlannedNewItem | PlannedReviewItem>;
  backlogCount: number;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeWeights(weights: Record<TopicId, number>) {
  const total = TOPIC_IDS.reduce((sum, topic) => sum + Math.max(0, weights[topic] ?? 0), 0) || 1;
  return Object.fromEntries(
    TOPIC_IDS.map((topic) => [topic, Math.max(0, weights[topic] ?? 0) / total])
  ) as Record<TopicId, number>;
}

function isEligible(
  problem: Problem,
  input: PlannerInput,
  unavailable: Set<string>
) {
  if (unavailable.has(problem.slug)) return false;
  if (input.seenSlugs.has(problem.slug)) return false;
  if (problem.isPremium && !input.includePremium) return false;
  return true;
}

export function planDay(input: PlannerInput): PlannerResult {
  const remainingSlots = Math.max(0, input.dailyGoal - input.filledCount);
  const unavailable = new Set(input.excludeSlugs);
  const weights = normalizeWeights(input.weights);

  const sheetByTopic = new Map<TopicId, Problem[]>();
  const extrasByTopic = new Map<TopicId, Problem[]>();
  for (const topic of TOPIC_IDS) {
    sheetByTopic.set(topic, []);
    extrasByTopic.set(topic, []);
  }
  for (const problem of input.problems) {
    const list = problem.source === "sheet" ? sheetByTopic.get(problem.topic) : extrasByTopic.get(problem.topic);
    list?.push(problem);
  }
  for (const list of sheetByTopic.values()) {
    list.sort((a, b) => (a.sheetOrder ?? 0) - (b.sheetOrder ?? 0));
  }
  for (const list of extrasByTopic.values()) {
    list.sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0) || a.title.localeCompare(b.title));
  }

  const availableSheet = (topic: TopicId) =>
    (sheetByTopic.get(topic) ?? []).filter((problem) => isEligible(problem, input, unavailable));
  const availableExtras = (topic: TopicId) => {
    if (input.extrasRate <= 0) return [];
    return (extrasByTopic.get(topic) ?? []).filter((problem) => isEligible(problem, input, unavailable));
  };
  const hasAvailableSheet = (topic: TopicId) => availableSheet(topic).length > 0;
  const hasAvailableExtras = (topic: TopicId) => availableExtras(topic).length > 0;
  const canOfferTopic = (topic: TopicId) =>
    hasAvailableSheet(topic) || hasAvailableExtras(topic);

  const due = input.dueCards
    .filter((card) => !unavailable.has(card.slug))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const reviewSlots = Math.min(due.length, remainingSlots);
  const reviews = due.slice(0, reviewSlots);
  const backlogCount = Math.max(0, due.length - reviewSlots);

  for (const review of reviews) unavailable.add(review.slug);

  const items: PlannerResult["items"] = reviews.map((review) => ({
    slug: review.slug,
    kind: "review",
    reason: `Spaced review · ${review.dueLabel}`,
  }));

  const newSlots = Math.max(0, remainingSlots - reviews.length);
  if (newSlots === 0) {
    return { items, backlogCount };
  }

  const counts = { ...input.weeklyCounts };
  const usedNewTopics = new Set<TopicId>();
  let added = 0;

  while (added < newSlots) {
    const candidates = TOPIC_IDS.filter(
      (topic) => !usedNewTopics.has(topic) && canOfferTopic(topic)
    );
    if (candidates.length === 0) break;

    const withAvailability = candidates.filter(
      (topic) => hasAvailableSheet(topic) || (input.extrasRate > 0 && hasAvailableExtras(topic))
    );
    if (withAvailability.length === 0) break;

    const coverageCandidates = input.coverageFloor
      ? withAvailability.filter((topic) => (counts[topic] ?? 0) === 0)
      : [];

    let selectedTopic: TopicId;
    if (coverageCandidates.length > 0) {
      selectedTopic = coverageCandidates.slice().sort((a, b) => {
        const weightDiff = weights[b] - weights[a];
        if (weightDiff !== 0) return weightDiff;
        const lastA = input.lastNewAt[a] ?? "";
        const lastB = input.lastNewAt[b] ?? "";
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return TOPIC_IDS.indexOf(a) - TOPIC_IDS.indexOf(b);
      })[0];
    } else {
      const scored = withAvailability.map((topic) => {
        const target = weights[topic] * input.dailyGoal * 7;
        const deficit = target - (counts[topic] ?? 0);
        return { topic, deficit, weight: weights[topic], last: input.lastNewAt[topic] ?? "" };
      });
      scored.sort((a, b) => {
        if (Math.abs(b.deficit - a.deficit) > 0.0001) return b.deficit - a.deficit;
        if (a.last !== b.last) return a.last.localeCompare(b.last);
        if (b.weight !== a.weight) return b.weight - a.weight;
        return TOPIC_IDS.indexOf(a.topic) - TOPIC_IDS.indexOf(b.topic);
      });
      selectedTopic = scored[0].topic;
    }

    const sheetOptions = availableSheet(selectedTopic);
    const extraOptions = availableExtras(selectedTopic);
    const firstExposure = (input.sheetIntroduced[selectedTopic] ?? 0) === 0;
    const zeroThisWeek = (counts[selectedTopic] ?? 0) === 0;
    const forceSheet = (firstExposure || zeroThisWeek) && sheetOptions.length > 0;

    let useExtra = false;
    if (!forceSheet && extraOptions.length > 0 && input.extrasRate > 0) {
      const roll = hashString(
        `${input.seed ?? "leet"}:${input.date}:${selectedTopic}:${added}:${counts[selectedTopic] ?? 0}`
      );
      useExtra = roll % 100 < input.extrasRate;
      if (sheetOptions.length === 0) useExtra = true;
    }

    const picked = useExtra ? extraOptions[0] : sheetOptions[0];
    if (!picked) {
      usedNewTopics.add(selectedTopic);
      continue;
    }

    let reason: string;
    if (picked.source === "company") {
      const companies = picked.companies.slice(0, 2).join(" / ");
      reason = companies ? `Stretch · ${companies}` : "Stretch · company interview pick";
    } else if (zeroThisWeek) {
      reason = `Weekly coverage · ${TOPIC_MAP[selectedTopic].name}`;
    } else {
      reason = `High-yield · ${TOPIC_MAP[selectedTopic].name} (${round(weights[selectedTopic] * 100)}%)`;
    }

    items.push({ slug: picked.slug, kind: "new", reason, source: picked.source });
    unavailable.add(picked.slug);
    usedNewTopics.add(selectedTopic);
    counts[selectedTopic] = (counts[selectedTopic] ?? 0) + 1;
    added++;
  }

  return { items, backlogCount };
}

export function weeklyTargets(settings: {
  dailyGoal: number;
  coverageFloor: boolean;
  weights: Record<TopicId, number>;
}): Record<TopicId, { share: number; target: number }> {
  const weights = normalizeWeights(settings.weights);
  return Object.fromEntries(
    TOPIC_IDS.map((topic) => {
      const rawTarget = weights[topic] * settings.dailyGoal * 7;
      return [
        topic,
        {
          share: weights[topic],
          target: settings.coverageFloor ? Math.max(1, rawTarget) : rawTarget,
        },
      ];
    })
  ) as Record<TopicId, { share: number; target: number }>;
}

export function ratingLabel(rating: Rating): string {
  return rating === 1 ? "Again" : rating === 2 ? "Hard" : rating === 3 ? "Good" : "Easy";
}
