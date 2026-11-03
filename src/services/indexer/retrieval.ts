import type { RetrievedChunk } from "./types";

export const RETRIEVAL_LIMIT = 6;
export const CANDIDATE_LIMIT = 24;

/** Keep exact tokens as well as the words within identifiers and source paths. */
export function lexicalTerms(query: string): string[] {
  const words = query.slice(0, 16000);
  const split = words
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ");
  return [
    ...new Set(
      (
        `${words} ${split}`.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []
      ).filter((token) => /[\p{L}\p{N}]/u.test(token)),
    ),
  ].slice(0, 32);
}

export function lexicalWeight(query: string): number {
  // A single identifier, a path, an error code or a quoted literal is a code lookup.
  return /^\s*[\p{L}\p{N}_]+\s*$/u.test(query) ||
    /[a-z][A-Z]|\w_\w|\w[/.]\w|\w\/\w|["`]/.test(query)
    ? 2
    : 1;
}

function overlaps(a: RetrievedChunk, b: RetrievedChunk): boolean {
  if (
    !a.path ||
    !a.commitSha ||
    a.path !== b.path ||
    a.commitSha !== b.commitSha ||
    a.startLine == null ||
    a.endLine == null ||
    b.startLine == null ||
    b.endLine == null
  )
    return false;
  // Character-bounded fragments of one long line share line numbers without sharing text.
  if (a.startLine === a.endLine || b.startLine === b.endLine)
    return a.content === b.content;
  const intersection = Math.max(
    0,
    Math.min(a.endLine, b.endLine) - Math.max(a.startLine, b.startLine) + 1,
  );
  return (
    intersection /
      Math.min(a.endLine - a.startLine + 1, b.endLine - b.startLine + 1) >=
    0.8
  );
}

/** Scores are reciprocal ranks, not incomparable cosine and full-text scores. */
export function fuseCandidates(
  semantic: RetrievedChunk[],
  lexical: RetrievedChunk[],
  weight = 1,
): RetrievedChunk[] {
  const candidates = new Map<
    string,
    { document: RetrievedChunk; score: number }
  >();
  for (const [documents, multiplier] of [
    [semantic, 1],
    [lexical, weight],
  ] as const) {
    const seen = new Set<string>();
    documents.forEach((document, index) => {
      if (seen.has(document.id)) return;
      seen.add(document.id);
      const current = candidates.get(document.id) ?? { document, score: 0 };
      current.score += multiplier / (60 + index + 1);
      candidates.set(document.id, current);
    });
  }
  const ranked = [...candidates.values()].sort(
    (a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id),
  );
  const result: RetrievedChunk[] = [];
  for (const { document } of ranked) {
    if (!result.some((existing) => overlaps(existing, document)))
      result.push(document);
    if (result.length === RETRIEVAL_LIMIT) break;
  }
  return result;
}
