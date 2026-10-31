import type { Problem, TopicId } from "@/lib/types";
import sheetData from "./sheet.json";
import extrasData from "./extras.json";

const sheet = (sheetData as unknown as Problem[])
  .slice()
  .sort((a, b) => (a.sheetOrder ?? 0) - (b.sheetOrder ?? 0));

const extras = (extrasData as unknown as Problem[])
  .slice()
  .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0) || a.title.localeCompare(b.title));

export const SHEET_PROBLEMS = sheet;
export const COMPANY_PROBLEMS = extras;
export const PROBLEMS: Problem[] = [...sheet, ...extras];

export const PROBLEM_BY_SLUG = new Map(PROBLEMS.map((problem) => [problem.slug, problem]));
export const SHEET_SLUGS = new Set(sheet.map((problem) => problem.slug));

export function getProblem(slug: string): Problem | undefined {
  return PROBLEM_BY_SLUG.get(slug);
}

export function countByTopic(problems: Problem[]): Record<TopicId, number> {
  const counts = {} as Record<TopicId, number>;
  for (const problem of problems) {
    counts[problem.topic] = (counts[problem.topic] ?? 0) + 1;
  }
  return counts;
}
