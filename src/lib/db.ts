import "server-only";

import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { COMPANY_PROBLEMS, PROBLEMS, SHEET_PROBLEMS, getProblem } from "@/data/problems";
import { DEFAULT_WEIGHTS, TOPIC_IDS } from "@/data/topics";
import {
  addDaysToDateString,
  diffCalendarDays,
  dueLabel,
  formatWeekday,
  localDateString,
  localDayBounds,
} from "@/lib/dates";
import {
  planDay,
  weeklyTargets,
  type DueCard,
  type PlannerInput,
} from "@/lib/planner";
import { NEW_CARD_STATE, previewIntervals, rateCard, type SchedulerState } from "@/lib/scheduler";
import type {
  AppUser,
  Card,
  CardState,
  DailyGoal,
  Difficulty,
  ForecastDay,
  HeatmapDay,
  PlanItem,
  PlanItemView,
  PlanItemStatus,
  ProgressData,
  Rating,
  Settings,
  TodayData,
  TopicId,
  TopicProgress,
} from "@/lib/types";
import { percent, round } from "@/lib/utils";

type Row = Record<string, unknown>;
type QueryArg = string | number | null;

export interface Statement {
  sql: string;
  args?: QueryArg[];
}

export interface AuthUser extends AppUser {
  passwordHash: string;
}

export interface DatabaseDriver {
  query(sql: string, args: QueryArg[]): Promise<Row[]>;
  transaction(statements: Statement[]): Promise<void>;
}

const globalForDb = globalThis as unknown as {
  leetsuggestDriver?: DatabaseDriver;
  leetsuggestReady?: Promise<void>;
};

let testDriver: DatabaseDriver | null = null;

export function setDatabaseDriverForTests(driver: DatabaseDriver | null): void {
  testDriver = driver;
  globalForDb.leetsuggestReady = undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon Postgres connection string to your environment."
    );
  }
  return url;
}

function createNeonDriver(sql: NeonQueryFunction<false, false>): DatabaseDriver {
  return {
    async query(text, args) {
      return (await sql.query(text, args)) as Row[];
    },
    async transaction(statements) {
      await sql.transaction((txn) =>
        statements.map((statement) => txn.query(statement.sql, statement.args ?? []))
      );
    },
  };
}

function driver(): DatabaseDriver {
  if (testDriver) return testDriver;
  if (!globalForDb.leetsuggestDriver) {
    globalForDb.leetsuggestDriver = createNeonDriver(neon(connectionString()));
  }
  return globalForDb.leetsuggestDriver;
}

function prepare(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function rawQuery<T extends Row = Row>(sql: string, args: QueryArg[] = []): Promise<T[]> {
  const rows = await driver().query(prepare(sql), args);
  return rows as T[];
}

async function rawTransaction(statements: Statement[]): Promise<void> {
  if (statements.length === 0) return;
  await driver().transaction(
    statements.map((statement) => ({
      sql: prepare(statement.sql),
      args: statement.args ?? [],
    }))
  );
}

export async function query<T extends Row = Row>(sql: string, args: QueryArg[] = []): Promise<T[]> {
  await ensureDb();
  return rawQuery<T>(sql, args);
}

async function transaction(statements: Statement[]): Promise<void> {
  await ensureDb();
  await rawTransaction(statements);
}

const SCHEMA = [
  `SELECT pg_advisory_xact_lock(hashtext('leetsuggest_schema_v1'))`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_goal INTEGER NOT NULL DEFAULT 4,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    extras_rate INTEGER NOT NULL DEFAULT 20,
    include_premium INTEGER NOT NULL DEFAULT 0,
    coverage_floor INTEGER NOT NULL DEFAULT 1,
    weights_json TEXT NOT NULL,
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    topic TEXT NOT NULL,
    source TEXT NOT NULL,
    state TEXT NOT NULL,
    due_at TEXT,
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    repetitions INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    learning_step INTEGER NOT NULL DEFAULT 0,
    introduced_at TEXT,
    last_reviewed_at TEXT,
    last_rating INTEGER,
    known INTEGER NOT NULL DEFAULT 0,
    suspended INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, slug)
  )`,
  `CREATE INDEX IF NOT EXISTS cards_due_idx ON cards (user_id, due_at)`,
  `CREATE INDEX IF NOT EXISTS cards_introduced_idx ON cards (user_id, introduced_at)`,
  `CREATE TABLE IF NOT EXISTS plan_days (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, plan_date)
  )`,
  `CREATE TABLE IF NOT EXISTS plan_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL,
    slug TEXT NOT NULL,
    kind TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    rating INTEGER,
    reason TEXT,
    available_after TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, plan_date, slug)
  )`,
  `CREATE INDEX IF NOT EXISTS plan_items_date_idx ON plan_items (user_id, plan_date, "position")`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    rating INTEGER NOT NULL,
    reviewed_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    interval_days REAL NOT NULL,
    ease_factor REAL NOT NULL,
    state TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_user_date_idx ON reviews (user_id, reviewed_at)`,
];

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function settingsInsertStatement(userId: string): Statement {
  const now = new Date().toISOString();
  return {
    sql: `INSERT INTO settings
      (user_id, daily_goal, timezone, extras_rate, include_premium, coverage_floor, weights_json, onboarding_complete, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO NOTHING`,
    args: [
      userId,
      4,
      defaultTimezone(),
      20,
      0,
      1,
      JSON.stringify(DEFAULT_WEIGHTS),
      0,
      now,
      now,
    ],
  };
}

