import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, run } = vi.hoisted(() => ({
  db: {
    storeSettings: { findUnique: vi.fn() },
    repository: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  run: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/services/indexer", () => ({
  Indexer: class {
    run = run;
  },
}));
import { POST, GET } from "@/app/api/repositories/route";
import { DELETE } from "@/app/api/repositories/[id]/route";
import { RequestError } from "@/lib/server/errors";
const req = (body: unknown) =>
  new Request("http://localhost/api/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  db.storeSettings.findUnique.mockResolvedValue({
    openAiKey: "secret",
    githubAccessToken: "secret",
  });
  db.repository.findUnique.mockImplementation(({ where }) =>
    Promise.resolve(where.url ? null : { id: "repo", status: "IMPORTED" }),
  );
  db.repository.create.mockResolvedValue({ id: "repo" });
});

describe("repository API", () => {
  it("rejects invalid JSON and non-GitHub URLs before DB writes", async () => {
    expect(
      (
        await POST(
          new Request("http://localhost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(req({ url: "https://example.com/a/b" }))).status).toBe(
      400,
    );
    expect(db.repository.create).not.toHaveBeenCalled();
  });
  it("requires settings", async () => {
    db.storeSettings.findUnique.mockResolvedValue(null);
    expect((await POST(req({ url: "https://github.com/a/b" }))).status).toBe(
      409,
    );
  });
  it("awaits indexing and returns the finished repository, not early success", async () => {
    let finish!: () => void;
    run.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    db.repository.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "repo", status: "IMPORTED" });
    let settled = false;
    const response = POST(req({ url: "https://github.com/a/b" })).then(
      (value) => {
        settled = true;
        return value;
      },
    );
    await vi.waitFor(() => expect(run).toHaveBeenCalledWith("repo", undefined));
    expect(settled).toBe(false);
    finish();
    expect((await response).status).toBe(201);
  });
  it("returns failure status when indexing fails", async () => {
    run.mockRejectedValue(new RequestError("Indexing failed.", 502));
    const response = await POST(req({ url: "https://github.com/a/b" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Indexing failed." });
  });
  it("reimports an existing repository only after an atomic non-loading claim", async () => {
    db.repository.findUnique.mockResolvedValue({ id: "repo" });
    db.repository.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(req({ url: "https://github.com/a/b" }))).status).toBe(
      409,
    );
    expect(run).not.toHaveBeenCalled();
    db.repository.updateMany.mockResolvedValue({ count: 1 });
    expect(
      (await POST(req({ url: "https://github.com/a/b", branch: "develop" })))
        .status,
    ).toBe(200);
    expect(run).toHaveBeenCalledWith("repo", "develop");
  });
  it("does not reflect raw database errors", async () => {
    db.repository.findMany.mockRejectedValue(new Error("password=secret"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
  it("rejects cross-origin deletion before accessing the database", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/repositories/repo", {
        method: "DELETE",
        headers: { Origin: "https://untrusted.example" },
      }),
      { params: Promise.resolve({ id: "repo" }) },
    );
    expect(response.status).toBe(403);
    expect(db.repository.deleteMany).not.toHaveBeenCalled();
  });
  it("deletes via cascading FK and returns 404 for missing repository", async () => {
    db.repository.deleteMany.mockResolvedValue({ count: 1 });
    expect(
      (
        await DELETE(new Request("http://localhost", { method: "DELETE" }), {
          params: Promise.resolve({ id: "repo" }),
        })
      ).status,
    ).toBe(200);
    expect(db.repository.deleteMany).toHaveBeenCalledWith({
      where: { id: "repo" },
    });
    db.repository.deleteMany.mockResolvedValue({ count: 0 });
    expect(
      (
        await DELETE(new Request("http://localhost", { method: "DELETE" }), {
          params: Promise.resolve({ id: "missing" }),
        })
      ).status,
    ).toBe(404);
  });
});
