import { parseRepositoryUrl } from "./github";
import type { RetrievedChunk } from "./types";

export interface SourceCitation {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  url: string;
}
export interface SourceMetadata {
  sources: SourceCitation[];
  hasLegacySources: boolean;
}

function citation(
  repositoryUrl: string,
  chunk: RetrievedChunk,
  id: string,
): SourceCitation | null {
  const { path, commitSha, blobSha, startLine, endLine } = chunk;
  if (
    !path ||
    !commitSha ||
    !blobSha ||
    !/^[a-f0-9]{40,64}$/i.test(blobSha) ||
    !/^[a-f0-9]{40,64}$/i.test(commitSha) ||
    typeof startLine !== "number" ||
    typeof endLine !== "number" ||
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 1 ||
    endLine < startLine ||
    /[\x00-\x1f\x7f\\]/.test(path) ||
    path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    return null;
  let url: string;
  let encodedPath: string;
  try {
    url = parseRepositoryUrl(repositoryUrl).url;
    encodedPath = path.split("/").map(encodeURIComponent).join("/");
  } catch {
    return null;
  }
  return {
    id,
    path,
    startLine,
    endLine,
    url: `${url}/blob/${commitSha}/${encodedPath}#L${startLine}-L${endLine}`,
  };
}

/** Citation IDs and URLs are generated here, never supplied by the language model. */
export function buildSourceContext(
  repositoryUrl: string,
  chunks: RetrievedChunk[],
) {
  const sources: SourceCitation[] = [];
  const excerpts = chunks.map((chunk, index) => {
    const source = citation(repositoryUrl, chunk, `S${index + 1}`);
    if (source) sources.push(source);
    return {
      citationId: source?.id ?? null,
      path: source?.path ?? null,
      startLine: source?.startLine ?? null,
      endLine: source?.endLine ?? null,
      language: chunk.language,
      content: chunk.content,
      context: chunk.context || undefined,
    };
  });
  return {
    context: JSON.stringify(excerpts),
    sources,
    hasLegacySources: sources.length < chunks.length,
  };
}
