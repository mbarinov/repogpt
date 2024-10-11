import {
    GithubRepoLoader
} from "@langchain/community/document_loaders/web/github";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {OpenAIEmbeddings} from "@langchain/openai";
import {PrismaVectorStore} from "@langchain/community/vectorstores/prisma";
import {Prisma, RepositoryStatus, PrismaClient, Document} from "@prisma/client";
import {Document as LangchainDocument} from "langchain/document"; // Adjust the import path if necessary
import prisma from '@/lib/prisma';

/**
 * List of paths to ignore when loading documents from GitHub repositories.
 */
const IGNORED_PATHS = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.github/**",
    "**/.git/**",
    "**/.vscode/**",
    "**/.idea/**",
    "**/.gitignore",
    "**/.npmignore",
    "**/.eslintrc.js",
    "**/tsconfig.json",
    "**/package.json",
    "**/package-lock.json",
    "**/yarn.lock",
    "**/pnpm-lock.yaml"
];

/**
 * Indexer class responsible for loading, processing, and storing documents from a GitHub repository.
 */
export class Indexer {
    private readonly db: PrismaClient;

    /**
     * Constructs an Indexer instance.
     * @param db - PrismaClient instance for database interactions.
     */
    constructor(db: PrismaClient = prisma) {
        this.db = db;
    }

    /**
     * Executes the indexing process for a given repository ID.
     * @param repoId - The ID of the repository to index.
     */
    public async run(repoId: string, branch: string = "main") {
        console.log(`[${new Date().toISOString()}] Starting indexing for repository ID: ${repoId}`);

        try {
            const repository = await this.getRepository(repoId);
            const docs = await this.loadDocuments(repository.url, branch);
            const chunks = await this.splitDocuments(docs);

            await this.storeChunks(chunks, repository.id, repository.url);

            console.log(`[${new Date().toISOString()}] Indexing completed successfully for repository ID: ${repoId}`);
        } catch (error) {
            this.db.repository.update({
                where: {
                    id: repoId,
                },
                data: {
                    error: (error as Error).message,
                    status: RepositoryStatus.ERROR
                }
            }).then(() => {
                console.error(`[${new Date().toISOString()}] Error during indexing for repository ID ${repoId}:`, error);
            })
        }
    }

    /**
     * Retrieves repository details from the database.
     * @param repoId - The ID of the repository.
     * @returns The repository record.
     * @throws Error if the repository is not found.
     */
    private async getRepository(repoId: string) {
        const repository = await this.db.repository.findUnique({
            where: {id: repoId}
        });

        if (!repository) {
            throw new Error(`Repository with ID ${repoId} not found`);
        }

        return repository;
    }

    /**
     * Retrieves the GitHub access token from the database.
     * @returns The GitHub access token.
     * @throws Error if the access token is not found.
     */
    private async getGithubAccessToken(): Promise<string> {
        const settings = await this.db.storeSettings.findFirst({
            orderBy: {createdAt: 'desc'} // Ensures the latest settings are fetched
        });

        const accessToken = settings?.githubAccessToken;

        if (!accessToken) {
            throw new Error("GitHub access token is required");
        }

        return accessToken;
    }

    /**
     * Retrieves the OpenAI access token from the database.
     * @returns The OpenAI access token.
     * @throws Error if the access token is not found.
     */
    private async getOpenAiToken(): Promise<string> {
        const settings = await this.db.storeSettings.findFirst({
            orderBy: {createdAt: 'desc'} // Ensures the latest settings are fetched
        });

        const openAiKey = settings?.openAiKey;

        if (!openAiKey) {
            throw new Error("OpenAI access token is required");
        }

        return openAiKey;
    }

    /**
     * Loads documents from a GitHub repository.
     * @param repoUrl - The URL of the GitHub repository.
     * @param branch - The branch to load documents from (default is "main").
     * @returns An array of LangChain documents.
     */
    private async loadDocuments(repoUrl: string, branch: string = "main"): Promise<LangchainDocument[]> {
        const accessToken = await this.getGithubAccessToken();

        const loader = new GithubRepoLoader(
            repoUrl,
            {
                branch,
                recursive: true,
                accessToken,
                unknown: "warn",
                maxConcurrency: 5,
                ignorePaths: IGNORED_PATHS
            }
        );

        const docs: LangchainDocument[] = [];
        for await (const doc of loader.loadAsStream()) {
            docs.push(doc);
        }

        console.log(`[${new Date().toISOString()}] Loaded ${docs.length} documents from ${repoUrl}`);
        return docs;
    }

    /**
     * Splits documents into manageable chunks.
     * @param docs - The array of documents to split.
     * @returns An array of document chunks.
     */
    private async splitDocuments(docs: LangchainDocument[]): Promise<LangchainDocument[]> {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200
        });

        const chunks = await splitter.splitDocuments(docs);
        console.log(`[${new Date().toISOString()}] Split into ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Stores document chunks into the vector store.
     * @param chunks - The array of document chunks to store.
     * @param namespace - The namespace under which to store the documents (should be Repository.id).
     * @param repoUrl - The URL of the repository (used to update repository status).
     */
    private async storeChunks(chunks: LangchainDocument[], namespace: string, repoUrl: string) {
        console.log(`[${new Date().toISOString()}] Storing ${chunks.length} chunks into the vector store`);

        const openAiKey = await this.getOpenAiToken();
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: openAiKey,
        });

        const vectorStore = PrismaVectorStore.withModel<Document>(this.db).create(
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

        try {
            // Delete existing documents with the same namespace (Repository.id)
            await this.db.document.deleteMany({
                where: {namespace}
            });
            console.log(`[${new Date().toISOString()}] Deleted existing documents in namespace: ${namespace}`);

            // Create new document records with the correct namespace (Repository.id)
            const createPromises = chunks.map(chunk =>
                this.db.document.create({
                    data: {
                        content: sanitizeString(chunk.pageContent),
                        namespace
                    }
                })
            );

            const createdDocs = await this.db.$transaction(createPromises);
            console.log(`[${new Date().toISOString()}] Created ${createdDocs.length} document records`);

            // Add the created documents to the vector store
            await vectorStore.addModels(createdDocs);
            console.log(`[${new Date().toISOString()}] Added models to the vector store`);

            // Update the repository status using repoUrl
            await this.db.repository.update({
                where: {url: repoUrl},
                data: {status: RepositoryStatus.IMPORTED, error: null}
            });
            console.log(`[${new Date().toISOString()}] Updated repository status to IMPORTED for URL: ${repoUrl}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error storing chunks for namespace ${namespace}:`, error);

            // Update the repository status to NOT_STARTED in case of error
            await this.db.repository.update({
                where: {url: repoUrl},
                data: {status: RepositoryStatus.NOT_STARTED}
            });
            console.log(`[${new Date().toISOString()}] Updated repository status to NOT_STARTED for URL: ${repoUrl}`);

            throw error; // Re-throw to allow upstream handling if necessary
        }
    }
}

function sanitizeString(input: string): string {
    return input.replace(/\0/g, ''); // Removes all null bytes
}
