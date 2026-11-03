import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

const fixture = vi.hoisted(() => ({ failEmbeddings: false, stream: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return {
    default: new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL,
      }),
    }),
  };
});
vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: class {
    async embedDocuments(texts: string[]) {
      if (fixture.failEmbeddings)
        throw new Error("fixture upstream failure with secret-token");
      return texts.map(() => Array(1536).fill(0.1));
    }
    async embedQuery() {
      return Array(1536).fill(0.1);
    }
  },
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => "fixture-model",
}));
vi.mock("ai", () => ({ streamText: fixture.stream }));
import database from "@/lib/prisma";
import { POST as saveSettings } from "@/app/api/settings/route";
import {
  POST as importRepository,
  GET as listRepositories,
} from "@/app/api/repositories/route";
import { DELETE as deleteRepository } from "@/app/api/repositories/[id]/route";
import { POST as chat } from "@/app/api/chat/route";

const jsonRequest = (path: string, body: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  });
afterEach(() => {
  vi.unstubAllGlobals();
  fixture.failEmbeddings = false;
});
afterAll(async () => {
  await database.$disconnect();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "API lifecycle with real PostgreSQL and mocked external providers",
  () => {
    it("saves secret-safe settings, imports, queries, preserves a failed refresh and deletes", async () => {
      const owner = `fixture-${randomUUID()}`;
      const repoUrl = `https://github.com/${owner}/project`;
      const key = `test-key-${owner}`;
      let id: string | undefined;
      try {
        const saved = await saveSettings(
          jsonRequest("/api/settings", {
            openAiKey: key,
            githubAccessToken: "test-fine-grained-token",
          }),
        );
        expect(saved.status).toBe(200);
        expect(await saved.json()).toEqual({ success: true });
        const github = vi.fn(
          async (input: string | URL | Request, init?: RequestInit) => {
            expect(new Headers(init?.headers).get("Authorization")).toBe(
              "Bearer test-fine-grained-token",
            );
            const url = String(input);
            if (url.endsWith("/project"))
              return Response.json({ default_branch: "trunk" });
            if (url.endsWith("/commits/trunk"))
              return Response.json({
                sha: "c".repeat(40),
                commit: { tree: { sha: "d".repeat(40) } },
              });
            if (url.includes(`/git/trees/${"d".repeat(40)}`))
              return Response.json({
                tree: [
                  {
                    type: "blob",
                    mode: "100644",
                    path: "package.json",
                    size: 50,
                    sha: "a".repeat(40),
                  },
                ],
              });
            if (url.includes("/git/blobs/"))
              return Response.json({
                encoding: "base64",
                content: Buffer.from(
                  '{"name":"fixture","dependencies":{"next":"16.4.4"}}',
                ).toString("base64"),
              });
            throw new Error(`Unexpected fixture request ${url}`);
          },
        );
        vi.stubGlobal("fetch", github);
        const imported = await importRepository(
          jsonRequest("/api/repositories", { url: repoUrl, branch: "" }),
        );
        expect(imported.status).toBe(201);
        const payload = await imported.json();
        id = payload.repository.id;
        expect(payload.repository.status).toBe("IMPORTED");
        expect(
          await database.document.count({ where: { namespace: id } }),
        ).toBeGreaterThan(0);
        expect(github).toHaveBeenCalledTimes(4);
        fixture.stream.mockReturnValue({
          toUIMessageStreamResponse: () =>
            new Response("fixture streamed reply"),
        });
        const reply = await chat(
          jsonRequest("/api/chat", {
            selectedRepoId: id,
            messages: [
              {
                id: "question",
                role: "user",
                parts: [{ type: "text", text: "What framework is used?" }],
              },
            ],
          }),
        );
        expect(reply.status).toBe(200);
        expect(await reply.text()).toBe("fixture streamed reply");
        const generation = fixture.stream.mock.calls.at(-1)![0];
        expect(generation.messages[0].content).toContain("next");
        expect(generation.system).not.toContain("16.4.4");
        fixture.failEmbeddings = true;
        const failedRefresh = await importRepository(
          jsonRequest("/api/repositories", { url: repoUrl }),
        );
        expect(failedRefresh.status).toBe(502);
        expect(await failedRefresh.text()).not.toContain("secret-token");
        expect(
          await database.repository.findUnique({ where: { id } }),
        ).toMatchObject({ status: "IMPORTED" });
        expect(
          await database.document.count({ where: { namespace: id } }),
        ).toBeGreaterThan(0);
        const listed = await listRepositories();
        expect(
          (await listed.json()).repositories.some(
            (repo: { id: string }) => repo.id === id,
          ),
        ).toBe(true);
        const deleted = await deleteRepository(
          new NextRequest(`http://localhost/api/repositories/${id}`, {
            method: "DELETE",
            headers: { Origin: "http://localhost" },
          }),
          { params: Promise.resolve({ id: id! }) },
        );
        expect(deleted.status).toBe(200);
        expect(
          await database.document.count({ where: { namespace: id } }),
        ).toBe(0);
      } finally {
        if (id) await database.repository.deleteMany({ where: { id } });
        await database.storeSettings.deleteMany({
          where: { id: 1, openAiKey: key },
        });
      }
    });
  },
);
