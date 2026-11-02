"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Repository } from "@prisma/client";
import { Import } from "./import";
import { List } from "./list";
import { Button } from "@/components/ui/button";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

export function RepoPage({ list }: { list: Repository[] }) {
  const [repos, setRepos] = useState(list);
  const [importUrl, setImportUrl] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const importBusy = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (importUrl !== null) dialog.current?.showModal();
  }, [importUrl]);
  const closeImport = () => {
    dialog.current?.close();
    setImportUrl(null);
    trigger.current?.focus();
  };
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const fetchRepos = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/repositories", { signal });
    if (!response.ok) throw new Error("Could not refresh repositories.");
    const data = await response.json();
    if (mounted.current) {
      setRepos(data.repositories);
      setError("");
    }
  }, []);
  const hasLoading = repos.some((repo) => repo.status === "LOADING");
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        await fetchRepos(controller.signal);
      } catch {
        if (!controller.signal.aborted)
          setError("Could not refresh repositories.");
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
    }
    if (hasLoading) timer = setTimeout(poll, 3000);
    return () => {
      mounted.current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [hasLoading, fetchRepos]);

  return (
    <div>
      <div className="library-heading">
        <div>
          <h1 className="page-heading">Your repositories</h1>
          <p className="page-subtitle">
            Index your code. Ask better questions.
          </p>
        </div>
        <Button
          ref={trigger}
          className="library-import"
          onClick={() => setImportUrl("")}
        >
          <GitHubLogoIcon width={28} height={28} />
          Import repository
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {importUrl !== null && (
        <dialog
          ref={dialog}
          className="import-dialog"
          aria-labelledby="import-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!importBusy.current) closeImport();
          }}
        >
          <h2 id="import-title" className="text-2xl font-bold tracking-tight">
            Import repository
          </h2>
          <p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">
            Connect a GitHub repository to ask questions about its code. Private
            repositories need access through your saved GitHub token.
          </p>
          <Import
            initialUrl={importUrl}
            onSuccess={closeImport}
            onCancel={closeImport}
            onBusyChange={(busy) => {
              importBusy.current = busy;
            }}
            onImport={async ({ url, branch }) => {
              setError("");
              const response = await fetch("/api/repositories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, branch }),
              });
              const data = await response.json();
              if (!response.ok) {
                await fetchRepos().catch(() => undefined);
                throw new Error(data.error || "Repository import failed.");
              }
              if (mounted.current)
                setRepos((current) => [
                  ...current.filter((repo) => repo.id !== data.repository.id),
                  data.repository,
                ]);
            }}
          />
        </dialog>
      )}
      <List
        onImport={(repo) => setImportUrl(repo.url)}
        repos={repos}
        onDelete={async (id) => {
          const response = await fetch(
            `/api/repositories/${encodeURIComponent(id)}`,
            { method: "DELETE" },
          );
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Could not delete repository.");
          }
          setRepos((current) => current.filter((repo) => repo.id !== id));
        }}
      />
    </div>
  );
}
