import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Indexer } from "@/services/indexer";
import { parseBranch, parseRepositoryUrl } from "@/services/indexer/github";
import { errorResponse, readObject, RequestError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const { url, name } = parseRepositoryUrl(body.url);
    const branch = parseBranch(body.branch);
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 1 },
    });
    if (!settings?.openAiKey || !settings?.githubAccessToken)
      throw new RequestError(
        "Configure your GitHub and OpenAI keys first.",
        409,
      );
    const existing = await prisma.repository.findUnique({ where: { url } });
    let id: string;
    if (existing) {
      // Atomic claim prevents concurrent imports from replacing each other's index.
      const claim = await prisma.repository.updateMany({
        where: { id: existing.id, status: { not: "LOADING" } },
        data: { status: "LOADING", error: null },
      });
      if (!claim.count)
        throw new RequestError(
          "This repository is already being imported.",
          409,
        );
      id = existing.id;
    } else {
      try {
        id = (
          await prisma.repository.create({
            data: { name, url, status: "LOADING" },
          })
        ).id;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        )
          throw new RequestError(
            "This repository is already being imported.",
            409,
          );
        throw error;
      }
    }
    // Deliberately awaited: local Node server, not a fire-and-forget serverless job.
    await new Indexer().run(id, branch);
    const repository = await prisma.repository.findUnique({ where: { id } });
    if (!repository)
      throw new RequestError("Repository was deleted during import.", 404);
    return NextResponse.json({ repository }, { status: existing ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      repositories: await prisma.repository.findMany({
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
