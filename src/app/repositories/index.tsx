"use client";

import React from 'react'
import {Repository, RepositoryStatus} from '@prisma/client'
import {Import} from './import'
import {List} from './list'

interface RepoPageProps {
    list: Repository[]
}

export function RepoPage(props: RepoPageProps) {
    const [repos, setRepos] = React.useState(props.list);

    async function fetchRepos() {
        const response = await fetch('/api/repositories');
        const data = await response.json();

        if (!response.ok) {
            return;
        }

        const repositories = data.repositories as Repository[];

        const hasLoading = repositories.some(repo => repo.status === RepositoryStatus.LOADING);

        if (hasLoading) {
            setTimeout(fetchRepos, 3000);
        } else {
            setRepos(repositories);
        }

        setRepos(data.repositories);
    }

    const handleImport = async ({
                                    url,
                                    branch
                                }: {
        url: string;
        branch: string;
    }) => {
        const response = await fetch('/api/repositories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                branch
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(data.error)
            return
        }

        setRepos([...repos, data.repository]);

        await fetchRepos();
    }

    const handleDelete = async (repoId: string) => {
        const response = await fetch(`/api/repositories/${repoId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        await response.json();
        await fetchRepos();
    }

    return (
        <div className="flex flex-col w-full gap-4">
            <Import onImport={handleImport}/>
            <List
                repos={repos}
                onDelete={handleDelete}
            />
        </div>
    )
}