import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

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
  contents: string[],
  vectors: number[][],
  db: PrismaClient = prisma,
) {
  if (!contents.length || contents.length !== vectors.length)
    throw new Error("Invalid document batch.");
  const literals = vectors.map(vectorLiteral);
  // No external requests inside the transaction: failed embeddings leave the previous index intact.
  await db.$transaction(
    async (tx) => {
      await tx.document.deleteMany({ where: { namespace: repositoryId } });
      for (let offset = 0; offset < contents.length; offset += 100) {
        const rows = contents
          .slice(offset, offset + 100)
          .map(
            (content, i) =>
              Prisma.sql`(${randomUUID()}, ${content}, ${repositoryId}, ${literals[offset + i]}::vector, NOW(), NOW())`,
          );
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO "Document" ("id", "content", "namespace", "vector", "createdAt", "updatedAt") VALUES ${Prisma.join(rows)}`,
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

export async function searchDocuments(
  repositoryId: string,
  vector: number[],
  db: PrismaClient = prisma,
): Promise<{ content: string }[]> {
  const literal = vectorLiteral(vector);
  return db.$queryRaw<{ content: string }[]>(Prisma.sql`
    SELECT "content" FROM "Document"
    WHERE "namespace" = ${repositoryId} AND "vector" IS NOT NULL
    ORDER BY "vector" <=> ${literal}::vector LIMIT 6
  `);
}
