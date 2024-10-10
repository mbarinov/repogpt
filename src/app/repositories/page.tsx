import {redirect} from "next/navigation";
import {PrismaClient} from '@prisma/client'
import {RepoPage} from './index'

export const dynamic = 'force-dynamic'

export default async function ReposPage() {
    const db = new PrismaClient();

    const settings = await  db.storeSettings.findFirst();

    if(!settings?.openAiKey || !settings?.githubAccessToken) {
        redirect('/settings');
    }

    const list = await db.repository.findMany();

    return (
        <div className="w-full flex justify-center">
            <div className="flex justify-stretch max-w-3xl w-full">
                <RepoPage list={list || []}/>
            </div>
        </div>
    )
}