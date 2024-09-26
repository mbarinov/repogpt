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
    SelectSeparator
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Send} from 'lucide-react';

interface MessageInputProps {
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    hasMessages: boolean;
    onClear?: () => void;
}

export function MessageInput({
                                 input,
                                 handleInputChange,
                                 handleSubmit,
                                 isLoading,
                                 hasMessages,
                                 onClear
                             }: MessageInputProps) {

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
        }
    };

    return (
        <form onSubmit={handleSubmit}
              className={`flex flex-col gap-4 p-6 bg-white shadow-lg ${hasMessages ? 'w-full lg:max-w-4xl mx-auto fixed bottom-0 left-0 right-0 rounded-tl-2xl rounded-tr-2xl' : 'flex items-stretch justify-center w-full lg:w-1/3 rounded-2xl'}`}>
            <Textarea
                placeholder="Ask me anything about your repo"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`flex-grow mr-2 bg-white text-gray-800 border border-gray-300 rounded-lg shadow-sm ${hasMessages ? '' : 'text-lg p-4'}`}
            />
            <div className="flex items-center justify-between gap-2">
                <Select defaultValue={"@mbarinov/aithelete"}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a repo"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Available repositories:</SelectLabel>
                            <SelectItem
                                value="@mbarinov/aithelete">@mbarinov/aithelete</SelectItem>
                            <SelectItem value="banana">Banana</SelectItem>
                        </SelectGroup>
                        <SelectSeparator/>
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