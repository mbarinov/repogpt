import React from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectLabel,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Repository } from "@prisma/client";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  hasMessages: boolean;
  onClear?: () => void;
  onStop?: () => void;
  repositories: Repository[];
  selectedRepoId: string | null;
  onSelectedRepoIdChange?: (repoId: string) => void;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  hasMessages,
  onClear,
  onStop,
  repositories,
  selectedRepoId,
  onSelectedRepoIdChange,
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      !isLoading &&
      selectedRepoId &&
      input.trim()
    ) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const examples = [
    "How is the project structured?",
    "Where does authentication happen?",
    "How do I run the project locally?",
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full min-w-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <Textarea
        aria-label="Message"
        placeholder={
          selectedRepoId
            ? "Ask a question about this repository…"
            : "Index a repository to start chatting"
        }
        disabled={!selectedRepoId}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="min-h-24 resize-y border-0 bg-transparent p-0 text-base text-slate-800 shadow-none focus-visible:ring-0"
      />
      {!hasMessages && examples.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {examples.map((example, index) => (
            <button
              type="button"
              key={index}
              disabled={!selectedRepoId || isLoading}
              className="rounded-md border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
              onClick={() =>
                handleInputChange({
                  target: { value: example },
                } as React.ChangeEvent<HTMLTextAreaElement>)
              }
            >
              {example}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Select
          disabled={isLoading}
          value={selectedRepoId || ""}
          onValueChange={(nextRepo) => {
            if (nextRepo) {
              onSelectedRepoIdChange?.(nextRepo);
              onClear?.();
            }
          }}
        >
          <SelectTrigger
            aria-label="Repository"
            className="w-full min-w-0 sm:w-[260px]"
          >
            <SelectValue placeholder="Select a repo" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Available repositories:</SelectLabel>
              {repositories.map((repo) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="flex flex-row gap-2">
          {isLoading && (
            <Button type="button" variant="outline" onClick={onStop}>
              Stop
            </Button>
          )}
          {hasMessages && onClear && (
            <Button
              type="button"
              onClick={onClear}
              size="sm"
              disabled={isLoading}
              variant="ghost"
              className="text-slate-600"
            >
              <span className="font-semibold">Clear</span>
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !selectedRepoId || !input.trim()}
            className="gap-2 bg-teal-900 text-white hover:bg-teal-800"
          >
            <Send className="h-4 w-4" />
            <span className="font-semibold">Send</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