async function initializeSettings(userId: string): Promise<void> {
  const statement = settingsInsertStatement(userId);
  await query(statement.sql, statement.args ?? []);
}

async function migrate() {
  await rawTransaction(SCHEMA.map((sql) => ({ sql })));
}

export function ensureDb(): Promise<void> {
  if (!globalForDb.leetsuggestReady) {
    globalForDb.leetsuggestReady = migrate().catch((error) => {
      globalForDb.leetsuggestReady = undefined;
      throw error;
    });
  }
  return globalForDb.leetsuggestReady;
}

function str(row: Row, key: string): string {
  const value = row[key];
  return value == null ? "" : String(value);
}

function nullableStr(row: Row, key: string): string | null {
  const value = row[key];
  return value == null ? null : String(value);
}

function num(row: Row, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNum(row: Row, key: string): number | null {
  const value = row[key];
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(row: Row, key: string): boolean {
  return num(row, key) !== 0;
}

function parseWeights(json: string): Record<TopicId, number> {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const weights = Object.fromEntries(
      TOPIC_IDS.map((topic) => {
        const value = Number(parsed[topic]);
        return [topic, Number.isFinite(value) ? Math.max(0, value) : (DEFAULT_WEIGHTS[topic] ?? 0)];
      })
    ) as Record<TopicId, number>;
    return Object.values(weights).some((value) => value > 0) ? weights : { ...DEFAULT_WEIGHTS };
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

function rowToSettings(row: Row): Settings {
  return {
    userId: str(row, "user_id"),
    dailyGoal: Number(num(row, "daily_goal", 4)) as DailyGoal,
    timezone: str(row, "timezone") || "UTC",
    extrasRate: num(row, "extras_rate", 20),
    includePremium: bool(row, "include_premium"),
    coverageFloor: bool(row, "coverage_floor"),
    weights: parseWeights(str(row, "weights_json")),
    onboardingComplete: bool(row, "onboarding_complete"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<AppUser> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const settings = settingsInsertStatement(id);
  await transaction([
    {
      sql: `INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, email, name, passwordHash, now],
    },
    settings,
  ]);
  return { id, email, name };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const rows = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    [email]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: str(row, "id"),
    email: str(row, "email"),
    name: str(row, "name"),
    passwordHash: str(row, "password_hash"),
  };
}

export async function createSession(
  tokenHash: string,
  userId: string,
  expiresAt: string
): Promise<void> {
  const now = new Date().toISOString();
  await query("DELETE FROM sessions WHERE expires_at <= ?", [now]);
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [tokenHash, userId, expiresAt, now]
  );
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
}

export async function getUserBySessionTokenHash(tokenHash: string): Promise<AppUser | null> {
  const rows = await query(
    `SELECT u.id, u.email, u.name
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    [tokenHash, new Date().toISOString()]
  );
  const row = rows[0];
  if (!row) return null;
  return { id: str(row, "id"), email: str(row, "email"), name: str(row, "name") };
}

export async function getSettings(userId: string): Promise<Settings> {
  await ensureDb();
  const result = await rawQuery("SELECT * FROM settings WHERE user_id = ?", [userId]);
  const row = result[0];
  if (!row) {
    await initializeSettings(userId);
    return getSettings(userId);
  }
  return rowToSettings(row);
}

export async function updateSettings(userId: string, patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings(userId);
  const merged = { ...current, ...patch };
  const weights = Object.fromEntries(
    TOPIC_IDS.map((topic) => {
      const value = Number(merged.weights?.[topic] ?? current.weights[topic]);
      return [topic, Number.isFinite(value) ? Math.max(0, value) : current.weights[topic]];
    })
  ) as Record<TopicId, number>;
  if (!Object.values(weights).some((value) => value > 0)) {
    Object.assign(weights, DEFAULT_WEIGHTS);
  }
  const dailyGoal = Math.min(5, Math.max(3, Math.round(Number(merged.dailyGoal) || 4))) as DailyGoal;
  const timezone = isValidTimezone(merged.timezone) ? merged.timezone : current.timezone;
  const extrasRate = Math.min(100, Math.max(0, Math.round(Number(merged.extrasRate) || 0)));
  const now = new Date().toISOString();
  await query(
    `UPDATE settings SET daily_goal = ?, timezone = ?, extras_rate = ?, include_premium = ?,
      coverage_floor = ?, weights_json = ?, onboarding_complete = ?, updated_at = ?
      WHERE user_id = ?`,
    [
      dailyGoal,
      timezone,
      extrasRate,
      merged.includePremium ? 1 : 0,
      merged.coverageFloor ? 1 : 0,
      JSON.stringify(weights),
      merged.onboardingComplete ? 1 : 0,
      now,
      userId,
    ]
  );
  return getSettings(userId);
}

function rowToCard(row: Row): Card {
  return {
    userId: str(row, "user_id"),
    slug: str(row, "slug"),
    topic: str(row, "topic") as TopicId,
    source: str(row, "source") as Card["source"],
    state: str(row, "state") as Card["state"],
    dueAt: nullableStr(row, "due_at"),
    intervalDays: num(row, "interval_days"),
    easeFactor: num(row, "ease_factor", 2.5),
    repetitions: num(row, "repetitions"),
    lapses: num(row, "lapses"),
    learningStep: num(row, "learning_step"),
    introducedAt: nullableStr(row, "introduced_at"),
    lastReviewedAt: nullableStr(row, "last_reviewed_at"),
    lastRating: nullableNum(row, "last_rating") as Rating | null,
    known: bool(row, "known"),
    suspended: bool(row, "suspended"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

function rowToPlanItem(row: Row): PlanItem {
  return {
    id: str(row, "id"),
    userId: str(row, "user_id"),
    planDate: str(row, "plan_date"),
    slug: str(row, "slug"),
    kind: str(row, "kind") as PlanItem["kind"],
    position: num(row, "position"),
    status: str(row, "status") as PlanItemStatus,
    rating: nullableNum(row, "rating") as Rating | null,
    reason: nullableStr(row, "reason"),
    availableAfter: nullableStr(row, "available_after"),
    completedAt: nullableStr(row, "completed_at"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export async function getAllCards(userId: string): Promise<Card[]> {
  const result = await query(
    "SELECT * FROM cards WHERE user_id = ? ORDER BY introduced_at ASC",
    [userId]
  );
  return result.map(rowToCard);
}

export async function getCard(userId: string, slug: string): Promise<Card | null> {
  const result = await query("SELECT * FROM cards WHERE user_id = ? AND slug = ?", [
    userId,
    slug,
  ]);
  const row = result[0];
  return row ? rowToCard(row) : null;
}

function cardState(card: Card | null): SchedulerState {
  if (!card) return NEW_CARD_STATE;
  return {
    state: card.state,
    dueAt: card.dueAt,
    intervalDays: card.intervalDays,
    easeFactor: card.easeFactor,
    repetitions: card.repetitions,
    lapses: card.lapses,
    learningStep: card.learningStep,
  };
}

function cardInsertArgs(card: Card): QueryArg[] {
  return [
    card.userId,
    card.slug,
    card.topic,
    card.source,
    card.state,
    card.dueAt,
    card.intervalDays,
    card.easeFactor,
    card.repetitions,
    card.lapses,
    card.learningStep,
    card.introducedAt,
    card.lastReviewedAt,
    card.lastRating,
    card.known ? 1 : 0,
    card.suspended ? 1 : 0,
    card.createdAt,
    card.updatedAt,
  ];
}

function cardUpsertStatement(card: Card): Statement {
  return {
    sql: `INSERT INTO cards
      (user_id, slug, topic, source, state, due_at, interval_days, ease_factor, repetitions, lapses, learning_step,
       introduced_at, last_reviewed_at, last_rating, known, suspended, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, slug) DO UPDATE SET
        topic = excluded.topic,
        source = excluded.source,
        state = excluded.state,
        due_at = excluded.due_at,
        interval_days = excluded.interval_days,
        ease_factor = excluded.ease_factor,
        repetitions = excluded.repetitions,
        lapses = excluded.lapses,
        learning_step = excluded.learning_step,
        introduced_at = excluded.introduced_at,
        last_reviewed_at = excluded.last_reviewed_at,
        last_rating = excluded.last_rating,
        known = excluded.known,
        suspended = excluded.suspended,
        updated_at = excluded.updated_at`,
    args: cardInsertArgs(card),
  };
}

export async function getDueCards(
  userId: string,
  date: string,
  timezone?: string
): Promise<DueCard[]> {
  const settings = await getSettings(userId);
  const tz = timezone ?? settings.timezone;
  const { end } = localDayBounds(date, tz);
  const result = await query(
    `SELECT * FROM cards
      WHERE user_id = ? AND known = 0 AND suspended = 0 AND due_at IS NOT NULL AND due_at <= ?
      ORDER BY due_at ASC`,
    [userId, end.toISOString()]
  );
  return result.map((row) => {
    const card = rowToCard(row);
    return {
      slug: card.slug,
      topic: card.topic,
      dueAt: card.dueAt ?? new Date(0).toISOString(),
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
      state: card.state as DueCard["state"],
      dueLabel: dueLabel(card.dueAt, date, tz),
    };
  });
}

export async function getPlanItems(userId: string, date: string): Promise<PlanItem[]> {
  const result = await query(
    `SELECT * FROM plan_items WHERE user_id = ? AND plan_date = ? ORDER BY "position" ASC`,
    [userId, date]
  );
  return result.map(rowToPlanItem);
}

async function getPlanItem(userId: string, date: string, slug: string): Promise<PlanItem | null> {
  const result = await query(
    "SELECT * FROM plan_items WHERE user_id = ? AND plan_date = ? AND slug = ?",
    [userId, date, slug]
  );
  const row = result[0];
  return row ? rowToPlanItem(row) : null;
}

function weeklyCountsFromCards(cards: Card[], today: string, timezone: string) {
  const start = addDaysToDateString(today, -6);
  const counts = Object.fromEntries(TOPIC_IDS.map((topic) => [topic, 0])) as Record<TopicId, number>;
  const lastNewAt = Object.fromEntries(TOPIC_IDS.map((topic) => [topic, null])) as Record<
    TopicId,
    string | null
  >;
  const sheetIntroduced = Object.fromEntries(TOPIC_IDS.map((topic) => [topic, 0])) as Record<
    TopicId,
    number
  >;
  for (const card of cards) {
    if (card.introducedAt) {
      const day = localDateString(new Date(card.introducedAt), timezone);
      if (day >= start && day <= today) counts[card.topic] = (counts[card.topic] ?? 0) + 1;
      if (!lastNewAt[card.topic] || card.introducedAt > lastNewAt[card.topic]!) {
        lastNewAt[card.topic] = card.introducedAt;
      }
    }
    if (card.source === "sheet") {
      sheetIntroduced[card.topic] = (sheetIntroduced[card.topic] ?? 0) + 1;
    }
  }
  return { counts, lastNewAt, sheetIntroduced };
}

export async function ensurePlanForDate(
  userId: string,
  date: string,
  options: { force?: boolean; fillSkipped?: boolean } = {}
): Promise<PlanItem[]> {
  const settings = await getSettings(userId);
  const now = new Date();

  if (options.force) {
    await query(
      "DELETE FROM plan_items WHERE user_id = ? AND plan_date = ? AND status != 'done'",
      [userId, date]
    );
  }

  const existing = await getPlanItems(userId, date);
  const doneCount = existing.filter((item) => item.status === "done").length;
  const pendingCount = existing.filter((item) => item.status === "pending").length;
  const skippedCount = existing.filter((item) => item.status === "skipped").length;
  const filledCount =
    doneCount + pendingCount + (options.fillSkipped ? 0 : skippedCount);

  if (filledCount >= settings.dailyGoal) {
    await query(
      `INSERT INTO plan_days (user_id, plan_date, generated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id, plan_date) DO UPDATE SET generated_at = excluded.generated_at`,
      [userId, date, now.toISOString()]
    );
    return existing;
  }

  const cards = await getAllCards(userId);
  const dueCards = await getDueCards(userId, date);
  const { counts, lastNewAt, sheetIntroduced } = weeklyCountsFromCards(
    cards,
    date,
    settings.timezone
  );
  const excludeSlugs = new Set(existing.map((item) => item.slug));
  const input: PlannerInput = {
    date,
    dailyGoal: settings.dailyGoal,
    extrasRate: settings.extrasRate,
    includePremium: settings.includePremium,
    coverageFloor: settings.coverageFloor,
    weights: settings.weights,
    problems: PROBLEMS,
    seenSlugs: new Set(cards.map((card) => card.slug)),
    dueCards,
    weeklyCounts: counts,
    lastNewAt,
    sheetIntroduced,
    excludeSlugs,
    filledCount,
    now,
    seed: `${settings.userId}:${settings.dailyGoal}`,
  };
  const plan = planDay(input);
  const nextPosition =
    existing.reduce((max, item) => Math.max(max, item.position), -1) + 1;
  const statements: Statement[] = [
    {
      sql: `INSERT INTO plan_days (user_id, plan_date, generated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id, plan_date) DO UPDATE SET generated_at = excluded.generated_at`,
      args: [userId, date, now.toISOString()],
    },
    ...plan.items.map((item, index) => ({
      sql: `INSERT INTO plan_items
        (id, user_id, plan_date, slug, kind, "position", status, rating, reason, available_after, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL, ?, ?)
        ON CONFLICT DO NOTHING`,
      args: [
        randomUUID(),
        userId,
        date,
        item.slug,
        item.kind,
        nextPosition + index,
        item.reason,
        now.toISOString(),
        now.toISOString(),
      ],
    })),
  ];
  await transaction(statements);
  return getPlanItems(userId, date);
}

export async function ensureTodayPlan(
  userId: string,
  options: { force?: boolean; fillSkipped?: boolean } = {}
) {
  const settings = await getSettings(userId);
  const date = localDateString(new Date(), settings.timezone);
  return ensurePlanForDate(userId, date, options);
}

export async function addBacklogReview(userId: string): Promise<PlanItem | null> {
  const settings = await getSettings(userId);
  const today = localDateString(new Date(), settings.timezone);
  const existing = await getPlanItems(userId, today);
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const dueCards = await getDueCards(userId, today);
  const candidate = dueCards.find((card) => !existingSlugs.has(card.slug));
  if (!candidate) return null;

  const now = new Date().toISOString();
  const nextPosition =
    existing.reduce((max, item) => Math.max(max, item.position), -1) + 1;
  await query(
    `INSERT INTO plan_items
      (id, user_id, plan_date, slug, kind, "position", status, rating, reason, available_after, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'review', ?, 'pending', NULL, ?, NULL, NULL, ?, ?)
      ON CONFLICT DO NOTHING`,
    [
      randomUUID(),
      userId,
      today,
      candidate.slug,
      nextPosition,
      `Backlog review · ${candidate.dueLabel}`,
      now,
      now,
    ]
  );
  return getPlanItem(userId, today, candidate.slug);
}

export async function ratePlanItem(
  userId: string,
  slug: string,
  rating: Rating
): Promise<{ pending: boolean; dueAt: string }> {
  const settings = await getSettings(userId);
  const now = new Date();
  const today = localDateString(now, settings.timezone);
  const problem = getProblem(slug);
  if (!problem) throw new Error("Unknown problem");
  const existingCard = await getCard(userId, slug);
  if (existingCard?.known) throw new Error("This question is already marked known");
  const planItem = await getPlanItem(userId, today, slug);
  if (planItem && planItem.status !== "pending") {
    throw new Error("This question is already complete for today");
  }
  if (planItem?.availableAfter && new Date(planItem.availableAfter).getTime() > now.getTime()) {
    throw new Error("This review is not available yet");
  }

  const outcome = rateCard(
    existingCard ? cardState(existingCard) : NEW_CARD_STATE,
    rating,
    now
  );
  const dueAt = outcome.dueAt ?? now.toISOString();
  const dueDay = localDateString(new Date(dueAt), settings.timezone);
  const pending = diffCalendarDays(dueDay, today) <= 0;
  const nowIso = now.toISOString();

  const card: Card = {
    userId,
    slug,
    topic: problem.topic,
    source: problem.source,
    state: outcome.state,
    dueAt,
    intervalDays: outcome.intervalDays,
    easeFactor: outcome.easeFactor,
    repetitions: outcome.repetitions,
    lapses: outcome.lapses,
    learningStep: outcome.learningStep,
    introducedAt: existingCard?.introducedAt ?? nowIso,
    lastReviewedAt: nowIso,
    lastRating: rating,
    known: false,
    suspended: false,
    createdAt: existingCard?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const statements: Statement[] = [
    cardUpsertStatement(card),
    {
      sql: `INSERT INTO reviews (id, user_id, slug, rating, reviewed_at, due_at, interval_days, ease_factor, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        userId,
        slug,
        rating,
        nowIso,
        dueAt,
        outcome.intervalDays,
        outcome.easeFactor,
        outcome.state,
      ],
    },
  ];

  if (planItem) {
    statements.push({
      sql: `UPDATE plan_items SET status = ?, rating = ?, available_after = ?, completed_at = ?, updated_at = ?
        WHERE id = ?`,
      args: [
        pending ? "pending" : "done",
        rating,
        pending ? dueAt : null,
        pending ? null : nowIso,
        nowIso,
        planItem.id,
      ],
    });
  }

  await transaction(statements);
  return { pending, dueAt };
}

export async function skipPlanItem(userId: string, id: string): Promise<void> {
  const result = await query("SELECT * FROM plan_items WHERE id = ? AND user_id = ?", [
    id,
    userId,
  ]);
  const row = result[0];
  if (!row) return;
  const item = rowToPlanItem(row);
  if (item.status === "done") return;
  const now = new Date().toISOString();
  await query(
    `UPDATE plan_items SET status = 'skipped', rating = NULL, available_after = NULL,
      completed_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, id]
  );
  await ensurePlanForDate(userId, item.planDate, { fillSkipped: true });
}

export async function markProblemKnown(userId: string, slug: string): Promise<void> {
  const problem = getProblem(slug);
  if (!problem) throw new Error("Unknown problem");
  const settings = await getSettings(userId);
  const now = new Date();
  const today = localDateString(now, settings.timezone);
  const existing = await getCard(userId, slug);
  const nowIso = now.toISOString();
  const card: Card = {
    userId,
    slug,
    topic: problem.topic,
    source: problem.source,
    state: "known",
    dueAt: null,
    intervalDays: 0,
    easeFactor: existing?.easeFactor ?? NEW_CARD_STATE.easeFactor,
    repetitions: existing?.repetitions ?? 0,
    lapses: existing?.lapses ?? 0,
    learningStep: 0,
    introducedAt: existing?.introducedAt ?? nowIso,
    lastReviewedAt: nowIso,
    lastRating: existing?.lastRating ?? null,
    known: true,
    suspended: false,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  await transaction([
    cardUpsertStatement(card),
    {
      sql: `UPDATE plan_items SET status = 'skipped', rating = NULL, available_after = NULL,
        completed_at = ?, updated_at = ? WHERE user_id = ? AND plan_date = ? AND slug = ? AND status = 'pending'`,
      args: [nowIso, nowIso, userId, today, slug],
    },
  ]);
  await ensurePlanForDate(userId, today, { fillSkipped: true });
}

function streakFromDates(dates: Set<string>, today: string): number {
  let cursor = today;
  if (!dates.has(cursor)) cursor = addDaysToDateString(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateString(cursor, -1);
  }
  return streak;
}

interface ReviewRecord {
  slug: string;
  rating: Rating;
  reviewedAt: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  state: CardState;
}

async function getAllReviews(userId: string): Promise<ReviewRecord[]> {
  const result = await query(
    "SELECT * FROM reviews WHERE user_id = ? ORDER BY reviewed_at DESC",
    [userId]
  );
  return result.map((row) => ({
    slug: str(row, "slug"),
    rating: Number(num(row, "rating", 3)) as Rating,
    reviewedAt: str(row, "reviewed_at"),
    dueAt: str(row, "due_at"),
    intervalDays: num(row, "interval_days"),
    easeFactor: num(row, "ease_factor"),
    state: str(row, "state") as CardState,
  }));
}

function buildPlanItemViews(
  items: PlanItem[],
  cards: Card[],
  today: string,
  now: Date
): PlanItemView[] {
  const cardBySlug = new Map(cards.map((card) => [card.slug, card]));
  return items
    .map((item) => {
      const problem = getProblem(item.slug);
      if (!problem) return null;
      const card = cardBySlug.get(item.slug) ?? null;
      const state = cardState(card);
      const isAvailable =
        item.status === "pending" &&
        (!item.availableAfter || new Date(item.availableAfter).getTime() <= now.getTime());
      return {
        ...item,
        problem,
        nextIntervals: previewIntervals(state, now),
        isAvailable,
      } satisfies PlanItemView;
    })
    .filter((item): item is PlanItemView => item !== null);
}

function weeklyStatsFor(cards: Card[], settings: Settings, today: string) {
  const { counts } = weeklyCountsFromCards(cards, today, settings.timezone);
  const targets = weeklyTargets(settings);
  return TOPIC_IDS.map((topic) => ({
    topic,
    count: counts[topic] ?? 0,
    target: targets[topic].target,
    weightPct: round(targets[topic].share * 100),
  }));
}

export async function getTodayData(userId: string): Promise<TodayData> {
  const settings = await getSettings(userId);
  const now = new Date();
  const today = localDateString(now, settings.timezone);
  const allItems = await ensurePlanForDate(userId, today);
  const visibleItems = allItems.filter((item) => item.status !== "skipped");
  const cards = await getAllCards(userId);
  const dueCards = await getDueCards(userId, today);
  const reviews = await getAllReviews(userId);
  const reviewDates = new Set(
    reviews.map((review) => localDateString(new Date(review.reviewedAt), settings.timezone))
  );
  const items = buildPlanItemViews(visibleItems, cards, today, now);
  const doneCount = visibleItems.filter((item) => item.status === "done").length;
  const planSlugs = new Set(allItems.map((item) => item.slug));
  const backlogCount = dueCards.filter((card) => !planSlugs.has(card.slug)).length;
  const seen = new Set(cards.map((card) => card.slug));
  const sheetCompleted = cards.filter((card) => card.source === "sheet").length;
  const freeSheetRemaining = SHEET_PROBLEMS.filter(
    (problem) => !problem.isPremium && !seen.has(problem.slug)
  ).length;
  const newRemaining = PROBLEMS.filter(
    (problem) =>
      !seen.has(problem.slug) &&
      (!problem.isPremium || settings.includePremium) &&
      (problem.source === "sheet" || settings.extrasRate > 0)
  ).length;
  const waiting = items.filter((item) => item.status === "pending" && !item.isAvailable).length;
  const bonusCount = Math.max(0, visibleItems.length - settings.dailyGoal);

  let note: string | null = null;
  if (backlogCount > 0) {
    note = `${backlogCount} review${backlogCount === 1 ? "" : "s"} rolled over. Clear the backlog before adding more new work.`;
  } else if (waiting > 0 && doneCount + waiting >= settings.dailyGoal) {
    note = `All set for now. ${waiting} same-day review${waiting === 1 ? "" : "s"} will return later today.`;
  } else if (doneCount >= settings.dailyGoal) {
    note = "Daily goal complete. Anything else is optional.";
  } else if (items.length === 0) {
    note = "Nothing on deck. Mark sheet problems known or adjust your plan in Settings.";
  }

  return {
    date: today,
    settings,
    items,
    doneCount,
    goal: settings.dailyGoal,
    bonusCount,
    backlogCount,
    allDueCount: dueCards.length,
    streak: streakFromDates(reviewDates, today),
    weekly: weeklyStatsFor(cards, settings, today),
    sheetCompleted,
    sheetTotal: SHEET_PROBLEMS.length,
    freeSheetRemaining,
    newRemaining,
    note,
  };
}

export async function getProgressData(userId: string): Promise<ProgressData> {
  const settings = await getSettings(userId);
  const now = new Date();
  const today = localDateString(now, settings.timezone);
  await ensurePlanForDate(userId, today);
  const cards = await getAllCards(userId);
  const reviews = await getAllReviews(userId);
  const dueCards = await getDueCards(userId, today);
  const planItems = await getPlanItems(userId, today);
  const planSlugs = new Set(planItems.map((item) => item.slug));
  const cardBySlug = new Map(cards.map((card) => [card.slug, card]));
  const reviewDates = new Set(
    reviews.map((review) => localDateString(new Date(review.reviewedAt), settings.timezone))
  );
  const { counts } = weeklyCountsFromCards(cards, today, settings.timezone);
  const targets = weeklyTargets(settings);

  const sheetTotalsByTopic = Object.fromEntries(
    TOPIC_IDS.map((topic) => [topic, 0])
  ) as Record<TopicId, number>;
  const sheetDoneByTopic = Object.fromEntries(
    TOPIC_IDS.map((topic) => [topic, 0])
  ) as Record<TopicId, number>;
  const difficultyStats: Record<Difficulty, { completed: number; total: number }> = {
    Easy: { completed: 0, total: 0 },
    Medium: { completed: 0, total: 0 },
    Hard: { completed: 0, total: 0 },
  };

  for (const problem of SHEET_PROBLEMS) {
    sheetTotalsByTopic[problem.topic] += 1;
    difficultyStats[problem.difficulty].total += 1;
    if (cardBySlug.has(problem.slug)) {
      sheetDoneByTopic[problem.topic] += 1;
      difficultyStats[problem.difficulty].completed += 1;
    }
  }

  const topics: TopicProgress[] = TOPIC_IDS.map((topic) => ({
    topic,
    completed: sheetDoneByTopic[topic],
    total: sheetTotalsByTopic[topic],
    weeklyCount: counts[topic] ?? 0,
    weeklyTarget: targets[topic].target,
    weightPct: round(targets[topic].share * 100),
  }));

  const forecast: ForecastDay[] = [];
  for (let index = 0; index < 14; index++) {
    const date = addDaysToDateString(today, index);
    forecast.push({
      date,
      label: index === 0 ? "Today" : formatWeekday(date),
      count: 0,
      isToday: index === 0,
    });
  }
  for (const card of cards) {
    if (card.known || card.suspended || !card.dueAt) continue;
    const dueDate = localDateString(new Date(card.dueAt), settings.timezone);
    let index = diffCalendarDays(dueDate, today);
    if (index < 0) index = 0;
    if (index < forecast.length) forecast[index].count += 1;
  }

  const reviewCountByDate = new Map<string, number>();
  for (const review of reviews) {
    const date = localDateString(new Date(review.reviewedAt), settings.timezone);
    reviewCountByDate.set(date, (reviewCountByDate.get(date) ?? 0) + 1);
  }
  const heatmap: HeatmapDay[] = [];
  for (let offset = 111; offset >= 0; offset--) {
    const date = addDaysToDateString(today, -offset);
    heatmap.push({ date, count: reviewCountByDate.get(date) ?? 0 });
  }

  const goodReviews = reviews.filter((review) => review.rating >= 3).length;
  const recentReviews = reviews
    .slice(0, 6)
    .map((review) => {
      const problem = getProblem(review.slug);
      if (!problem) return null;
      return {
        slug: review.slug,
        title: problem.title,
        rating: review.rating,
        reviewedAt: review.reviewedAt,
        topic: problem.topic,
      };
    })
    .filter((review): review is NonNullable<typeof review> => review !== null);

  return {
    sheetCompleted: cards.filter((card) => card.source === "sheet").length,
    sheetTotal: SHEET_PROBLEMS.length,
    sheetFreeCompleted: cards.filter(
      (card) => card.source === "sheet" && !getProblem(card.slug)?.isPremium
    ).length,
    sheetFreeTotal: SHEET_PROBLEMS.filter((problem) => !problem.isPremium).length,
    extrasAttempted: cards.filter((card) => card.source === "company").length,
    extrasTotal: COMPANY_PROBLEMS.length,
    reviewsTotal: reviews.length,
    retention: reviews.length > 0 ? percent(goodReviews, reviews.length) : null,
    streak: streakFromDates(reviewDates, today),
    activeDays: reviewDates.size,
    dueToday: dueCards.length,
    backlog: dueCards.filter((card) => !planSlugs.has(card.slug)).length,
    topics,
    forecast,
    heatmap,
    difficulty: difficultyStats,
    recentReviews,
  };
}

export async function getSheetCards(userId: string): Promise<Card[]> {
  return getAllCards(userId);
}

export async function getSheetData(userId: string) {
  return {
    problems: PROBLEMS,
    sheetSlugs: SHEET_PROBLEMS.map((problem) => problem.slug),
    cards: await getAllCards(userId),
  };
}

export async function exportData(userId: string) {
  const settings = await getSettings(userId);
  const cards = await getAllCards(userId);
  const reviews = await getAllReviews(userId);
  const planResult = await query(
    `SELECT * FROM plan_items WHERE user_id = ? ORDER BY plan_date DESC, "position" ASC`,
    [userId]
  );
  return {
    app: "LeetSuggest",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    cards,
    reviews,
    planItems: planResult.map(rowToPlanItem),
  };
}

export async function resetProgress(userId: string): Promise<void> {
  await transaction([
    { sql: "DELETE FROM plan_items WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM plan_days WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM reviews WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM cards WHERE user_id = ?", args: [userId] },
  ]);
}

export async function resetAll(userId: string): Promise<void> {
  await resetProgress(userId);
  await query("DELETE FROM settings WHERE user_id = ?", [userId]);
  await initializeSettings(userId);
}

export async function getTopicCounts(userId: string) {
  const result = await query(
    "SELECT topic, COUNT(*) as count FROM cards WHERE user_id = ? GROUP BY topic",
    [userId]
  );
  return Object.fromEntries(
    result.map((row) => [str(row, "topic"), num(row, "count")])
  ) as Record<TopicId, number>;
}
