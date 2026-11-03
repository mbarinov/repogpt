import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import type { SourceChunk } from "@/services/indexer/types";
const chunk = (
  content: string,
  fields: Partial<SourceChunk> = {},
): SourceChunk => ({
  content,
  context: "",
  path: null,
  language: null,
  startLine: null,
  endLine: null,
  blobSha: null,
  commitSha: null,
  ...fields,
});
import {
  replaceDocuments,
  searchDocuments,
} from "@/services/indexer/vector-store";

// Explicit opt-in: never run destructive integration fixtures against the application's DB.
const url = process.env.TEST_DATABASE_URL;
const db = url
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  : null;
afterAll(async () => {
  await db?.$disconnect();
});

describe.skipIf(!url)("PostgreSQL / pgvector integration", () => {
  it("atomically replaces and retrieves an index, rolls back failed writes, cascades deletion", async () => {
    const client = db!;
    const id = randomUUID();
    const vector = Array(1536).fill(0.1);
    const repository = await client.repository.create({
      data: {
        id,
        name: `test-${id}`,
        url: `https://github.com/test/${id}`,
        status: "LOADING",
      },
    });
    let settingsId: number | undefined;
    try {
      await replaceDocuments(
        repository.id,
        [chunk("original source")],
        [vector],
        client,
      );
      expect(await searchDocuments(id, vector, "", client)).toEqual([
        expect.objectContaining({
          content: "original source",
          path: null,
          commitSha: null,
        }),
      ]);
      expect(
        await searchDocuments("not-a-repository", vector, "", client),
      ).toEqual([]);
      expect(
        await searchDocuments("x\' OR 1=1 --", vector, "", client),
      ).toEqual([]);
      const failingDb = {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          client.$transaction(async (tx) => {
            await callback(tx);
            throw new Error("simulated write failure before commit");
          }),
      } as unknown as PrismaClient;
      await expect(
        replaceDocuments(id, [chunk("replacement")], [vector], failingDb),
      ).rejects.toThrow("simulated write failure");
      expect(await searchDocuments(id, vector, "", client)).toEqual([
        expect.objectContaining({
          content: "original source",
          path: null,
          commitSha: null,
        }),
      ]);
      await replaceDocuments(id, [chunk("replacement")], [vector], client);
      expect(await searchDocuments(id, vector, "", client)).toEqual([
        expect.objectContaining({ content: "replacement" }),
      ]);
      const settings = await client.storeSettings.create({
        data: {
          id: -(parseInt(randomUUID().slice(0, 8), 16) % 2147483646) - 1,
          openAiKey: "test-only",
          githubAccessToken: "test-only",
          selectedRepoId: id,
        },
      });
      settingsId = settings.id;
      await client.repository.delete({ where: { id } });
      expect(await client.document.count({ where: { namespace: id } })).toBe(0);
      expect(
        (await client.storeSettings.findUnique({ where: { id: settingsId } }))
          ?.selectedRepoId,
      ).toBeNull();
    } finally {
      if (settingsId !== undefined)
        await client.storeSettings.deleteMany({ where: { id: settingsId } });
      await client.repository.deleteMany({ where: { id } });
    }
  });
});

describe.skipIf(!url)("repository deletion / import race", () => {
  it("cannot resurrect a deleted ID or overwrite a new import of the same URL", async () => {
    const client = db!;
    const oldId = randomUUID();
    const newId = randomUUID();
    const repositoryUrl = `https://github.com/test/${oldId}`;
    const vector = Array(1536).fill(0.1);
    await client.repository.create({
      data: {
        id: oldId,
        name: "old-import",
        url: repositoryUrl,
        status: "LOADING",
      },
    });
    try {
      await client.repository.delete({ where: { id: oldId } });
      await client.repository.create({
        data: {
          id: newId,
          name: "new-import",
          url: repositoryUrl,
          status: "LOADING",
        },
      });
      await replaceDocuments(
        newId,
        [chunk("new import source")],
        [vector],
        client,
      );
      await expect(
        replaceDocuments(
          oldId,
          [chunk("stale import source")],
          [vector],
          client,
        ),
      ).rejects.toThrow();
      expect(
        await client.repository.findUnique({ where: { id: oldId } }),
      ).toBeNull();
      expect(
        (await client.repository.findUnique({ where: { id: newId } }))?.status,
      ).toBe("IMPORTED");
      expect(await searchDocuments(newId, vector, "", client)).toEqual([
        expect.objectContaining({ content: "new import source" }),
      ]);
      expect(await client.document.count({ where: { namespace: oldId } })).toBe(
        0,
      );
    } finally {
      await client.repository.deleteMany({
        where: { id: { in: [oldId, newId] } },
      });
    }
  });
});

