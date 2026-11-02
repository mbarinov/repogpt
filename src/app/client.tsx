"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Repository } from "@prisma/client";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";

interface ChatProps {
  defaultRepoId?: string;
  repositories: Repository[];
}

// Remount the conversation when the repository changes so late stream events
// cannot append answers from the previous repository to the new conversation.
export function Chat({ defaultRepoId, repositories }: ChatProps) {
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
      repositories={available}
      onSelect={setSelectedRepoId}
    />
  );
}

function Conversation({
  selectedRepoId,
  repositories,
  onSelect,
}: {
  selectedRepoId: string;
  repositories: Repository[];
  onSelect: (id: string) => void;
}) {
  const [input, setInput] = useState("");
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
  return (
    <div className="flex flex-col h-full">
      <div className={messages.length ? "overflow-y-auto mb-40" : "flex-grow"}>
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
          <div role="alert" className="p-4 text-red-700">
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
    </div>
  );
}
