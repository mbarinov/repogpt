import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PrismaVectorStore } from "@langchain/community/vectorstores/prisma";
import { PrismaClient, Prisma, Document } from "@prisma/client";


const run = async () => {
    const db = new PrismaClient();
    const REPO_NAME =  "https://github.com/mbarinov/aithelete";

    const loader = new GithubRepoLoader(
        REPO_NAME,
        {
            branch: "main",
            recursive: true,
            accessToken: process.env.GITHUB_ACCESS_TOKEN,
            unknown: "warn",
            maxConcurrency: 5,
            ignorePaths: [
                "node_modules",
                "dist",
                "build",
                "coverage",
                ".github",
                ".git",
                ".vscode",
                ".idea",
                ".gitignore",
                ".npmignore",
                ".eslintrc.js",
                "tsconfig.json",
                "package.json",
                "package-lock.json",
                "yarn.lock",
                "pnpm-lock.yaml"
            ]
        }
    );

    const docs = [];
    for await (const doc of loader.loadAsStream()) {
        docs.push(doc);
    }

    console.log({ docs });
    console.log(`Loaded ${docs.length} documents`);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200
    });

    const chunks = await splitter.splitDocuments(docs);
    console.log(`Split ${chunks.length} chunks`);

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    });

    const vectorStore = PrismaVectorStore.withModel<Document>(db).create(
        embeddings,
        {
            prisma: Prisma,
            tableName: "Document",
            vectorColumnName: "vector",
            columns: {
                id: PrismaVectorStore.IdColumn,
                content: PrismaVectorStore.ContentColumn,
            }
        }
    );

    await db.document.deleteMany({
        where: { namespace: REPO_NAME }
    });

    await vectorStore.addModels(
        await db.$transaction(
            chunks.map((chunk) =>
                db.document.create({ data: { content: chunk.pageContent, namespace: REPO_NAME } })
            )
        )
    );
};

run().catch(console.error);