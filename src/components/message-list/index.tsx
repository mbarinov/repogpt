import React, { useEffect, useRef } from 'react';
import { Message } from '@/components/message';

interface Message {
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
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (messages.length === 0 && !isLoading) {
        return null;
    }

    return (
        <div className="overflow-y-auto mb-4 p-6 rounded-lg border border-gray-300 lg:max-w-3xl lg:mx-auto">
            <div className="flex flex-col gap-2 ">
                {messages.map((message) => (
                    <Message key={message.id} id={message.id} role={message.role} content={message.content} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            {isLoading && (
                <div className="text-center mt-4">
                    <span className="inline-block p-3 rounded-lg bg-gray-200 text-gray-800 shadow-md">
                        AI is thinking...
                    </span>
                </div>
            )}
        </div>
    );
}