import { describe, expect, it } from "vitest";
import { Document } from "@langchain/core/documents";
import { prepareChunks, embedChunks } from "@/services/indexer";
import { MAX_CHUNK_CHARACTERS } from "@/services/indexer/types";

const document = (content: string, path = "src/example.ts") =>
  new Document({
    pageContent: content,
    metadata: {
      path,
      source: path,
      blobSha: "b".repeat(40),
      commitSha: "c".repeat(40),
    },
  });

describe("source-preserving code chunks", () => {
  it("keeps original CRLF lines and distinct immutable references before trimming", async () => {
    const chunks = await prepareChunks([
      document(
        "\r\n\r\nexport function first() { return '😀'; }\r\n\r\nexport function second() { return 2; }\r\n",
      ),
    ]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      content: "export function first() { return '😀'; }",
      path: "src/example.ts",
      language: "typescript",
      startLine: 3,
      endLine: 3,
      blobSha: "b".repeat(40),
      commitSha: "c".repeat(40),
    });
    expect(chunks[1]).toMatchObject({ startLine: 5, endLine: 5 });
  });
  it("does not locate repeated snippets using ambiguous text searches", async () => {
    const chunks = await prepareChunks([
      document("export const a = 1;\n\nexport const a = 1;\n"),
    ]);
    expect(chunks.map((chunk) => [chunk.startLine, chunk.endLine])).toEqual([
      [1, 1],
      [3, 3],
    ]);
  });
  it("keeps exports and functions together with bounded, separate import context", async () => {
    const chunks = await prepareChunks([
      document(
        "import { read } from './io';\n\n/** Read a file. */\nexport async function loadFile(path: string) {\n  return read(path);\n}\n\nexport class Store {\n  get() { return 1; }\n}\n",
      ),
    ]);
    const fn = chunks.find((chunk) =>
      chunk.content.includes("export async function"),
    )!;
    expect(fn.content).toContain("/** Read a file. */");
    expect(fn.content).toContain("return read(path)");
    expect(fn.context).toContain("import { read } from './io';");
    expect(fn).toMatchObject({ startLine: 3, endLine: 6 });
    expect(
      chunks.some(
        (chunk) =>
          chunk.content.includes("export class Store") &&
          chunk.content.includes("get()"),
      ),
    ).toBe(true);
  });
  it("splits oversized classes by members, keeping their enclosing context", async () => {
    const source = `import { Value } from './value';\nexport class BigStore {\n${Array.from({ length: 100 }, (_, i) => `  method${i}() { return '${"x".repeat(60)}'; }`).join("\n")}\n}`;
    const chunks = await prepareChunks([document(source)]);
    expect(chunks.length).toBeLessThan(10); // Pack small members without cutting across a member boundary.
    const member = chunks.find((chunk) => chunk.content.includes("method50"))!;
    expect(member.context).toContain("class BigStore");
    expect(member.context).toContain("import { Value }");
    expect(
      chunks.every(
        (chunk) =>
          chunk.content.length +
            chunk.context.length +
            (chunk.context ? 2 : 0) <=
          MAX_CHUNK_CHARACTERS,
      ),
    ).toBe(true);
    expect(chunks.map((chunk) => chunk.content).join("\n")).toContain(
      "method99",
    );
  });
  it("bounds a huge single-line symbol without breaking emoji or losing its source line", async () => {
    const chunks = await prepareChunks([
      document(`export const message = '${"😀".repeat(6000)}';`),
    ]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.every((chunk) => chunk.startLine === 1 && chunk.endLine === 1),
    ).toBe(true);
    expect(
      chunks.every(
        (chunk) =>
          chunk.content.length +
            chunk.context.length +
            (chunk.context ? 2 : 0) <=
          MAX_CHUNK_CHARACTERS,
      ),
    ).toBe(true);
    expect(chunks.map((chunk) => chunk.content).join("")).toBe(
      `export const message = '${"😀".repeat(6000)}';`,
    );
  });
  it("splits Markdown at headings but not heading-like lines in fenced code", async () => {
    const chunks = await prepareChunks([
      document(
        "# Overview\nHello\n```sh\n# not a section\n```\n\n## Install\nRun it.\n",
        "README.md",
      ),
    ]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      language: "markdown",
      startLine: 1,
      endLine: 5,
    });
    expect(chunks[1]).toMatchObject({ startLine: 7, endLine: 8 });
  });
  it("handles unknown extensions, malformed syntax, and cleanup without corrupting line provenance", async () => {
    const chunks = await prepareChunks([
      document("\n\0\nhello\uD800😀\uDC00\n", "notes.unknown"),
      document("export function broken( {\n  text ???", "broken.ts"),
    ]);
    expect(chunks[0]).toMatchObject({
      content: "hello😀",
      startLine: 3,
      endLine: 3,
      language: "text",
    });
    expect(
      chunks
        .slice(1)
        .map((chunk) => chunk.content)
        .join("\n"),
    ).toContain("text ???");
    expect(chunks.every((chunk) => chunk.content.trim())).toBe(true);
  });
  it("makes missing legacy provenance explicit rather than inventing a source", async () => {
    const [chunk] = await prepareChunks([
      new Document({ pageContent: "legacy source" }),
    ]);
    expect(chunk).toMatchObject({
      path: null,
      blobSha: null,
      commitSha: null,
      language: null,
      startLine: null,
      endLine: null,
    });
  });
  it("uses one shared embedding budget instead of the old 2000 character cutoff", async () => {
    const vector = Array(1536).fill(0.1);
    await expect(
      embedChunks(["x".repeat(3000)], async () => [vector]),
    ).resolves.toEqual([vector]);
    await expect(
      embedChunks(["x".repeat(MAX_CHUNK_CHARACTERS + 1)], async () => [vector]),
    ).rejects.toThrow("Invalid embedding input");
  });
});

