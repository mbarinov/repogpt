import {Chroma} from "@langchain/community/vectorstores/chroma";
import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {SystemMessagePromptTemplate,} from "@langchain/core/prompts";
import {formatDocumentsAsString} from "langchain/util/document";
import {
    RunnablePassthrough,
    RunnableSequence,
} from "@langchain/core/runnables";
import {StringOutputParser} from "@langchain/core/output_parsers"

const chatHistory = new Map<string, string[]>();

async function run() {
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0
    });

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    });

    const vectorStore = new Chroma(embeddings, {
        collectionName: "aithelete",
        url: "http://localhost:8000",
        collectionMetadata: {
            "hnsw:space": "cosine",
        }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
    });

    const retriever = vectorStore.asRetriever({k: 6, searchType: "similarity"});

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
            chat_history: async (input, { metadata: {
                sessionId
            }}) => {
                return chatHistory.get(sessionId) || [];
            }
        }),
        systemPrompt,
        llm,
        new StringOutputParser(),
    ]);

    // const msg = await chain.invoke({
    //     question: "What is the technical stack of the project?",
    //     chat_history: [],
    // }, {
    //     configurable: {
    //         sessionId: "aithelete",
    //     }
    // });
    //
    // chatHistory.set("aithelete", [...chatHistory.get("aithelete") || [], msg]);
}

run().catch(console.error);