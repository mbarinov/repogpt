import { describe, expect, it } from "vitest";
import { buildSourceContext } from "@/services/indexer/citations";
import type { RetrievedChunk } from "@/services/indexer/types";
const chunk: RetrievedChunk = {
  id: "doc",
  content: "export const answer = 42;",
  context: 'import { value } from "./value";',
  path: "src/a file#ü.ts",
  language: "typescript",
  startLine: 4,
  endLine: 6,
  commitSha: "c".repeat(40),
  blobSha: "b".repeat(40),
};
describe("grounded source context", () => {
  it("issues citation IDs and immutable commit links from retrieved metadata only", () => {
    const result = buildSourceContext("https://github.com/org/repo", [chunk]);
    expect(result.sources).toEqual([
      {
        id: "S1",
        path: chunk.path,
        startLine: 4,
        endLine: 6,
        url: `https://github.com/org/repo/blob/${"c".repeat(40)}/src/a%20file%23%C3%BC.ts#L4-L6`,
      },
    ]);
    expect(result.context).toContain('"citationId":"S1"');
    expect(result.context).toContain('"context"');
    expect(result.context).toContain('"startLine":4');
    expect(result.context).not.toContain(`/blob/${chunk.blobSha}`);
    expect(result.hasLegacySources).toBe(false);
  });
  it("keeps legacy excerpts useful without inventing links or line numbers", () => {
    const result = buildSourceContext("https://github.com/org/repo", [
      { ...chunk, path: null, commitSha: null, startLine: null, endLine: null },
    ]);
    expect(result.sources).toEqual([]);
    expect(result.context).toContain(chunk.content);
    expect(result.hasLegacySources).toBe(true);
  });
  it.each([
    { path: "../secret.ts" },
    { path: "src/../../secret.ts" },
    { commitSha: "main" },
    { blobSha: null },
    { startLine: 0 },
    { endLine: 3 },
    { path: "src/a\n.ts" },
    { path: "src/\ud800.ts" },
  ])("does not create invalid source links from %j", (invalid) => {
    expect(
      buildSourceContext("https://github.com/org/repo", [
        { ...chunk, ...invalid },
      ]).sources,
    ).toEqual([]);
  });
  it("does not accept a foreign repository URL as a citation origin", () => {
    expect(
      buildSourceContext("https://evil.test/org/repo", [chunk]).sources,
    ).toEqual([]);
  });
});
