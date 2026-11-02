import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  CANDIDATE_LIMIT,
  fuseCandidates,
  lexicalTerms,
  lexicalWeight,
} from "./retrieval";
import {
  MAX_CHUNK_CHARACTERS,
  MAX_CONTEXT_CHARACTERS,
  type RetrievedChunk,
  type SourceChunk,
} from "./types";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function vectorLiteral(vector: number[]): string {
  if (
    vector.length !== EMBEDDING_DIMENSIONS ||
    vector.some((value) => !Number.isFinite(value))
  )
    throw new Error("Invalid embedding vector.");
  return `[${vector.join(",")}]`;
}

export async function replaceDocuments(
  repositoryId: string,
  chunks: SourceChunk[],
  vectors: number[][],
  db: PrismaClient = prisma,
) {
  if (
    !chunks.length ||
    chunks.length !== vectors.length ||
    chunks.some(
      (chunk) =>
        !chunk.content.trim() ||
        chunk.context.length > MAX_CONTEXT_CHARACTERS ||
        chunk.content.length + chunk.context.length + (chunk.context ? 2 : 0) >
          MAX_CHUNK_CHARACTERS,
    )
  )
    throw new Error("Invalid document batch.");
  const literals = vectors.map(vectorLiteral);
  // No external requests inside the transaction: failed embeddings leave the previous index intact.
  await db.$transaction(
    async (tx) => {
      await tx.document.deleteMany({ where: { namespace: repositoryId } });
      for (let offset = 0; offset < chunks.length; offset += 100) {
        const rows = chunks
          .slice(offset, offset + 100)
          .map(
            (chunk, i) =>
              Prisma.sql`(${randomUUID()}, ${chunk.content}, ${chunk.context}, ${repositoryId}, ${chunk.path}, ${chunk.language}, ${chunk.startLine}, ${chunk.endLine}, ${chunk.blobSha}, ${chunk.commitSha}, ${literals[offset + i]}::vector, NOW(), NOW())`,
          );
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO "Document" ("id", "content", "context", "namespace", "path", "language", "startLine", "endLine", "blobSha", "commitSha", "vector", "createdAt", "updatedAt") VALUES ${Prisma.join(rows)}`,
        );
      }
      await tx.repository.update({
        where: { id: repositoryId },
        data: { status: "IMPORTED", error: null },
      });
    },
    { timeout: 60_000 },
  );
}

const fields = Prisma.sql`"id", "content", "context", "path", "language", "startLine", "endLine", "blobSha", "commitSha"`;

type RankedCandidate = RetrievedChunk & {
  retriever: "semantic" | "lexical";
  candidateRank: bigint;
};

export async function searchDocuments(
  repositoryId: string,
  vector: number[],
  query: string,
  db: PrismaClient = prisma,
): Promise<RetrievedChunk[]> {
  const literal = vectorLiteral(vector);
  const terms = lexicalTerms(query);
  const exact = query.trim().toLowerCase().slice(0, 512);
  // Terms contain only letters, digits and underscores; the full tsquery remains a bound value.
  const tsquery = terms.map((term) => `'${term}'`).join(" | ");
  const lexicalCte = terms.length
    ? Prisma.sql`, lexical AS (
    SELECT ${fields},
      (strpos(lower(coalesce("path", '')), ${exact}) > 0 OR strpos(lower("content"), ${exact}) > 0) AS "exactMatch",
      ts_rank_cd("searchVector", to_tsquery('simple', ${tsquery})) AS "lexicalScore"
    FROM "Document"
    WHERE "namespace" = ${repositoryId}
      AND "searchVector" @@ to_tsquery('simple', ${tsquery})
    ORDER BY "exactMatch" DESC, "lexicalScore" DESC, "id" ASC LIMIT ${CANDIDATE_LIMIT}
  )`
    : Prisma.empty;
  const lexicalSelect = terms.length
    ? Prisma.sql`
    UNION ALL
    SELECT 'lexical' AS "retriever",
      row_number() OVER (ORDER BY "exactMatch" DESC, "lexicalScore" DESC, "id" ASC) AS "candidateRank",
      ${fields} FROM lexical
  `
    : Prisma.empty;
  // One statement gives both bounded candidate lists the same MVCC snapshot during a refresh.
  const rows = await db.$queryRaw<RankedCandidate[]>(Prisma.sql`
    WITH semantic AS (
      SELECT ${fields}, "vector" <=> ${literal}::vector AS "distance"
      FROM "Document"
      WHERE "namespace" = ${repositoryId} AND "vector" IS NOT NULL
      ORDER BY "distance" ASC, "id" ASC LIMIT ${CANDIDATE_LIMIT}
    ) ${lexicalCte}
    SELECT 'semantic' AS "retriever",
      row_number() OVER (ORDER BY "distance" ASC, "id" ASC) AS "candidateRank",
      ${fields} FROM semantic
    ${lexicalSelect}
  `);
  const candidates = (
    retriever: RankedCandidate["retriever"],
  ): RetrievedChunk[] =>
    rows
      .filter((row) => row.retriever === retriever)
      .sort((a, b) => Number(a.candidateRank - b.candidateRank))
      .map((row) => ({
        id: row.id,
        content: row.content,
        context: row.context,
        path: row.path,
        language: row.language,
        startLine: row.startLine,
        endLine: row.endLine,
        blobSha: row.blobSha,
        commitSha: row.commitSha,
      }));
  return fuseCandidates(
    candidates("semantic"),
    candidates("lexical"),
    lexicalWeight(query),
  );
}
