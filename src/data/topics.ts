import type { TopicId, TopicMeta } from "@/lib/types";
import defaultWeights from "./default-topic-weights.json";

export const TOPICS: TopicMeta[] = [
  {
    id: "arrays",
    name: "Arrays",
    shortName: "Arrays",
    description: "Scanning, sorting, matrices, and in-place tricks.",
    color: "#4f7cff",
  },
  {
    id: "two-pointers",
    name: "Two Pointers & Sliding Window",
    shortName: "Windows",
    description: "Pointer movement and contiguous subarray reasoning.",
    color: "#e46f4b",
  },
  {
    id: "binary-search",
    name: "Binary Search",
    shortName: "Binary Search",
    description: "Search spaces, rotated arrays, and answer-space search.",
    color: "#9b6cff",
  },
  {
    id: "hashing",
    name: "Hashing & Prefix Sums",
    shortName: "Hashing",
    description: "Frequency maps, prefix sums, and lookup-driven solutions.",
    color: "#239b97",
  },
  {
    id: "linked-list",
    name: "Linked Lists",
    shortName: "Linked List",
    description: "Pointer surgery, fast/slow traversal, and list design.",
    color: "#d79a2b",
  },
  {
    id: "stacks-queues",
    name: "Stacks & Queues",
    shortName: "Stacks & Queues",
    description: "Monotonic structures, parsing, and data-structure design.",
    color: "#cb5877",
  },
  {
    id: "recursion-backtracking",
    name: "Recursion & Backtracking",
    shortName: "Recursion",
    description: "Subsets, permutations, search trees, and pruning.",
    color: "#789a3a",
  },
  {
    id: "greedy",
    name: "Greedy & Intervals",
    shortName: "Greedy",
    description: "Local choices, scheduling, and interval reasoning.",
    color: "#d9862f",
  },
  {
    id: "heaps",
    name: "Heaps & Priority Queues",
    shortName: "Heaps",
    description: "Top-k, streaming medians, and priority-driven problems.",
    color: "#9a6b45",
  },
  {
    id: "binary-trees",
    name: "Binary Trees",
    shortName: "Trees",
    description: "Traversal, recursion, views, and tree dynamic programming.",
    color: "#3b9a6b",
  },
  {
    id: "bst",
    name: "Binary Search Trees",
    shortName: "BST",
    description: "Ordered traversal, validation, and BST operations.",
    color: "#6f8c3c",
  },
  {
    id: "graphs",
    name: "Graphs",
    shortName: "Graphs",
    description: "Traversal, connectivity, shortest paths, and union-find.",
    color: "#5267d8",
  },
  {
    id: "dynamic-programming",
    name: "Dynamic Programming",
    shortName: "DP",
    description: "States, transitions, subsequences, and partition DP.",
    color: "#bb4f86",
  },
  {
    id: "tries",
    name: "Tries",
    shortName: "Tries",
    description: "Prefix trees, XOR tries, and string dictionaries.",
    color: "#7b61d6",
  },
  {
    id: "strings",
    name: "Strings",
    shortName: "Strings",
    description: "Parsing, matching, hashing, and string transforms.",
    color: "#159b9b",
  },
  {
    id: "bit-manipulation",
    name: "Bit Manipulation",
    shortName: "Bits",
    description: "Bitwise identities, XOR tricks, and masks.",
    color: "#718034",
  },
  {
    id: "math",
    name: "Math & Number Theory",
    shortName: "Math",
    description: "Arithmetic, primes, combinatorics, and numerical reasoning.",
    color: "#8b7d62",
  },
];

export const TOPIC_MAP = Object.fromEntries(TOPICS.map((topic) => [topic.id, topic])) as Record<
  TopicId,
  TopicMeta
>;

export const TOPIC_IDS = TOPICS.map((topic) => topic.id);

export const DEFAULT_WEIGHTS = defaultWeights as Record<TopicId, number>;

export function topicName(id: TopicId): string {
  return TOPIC_MAP[id]?.name ?? id;
}
