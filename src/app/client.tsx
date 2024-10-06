'use client'

import {useEffect, useState} from "react";
import {useChat} from 'ai/react';
import {Repository} from '@prisma/client'
import {MessageList} from '@/components/message-list';
import {MessageInput} from '@/components/message-input';

interface ChatProps {
    defaultRepoId?: string,
    repositories: Repository[]
}

export function Chat(props: ChatProps) {
    const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
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
            selectedRepoId
        },
        streamProtocol: 'text',
    });

    useEffect(() => {
        if (props.defaultRepoId) {
            setSelectedRepoId(props.defaultRepoId);
        } else if (props.repositories.length > 0) {
            setSelectedRepoId(props.repositories[0].id);
        }
    }, [props.defaultRepoId, props.repositories]);

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
                    selectedRepoId={selectedRepoId}
                    onSelectedRepoIdChange={(repoId) => {
                        setSelectedRepoId(repoId);
                    }}
                    repositories={props.repositories}
                    hasMessages={messages.length > 0}
                    onClear={() => setMessages([])}
                />
            </div>
        </div>
    );
}