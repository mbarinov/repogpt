import { useState } from "react";
import Link from "next/link";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  CheckCircle,
  CircleAlert,
  Circle,
  Trash2,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import type { Repository } from "@prisma/client";

function Status({ repo }: { repo: Repository }) {
  if (repo.status === "IMPORTED" && repo.error)
    return (
      <span className="repo-status">
        <CircleAlert
          aria-label="Refresh failed"
          className="text-amber-600"
          size={24}
        />
        <span>Refresh failed</span>
      </span>
    );
  if (repo.status === "IMPORTED")
    return (
      <span className="repo-status">
        <CheckCircle
          aria-label="Ready"
          className="text-emerald-600"
          size={24}
        />
        <span>Ready</span>
      </span>
    );
  if (repo.status === "LOADING")
    return (
      <span className="repo-status">
        <Loader2
          aria-label="Importing"
          className="animate-spin text-primary"
          size={24}
        />
        <span>Indexing…</span>
      </span>
    );
  if (repo.status === "ERROR")
    return (
      <span className="repo-status">
        <CircleAlert
          aria-label="Import failed"
          className="text-red-600"
          size={24}
        />
        <span>Import failed</span>
      </span>
    );
  return (
    <span className="repo-status">
      <Circle aria-label="Not indexed" className="text-slate-500" size={24} />
      <span>Not indexed</span>
    </span>
  );
}

export function List({
  repos,
  onDelete,
  onImport,
}: {
  repos: Repository[];
  onDelete: (id: string) => Promise<void>;
  onImport?: (repo: Repository) => void;
}) {
  const [selectedId, setSelectedId] = useState(repos[0]?.id);
  const selected = repos.find((repo) => repo.id === selectedId) ?? repos[0];
  if (!selected)
    return (
      <div className="empty-library">
        <GitHubLogoIcon className="mx-auto mb-5 h-10 w-10" />
        <h2 className="text-xl font-semibold text-foreground">
          No repositories yet.
        </h2>
        <p className="mt-3">Import a GitHub repository to get started.</p>
      </div>
    );
  return (
    <div className="library-grid">
      <div>
        <table className="repository-table" aria-label="Your repositories">
          <thead>
            <tr>
              <th scope="col">Repository</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr
                key={repo.id}
                className={repo.id === selected.id ? "selected" : undefined}
              >
                <td>
                  <button
                    type="button"
                    className="repository-select"
                    aria-label={`Select ${repo.name}`}
                    aria-pressed={repo.id === selected.id}
                    onClick={() => setSelectedId(repo.id)}
                  >
                    <GitHubLogoIcon width={28} height={28} />
                    <span>{repo.name}</span>
                  </button>
                </td>
                <td>
                  <Status repo={repo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RepositoryDetail
        key={selected.id}
        repo={selected}
        onDelete={onDelete}
        onImport={onImport}
      />
    </div>
  );
}
function RepositoryDetail({
  repo,
  onDelete,
  onImport,
}: {
  repo: Repository;
  onDelete: (id: string) => Promise<void>;
  onImport?: (repo: Repository) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const ready = repo.status === "IMPORTED";
  // Only link to known GitHub URLs, never trust an imported arbitrary scheme.
  const githubUrl = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(
    repo.url ?? "",
  )
    ? repo.url
    : null;
  return (
    <section className="repository-detail" aria-label="Selected repository">
      <h2>{repo.name}</h2>
      <div className="detail-meta">
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link inline-flex items-center gap-3"
          >
            <GitHubLogoIcon width={25} height={25} />
            GitHub
            <ExternalLink size={17} />
          </a>
        )}
        <span className={ready ? "text-emerald-700" : "text-muted-foreground"}>
          {ready
            ? repo.error
              ? "Previous index available"
              : "Ready to chat"
            : repo.status === "LOADING"
              ? "Indexing in progress"
              : "Not ready to chat"}
        </span>
      </div>
      <p className="detail-description">
        {ready
          ? "Ask questions about the indexed code in this repository."
          : repo.status === "LOADING"
            ? "We’re reading and indexing your code. You can open a chat when indexing finishes."
            : "Index this repository to explore its code in a conversation."}
      </p>
      {repo.error && (
        <p
          role="status"
          className={`mb-6 rounded-lg border p-4 text-sm leading-6 ${ready ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {ready
            ? "Refresh failed; chat uses the previous index. "
            : "Import failed. "}
          {repo.error}
        </p>
      )}
      {ready ? (
        <Button asChild className="detail-chat">
          <Link href={`/?repoId=${encodeURIComponent(repo.id)}`}>
            Open chat
            <ArrowRight size={25} />
          </Link>
        </Button>
      ) : (
        <Button className="detail-chat" disabled>
          Open chat
          <ArrowRight size={25} />
        </Button>
      )}
      {ready ? (
        <div className="detail-section">
          <h3>Try asking</h3>
          {[
            "How is the project structured?",
            "Where does authentication happen?",
          ].map((prompt) => (
            <Link
              key={prompt}
              href={`/?repoId=${encodeURIComponent(repo.id)}&prompt=${encodeURIComponent(prompt)}`}
              className="prompt-link"
            >
              <MessageSquare size={24} />
              {prompt}
            </Link>
          ))}
        </div>
      ) : (
        <div className="detail-section text-muted-foreground leading-6">
          {repo.status === "LOADING" ? (
            "You can leave this page while indexing. If an import was interrupted, remove it in repository settings and import again."
          ) : (
            <>
              <p>
                Check your GitHub token’s repository access and your OpenAI key,
                then retry the import.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link href="/settings" className="text-link">
                  Check API keys
                </Link>
                {onImport && (
                  <Button variant="outline" onClick={() => onImport(repo)}>
                    Retry import
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <details className="detail-section repository-settings">
        <summary>
          <ChevronDown size={22} />
          Repository settings
        </summary>
        <div className="repository-settings-body">
          <p className="text-sm">
            Removing a repository deletes its local index, not its code on
            GitHub.
          </p>
          {onImport && ready && (
            <Button variant="outline" onClick={() => onImport(repo)}>
              Refresh index
            </Button>
          )}
          <AlertDialog
            open={open}
            onOpenChange={(value) => {
              if (!deleting) {
                setOpen(value);
                setError("");
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                aria-label={`Delete ${repo.name}`}
                variant="destructive"
                size="sm"
              >
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {repo.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the repository and its indexed
                  documents. The GitHub repository is not changed.{" "}
                  {repo.status === "LOADING" &&
                    "This removes the active or interrupted import; it will not be able to complete. You can import the repository again afterward."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error && (
                <p role="alert" className="text-red-700">
                  {error}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={async (event) => {
                    event.preventDefault();
                    if (deleting) return;
                    setDeleting(true);
                    setError("");
                    try {
                      await onDelete(repo.id);
                      setOpen(false);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Could not delete repository.",
                      );
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>{" "}
        </div>
      </details>
    </section>
  );
}
