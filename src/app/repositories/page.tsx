import { redirect } from "next/navigation";
import db from "@/lib/prisma";
import { RepoPage } from "./index";

export const dynamic = "force-dynamic";

export default async function ReposPage() {
  const settings = await db.storeSettings.findFirst();

  if (!settings?.openAiKey || !settings?.githubAccessToken) {
    redirect("/settings");
  }

  const list = await db.repository.findMany();

  return <RepoPage list={list || []} />;
}
