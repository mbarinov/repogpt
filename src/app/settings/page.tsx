import Link from "next/link";
import {GithubIcon} from "lucide-react";
import {
    ConfigurationForm
} from './client';
import {PrismaClient} from "@prisma/client";

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const db = new PrismaClient();

    const settings = await db.storeSettings.findFirst();

    return (
        <div
            className="flex flex-col items-center justify-center p-4 bg-beige-100 text-beige-900">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Configuration</h2>
                    <p className="text-beige-700 mt-2">Securely manage your API
                        keys</p>
                </div>
                <ConfigurationForm githubAccessToken={settings?.githubAccessToken} openAiKey={settings?.openAiKey}/>
                <div className="text-center">
                    <Link
                        href="https://github.com/yourusername/repogpt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-beige-800 hover:text-beige-900 hover:underline"
                    >
                        <GithubIcon className="mr-2 h-4 w-4"/>
                        View Source on GitHub
                    </Link>
                </div>
            </div>
        </div>
    )
}