'use client'

import {useState} from 'react'
import Link from 'next/link'
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {useToast} from "@/hooks/use-toast"
import {EyeIcon, EyeOffIcon} from 'lucide-react'

interface ConfigurationFormProps {
    openAiKey?: string
    githubAccessToken?: string
}

export function ConfigurationForm(props: ConfigurationFormProps) {
    const [openAiKey, setOpenAiKey] = useState<string>(props.openAiKey ?? '')
    const [githubAccessToken, setGithubAccessToken] = useState<string>(props.githubAccessToken ?? '')
    const [showOpenAIKey, setShowOpenAIKey] = useState<boolean>(false)
    const [showGithubKey, setShowGithubKey] = useState<boolean>(false)
    const {toast} = useToast()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                openAiKey,
                githubAccessToken
            })
        });

        if (!response.ok) {
            toast({
                title: "Error",
                description: "Failed to save API keys.",
            })
            return;
        }


        console.log('API keys saved successfully.')
        toast({
            title: "Success",
            description: "API keys saved successfully.",
            variant: "default"
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <div className="relative">
                    <Input
                        id="openai-key"
                        type={showOpenAIKey ? "text" : "password"}
                        placeholder="Enter your OpenAI API key"
                        value={openAiKey}
                        onChange={(e) => setOpenAiKey(e.target.value)}
                        className="bg-beige-50 border-beige-300 pr-10"
                        required
                        minLength={32}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-beige-700 hover:text-beige-900 hover:bg-beige-200"
                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    >
                        {showOpenAIKey ?
                            <EyeOffIcon className="h-4 w-4"/> :
                            <EyeIcon className="h-4 w-4"/>}
                    </Button>
                </div>
                <p className="text-sm text-beige-700">OpenAI key is
                    needed for indexing and requests. Your OpenAI API
                    key will be stored securely on your device.</p>
                <p className="text-sm text-beige-700">To get your OpenAI
                    API key, visit <a
                        href="https://platform.openai.com/account/api-keys"
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">OpenAI
                        API Keys</a>.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="github-key">GitHub API Key</Label>
                <div className="relative">
                    <Input
                        id="github-key"
                        type={showGithubKey ? "text" : "password"}
                        placeholder="Enter your GitHub API key"
                        value={githubAccessToken}
                        onChange={(e) => setGithubAccessToken(e.target.value)}
                        className="bg-beige-50 border-beige-300 pr-10"
                        required
                        minLength={40}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-beige-700 hover:text-beige-900 hover:bg-beige-200"
                        onClick={() => setShowGithubKey(!showGithubKey)}
                    >
                        {showGithubKey ?
                            <EyeOffIcon className="h-4 w-4"/> :
                            <EyeIcon className="h-4 w-4"/>}
                    </Button>
                </div>
                <p className="text-sm text-beige-700">GitHub Access
                    Token is needed for cloning repos. Your GitHub API
                    key will be stored securely on your device.</p>
                <p className="text-sm text-beige-700">To get your GitHub
                    Access Token, visit <a
                        href="https://github.com/settings/tokens"
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">GitHub
                        Tokens</a>.</p>
            </div>

            <div className="flex flex-col gap-4">
                <Button type="submit"
                        className="w-full bg-blue-600 text-white hover:bg-blue-700">Save</Button>
                <Link href="/repositories">
                    <Button type="button"
                            className="w-full bg-gray-400 text-white hover:bg-gray-500">Import
                        Repos</Button>
                </Link>
            </div>
        </form>
    );
}