describe.skipIf(!url)(
  "hybrid retrieval regression corpus (deterministic vectors, not a model benchmark)",
  () => {
    it("retrieves exact symbols, paths and error strings without losing semantic answers or leaking namespaces", async () => {
      const client = db!;
      const id = randomUUID();
      const other = randomUUID();
      const vector = (x: number, y: number) => [x, y, ...Array(1534).fill(0)];
      const provenance = {
        language: "typescript",
        startLine: 4,
        endLine: 12,
        blobSha: "a".repeat(40),
        commitSha: "b".repeat(40),
      };
      const source = [
        chunk("General documentation about reading project data.", {
          ...provenance,
          path: "README.md",
        }),
        chunk("export function loadRepositoryFiles() { return readFiles(); }", {
          ...provenance,
          path: "src/github.ts",
        }),
        chunk("export function getSession() { return currentSession; }", {
          ...provenance,
          path: "src/auth/session_store.ts",
        }),
        chunk('throw new Error("ERR_SOCKET_TIMEOUT: Connection refused");', {
          ...provenance,
          path: "src/network.ts",
        }),
        chunk(
          "Transactions preserve the previous index if replacement fails.",
          { ...provenance, path: "src/storage.ts" },
        ),
      ];
      await client.repository.createMany({
        data: [id, other].map((value) => ({
          id: value,
          name: value,
          url: `https://github.com/test/${value}`,
          status: "IMPORTED",
        })),
      });
      try {
        await replaceDocuments(
          id,
          source,
          [
            vector(1, 0),
            vector(0.8, 0.2),
            vector(0.8, 0.2),
            vector(0.8, 0.2),
            vector(0, 1),
          ],
          client,
        );
        await replaceDocuments(
          other,
          Array.from({ length: 40 }, () =>
            chunk(
              "loadRepositoryFiles ERR_SOCKET_TIMEOUT src/auth/session_store.ts",
            ),
          ),
          Array.from({ length: 40 }, () => vector(1, 0)),
          client,
        );
        for (const [query, path] of [
          ["loadRepositoryFiles", "src/github.ts"],
          ["load repository files", "src/github.ts"],
          ["src/auth/session_store.ts", "src/auth/session_store.ts"],
          ["ERR_SOCKET_TIMEOUT", "src/network.ts"],
          ["Connection refused", "src/network.ts"],
        ]) {
          const result = await searchDocuments(id, vector(1, 0), query, client);
          expect(result[0].path, query).toBe(path);
          expect(result.every((doc) => doc.commitSha === "b".repeat(40))).toBe(
            true,
          );
        }
        expect(
          (
            await searchDocuments(
              id,
              vector(0, 1),
              "How are incomplete updates made safe?",
              client,
            )
          )[0].path,
        ).toBe("src/storage.ts");
        expect(
          (await searchDocuments(id, vector(0, 1), "", client))[0].path,
        ).toBe("src/storage.ts");
        expect(
          await searchDocuments(
            "' OR 1=1 --",
            vector(1, 0),
            "loadRepositoryFiles",
            client,
          ),
        ).toEqual([]);
        await expect(
          searchDocuments(
            id,
            vector(1, 0),
            "' OR 1=1; DROP TABLE Document; %_ | & !",
            client,
          ),
        ).resolves.toBeDefined();
        expect(await client.document.count({ where: { namespace: id } })).toBe(
          source.length,
        );
        const stored = await client.document.findFirstOrThrow({
          where: { namespace: id, path: "src/github.ts" },
        });
        expect(stored).toMatchObject({
          ...provenance,
          content: source[1].content,
          context: "",
        });
      } finally {
        await client.repository.deleteMany({
          where: { id: { in: [id, other] } },
        });
      }
    });
    it("makes legacy rows lexically searchable without fabricating provenance", async () => {
      const client = db!;
      const id = randomUUID();
      await client.repository.create({
        data: {
          id,
          name: id,
          url: `https://github.com/test/${id}`,
          status: "IMPORTED",
        },
      });
      try {
        // Old application insert: new migration columns are omitted deliberately.
        await client.$executeRaw`INSERT INTO "Document" ("id","namespace","content","createdAt","updatedAt") VALUES (${randomUUID()},${id},'legacyExactSymbol',NOW(),NOW())`;
        const results = await searchDocuments(
          id,
          Array(1536).fill(0.1),
          "legacyExactSymbol",
          client,
        );
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          content: "legacyExactSymbol",
          path: null,
          commitSha: null,
          blobSha: null,
          startLine: null,
          endLine: null,
          context: "",
        });
      } finally {
        await client.repository.deleteMany({ where: { id } });
      }
    });
  },
);

describe.skipIf(!url)("provenance migration on an old table", () => {
  it("backfills lexical search while retaining existing content and unknown source fields", async () => {
    const session = new pg.Client({ connectionString: url });
    await session.connect();
    try {
      // Session-local old-schema fixture avoids touching the real public table.
      await session.query(
        'CREATE TEMP TABLE "Document" ("id" TEXT PRIMARY KEY, "content" TEXT NOT NULL, "namespace" TEXT NOT NULL)',
      );
      await session.query('INSERT INTO "Document" VALUES ($1,$2,$3)', [
        "old",
        "loadRepositoryFiles legacy data",
        "fixture",
      ]);
      const migration = await readFile(
        new URL(
          "../prisma/migrations/20261102200500_source_provenance_hybrid_search/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await session.query(migration);
      const { rows } = await session.query(
        `SELECT "content", "path", "commitSha", "context", "searchVector" @@ to_tsquery('simple', 'repository') AS matches FROM "Document"`,
      );
      expect(rows).toEqual([
        {
          content: "loadRepositoryFiles legacy data",
          path: null,
          commitSha: null,
          context: "",
          matches: true,
        },
      ]);
    } finally {
      await session.end();
    }
  });
});
