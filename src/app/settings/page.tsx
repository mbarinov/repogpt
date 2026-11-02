import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { ConfigurationForm } from "./client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return (
    <section className="mx-auto w-full max-w-5xl pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 text-base text-slate-600 sm:text-lg">
          Connect the tools behind your conversations.
        </p>
      </header>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px] md:gap-12">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
          <h2 className="mb-2 text-xl font-semibold text-slate-900">
            API connections
          </h2>
          <p className="mb-8 text-sm leading-6 text-slate-500">
            Configured keys stay on this server. Leave a field blank to keep its
            saved value.
          </p>
          <ConfigurationForm
            hasGithubAccessToken={Boolean(settings?.githubAccessToken)}
            hasOpenAiKey={Boolean(settings?.openAiKey)}
          />
        </div>
        <aside className="space-y-6 text-sm leading-6 text-slate-500">
          <div className="border-b border-slate-200 pb-6">
            <ShieldCheck size={24} className="mb-4 text-teal-800" />
            <h2 className="mb-2 font-semibold text-slate-900">
              Your local workspace
            </h2>
            <p>
              API keys are stored in this server’s database. RepoGPT has no
              authentication: run it locally and do not expose it to the public
              internet.
            </p>
          </div>
          <p>
            Repository content is sent to OpenAI for indexing and chat. Only
            connect repositories you’re permitted to process.
          </p>
          <Link
            href="https://github.com/mbarinov/repogpt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-medium text-teal-900 hover:underline"
          >
            View source on GitHub <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}
