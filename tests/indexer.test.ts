import { describe, expect, it, vi } from "vitest";
import { Document } from "@langchain/core/documents";
import {
  embedChunks,
  prepareChunks,
  sanitizeContent,
  EMBEDDING_BATCH_SIZE,
} from "@/services/indexer";
import {
  parseBranch,
  parseRepositoryUrl,
  loadGithubDocuments,
  shouldIndexPath,
} from "@/services/indexer/github";
import {
  EMBEDDING_DIMENSIONS,
  replaceDocuments,
  vectorLiteral,
} from "@/services/indexer/vector-store";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ default: {} }));
const vector = () => Array(EMBEDDING_DIMENSIONS).fill(0.1);

describe("repository inputs", () => {
  it("canonicalizes GitHub URLs and rejects other origins and embedded credentials", () => {
    expect(parseRepositoryUrl("https://github.com/owner/repo.git/").url).toBe(
      "https://github.com/owner/repo",
    );
    for (const url of [
      "https://evil.test/a/b",
      "http://github.com/a/b",
      "https://token@github.com/a/b",
      "https://github.com/a/b/tree/main",
      "https://github.com/a/b?token=x",
    ])
      expect(() => parseRepositoryUrl(url)).toThrow();
  });
  it("accepts slash branches but not git control syntax", () => {
    expect(parseBranch("feature/a")).toBe("feature/a");
    expect(parseBranch("")).toBeUndefined();
    for (const branch of ["a..b", "a b", "main~1", "x\n"])
      expect(() => parseBranch(branch)).toThrow();
  });
  it("indexes manifests and CI but excludes generated files, secrets and locks", () => {
    for (const path of [
      "package.json",
      "tsconfig.json",
      ".github/workflows/ci.yml",
      ".env.example",
      "src/a.ts",
    ])
      expect(shouldIndexPath(path)).toBe(true);
    for (const path of [
      "node_modules/a.ts",
      "x/dist/a.js",
      ".env",
      ".env.local",
      "id_rsa",
      "x.pem",
      "pnpm-lock.yaml",
      "a.png",
    ])
      expect(shouldIndexPath(path)).toBe(false);
  });
});

describe("GitHub loading (issue #11 regression coverage; mocked API)", () => {
  it("sends Bearer authorization for fine-grained PATs, uses default branch and immutable blobs", async () => {
    const sha = "a".repeat(40);
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ default_branch: "develop" }))
      .mockResolvedValueOnce(
        Response.json({
          tree: [
            {
              type: "blob",
              mode: "100644",
              path: "package.json",
              size: 20,
              sha,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          encoding: "base64",
          content: Buffer.from('{"name":"test"}').toString("base64"),
        }),
      );
    const docs = await loadGithubDocuments(
      "https://github.com/a/b",
      "test-token",
      undefined,
      request,
    );
    expect(docs[0].metadata.source).toBe("package.json");
    expect(request.mock.calls[1][0]).toContain(
      "/git/trees/develop?recursive=1",
    );
    expect(request.mock.calls[2][0]).toContain(`/git/blobs/${sha}`);
    expect(request.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });
  it("reports permission guidance without reflecting upstream secrets", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("secret-token upstream payload", { status: 403 }),
      );
    await expect(
      loadGithubDocuments(
        "https://github.com/a/b",
        "secret-token",
        "main",
        request,
      ),
    ).rejects.toThrow("Contents: Read");
    await expect(
      loadGithubDocuments(
        "https://github.com/a/b",
        "secret-token",
        "main",
        request,
      ),
    ).rejects.not.toThrow("secret-token");
  });
  it("rejects truncated trees instead of claiming a complete index", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ tree: [], truncated: true }));
    await expect(
      loadGithubDocuments("https://github.com/a/b", "token", "main", request),
    ).rejects.toThrow("too large");
  });
});

describe("embedding input safety (issue #7 regression coverage; no provider reproduction)", () => {
  it("removes NUL and malformed surrogate characters while preserving emoji", () => {
    expect(sanitizeContent(" a\0\uD800😀\uDC00 ")).toBe("a😀");
  });
  it("drops empty chunks and refuses an empty index", async () => {
    await expect(
      prepareChunks([new Document({ pageContent: "\0  " })]),
    ).rejects.toThrow("No indexable text");
  });
  it("bounds batches, validates vectors and preserves all results", async () => {
    const embed = vi.fn(async (texts: string[]) => texts.map(vector));
    const chunks = Array(EMBEDDING_BATCH_SIZE + 1).fill("hello");
    expect(await embedChunks(chunks, embed)).toHaveLength(chunks.length);
    expect(embed.mock.calls.map((call) => call[0].length)).toEqual([32, 1]);
    await expect(embedChunks([" "], embed)).rejects.toThrow(
      "Invalid embedding input",
    );
    await expect(embedChunks(["a"], async () => [[]])).rejects.toThrow(
      "Invalid embedding vector",
    );
    await expect(embedChunks(["a"], async () => [])).rejects.toThrow(
      "Incomplete",
    );
    expect(() => vectorLiteral([...Array(1535).fill(0), NaN])).toThrow();
  });
  it("validates all vectors before entering the replacement transaction", async () => {
    const transaction = vi.fn();
    await expect(
      replaceDocuments("repo", ["a"], [[]], {
        $transaction: transaction,
      } as unknown as PrismaClient),
    ).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });
});
