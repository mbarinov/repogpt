"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Repository } from "@prisma/client";
import { Import } from "./import";
import { List } from "./list";

export function RepoPage({ list }: { list: Repository[] }) {
  const [repos, setRepos] = useState(list);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const fetchRepos = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/repositories", { signal });
    if (!response.ok) throw new Error("Could not refresh repositories.");
    const data = await response.json();
    if (mounted.current) setRepos(data.repositories);
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
    <div className="flex flex-col w-full gap-4">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <Import
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
      <List
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
