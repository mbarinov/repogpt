import { defineConfig, devices } from "@playwright/test";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must point to a disposable migrated PostgreSQL/pgvector database for browser tests.",
  );
}
const baseURL = "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        }
      : {},
  },
  webServer: {
    command: "pnpm start --port 3100",
    url: `${baseURL}/settings`,
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL },
    timeout: 120_000,
  },
});
