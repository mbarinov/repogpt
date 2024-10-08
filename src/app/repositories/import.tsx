import React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {useToast} from '@/hooks/use-toast'

interface ImportProps {
    onImport: ({
                   url,
                   branch
               }: {
        url: string;
        branch: string;
    }) => void
}

export function Import({onImport}: ImportProps) {
    const [repoUrl, setRepoUrl] = React.useState<string>('');
    const [branch, setBranch] = React.useState<string>('main');
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const {toast} = useToast()

    const handleImport = async () => {
        if (!repoUrl) {
            toast({
                title: "Error",
                description: "Please enter a valid GitHub repository URL.",
                variant: "destructive",
            })
            return
        }

        if (isLoading) {
            return
        }

        try {
            setIsLoading(true)

            onImport({
                url: repoUrl,
                branch,
            });

            setRepoUrl('')

            toast({
                title: "Success",
                description: "Repository import started. It may take a few minutes.",
            });
        } catch (e) {
            const error = e as { message: string; status?: number };

            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });

        } finally {
            setIsLoading(false);
        }
    }


    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Import GitHub
                Repository</h2>
            <div className="flex space-x-2">
                <Input
                    type="text"
                    disabled={isLoading}
                    placeholder="Enter GitHub repo URL"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                />
                <Input
                    type="text"
                    disabled={isLoading}
                    placeholder="Enter branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-24"
                />
                <Button disabled={isLoading}
                        onClick={handleImport}>Import</Button>
            </div>
        </div>
    );
}