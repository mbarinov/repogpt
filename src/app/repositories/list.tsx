import React from 'react'
import Link from 'next/link'
import {Button} from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {Loader2, CheckCircle, Trash2, MessageSquare} from 'lucide-react'
import {Repository, RepositoryStatus} from '@prisma/client'

interface ListProps {
    repos: Repository[]
    onDelete: (id: string) => void
}

export function List({repos, onDelete}: ListProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Repositories</h2>
            <ul className="space-y-4">
                {repos.map((repo) => (
                    <li key={repo.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                        <div className="flex items-center space-x-4">
                            <span className="font-medium">{repo.name}</span>
                            {repo.status === RepositoryStatus.ERROR && (
                                <span className="text-red-500">Error: {repo?.error}</span>
                            )}
                            {repo.status === RepositoryStatus.LOADING ? (
                                <Loader2 className="animate-spin text-blue-500"
                                         size={20}/>
                            ) : (
                                <CheckCircle className="text-green-500"
                                             size={20}/>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <Link href={`/?repoId=${repo.id}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={repo.status !== RepositoryStatus.IMPORTED}
                                >
                                    <MessageSquare className="mr-2" size={16}/>
                                    Chat
                                </Button>
                            </Link>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 size={16}/>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you
                                            sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete the
                                            repository
                                            and remove all associated data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(repo.id)}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}