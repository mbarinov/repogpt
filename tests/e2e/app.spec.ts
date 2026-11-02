import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mkdir } from "node:fs/promises";

const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
});
const fixtureId = "e2e-repogpt";
const fixtureKey = "sk-test-not-a-real-openai-key";
const fixtureToken = "github-test-not-a-real-token";
const fixtureRepo = {
  id: fixtureId,
  name: "mbarinov/repogpt",
  url: "https://github.com/mbarinov/repogpt",
  status: "IMPORTED" as const,
};

test.beforeEach(async () => {
  await database.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, openAiKey: fixtureKey, githubAccessToken: fixtureToken },
    update: {
      openAiKey: fixtureKey,
      githubAccessToken: fixtureToken,
      selectedRepoId: null,
    },
  });
  await database.repository.deleteMany({
    where: { id: { startsWith: "e2e-" } },
  });
  await database.repository.create({ data: fixtureRepo });
});
test.afterAll(async () => {
  await database.storeSettings.deleteMany({
    where: { id: 1, openAiKey: fixtureKey },
  });
  await database.repository.deleteMany({
    where: { id: { startsWith: "e2e-" } },
  });
  await database.$disconnect();
});

test("settings never render saved secrets and blank save preserves credentials", async ({
  page,
}) => {
  const response = await page.goto("/settings");
  const html = await response!.text();
  expect(html).not.toContain(fixtureKey);
  expect(html).not.toContain(fixtureToken);
  await expect(page.getByLabel("OpenAI API Key", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("GitHub API Key", { exact: true })).toHaveValue(
    "",
  );
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/settings") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saved).status()).toBe(200);
  const stored = await database.storeSettings.findUniqueOrThrow({
    where: { id: 1 },
  });
  expect(stored.openAiKey).toBe(fixtureKey);
  expect(stored.githubAccessToken).toBe(fixtureToken);
  await expect(page.getByText("API keys saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("OpenAI API Key", { exact: true })).toHaveValue(
    "",
  );
});

test("import waits, keeps failures retryable, then displays only a completed import", async ({
  page,
}) => {
  let attempts = 0;
  let release: (() => void) | undefined;
  await page.route("**/api/repositories", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    if (attempts === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fulfill({
        status: 502,
        json: { error: "Fixture import failed. Retry the import." },
      });
    }
    const repository = await database.repository.create({
      data: {
        id: "e2e-imported",
        name: "example/fixture",
        url: "https://github.com/example/fixture",
        status: "IMPORTED",
      },
    });
    return route.fulfill({ status: 201, json: { repository } });
  });
  await page.goto("/repositories");
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://github.com/example/fixture");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("button", { name: "Importing…" })).toBeDisabled();
  await expect(
    page.getByText("Repository imported and ready to chat."),
  ).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  await expect(
    page.getByText("Fixture import failed. Retry the import."),
  ).toBeVisible();
  await expect(page.getByLabel("GitHub repository URL")).toHaveValue(
    "https://github.com/example/fixture",
  );
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(
    page.getByText("example/fixture", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("GitHub repository URL")).toHaveValue("");
  expect(attempts).toBe(2);
});

test("deletion can be cancelled, keeps an error open, then deletes real indexed rows", async ({
  page,
}) => {
  await database.document.create({
    data: { content: "fixture indexed source", namespace: fixtureId },
  });
  let attempts = 0;
  await page.route(`**/api/repositories/${fixtureId}`, async (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        json: { error: "Temporary fixture failure" },
      });
    return route.continue();
  });
  await page.goto("/repositories");
  await page.getByRole("button", { name: "Delete mbarinov/repogpt" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(attempts).toBe(0);
  await page.getByRole("button", { name: "Delete mbarinov/repogpt" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("Temporary fixture failure")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByText("No repositories yet.", { exact: false }),
  ).toBeVisible();
  expect(
    await database.document.count({ where: { namespace: fixtureId } }),
  ).toBe(0);
  expect(
    await database.repository.findUnique({ where: { id: fixtureId } }),
  ).toBeNull();
});

function streamReply(text: string, id: string) {
  return (
    [
      { type: "start", messageId: id },
      { type: "start-step" },
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: text },
      { type: "text-end", id: "text-1" },
      { type: "finish-step" },
      { type: "finish", finishReason: "stop" },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n"
  );
}

test("chat renders streamed text and sends the next turn with conversation history", async ({
  page,
}) => {
  const requests: {
    messages: { role: string; parts: { type: string; text?: string }[] }[];
    selectedRepoId: string;
  }[] = [];
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
        "cache-control": "no-cache",
      },
      body: streamReply(
        requests.length === 1
          ? "RepoGPT uses Next.js and React for the interface, LangChain for embeddings, and PostgreSQL with pgvector for repository search.\n\nRun it locally with Node.js 24 and configure your API keys in Settings."
          : "The database stores repository documents and their embedding vectors. Retrieval is scoped to the selected repository.",
        `fixture-answer-${requests.length}`,
      ),
    });
  });
  await page.goto(`/?repoId=${fixtureId}`);
  await page
    .getByLabel("Message", { exact: true })
    .fill("What's the tech stack?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("RepoGPT uses Next.js and React", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Message", { exact: true })
    .fill("What is the database used for?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("The database stores repository documents", {
      exact: false,
    }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].selectedRepoId).toBe(fixtureId);
  expect(requests[1].messages.map((message) => message.role)).toEqual([
    "user",
    "assistant",
    "user",
  ]);
  if (process.env.UPDATE_SCREENSHOTS === "1") {
    await mkdir("docs/images", { recursive: true });
    await page.screenshot({ path: "docs/images/chat.png", fullPage: true });
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByText("The database stores repository documents", {
      exact: false,
    }),
  ).toHaveCount(0);
});

test("repository statuses are accurate and screenshots use explicit demo fixtures", async ({
  page,
}) => {
  await database.repository.createMany({
    data: [
      {
        id: "e2e-error",
        name: "example/private-repository",
        url: "https://github.com/example/private-repository",
        status: "ERROR",
        error:
          "Check that the token has Contents: read access to this repository.",
      },
      {
        id: "e2e-idle",
        name: "example/not-indexed",
        url: "https://github.com/example/not-indexed",
        status: "NOT_STARTED",
      },
    ],
  });
  await page.goto("/repositories");
  await expect(page.getByLabel("Ready", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Import failed", { exact: true })).toHaveCount(
    1,
  );
  await expect(page.getByLabel("Not indexed", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Chat", exact: true }),
  ).toHaveCount(2);
  for (const button of await page
    .getByRole("button", { name: "Chat", exact: true })
    .all())
    await expect(button).toBeDisabled();
  if (process.env.UPDATE_SCREENSHOTS === "1") {
    await mkdir("docs/images", { recursive: true });
    await page.screenshot({
      path: "docs/images/repositories.png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("GitHub repository URL")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
