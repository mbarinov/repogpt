import {PrismaClient} from '@prisma/client'
import {RepoPage} from './index'

export default async function ReposPage() {
    const db = new PrismaClient();

    const list = await db.repository.findMany();

    return (
        <div className="w-full flex justify-center">
            <div className="flex justify-stretch max-w-3xl w-full">
                <RepoPage list={list || []}/>
            </div>
        </div>
    )
}