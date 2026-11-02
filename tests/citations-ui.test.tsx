// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Message } from "@/components/message";
afterEach(cleanup);
const source = {
  id: "S1",
  path: "src/index.ts",
  startLine: 3,
  endLine: 8,
  url: `https://github.com/org/repo/blob/${"a".repeat(40)}/src/index.ts#L3-L8`,
};
it("resolves only server-issued source IDs and ignores model-created URLs", () => {
  render(
    <Message
      id="1"
      role="assistant"
      content="See [S1](#source-S1), [fake](#source-S99), [invented](https://github.com/org/repo/blob/main/fake.ts), [evil](https://evil.test)."
      sources={[source]}
    />,
  );
  expect(screen.getByRole("link", { name: "S1" }).getAttribute("href")).toBe(
    source.url,
  );
  expect(screen.queryByRole("link", { name: "fake" })).toBeNull();
  expect(screen.queryByRole("link", { name: "invented" })).toBeNull();
  expect(screen.queryByRole("link", { name: "evil" })).toBeNull();
  expect(
    screen.getByRole("link", { name: /src\/index.ts/ }).getAttribute("href"),
  ).toBe(source.url);
});
it("explains reindexing for legacy excerpts without fake sources", () => {
  render(
    <Message
      id="1"
      role="assistant"
      content="Legacy answer"
      hasLegacySources
    />,
  );
  expect(screen.getByText(/Refresh the repository index/)).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
