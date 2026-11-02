import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  assertMutationRequest,
  errorResponse,
  RequestError,
} from "@/lib/server/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertMutationRequest(_request);
    const { id } = await params;
    if (!id || id.length > 100)
      throw new RequestError("Invalid repository ID.");
    // The FK migration cascades documents and clears selectedRepoId atomically.
    const deleted = await prisma.repository.deleteMany({ where: { id } });
    if (!deleted.count) throw new RequestError("Repository not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
