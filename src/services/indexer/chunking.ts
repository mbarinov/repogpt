import ts from "typescript";
import type { Document } from "@langchain/core/documents";
import {
  MAX_CHUNK_CHARACTERS,
  MAX_CONTEXT_CHARACTERS,
  type SourceChunk,
} from "./types";

export function sanitizeContent(content: string): string {
  return content
    .replace(/\0/g, "")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "",
    )
    .trim();
}

export function languageForPath(path: string): string {
  const extension = path.split(".").at(-1)?.toLowerCase();
  if (["ts", "tsx", "mts", "cts"].includes(extension ?? ""))
    return "typescript";
  if (["js", "jsx", "mjs", "cjs"].includes(extension ?? ""))
    return "javascript";
  if (["md", "mdx", "markdown"].includes(extension ?? "")) return "markdown";
  return (
    (
      {
        py: "python",
        rb: "ruby",
        rs: "rust",
        go: "go",
        java: "java",
        json: "json",
        yml: "yaml",
        yaml: "yaml",
        css: "css",
        html: "html",
        sh: "shell",
        sql: "sql",
      } as Record<string, string>
    )[extension ?? ""] ?? "text"
  );
}

type Span = { start: number; end: number; context: string };
function boundedContext(imports: string, enclosing = ""): string {
  const text = [enclosing, imports].filter(Boolean).join("\n");
  let end = Math.min(text.length, MAX_CONTEXT_CHARACTERS);
  if (/[\uD800-\uDBFF]/.test(text[end - 1] ?? "")) end--;
  return sanitizeContent(text.slice(0, end));
}

function codeSpans(content: string, path: string): Span[] {
  try {
    return parseCodeSpans(content, path);
  } catch {
    // Declaration-only files and parser failures must not fail the repository import.
    return [{ start: 0, end: content.length, context: "" }];
  }
}

function parseCodeSpans(content: string, path: string): Span[] {
  // The public transpiler diagnostics give malformed files a conservative fallback.
  // Nothing is executed; the compiler is only used to recognize source boundaries.
  const diagnostics = ts.transpileModule(content, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      jsx: ts.JsxEmit.Preserve,
    },
  }).diagnostics;
  if (
    diagnostics?.some(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    )
  )
    return [{ start: 0, end: content.length, context: "" }];
  const source = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = source.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) ||
        ts.isImportEqualsDeclaration(statement),
    )
    .map((statement) => statement.getText(source))
    .join("\n");
  const importContext = imports ? `Imports:\n${imports}` : "";
  const spans: Span[] = [];
  for (const statement of source.statements) {
    const start = statement.getFullStart();
    const end = statement.end;
    const context =
      ts.isImportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)
        ? ""
        : boundedContext(importContext);
    if (
      ts.isClassDeclaration(statement) &&
      statement.members.length &&
      end - start > MAX_CHUNK_CHARACTERS - context.length - 2
    ) {
      const header = content
        .slice(statement.getStart(source), statement.members[0].getFullStart())
        .trim();
      const memberContext = boundedContext(
        importContext,
        `Enclosing class:\n${header}`,
      );
      let cursor = start;
      for (const member of statement.members) {
        if (member.getFullStart() > cursor)
          spans.push({ start: cursor, end: member.getFullStart(), context });
        // Pack adjacent small members so a large class does not create hundreds
        // of tiny embeddings, while every split still ends at a member boundary.
        const previous = spans.at(-1);
        if (
          previous?.context === memberContext &&
          previous.end === member.getFullStart() &&
          member.end - previous.start + memberContext.length + 2 <=
            MAX_CHUNK_CHARACTERS
        )
          previous.end = member.end;
        else
          spans.push({
            start: member.getFullStart(),
            end: member.end,
            context: memberContext,
          });
        cursor = member.end;
      }
      if (cursor < end) spans.push({ start: cursor, end, context });
    } else {
      let enclosing = "";
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.body &&
        end - start > MAX_CHUNK_CHARACTERS - context.length - 2
      )
        enclosing = `Enclosing function:\n${content.slice(statement.getStart(source), statement.body.getStart(source)).trim()}`;
      if (
        ts.isVariableStatement(statement) &&
        end - start > MAX_CHUNK_CHARACTERS - context.length - 2
      )
        enclosing = `Enclosing declaration:\n${statement.declarationList.declarations.map((declaration) => declaration.name.getText(source)).join(", ")}`;
      spans.push({
        start,
        end,
        context: enclosing ? boundedContext(importContext, enclosing) : context,
      });
    }
  }
  const last = spans.at(-1)?.end ?? 0;
  if (last < content.length)
    spans.push({ start: last, end: content.length, context: "" });
  return spans;
}

