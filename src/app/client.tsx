"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CheckCircle2 } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Repository } from "@prisma/client";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";

interface ChatProps {
  defaultRepoId?: string;
  defaultPrompt?: string;
  repositories: Repository[];
}

// Remount the conversation when the repository changes so late stream events
// cannot append answers from the previous repository to the new conversation.
export function Chat({
  defaultRepoId,
  defaultPrompt,
  repositories,
}: ChatProps) {
  const available = repositories.filter((repo) => repo.status === "IMPORTED");
  const [selectedRepoId, setSelectedRepoId] = useState(
    () =>
      available.find((repo) => repo.id === defaultRepoId)?.id ??
      available[0]?.id ??
      "",
  );
  return (
    <Conversation
      key={selectedRepoId}
      selectedRepoId={selectedRepoId}
      defaultPrompt={
        selectedRepoId === defaultRepoId ? defaultPrompt : undefined
      }
      repositories={available}
      onSelect={setSelectedRepoId}
    />
  );
}

function Conversation({
  selectedRepoId,
  defaultPrompt,
  repositories,
  onSelect,
}: {
  selectedRepoId: string;
  defaultPrompt?: string;
  repositories: Repository[];
  onSelect: (id: string) => void;
}) {
  const [input, setInput] = useState(defaultPrompt ?? "");
  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
    regenerate,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { selectedRepoId },
    }),
  });
  const isLoading = status === "submitted" || status === "streaming";
  const selectedRepo = repositories.find((repo) => repo.id === selectedRepoId);
  return (
    <section className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-7 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Chat
          </h1>
          <p className="mt-2 text-slate-600">
            Understand your code, one question at a time.
          </p>
        </div>
        <Link
          href="/repositories"
          className="inline-flex items-center gap-2 rounded-md py-2 text-sm font-medium text-teal-900 hover:underline"
        >
          <ArrowLeft size={16} /> Repositories
        </Link>
      </header>
      {selectedRepo && (
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
          <span className="break-all font-semibold text-slate-800">
            {selectedRepo.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <CheckCircle2 size={15} />
            Indexed code
          </span>
        </div>
      )}
      {selectedRepo?.error && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Refresh failed; chat uses the previous index. {selectedRepo.error}
        </p>
      )}
      <div className="min-w-0">
        {!messages.length && (
          <div className="py-8 text-center sm:py-14">
            <MessageSquare className="mx-auto mb-5 text-teal-800" size={30} />
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {selectedRepo
                ? "What would you like to understand?"
                : "No indexed repositories yet"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              {selectedRepo
                ? "Ask about the architecture, trace a feature, or find your way around the code."
                : "Import a repository and wait for indexing to finish. Then you can ask questions about its code."}
            </p>
            {!selectedRepo && (
              <Link
                href="/repositories"
                className="mt-4 inline-block text-sm font-medium text-teal-800 underline"
              >
                Go to repositories
              </Link>
            )}
          </div>
        )}
        <MessageList
          messages={messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join(""),
          }))}
          isLoading={isLoading}
        />
        {error && (
          <div
            role="alert"
            className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Could not complete the response. Check your settings and try again.
            <button
              type="button"
              className="ml-2 underline"
              disabled={isLoading}
              onClick={() => {
                clearError();
                void regenerate();
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
      <MessageInput
        input={input}
        handleInputChange={(event) => setInput(event.target.value)}
        handleSubmit={(event) => {
          event.preventDefault();
          if (!input.trim() || !selectedRepoId || isLoading) return;
          const text = input.trim();
          setInput("");
          clearError();
          void sendMessage({ text });
        }}
        isLoading={isLoading}
        selectedRepoId={selectedRepoId}
        repositories={repositories}
        hasMessages={messages.length > 0}
        onClear={() => {
          setMessages([]);
          clearError();
        }}
        onStop={() => void stop()}
        onSelectedRepoIdChange={(id) => {
          void stop();
          onSelect(id);
        }}
      />
      <p className="text-center text-xs leading-5 text-slate-500">
        Answers are based on indexed code. Verify important details against the
        source.
      </p>
    </section>
  );
}
