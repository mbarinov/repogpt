/** A source span from one immutable repository snapshot. Null metadata denotes a legacy index. */
export interface SourceChunk {
  content: string;
  path: string | null;
  language: string | null;
  startLine: number | null;
  endLine: number | null;
  blobSha: string | null;
  commitSha: string | null;
  /** Import/enclosing-symbol context, not part of the cited source span. */
  context: string;
}
export interface RetrievedChunk extends SourceChunk {
  id: string;
}
export const MAX_CHUNK_CHARACTERS = 4000;
export const MAX_CONTEXT_CHARACTERS = 800;
