import { test, expect, type Page } from "@playwright/test";
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

const browserErrors: string[] = [];
async function capture(page: Page, name: string) {
  if (process.env.UPDATE_SCREENSHOTS !== "1") return;
  await mkdir("docs/images", { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `docs/images/${name}.png`,
    fullPage: !name.startsWith("import"),
    animations: "disabled",
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  browserErrors.length = 0;
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    // Error responses are intentionally exercised below; hydration/runtime errors are not.
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      browserErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1487, height: 1058 });
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
test.afterEach(() => {
  expect(browserErrors).toEqual([]);
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
  await capture(page, "settings");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await capture(page, "settings-mobile");
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
    .getByRole("button", { name: "Import repository", exact: true })
    .click();
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://github.com/example/fixture");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("button", { name: "Importing…" })).toBeDisabled();
  await expect(
    page.getByText("Repository imported and ready to chat."),
  ).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.keyboard.press("Enter");
  expect(attempts).toBe(1);
  release!();
  await expect(
    page.getByText("Fixture import failed. Retry the import.").first(),
  ).toBeVisible();
  await expect(page.getByLabel("GitHub repository URL")).toHaveValue(
    "https://github.com/example/fixture",
  );
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Select example/fixture", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Import repository", exact: true })
    .click();
  await expect(page.getByLabel("GitHub repository URL")).toHaveValue("");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
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
  await page.getByText("Repository settings", { exact: true }).click();
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
  await capture(page, "repositories-empty");
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
  await capture(page, "chat");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await capture(page, "chat-mobile");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByText("The database stores repository documents", {
      exact: false,
    }),
  ).toHaveCount(0);
});

test("library selection exposes accurate states and responsive screenshots", async ({
  page,
}) => {
  // Synthetic fixtures only: no GitHub or model network calls are made.
  await database.repository.createMany({
    data: [
      {
        id: "e2e-loading",
        name: "example/api-service",
        url: "https://github.com/example/api-service",
        status: "LOADING",
      },
      {
        id: "e2e-error",
        name: "example/private-repo",
        url: "https://github.com/example/private-repo",
        status: "ERROR",
        error:
          "Check that the token has Contents: read access to this repository.",
      },
      {
        id: "e2e-idle",
        name: "example/docs",
        url: "https://github.com/example/docs",
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
    page.getByRole("link", { name: "Open chat", exact: true }),
  ).toBeVisible();
  await capture(page, "repositories");
  for (const name of [
    "example/api-service",
    "example/private-repo",
    "example/docs",
  ]) {
    const selection = page.getByRole("button", {
      name: `Select ${name}`,
      exact: true,
    });
    await selection.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open chat", exact: true }),
    ).toBeDisabled();
    if (name === "example/private-repo") {
      await expect(
        page.getByText(
          "Check that the token has Contents: read access to this repository.",
          { exact: false },
        ),
      ).toBeVisible();
      await capture(page, "repositories-error");
    }
  }
  await page
    .getByRole("button", { name: "Select mbarinov/repogpt", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await capture(page, "repositories-mobile");
  await page
    .getByRole("button", { name: "Import repository", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noOverflow(page);
  await capture(page, "import-mobile");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Import repository", exact: true }),
  ).toBeFocused();
});

test("import cancellation and keyboard focus leave repository state intact", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/repositories", async (route) => {
    if (route.request().method() === "POST") calls++;
    return route.continue();
  });
  await page.goto("/repositories");
  const trigger = page.getByRole("button", {
    name: "Import repository",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByLabel("GitHub repository URL")).toBeFocused();
  await page
    .getByLabel("GitHub repository URL")
    .fill("https://github.com/example/cancelled");
  await capture(page, "import-dialog");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(calls).toBe(0);
  await expect(
    page.getByRole("button", { name: "Select mbarinov/repogpt", exact: true }),
  ).toBeVisible();
});

test("suggestions seed chat without submitting and mobile navigation supports back and forward", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/chat", async (route) => {
    submissions++;
    return route.fulfill({
      status: 500,
      json: { error: "Unexpected submission" },
    });
  });
  await page.goto("/repositories");
  await page
    .getByRole("link", { name: "How is the project structured?", exact: true })
    .click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "How is the project structured?",
  );
  expect(submissions).toBe(0);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Your repositories", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "How is the project structured?",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByLabel("OpenAI API Key", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Repositories", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your repositories", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("failed refresh keeps old index chat available and retry opens a prefilled import", async ({
  page,
}) => {
  await database.repository.update({
    where: { id: fixtureId },
    data: { error: "Synthetic embedding service unavailable." },
  });
  await page.goto("/repositories");
  await expect(page.getByRole("status")).toContainText(
    "chat uses the previous index",
  );
  await expect(
    page.getByRole("link", { name: "Open chat", exact: true }),
  ).toHaveAttribute("href", `/?repoId=${fixtureId}`);
  await page.getByText("Repository settings", { exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh index", exact: true })
    .click();
  await expect(page.getByLabel("GitHub repository URL")).toHaveValue(
    fixtureRepo.url,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "chat uses the previous index",
  );
});
