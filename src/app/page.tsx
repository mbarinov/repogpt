import {Chat} from './client';
import {PrismaClient} from "@prisma/client";
import {redirect} from "next/navigation";

interface ChatPageProps {
    searchParams: {
        repoId?: string
    }
}

export const dynamic = 'force-dynamic'

export default async function ChatPage({
                                           searchParams
                                       }: ChatPageProps) {
    const db = new PrismaClient();

    const settings = await db.storeSettings.findFirst();

    if (!settings?.openAiKey || !settings?.githubAccessToken) {
        return redirect('/settings');
    }

    const list = await db.repository.findMany();

    if (list.length === 0) {
        return redirect('/repositories');
    }


    return (
        <div className="flex flex-col h-full">
            <Chat defaultRepoId={searchParams?.repoId} repositories={list}/>
        </div>
    );
}