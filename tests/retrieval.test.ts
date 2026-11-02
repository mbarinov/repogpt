import { describe, expect, it } from "vitest";
import { lexicalTerms, fuseCandidates } from "@/services/indexer/retrieval";
import type { RetrievedChunk } from "@/services/indexer/types";

const document = (
  id: string,
  overrides: Partial<RetrievedChunk> = {},
): RetrievedChunk => ({
  id,
  content: id,
  context: "",
  path: `src/${id}.ts`,
  language: "typescript",
  startLine: 1,
  endLine: 10,
  blobSha: "a".repeat(40),
  commitSha: "b".repeat(40),
  ...overrides,
});
describe("lexical identifier normalization", () => {
  it("keeps full identifiers and splits camelCase, snake_case and paths", () => {
    expect(
      lexicalTerms(
        "loadRepositoryFiles src/auth/session_store.ts HTTP_TIMEOUT",
      ),
    ).toEqual(
      expect.arrayContaining([
        "loadrepositoryfiles",
        "load",
        "repository",
        "files",
        "session_store",
        "session",
        "store",
        "http_timeout",
        "http",
        "timeout",
      ]),
    );
  });
  it("bounds arbitrary query syntax without interpreting SQL or tsquery operators", () => {
    const terms = lexicalTerms(
      "'; DROP TABLE Document; -- foo%_bar | & ! : * " + "word ".repeat(100),
    );
    expect(terms.length).toBeLessThanOrEqual(32);
    expect(terms.every((term) => /^[\p{L}\p{N}_]+$/u.test(term))).toBe(true);
    expect(lexicalTerms(" % | & ! : * ")).toEqual([]);
  });
});
describe("deterministic reciprocal rank fusion", () => {
  it("promotes lexical exact-code evidence above a semantically generic distractor", () => {
    const exact = document("exact");
    const generic = document("generic");
    expect(fuseCandidates([generic, exact], [exact, generic], 2)[0].id).toBe(
      "exact",
    );
  });
  it("uses semantic results for an empty lexical query and bounds output", () => {
    expect(
      fuseCandidates(
        Array.from({ length: 20 }, (_, i) => document(String(i))),
        [],
      ).map((x) => x.id),
    ).toEqual(["0", "1", "2", "3", "4", "5"]);
  });
  it("deduplicates IDs and heavily overlapping source spans but not other snapshots", () => {
    const a = document("a", { path: "src/a.ts", startLine: 10, endLine: 30 });
    const overlap = document("b", {
      path: "src/a.ts",
      startLine: 12,
      endLine: 29,
    });
    const anotherSnapshot = document("c", {
      path: "src/a.ts",
      startLine: 12,
      endLine: 29,
      commitSha: "c".repeat(40),
    });
    expect(
      fuseCandidates([a, overlap, anotherSnapshot], [a]).map((x) => x.id),
    ).toEqual(["a", "c"]);
  });
  it("keeps distinct legacy documents without pretending their null spans overlap", () => {
    const legacy = {
      path: null,
      startLine: null,
      endLine: null,
      commitSha: null,
      blobSha: null,
    };
    expect(
      fuseCandidates([document("a", legacy), document("b", legacy)], []),
    ).toHaveLength(2);
  });
  it("breaks equal scores by document ID, not input race order", () => {
    expect(
      fuseCandidates(
        [document("b"), document("a")],
        [document("a"), document("b")],
      )[0].id,
    ).toBe("a");
  });
});

import { searchDocuments } from "@/services/indexer/vector-store";
import type { PrismaClient } from "@prisma/client";
import { vi } from "vitest";
it("retrieves both candidate lists in one snapshot with bound adversarial inputs", async () => {
  const query = "loadRepositoryFiles'; DROP TABLE Document; %_";
  const repo = "repo' OR 1=1 --";
  const execute = vi.fn().mockResolvedValue([]);
  await searchDocuments(repo, Array(1536).fill(0.1), query, {
    $queryRaw: execute,
  } as unknown as PrismaClient);
  expect(execute).toHaveBeenCalledTimes(1);
  for (const [sql] of execute.mock.calls) {
    expect(sql.text).not.toContain(repo);
    expect(sql.text).not.toContain(query);
    expect(sql.values).toContain(repo);
    expect(sql.text).toContain('"namespace"');
  }
});
it("keeps distinct fragments of an oversized single source line", () => {
  const source = {
    path: "large.ts",
    commitSha: "a".repeat(40),
    startLine: 7,
    endLine: 7,
  };
  expect(
    fuseCandidates(
      [
        document("a", { ...source, content: "const start = [1,2,3," }),
        document("b", { ...source, content: "4,5,6];" }),
      ],
      [],
    ),
  ).toHaveLength(2);
});
import { replaceDocuments } from "@/services/indexer/vector-store";
it("rejects combined content/context over budget before starting a write", async () => {
  const db = { $transaction: vi.fn() };
  await expect(
    replaceDocuments(
      "repo",
      [document("a", { content: "a".repeat(3200), context: "b".repeat(800) })],
      [Array(1536).fill(0.1)],
      db as unknown as PrismaClient,
    ),
  ).rejects.toThrow("Invalid document batch");
  await expect(
    replaceDocuments(
      "repo",
      [document("a", { content: "a", context: "b".repeat(801) })],
      [Array(1536).fill(0.1)],
      db as unknown as PrismaClient,
    ),
  ).rejects.toThrow("Invalid document batch");
  expect(db.$transaction).not.toHaveBeenCalled();
});
