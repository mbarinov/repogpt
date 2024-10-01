import {NextRequest, NextResponse} from "next/server";
import {PrismaClient, RepositoryStatus} from "@prisma/client";
import {Indexer} from '@/services/indexer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            url,
        } = body as {
            url: string;
        };

        if (!url) {
            throw new Error("URL is required");
        }

        const db = new PrismaClient();
        // Get a name from the Github URL
        const name = url.split('/').slice(-2).join('/');

        const repository = await db.repository.create({
            data: {
                name,
                url,
                status: RepositoryStatus.LOADING,
            },
        })

        const indexer = new Indexer();

        indexer.run(repository.id);

        return NextResponse.json({
            success: true, repository: {
                name,
                url,
                status: RepositoryStatus.LOADING,
            }
        });

    } catch (e: unknown) {
        const error = e as { message: string; status?: number };
        console.error(error.message);
        return NextResponse.json({error: error.message}, {status: error.status ?? 500});
    }
}

export async function GET() {
    try {
        const db = new PrismaClient();
        const repositories = await db.repository.findMany();

        return NextResponse.json({repositories});
    } catch (e: unknown) {
        const error = e as { message: string; status?: number };
        console.error(error.message);
        return NextResponse.json({error: error.message}, {status: error.status ?? 500});
    }
}