function markdownSpans(content: string): Span[] {
  const spans: Span[] = [];
  let start = 0;
  let offset = 0;
  let fence: string | null = null;
  let heading = "";
  for (const line of content.split(/(?<=\n)/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length)
        fence = null;
    } else if (!fence && /^ {0,3}#{1,6}\s+/.test(line)) {
      if (offset > start) spans.push({ start, end: offset, context: heading });
      start = offset;
      heading = boundedContext(`Section:\n${line.trim()}`);
    }
    offset += line.length;
  }
  if (start < content.length)
    spans.push({ start, end: content.length, context: heading });
  return spans;
}

function ignoredAt(text: string, offset: number): boolean {
  const char = text[offset];
  return (
    /\s/.test(char) ||
    char === "\0" ||
    (/[\uD800-\uDBFF]/.test(char) &&
      !/[\uDC00-\uDFFF]/.test(text[offset + 1] ?? "")) ||
    (/[\uDC00-\uDFFF]/.test(char) &&
      !/[\uD800-\uDBFF]/.test(text[offset - 1] ?? ""))
  );
}
function lineStarts(content: string): number[] {
  const offsets = [0];
  for (let index = 0; index < content.length; index++) {
    if (
      content[index] === "\n" ||
      (content[index] === "\r" && content[index + 1] !== "\n")
    )
      offsets.push(index + 1);
  }
  return offsets;
}
function lineAt(offsets: number[], offset: number): number {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (offsets[mid] <= offset) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function splitDocument(document: Document): SourceChunk[] {
  const text = document.pageContent;
  const path =
    typeof document.metadata.path === "string"
      ? document.metadata.path
      : typeof document.metadata.source === "string"
        ? document.metadata.source
        : null;
  const language = path ? languageForPath(path) : null;
  const spans =
    language === "typescript" || language === "javascript"
      ? codeSpans(text, path!)
      : language === "markdown"
        ? markdownSpans(text)
        : [{ start: 0, end: text.length, context: "" }];
  const lines = lineStarts(text);
  const chunks: SourceChunk[] = [];
  for (const span of spans) {
    const budget =
      MAX_CHUNK_CHARACTERS - span.context.length - (span.context ? 2 : 0);
    let cursor = span.start;
    while (cursor < span.end) {
      let end = Math.min(cursor + budget, span.end);
      if (end < span.end) {
        const newline = text.lastIndexOf("\n", end - 1);
        if (newline > cursor + budget / 2) end = newline + 1;
        if (/[\uD800-\uDBFF]/.test(text[end - 1] ?? "")) end--;
      }
      let start = cursor;
      let trimmedEnd = end;
      while (start < trimmedEnd && ignoredAt(text, start)) start++;
      while (trimmedEnd > start && ignoredAt(text, trimmedEnd - 1))
        trimmedEnd--;
      const content = sanitizeContent(text.slice(start, trimmedEnd));
      if (content)
        chunks.push({
          content,
          path,
          language,
          startLine: path ? lineAt(lines, start) : null,
          endLine: path ? lineAt(lines, trimmedEnd - 1) : null,
          blobSha:
            typeof document.metadata.blobSha === "string"
              ? document.metadata.blobSha
              : null,
          commitSha:
            typeof document.metadata.commitSha === "string"
              ? document.metadata.commitSha
              : null,
          context: span.context,
        });
      cursor = end;
    }
  }
  return chunks;
}
