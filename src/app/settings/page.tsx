import Link from "next/link";
import { Code2 } from "lucide-react";
import { ConfigurationForm } from "./client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-beige-100 text-beige-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Configuration</h2>
          <p className="text-beige-700 mt-2">Manage your local API keys</p>
        </div>
        <ConfigurationForm
          hasGithubAccessToken={Boolean(settings?.githubAccessToken)}
          hasOpenAiKey={Boolean(settings?.openAiKey)}
        />
        <div className="text-center">
          <Link
            href="https://github.com/mbarinov/repogpt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-beige-800 hover:text-beige-900 hover:underline"
          >
            <Code2 className="mr-2 h-4 w-4" />
            View Source on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
