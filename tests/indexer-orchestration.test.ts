import { beforeEach, describe, expect, it, vi } from "vitest";
import { Document } from "@langchain/core/documents";
import type { PrismaClient } from "@prisma/client";
const { load, embed, replace, db } = vi.hoisted(() => ({
  load: vi.fn(),
  embed: vi.fn(),
  replace: vi.fn(),
  db: {
    $queryRaw: vi.fn(),
    repository: { findUnique: vi.fn(), updateMany: vi.fn() },
    storeSettings: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/services/indexer/github", () => ({ loadGithubDocuments: load }));
vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: class {
    embedDocuments = embed;
  },
}));
vi.mock("@/services/indexer/vector-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/indexer/vector-store")>()),
  replaceDocuments: replace,
}));
import { Indexer } from "@/services/indexer";

beforeEach(() => {
  vi.resetAllMocks();
  db.repository.findUnique.mockResolvedValue({
    id: "repo",
    url: "https://github.com/a/b",
  });
  db.storeSettings.findUnique.mockResolvedValue({
    openAiKey: "secret-openai",
    githubAccessToken: "secret-github",
  });
  db.$queryRaw.mockResolvedValue([{ exists: false }]);
  load.mockResolvedValue([new Document({ pageContent: "test source" })]);
  embed.mockResolvedValue([Array(1536).fill(0.1)]);
});

describe("indexing lifecycle", () => {
  it("only replaces after every external operation succeeds", async () => {
    await new Indexer(db as unknown as PrismaClient).run("repo", "develop");
    expect(load).toHaveBeenCalledWith(
      "https://github.com/a/b",
      "secret-github",
      "develop",
    );
    expect(replace).toHaveBeenCalledWith(
      "repo",
      ["test source"],
      [Array(1536).fill(0.1)],
      db,
    );
    expect(db.repository.updateMany).not.toHaveBeenCalled();
  });
  it("preserves existing index on provider error and stores only safe error text", async () => {
    db.$queryRaw.mockResolvedValue([{ exists: true }]);
    embed.mockRejectedValue(new Error("upstream secret-openai payload"));
    await expect(
      new Indexer(db as unknown as PrismaClient).run("repo"),
    ).rejects.toThrow("Indexing failed");
    expect(replace).not.toHaveBeenCalled();
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: "repo" },
      data: {
        status: "IMPORTED",
        error: expect.stringContaining("previous index was preserved"),
      },
    });
    expect(JSON.stringify(db.repository.updateMany.mock.calls)).not.toContain(
      "secret-openai",
    );
  });
  it("marks a first import as ERROR and tolerates deletion during import", async () => {
    load.mockRejectedValue(new Error("network failed"));
    db.repository.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      new Indexer(db as unknown as PrismaClient).run("repo"),
    ).rejects.toThrow("Indexing failed");
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: "repo" },
      data: { status: "ERROR", error: expect.any(String) },
    });
  });
  it("awaits the failure state before rejecting the import request", async () => {
    load.mockRejectedValue(new Error("network failed"));
    let finish!: () => void;
    db.repository.updateMany.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let rejected = false;
    const promise = new Indexer(db as unknown as PrismaClient)
      .run("repo")
      .catch(() => {
        rejected = true;
      });
    await vi.waitFor(() => expect(db.repository.updateMany).toHaveBeenCalled());
    expect(rejected).toBe(false);
    finish();
    await promise;
    expect(rejected).toBe(true);
  });
});
