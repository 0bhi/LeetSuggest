export type TopicId =
  | "arrays"
  | "two-pointers"
  | "binary-search"
  | "hashing"
  | "linked-list"
  | "stacks-queues"
  | "recursion-backtracking"
  | "greedy"
  | "heaps"
  | "binary-trees"
  | "bst"
  | "graphs"
  | "dynamic-programming"
  | "tries"
  | "strings"
  | "bit-manipulation"
  | "math";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Rating = 1 | 2 | 3 | 4;
export type DailyGoal = 3 | 4 | 5;
export type CardState = "new" | "learning" | "review" | "relearning" | "known";
export type PlanItemKind = "review" | "new";
export type PlanItemStatus = "pending" | "done" | "skipped";

export interface TopicMeta {
  id: TopicId;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  sheetTitle: string | null;
  url: string;
  difficulty: Difficulty;
  isPremium: boolean;
  topic: TopicId;
  pattern: string | null;
  leetcodeTopics: string[];
  source: "sheet" | "company";
  sheetOrder: number | null;
  companies: string[];
  frequency: number | null;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
}

export interface Settings {
  userId: string;
  dailyGoal: DailyGoal;
  timezone: string;
  extrasRate: number;
  includePremium: boolean;
  coverageFloor: boolean;
  weights: Record<TopicId, number>;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  userId: string;
  slug: string;
  topic: TopicId;
  source: "sheet" | "company";
  state: Exclude<CardState, "new">;
  dueAt: string | null;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  learningStep: number;
  introducedAt: string | null;
  lastReviewedAt: string | null;
  lastRating: Rating | null;
  known: boolean;
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  userId: string;
  planDate: string;
  slug: string;
  kind: PlanItemKind;
  position: number;
  status: PlanItemStatus;
  rating: Rating | null;
  reason: string | null;
  availableAfter: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanItemView extends PlanItem {
  problem: Problem;
  nextIntervals: Record<Rating, string>;
  isAvailable: boolean;
}

export interface WeeklyTopicStat {
  topic: TopicId;
  count: number;
  target: number;
  weightPct: number;
}

export interface TodayData {
  date: string;
  settings: Settings;
  items: PlanItemView[];
  doneCount: number;
  goal: number;
  bonusCount: number;
  backlogCount: number;
  allDueCount: number;
  streak: number;
  weekly: WeeklyTopicStat[];
  sheetCompleted: number;
  sheetTotal: number;
  freeSheetRemaining: number;
  newRemaining: number;
  note: string | null;
}

export interface TopicProgress {
  topic: TopicId;
  completed: number;
  total: number;
  weeklyCount: number;
  weeklyTarget: number;
  weightPct: number;
}

export interface ForecastDay {
  date: string;
  label: string;
  count: number;
  isToday: boolean;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface ProgressData {
  sheetCompleted: number;
  sheetTotal: number;
  sheetFreeCompleted: number;
  sheetFreeTotal: number;
  extrasAttempted: number;
  extrasTotal: number;
  reviewsTotal: number;
  retention: number | null;
  streak: number;
  activeDays: number;
  dueToday: number;
  backlog: number;
  topics: TopicProgress[];
  forecast: ForecastDay[];
  heatmap: HeatmapDay[];
  difficulty: Record<Difficulty, { completed: number; total: number }>;
  recentReviews: {
    slug: string;
    title: string;
    rating: Rating;
    reviewedAt: string;
    topic: TopicId;
  }[];
}
