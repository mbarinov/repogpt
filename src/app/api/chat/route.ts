import {NextRequest, NextResponse} from "next/server";
import {Message as VercelChatMessage} from "ai";

import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {SystemMessagePromptTemplate} from "@langchain/core/prompts";
import {RunnablePassthrough, RunnableSequence} from "@langchain/core/runnables";
import {HttpResponseOutputParser} from "langchain/output_parsers";
import {PrismaVectorStore} from "@langchain/community/vectorstores/prisma";
import {Document, Prisma, PrismaClient} from "@prisma/client";
import {formatDocumentsAsString} from "langchain/util/document";

const formatMessage = (message: VercelChatMessage) => {
    return `${message.role}: ${message.content}`;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const messages = body.messages ?? [];
        const repositoryId = body.selectedRepoId;
        const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
        const currentMessageContent = messages[messages.length - 1].content;
        const db = new PrismaClient();

        const apiKey = (await db.storeSettings.findFirst())?.openAiKey;
        const repository = await db.repository.findUnique({
            where: {
                id: repositoryId
            }
        });

        if (!apiKey) {
            throw new Error("OpenAI API key is required");
        }

        if (!repository) {
            throw new Error("Repository not found");
        }

        const llm = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0,
            apiKey
        });

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey
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
                },
                filter: {
                    namespace: {
                        equals: repository?.id
                    }
                }
            }
        );


        const retriever = vectorStore.asRetriever({
            k: 6,
            searchType: "similarity"
        });

        const systemPrompt = SystemMessagePromptTemplate.fromTemplate(`
  You are a helpful assistant with good knowledge in coding. Use the provided context and previous conversation to answer user questions with detailed explanations.
  Read the given context before answering questions and think step by step. If you cannot answer a user question based on the provided context, inform the user. Do not use any other information for answering.

  Context: {context}

  Conversation History:
  {chat_history}

  User: {question}
  `);

        const chain = RunnableSequence.from([
            RunnablePassthrough.assign({
                context: async (input) => {
                    return await retriever.pipe(formatDocumentsAsString).invoke(input.question as string);
                },
                question: async (input) => {
                    return input.question;
                },
                chat_history: async (input, {
                    metadata: {}
                }) => {
                    return input.chat_history || [];
                }
            }),
            systemPrompt,
            llm,
            new HttpResponseOutputParser(),
        ]);

        const stream = await chain.stream({
            chat_history: formattedPreviousMessages.join("\n"),
            question: currentMessageContent,
        });

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (e: unknown) {
        const error = e as { message: string; status?: number };
        return NextResponse.json({error: error.message}, {status: error.status ?? 500});
    }
}