import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const SHEET_URL = 'https://takeuforward.org/prep-hub/strivers-180-master-dsa-patterns';
const COMPANIES = [
  'Amazon',
  'Google',
  'Microsoft',
  'Meta',
  'Adobe',
  'Apple',
  'Uber',
  'Flipkart',
  'Atlassian',
  'Netflix'
];

const CATEGORY_TOPIC = {
  arrays: 'arrays',
  'linear-scan': 'arrays',
  'divide-and-conquer': 'arrays',
  'two-pointers': 'two-pointers',
  'sliding-window-and-two-pointers': 'two-pointers',
  'sliding-window': 'two-pointers',
  'counting-windows': 'two-pointers',
  hashing: 'hashing',
  'hashing-prefix-sums': 'hashing',
  'binary-search': 'binary-search',
  'search-on-answer': 'binary-search',
  'partition-search': 'binary-search',
  'recursion-and-backtracking': 'recursion-backtracking',
  'subsets-combinations': 'recursion-backtracking',
  backtracking: 'recursion-backtracking',
  'linked-list': 'linked-list',
  'fast-slow-pointers': 'linked-list',
  'reversal-rewiring': 'linked-list',
  'stack-and-queues': 'stacks-queues',
  'monotonic-stack-queue': 'stacks-queues',
  'data-structure-design': 'stacks-queues',
  'greedy-algorithms': 'greedy',
  greedy: 'greedy',
  'intervals-scheduling': 'greedy',
  heaps: 'heaps',
  'heap-priority-queue': 'heaps',
  'binary-trees': 'binary-trees',
  bfs: 'binary-trees',
  'dfs-tree-dp': 'binary-trees',
  'binary-search-trees': 'bst',
  'inorder-traversal': 'bst',
  graphs: 'graphs',
  'bfs-dfs': 'graphs',
  'ordering-connectivity': 'graphs',
  'shortest-path': 'graphs',
  'dsu-mst': 'graphs',
  'dynamic-programming': 'dynamic-programming',
  'state-transition-dp': 'dynamic-programming',
  'knapsack-dp': 'dynamic-programming',
  'sequence-dp': 'dynamic-programming',
  'partition-dp': 'dynamic-programming',
  tries: 'tries',
  trie: 'tries',
  strings: 'strings',
  'string-matching': 'strings',
  'bit-manipulation': 'bit-manipulation',
  mathematics: 'math',
  'number-theory': 'math'
};

const SLUG_OVERRIDES = {
  'flattening-of-ll': 'flatten-a-multilevel-doubly-linked-list',
  'detect-a-cycle-in-an-undirected-graph': 'redundant-connection',
  'kmp-algorithm-or-lps-array': 'find-the-index-of-the-first-occurrence-in-a-string',
  "kosaraju's-algorithm": null
};

const TOPIC_ORDER = [
  'arrays',
  'two-pointers',
  'binary-search',
  'hashing',
  'linked-list',
  'stacks-queues',
  'recursion-backtracking',
  'greedy',
  'heaps',
  'binary-trees',
  'bst',
  'graphs',
  'dynamic-programming',
  'tries',
  'strings',
  'bit-manipulation',
  'math'
];

