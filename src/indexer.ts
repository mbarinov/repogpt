import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const run = async () => {
    const loader = new GithubRepoLoader(
        "https://github.com/mbarinov/aithelete",
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

    const vectorStore = new Chroma(embeddings, {
        collectionName: "aithelete",
        url: "http://localhost:8000", // Optional, will default to this value
        collectionMetadata: {
            "hnsw:space": "cosine",
        }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
    });

    await vectorStore.addDocuments(chunks);
};

run().catch(console.error);