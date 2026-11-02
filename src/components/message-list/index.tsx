import React, { useEffect, useRef } from "react";
import { Message } from "@/components/message";
import type { SourceMetadata } from "@/services/indexer/citations";

interface Message extends Partial<SourceMetadata> {
  id: string;
  role: string;
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            id={message.id}
            role={message.role}
            content={message.content}
            sources={message.sources}
            hasLegacySources={message.hasLegacySources}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isLoading && (
        <div role="status" className="mt-4 px-6 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            Generating response…
          </span>
        </div>
      )}
    </div>
  );
}
