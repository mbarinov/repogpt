import {NextRequest, NextResponse} from "next/server";
import {PrismaClient} from "@prisma/client";


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = new PrismaClient();
        const repositories = await db.repository.delete({
            where: {
                id: params.id
            }
        })

        return NextResponse.json({repositories});
    } catch (e: unknown) {
        const error = e as { message: string; status?: number };
        console.error(error.message);
        return NextResponse.json({error: error.message}, {status: error.status ?? 500});
    }
}