import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "@langchain/core/documents";
import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RequestError } from "@/lib/server/errors";
import { loadGithubDocuments } from "./github";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  replaceDocuments,
  vectorLiteral,
} from "./vector-store";

export const EMBEDDING_BATCH_SIZE = 32;
const MAX_CHUNKS = 10_000;
export function sanitizeContent(content: string): string {
  return content
    .replace(/\0/g, "")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "",
    )
    .trim();
}
export async function prepareChunks(documents: Document[]): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
  });
  const chunks = (await splitter.splitDocuments(documents))
    .map((chunk) => sanitizeContent(chunk.pageContent))
    .filter(Boolean);
  if (!chunks.length)
    throw new RequestError(
      "No indexable text was found in this repository.",
      422,
    );
  if (chunks.length > MAX_CHUNKS)
    throw new RequestError(
      "This repository exceeds the 10,000-chunk indexing limit.",
      422,
    );
  return chunks;
}

export async function embedChunks(
  chunks: string[],
  embed: (texts: string[]) => Promise<number[][]>,
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    if (batch.some((text) => !text.trim() || text.length > 2000))
      throw new RequestError("Invalid embedding input.", 422);
    const result = await embed(batch);
    if (result.length !== batch.length)
      throw new Error("Incomplete embedding response.");
    result.forEach(vectorLiteral);
    vectors.push(...result);
  }
  return vectors;
}

export class Indexer {
  constructor(private readonly db: PrismaClient = prisma) {}
  async run(repositoryId: string, branch?: string) {
    try {
      const repository = await this.db.repository.findUnique({
        where: { id: repositoryId },
      });
      if (!repository) throw new RequestError("Repository not found.", 404);
      const settings = await this.db.storeSettings.findUnique({
        where: { id: 1 },
      });
      if (!settings?.githubAccessToken || !settings?.openAiKey)
        throw new RequestError(
          "Configure your GitHub and OpenAI keys first.",
          409,
        );
      const docs = await loadGithubDocuments(
        repository.url,
        settings.githubAccessToken,
        branch,
      );
      const chunks = await prepareChunks(docs);
      const embeddings = new OpenAIEmbeddings({
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
        apiKey: settings.openAiKey,
        maxRetries: 2,
        timeout: 30_000,
      });
      const vectors = await embedChunks(chunks, (texts) =>
        embeddings.embedDocuments(texts),
      );
      await replaceDocuments(repositoryId, chunks, vectors, this.db);
    } catch (error) {
      const safeError =
        error instanceof RequestError
          ? error
          : new RequestError(
              "Indexing failed. Check your OpenAI key, quota and model access, then retry. Any previous index was preserved.",
              502,
            );
      const [previousIndex] = await this.db.$queryRaw<{ exists: boolean }[]>(
        Prisma.sql`SELECT EXISTS (SELECT 1 FROM "Document" WHERE "namespace" = ${repositoryId} AND "vector" IS NOT NULL) AS "exists"`,
      );
      // Keep the previous successful index queryable after a failed refresh.
      // updateMany is intentionally safe when the user deleted the repository mid-import.
      await this.db.repository.updateMany({
        where: { id: repositoryId },
        data: {
          status: previousIndex?.exists ? "IMPORTED" : "ERROR",
          error: safeError.message,
        },
      });
      throw safeError;
    }
  }
}
