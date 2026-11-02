import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 85 },
      include: ["src/services/**", "src/app/api/**", "src/lib/**"],
    },
  },
});
