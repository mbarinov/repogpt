import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, readObject, RequestError } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const key = (value: unknown): string => {
      if (value === undefined || value === "") return "";
      if (
        typeof value !== "string" ||
        value.length > 2000 ||
        /[\r\n\0]/.test(value)
      )
        throw new RequestError("Invalid API key.");
      return value.trim();
    };
    const openAiKey = key(body.openAiKey);
    const githubAccessToken = key(body.githubAccessToken);
    const existing = await prisma.storeSettings.findUnique({
      where: { id: 1 },
    });
    if (
      !(openAiKey || existing?.openAiKey) ||
      !(githubAccessToken || existing?.githubAccessToken)
    )
      throw new RequestError("OpenAI and GitHub keys are required.");
    await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: {
        ...(openAiKey ? { openAiKey } : {}),
        ...(githubAccessToken ? { githubAccessToken } : {}),
      },
      create: { id: 1, openAiKey, githubAccessToken },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
