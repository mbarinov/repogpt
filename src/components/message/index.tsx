import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
    id: string;
    role: string;
    content: string;
}

export function Message({ id, role, content }: MessageProps) {
    return (
        <div
            key={id}
            className={`${role === 'user' ? 'text-right' : 'text-left'} transition-opacity duration-500 ease-in-out transform ${role === 'user' ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}`}
        >
            <span className={`inline-block p-3 rounded-lg shadow-md ${role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>
                <ReactMarkdown>{content}</ReactMarkdown>
            </span>
        </div>
    );
}