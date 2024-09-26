'use client'

import {useChat} from 'ai/react';
import {MessageList} from '@/components/message-list';
import {MessageInput} from '@/components/message-input';

export default function ChatPage() {
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        setMessages,
        isLoading
    } = useChat({
        api: '/api/chat',
        initialMessages: [],
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            sessionId: 'unique-session-id', // You might want to generate this dynamically
        },
        streamProtocol: 'text',
        onResponse: (response) => {
            console.log('Response:', response);
        },
        onError: (error) => {
            console.error('Error:', error);
        },
    });

    return (
        <div className="flex flex-col h-full">
            <div
                className={`flex-grow ${messages.length === 0 ? 'flex' +
                    ' items-center justify-center' : 'overflow-y-auto mb-40'}`}>
                {messages.length > 0 &&
                    <MessageList messages={messages} isLoading={isLoading}/>}
            </div>
            <div
                className={`${messages.length === 0 ? 'flex items-center justify-center h-full' : ''}`}>
                <MessageInput
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    hasMessages={messages.length > 0}
                    onClear={() => setMessages([])}
                />
            </div>
        </div>
    );
}