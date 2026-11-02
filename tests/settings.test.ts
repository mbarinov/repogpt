import { beforeEach, describe, expect, it, vi } from "vitest";
const { db } = vi.hoisted(() => ({
  db: { storeSettings: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));
import { POST } from "@/app/api/settings/route";
const req = (body: unknown) =>
  new Request("http://localhost/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
});

describe("settings API", () => {
  it("requires both keys on first setup", async () => {
    db.storeSettings.findUnique.mockResolvedValue(null);
    expect((await POST(req({ openAiKey: "one" }))).status).toBe(400);
    expect(db.storeSettings.upsert).not.toHaveBeenCalled();
  });
  it("preserves existing secrets when input is blank and never returns them", async () => {
    db.storeSettings.findUnique.mockResolvedValue({
      openAiKey: "existing-secret",
      githubAccessToken: "existing-token",
    });
    const response = await POST(
      req({ openAiKey: "", githubAccessToken: "new-secret" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(db.storeSettings.upsert.mock.calls[0][0].update).toEqual({
      githubAccessToken: "new-secret",
    });
  });
  it("rejects malformed keys and never reflects provider or DB errors", async () => {
    expect(
      (await POST(req({ openAiKey: 42, githubAccessToken: "x" }))).status,
    ).toBe(400);
    expect(
      (await POST(req({ openAiKey: "x\nsecret", githubAccessToken: "x" })))
        .status,
    ).toBe(400);
    db.storeSettings.findUnique.mockRejectedValue(
      new Error("postgres://password-secret"),
    );
    const response = await POST(
      req({ openAiKey: "a", githubAccessToken: "b" }),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("password-secret");
  });
});

describe("local mutation boundaries", () => {
  it("rejects cross-site requests and simple text/plain POSTs", async () => {
    const crossSite = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect((await POST(crossSite)).status).toBe(403);
    expect(
      (
        await POST(
          new Request("http://localhost/api/settings", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(415);
    expect(db.storeSettings.findUnique).not.toHaveBeenCalled();
  });
});
