import React from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, UserRound } from "lucide-react";
import type { SourceCitation } from "@/services/indexer/citations";

interface MessageProps {
  id: string;
  role: string;
  content: string;
  sources?: SourceCitation[];
  hasLegacySources?: boolean;
}

export function Message({
  id,
  role,
  content,
  sources = [],
  hasLegacySources = false,
}: MessageProps) {
  const isUser = role === "user";
  return (
    <article
      key={id}
      className={`min-w-0 rounded-xl px-5 py-5 sm:px-6 ${isUser ? "bg-teal-50/70" : "bg-white"}`}
      aria-label={isUser ? "Your message" : "RepoGPT response"}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-950">
        {isUser ? (
          <UserRound size={17} aria-hidden="true" />
        ) : (
          <Sparkles size={17} aria-hidden="true" />
        )}
        {isUser ? "You" : "RepoGPT"}
      </div>
      <div className="min-w-0 break-words text-[15px] leading-7 text-slate-700 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-slate-100 [&_code]:font-mono [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-teal-800 [&_a]:underline [&_h1]:text-xl [&_h2]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-4">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const source = sources.find(
                (item) => href === `#source-${item.id}`,
              );
              // Model-written locations and unknown citation IDs are never clickable evidence.
              return source ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${source.path}:${source.startLine}–${source.endLine}`}
                >
                  {source.id}
                </a>
              ) : (
                <span>{children}</span>
              );
            },
            img: ({ alt }) => <span>{alt}</span>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {!isUser && sources.length > 0 && (
        <section
          aria-label="Retrieved sources"
          className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-600"
        >
          <h3 className="mb-2 font-semibold">Retrieved sources</h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-teal-800 underline"
                >
                  {source.id} · {source.path}:{source.startLine}–
                  {source.endLine}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!isUser && hasLegacySources && (
        <p className="mt-4 text-xs leading-5 text-amber-800">
          Some retrieved excerpts have no verified source location. Refresh the
          repository index to enable source links.
        </p>
      )}
    </article>
  );
}
