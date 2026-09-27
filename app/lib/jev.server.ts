/**
 * Jev classification service via OpenRouter Decisions API.
 * Model: typesafe/jev-1.13
 * Endpoint: POST https://openrouter.ai/api/alpha/decisions
 *
 * We use two primitives per file:
 *   - noul  "is_relevant"  → probability this file is relevant to the task
 *   - score "importance"   → 0=skip / 1=helpful / 2=critical
 */

import type { MirroredFile, JevRelevance } from "./store.server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const JEV_MODEL = "typesafe/jev-1.13";
const DECISIONS_ENDPOINT = "https://openrouter.ai/api/alpha/decisions";

/** Cache TTL: 5 minutes per task+file combination */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface JevDecisionResponse {
  answers: {
    is_relevant: { type: "noul"; noul: number };
    importance: {
      type: "score";
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
    };
  };
  usage: { input_tokens: number; output_tokens: number; cost: number };
}

/**
 * Ask Jev whether a single file is relevant to a given task.
 * Returns cached result if still fresh.
 */
export async function classifyFile(
  file: MirroredFile,
  task: string,
): Promise<JevRelevance> {
  // Check cache
  const cached = file.relevanceCache.get(task);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  if (!OPENROUTER_API_KEY) {
    // No key configured — return a neutral result so the app still works
    const fallback: JevRelevance = {
      task,
      isRelevant: true,
      probability: 0.5,
      score: 1,
      cachedAt: Date.now(),
    };
    file.relevanceCache.set(task, fallback);
    return fallback;
  }

  // Truncate content to keep tokens reasonable (first 2 000 chars)
  const preview = file.content.slice(0, 2000);

  const body = {
    model: JEV_MODEL,
    state: {
      task_description: task,
      file_path: file.path,
      file_language: file.language,
      file_preview: preview,
      file_size_chars: file.size,
    },
    questions: {
      is_relevant: {
        type: "noul",
        instructions:
          "Is this file relevant to the task described in task_description?",
        criteria: {
          true: "The file contains code, configuration, types, tests, or documentation that directly relates to what the task requires to read, modify, or understand.",
          false: "The file is unrelated to the task: different domain, generated artifacts, lock files, or assets the task would never touch.",
        },
      },
      importance: {
        type: "score",
        instructions:
          "How important is this file to completing the task?",
        criteria: [
          "Not needed — the task can be completed without reading this file",
          "Helpful context — reading it would improve the implementation",
          "Critical — the task cannot be done correctly without this file",
        ],
      },
    },
  };

  const res = await fetch(DECISIONS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jev API error ${res.status}: ${text}`);
  }

  const data: JevDecisionResponse = await res.json();
  const relevance: JevRelevance = {
    task,
    isRelevant: data.answers.is_relevant.noul >= 0.5,
    probability: data.answers.is_relevant.noul,
    score: data.answers.importance.score,
    cachedAt: Date.now(),
  };

  file.relevanceCache.set(task, relevance);
  return relevance;
}

/**
 * Classify all files in a workspace for a given task.
 * Runs in parallel (up to 10 concurrent) to respect rate limits.
 */
export async function classifyWorkspace(
  files: MirroredFile[],
  task: string,
): Promise<Map<string, JevRelevance>> {
  const results = new Map<string, JevRelevance>();
  const CONCURRENCY = 10;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((f) => classifyFile(f, task).then((r) => ({ path: f.path, r }))),
    );
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.set(s.value.path, s.value.r);
      }
    }
  }

  return results;
}
