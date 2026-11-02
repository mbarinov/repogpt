import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
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
        ["original source"],
        [vector],
        client,
      );
      expect(await searchDocuments(id, vector, client)).toEqual([
        { content: "original source" },
      ]);
      expect(await searchDocuments("not-a-repository", vector, client)).toEqual(
        [],
      );
      expect(await searchDocuments("x\' OR 1=1 --", vector, client)).toEqual(
        [],
      );
      const failingDb = {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          client.$transaction(async (tx) => {
            await callback(tx);
            throw new Error("simulated write failure before commit");
          }),
      } as unknown as PrismaClient;
      await expect(
        replaceDocuments(id, ["replacement"], [vector], failingDb),
      ).rejects.toThrow("simulated write failure");
      expect(await searchDocuments(id, vector, client)).toEqual([
        { content: "original source" },
      ]);
      await replaceDocuments(id, ["replacement"], [vector], client);
      expect(await searchDocuments(id, vector, client)).toEqual([
        { content: "replacement" },
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
      await replaceDocuments(newId, ["new import source"], [vector], client);
      await expect(
        replaceDocuments(oldId, ["stale import source"], [vector], client),
      ).rejects.toThrow();
      expect(
        await client.repository.findUnique({ where: { id: oldId } }),
      ).toBeNull();
      expect(
        (await client.repository.findUnique({ where: { id: newId } }))?.status,
      ).toBe("IMPORTED");
      expect(await searchDocuments(newId, vector, client)).toEqual([
        { content: "new import source" },
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