const TAG_PRIORITY = [
  [['trie'], 'tries'],
  [['binary search tree'], 'bst'],
  [['union find', 'graph', 'topological sort', 'shortest path', 'minimum spanning tree'], 'graphs'],
  [['heap (priority queue)', 'heap', 'ordered set'], 'heaps'],
  [['dynamic programming', 'memoization'], 'dynamic-programming'],
  [['backtracking', 'recursion'], 'recursion-backtracking'],
  [['linked list', 'doubly-linked list'], 'linked-list'],
  [['monotonic stack', 'monotonic queue', 'stack', 'queue', 'design', 'data stream'], 'stacks-queues'],
  [['binary tree', 'tree', 'depth-first search', 'breadth-first search'], 'binary-trees'],
  [['sliding window', 'two pointers'], 'two-pointers'],
  [['binary search'], 'binary-search'],
  [['greedy'], 'greedy'],
  [['bit manipulation'], 'bit-manipulation'],
  [['hash table', 'prefix sum', 'counting'], 'hashing'],
  [['string', 'string matching', 'rolling hash'], 'strings'],
  [['math', 'number theory', 'geometry', 'combinatorics', 'probability'], 'math'],
  [['array', 'matrix', 'sorting', 'divide and conquer', 'simulation'], 'arrays']
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function topicFromTags(tags) {
  const lower = tags.map((tag) => tag.toLowerCase());
  for (const [needles, topic] of TAG_PRIORITY) {
    if (needles.some((needle) => lower.includes(needle))) return topic;
  }
  return 'arrays';
}

function slugFromLink(link) {
  const match = String(link ?? '').match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  return match?.[1] ?? null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,text/csv,application/json' }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.text();
}

function parseTufRows(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)];
  let payload = '';
  for (const chunk of chunks) payload += JSON.parse('"' + chunk[1] + '"');
  const marker = payload.indexOf('"rows":');
  if (marker === -1) throw new Error('Could not find rows in TUF payload');
  const start = payload.indexOf('[', marker);
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < payload.length; i++) {
    const char = payload[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error('Could not isolate TUF rows array');
  return JSON.parse(payload.slice(start, end + 1));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

async function fetchQuestionDetails(slugs) {
  const unique = [...new Set(slugs.filter(Boolean))];
  const details = new Map();
  for (let offset = 0; offset < unique.length; offset += 25) {
    const batch = unique.slice(offset, offset + 25);
    const fields = batch
      .map(
        (slug, index) =>
          `q${index}: question(titleSlug: ${JSON.stringify(slug)}) { questionId title titleSlug difficulty isPaidOnly topicTags { name slug } }`
      )
      .join('\n');
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'user-agent': UA,
        'content-type': 'application/json',
        referer: 'https://leetcode.com/problemset/'
      },
      body: JSON.stringify({ query: `query {\n${fields}\n}` })
    });
    if (!res.ok) throw new Error(`LeetCode GraphQL failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`LeetCode GraphQL error: ${JSON.stringify(json.errors)}`);
    batch.forEach((slug, index) => details.set(slug, json.data?.[`q${index}`] ?? null));
    process.stdout.write(`LeetCode details ${Math.min(offset + 25, unique.length)}/${unique.length}\r`);
    await sleep(350);
  }
  process.stdout.write('\n');
  return details;
}

async function main() {
  await mkdir(dataDir, { recursive: true });

  console.log('Fetching Striver SDE sheet...');
  const html = await fetchText(SHEET_URL);
  const rows = parseTufRows(html);
  const categories = Object.fromEntries(
    rows.filter((row) => row[3] === 'category').map((row) => [row[2], row[4]])
  );
  const items = rows.filter((row) => row[3] === 'item');

  const sheetCandidates = [];
  const seen = new Set();
  let order = 0;
  for (const item of items) {
    const itemSlug = item[2];
    const link = item.find(
      (value) => typeof value === 'string' && value.includes('leetcode.com/problems/')
    );
    const redirect = item[7] && typeof item[7] === 'object' ? item[7] : {};
    const override = Object.hasOwn(SLUG_OVERRIDES, itemSlug) ? SLUG_OVERRIDES[itemSlug] : undefined;
    const slug = override === null ? null : (override ?? slugFromLink(link));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    sheetCandidates.push({
      slug,
      sheetTitle: String(item[5] ?? '').trim(),
      category: redirect.category ?? null,
      pattern: categories[redirect.category] ?? null,
      topic: CATEGORY_TOPIC[redirect.category] ?? null,
      order: order++
    });
  }
  console.log(`Sheet candidates with unique LeetCode links: ${sheetCandidates.length}`);

  console.log('Fetching company problem lists...');
  const companyIndex = new Map();
  for (const company of COMPANIES) {
    const url = `https://cdn.jsdelivr.net/gh/liquidslr/leetcode-company-wise-problems@main/${encodeURIComponent(
      company
    )}/${encodeURIComponent('5. All.csv')}`;
    const csv = parseCsv(await fetchText(url));
    for (const row of csv) {
      const slug = slugFromLink(row.Link);
      if (!slug) continue;
      const frequency = Number.parseFloat(row.Frequency) || 0;
      const topics = String(row.Topics ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const entry =
        companyIndex.get(slug) ?? {
          slug,
          companies: new Set(),
          frequencyMax: 0,
          frequencySum: 0,
          topics: new Set(),
          difficulty: String(row.Difficulty ?? '').toLowerCase()
        };
      entry.companies.add(company);
      entry.frequencyMax = Math.max(entry.frequencyMax, frequency);
      entry.frequencySum += frequency;
      topics.forEach((tag) => entry.topics.add(tag));
      companyIndex.set(slug, entry);
    }
    console.log(`  ${company}: ${csv.length} rows`);
  }

  const allCompanyProblems = [...companyIndex.values()].map((entry) => ({
    ...entry,
    companies: [...entry.companies].sort(),
    topics: [...entry.topics],
    topic: topicFromTags([...entry.topics])
  }));

  const sheetSlugs = new Set(sheetCandidates.map((item) => item.slug));
  const extrasByTopic = new Map();
  for (const problem of allCompanyProblems) {
    if (sheetSlugs.has(problem.slug)) continue;
    const list = extrasByTopic.get(problem.topic) ?? [];
    list.push(problem);
    extrasByTopic.set(problem.topic, list);
  }
  const extraCandidates = [];
  for (const topic of TOPIC_ORDER) {
    const list = (extrasByTopic.get(topic) ?? []).sort(
      (a, b) => b.frequencyMax - a.frequencyMax || a.slug.localeCompare(b.slug)
    );
    extraCandidates.push(...list.slice(0, 18));
  }
  console.log(`Company extra candidates: ${extraCandidates.length} (${allCompanyProblems.length} unique problems)`);

  console.log('Fetching difficulty and topic tags from LeetCode...');
  const details = await fetchQuestionDetails([
    ...sheetCandidates.map((item) => item.slug),
    ...extraCandidates.map((item) => item.slug)
  ]);

  const sheet = [];
  let droppedSheet = 0;
  for (const item of sheetCandidates) {
    const detail = details.get(item.slug);
    if (!detail) {
      droppedSheet++;
      continue;
    }
    sheet.push({
      id: item.slug,
      slug: item.slug,
      title: detail.title,
      sheetTitle: item.sheetTitle && item.sheetTitle !== detail.title ? item.sheetTitle : null,
      url: `https://leetcode.com/problems/${item.slug}/`,
      difficulty: detail.difficulty,
      isPremium: Boolean(detail.isPaidOnly),
      topic: item.topic ?? topicFromTags(detail.topicTags.map((tag) => tag.name)),
      pattern: item.pattern,
      leetcodeTopics: detail.topicTags.map((tag) => tag.name),
      source: 'sheet',
      sheetOrder: item.order,
      companies: [],
      frequency: null
    });
  }

  const extras = [];
  for (const candidate of extraCandidates) {
    const detail = details.get(candidate.slug);
    if (!detail) continue;
    extras.push({
      id: candidate.slug,
      slug: candidate.slug,
      title: detail.title,
      url: `https://leetcode.com/problems/${candidate.slug}/`,
      difficulty: detail.difficulty,
      isPremium: Boolean(detail.isPaidOnly),
      topic: topicFromTags(detail.topicTags.map((tag) => tag.name)),
      pattern: null,
      leetcodeTopics: detail.topicTags.map((tag) => tag.name),
      source: 'company',
      sheetOrder: null,
      companies: candidate.companies,
      frequency: Math.round(candidate.frequencyMax * 10) / 10
    });
  }

  const topicSums = Object.fromEntries(TOPIC_ORDER.map((topic) => [topic, 0]));
  for (const problem of allCompanyProblems) {
    topicSums[problem.topic] += problem.frequencySum;
  }
  const total = Object.values(topicSums).reduce((sum, value) => sum + value, 0) || 1;
  const rawWeights = Object.fromEntries(
    TOPIC_ORDER.map((topic) => [topic, Math.max(2, (topicSums[topic] / total) * 100)])
  );
  const weightTotal = Object.values(rawWeights).reduce((sum, value) => sum + value, 0);
  const defaultWeights = Object.fromEntries(
    TOPIC_ORDER.map((topic) => [topic, Math.round((rawWeights[topic] / weightTotal) * 1000) / 10])
  );

  const meta = {
    generatedAt: new Date().toISOString(),
    sheetSource: SHEET_URL,
    companySource: 'https://github.com/liquidslr/leetcode-company-wise-problems',
    companies: COMPANIES,
    sheetCount: sheet.length,
    sheetFreeCount: sheet.filter((problem) => !problem.isPremium).length,
    sheetPremiumCount: sheet.filter((problem) => problem.isPremium).length,
    droppedSheetCount: droppedSheet,
    extraCount: extras.length,
    extraFreeCount: extras.filter((problem) => !problem.isPremium).length,
    topicCounts: Object.fromEntries(
      TOPIC_ORDER.map((topic) => [
        topic,
        {
          sheet: sheet.filter((problem) => problem.topic === topic).length,
          extras: extras.filter((problem) => problem.topic === topic).length
        }
      ])
    )
  };

  await writeFile(join(dataDir, 'sheet.json'), JSON.stringify(sheet, null, 2) + '\n', 'utf8');
  await writeFile(join(dataDir, 'extras.json'), JSON.stringify(extras, null, 2) + '\n', 'utf8');
  await writeFile(
    join(dataDir, 'default-topic-weights.json'),
    JSON.stringify(defaultWeights, null, 2) + '\n',
    'utf8'
  );
  await writeFile(join(dataDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');

  console.log('\nSeed complete');
  console.log(`Sheet: ${sheet.length} problems (${meta.sheetFreeCount} free, ${meta.sheetPremiumCount} premium)`);
  console.log(`Extras: ${extras.length} problems (${meta.extraFreeCount} free)`);
  console.log('Default weights:', defaultWeights);
  console.log('Topic counts:', meta.topicCounts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