it("handles ambient declaration files without requiring JavaScript emission", async () => {
  const chunks = await prepareChunks([
    document(
      "declare module 'feature' {\n  export function load(): Promise<void>;\n}\n",
      "src/types.d.ts",
    ),
  ]);
  expect(chunks.map((chunk) => chunk.content).join("\n")).toContain(
    "export function load()",
  );
});

it("does not duplicate an import as its own context", async () => {
  const [chunk] = await prepareChunks([
    document("import { read } from './io';"),
  ]);
  expect(chunk.context).toBe("");
});

it("keeps the name of a very large exported variable in continuation context", async () => {
  const chunks = await prepareChunks([
    document(`export const welcomeMessage = '${"x".repeat(9000)}';`),
  ]);
  expect(chunks[1].context).toContain("welcomeMessage");
});

it("keeps decorators and exported arrow functions at source statement boundaries", async () => {
  const chunks = await prepareChunks([
    document(
      "import { injectable } from './di';\n\n@injectable()\nexport class Service {\n  run = () => 'ok';\n}\n\nexport const start = async () => new Service();\n",
    ),
  ]);
  expect(
    chunks.find((chunk) => chunk.content.includes("class Service")),
  ).toMatchObject({ startLine: 3, endLine: 6 });
  expect(
    chunks.find((chunk) => chunk.content.includes("class Service"))?.content,
  ).toContain("@injectable()");
  expect(
    chunks.find((chunk) => chunk.content.includes("export const start")),
  ).toMatchObject({ startLine: 8, endLine: 8 });
});

it("bounds oversized import context as part of the embedding input budget", async () => {
  const imports = Array.from(
    { length: 60 },
    (_, index) => `import { feature${index} } from './features/${index}';`,
  ).join("\n");
  const chunks = await prepareChunks([
    document(
      `${imports}\nexport const handle = () => {\n${"  doWork();\n".repeat(700)}};`,
    ),
  ]);
  const continuation = chunks.find((chunk) =>
    chunk.context.includes("handle"),
  )!;
  expect(continuation.context.length).toBeLessThanOrEqual(800);
  expect(
    chunks.every(
      (chunk) =>
        [chunk.context, chunk.content].filter(Boolean).join("\n\n").length <=
        MAX_CHUNK_CHARACTERS,
    ),
  ).toBe(true);
});
