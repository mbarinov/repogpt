import {Chat} from './client';
import {PrismaClient} from "@prisma/client";
import {redirect} from "next/navigation";

export default async function ChatPage() {
    const db = new PrismaClient();

    const settings = await db.storeSettings.findFirst();

    if(!settings?.openAiKey || !settings?.githubAccessToken) {
        return redirect('/settings');
    }

    const list = await db.repository.findMany();

    if(list.length === 0) {
        return redirect('/repositories');
    }


    return (
        <div className="flex flex-col h-full">
            <Chat repositories={list}/>
        </div>
    );
}