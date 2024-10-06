import React from 'react';
import {Textarea} from "@/components/ui/textarea";
import {
    Select,
    SelectItem,
    SelectContent,
    SelectGroup,
    SelectTrigger,
    SelectLabel,
    SelectValue,
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Send} from 'lucide-react';
import {Repository} from "@prisma/client";

interface MessageInputProps {
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    hasMessages: boolean;
    onClear?: () => void;
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
                                 repositories,
                                 selectedRepoId,
                                 onSelectedRepoIdChange
                             }: MessageInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
        }
    };

    const examples = ["What's the tech stack?", "How to set up" +
    " the project?", "How to deploy the project?"];

    return (
        <form onSubmit={handleSubmit}
              className={`flex flex-col gap-4 p-6 bg-white shadow-lg ${hasMessages ? 'w-full lg:max-w-4xl mx-auto fixed bottom-0 left-0 right-0 rounded-tl-2xl rounded-tr-2xl' : 'flex items-stretch justify-center w-full lg:w-2/5 rounded-2xl'}`}>
            <Textarea
                placeholder="Ask me anything about your repo"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`flex-grow mr-2 bg-white text-gray-800 border border-gray-300 rounded-lg shadow-sm ${hasMessages ? '' : 'text-lg p-4'}`}
            />
            {!hasMessages && examples.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {examples.map((example, index) => (
                        <div key={index}
                             className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer"
                             onClick={() => handleInputChange({target: {value: example}} as React.ChangeEvent<HTMLTextAreaElement>)}>
                            {example}
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <Select value={selectedRepoId || ''}
                        onValueChange={(nextRepo) => {
                            if (nextRepo) {
                                onSelectedRepoIdChange?.(nextRepo);
                                onClear?.();
                            }
                        }}>
                    <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select a repo"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Available repositories:</SelectLabel>
                            {repositories.map(repo => (
                                <SelectItem
                                    key={repo.id}
                                    value={repo.id}>{repo.name}</SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <div className="flex flex-row gap-2">
                    {hasMessages && onClear && (
                        <Button onClick={onClear} size="sm" disabled={isLoading}
                                className={`flex gap-1 rounded-full text-white shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span className="font-semibold">Clear</span>
                        </Button>
                    )}

                    <Button type="submit" size="sm" disabled={isLoading}
                            className={`flex gap-1 bg-blue-600 rounded-full hover:bg-blue-700 text-white shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Send className="h-4 w-4"/>
                        <span className="font-semibold">Send</span>
                    </Button>
                </div>
            </div>
        </form>
    );
}