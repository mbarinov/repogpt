import { Chat } from "./client";
import db from "@/lib/prisma";
import { redirect } from "next/navigation";

interface ChatPageProps {
  searchParams: Promise<{
    repoId?: string | string[];
    prompt?: string | string[];
  }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;

  const settings = await db.storeSettings.findUnique({ where: { id: 1 } });

  if (!settings?.openAiKey || !settings?.githubAccessToken) {
    return redirect("/settings");
  }

  const list = await db.repository.findMany({ orderBy: { createdAt: "desc" } });

  if (list.length === 0) {
    return redirect("/repositories");
  }

  return (
    <div className="flex flex-col h-full">
      <Chat
        key={`${typeof params.repoId === "string" ? params.repoId : "default"}:${typeof params.prompt === "string" ? params.prompt : ""}`}
        defaultRepoId={
          typeof params.repoId === "string" ? params.repoId : undefined
        }
        defaultPrompt={
          typeof params.prompt === "string"
            ? params.prompt.slice(0, 2000)
            : undefined
        }
        repositories={list}
      />
    </div>
  );
}
