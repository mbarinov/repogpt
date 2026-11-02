import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { Repository } from "@prisma/client";

export function List({
  repos,
  onDelete,
}: {
  repos: Repository[];
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Repositories</h2>
      {!repos.length && (
        <p>No repositories yet. Import a GitHub repository to get started.</p>
      )}
      <ul className="space-y-4">
        {repos.map((repo) => (
          <RepositoryRow key={repo.id} repo={repo} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
function RepositoryRow({
  repo,
  onDelete,
}: {
  repo: Repository;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-lg shadow">
      <div className="flex items-center gap-3">
        <span className="font-medium">{repo.name}</span>
        {repo.status === "IMPORTED" && !repo.error && (
          <CheckCircle
            aria-label="Ready"
            className="text-green-600"
            size={20}
          />
        )}
        {repo.status === "IMPORTED" && repo.error && (
          <>
            <CircleAlert
              aria-label="Refresh failed"
              className="text-amber-600"
              size={20}
            />
            <span role="status" className="text-amber-800">
              Refresh failed; chat uses the previous index. {repo.error}
            </span>
          </>
        )}
        {repo.status === "LOADING" && (
          <Loader2
            aria-label="Importing"
            className="animate-spin text-blue-600"
            size={20}
          />
        )}
        {repo.status === "ERROR" && (
          <>
            <CircleAlert
              aria-label="Import failed"
              className="text-red-600"
              size={20}
            />
            <span className="text-red-700">
              {repo.error || "Import failed"}
            </span>
          </>
        )}
        {repo.status === "NOT_STARTED" && (
          <Circle
            aria-label="Not indexed"
            className="text-gray-500"
            size={20}
          />
        )}
      </div>
      <div className="flex gap-2">
        {repo.status === "IMPORTED" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/?repoId=${encodeURIComponent(repo.id)}`}>
              <MessageSquare className="mr-2" size={16} />
              Chat
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Chat
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
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
        </AlertDialog>
      </div>
    </li>
  );
}
