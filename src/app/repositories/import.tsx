import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ImportProps {
  onImport: ({ url, branch }: { url: string; branch: string }) => Promise<void>;
  initialUrl?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}
export function Import({
  onImport,
  initialUrl = "",
  onSuccess,
  onCancel,
  onBusyChange,
}: ImportProps) {
  const [repoUrl, setRepoUrl] = React.useState(initialUrl);
  const [branch, setBranch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const busy = React.useRef(false);
  const { toast } = useToast();
  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (!repoUrl.trim()) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }
    busy.current = true;
    setIsLoading(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onImport({ url: repoUrl.trim(), branch: branch.trim() });
      setRepoUrl("");
      setBranch("");
      toast({
        title: "Success",
        description: "Repository imported and ready to chat.",
      });
      onSuccess?.();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Repository import failed.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      busy.current = false;
      setIsLoading(false);
      onBusyChange?.(false);
    }
  };
  return (
    <form onSubmit={handleImport} className="space-y-6">
      <div>
        <label
          htmlFor="repository-url"
          className="mb-2 block text-sm font-semibold"
        >
          GitHub repository URL
        </label>
        <Input
          id="repository-url"
          autoFocus
          type="url"
          required
          disabled={isLoading}
          placeholder="https://github.com/owner/repository"
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
          className="h-11"
        />
      </div>
      <div>
        <label
          htmlFor="repository-branch"
          className="mb-2 block text-sm font-semibold"
        >
          Branch
        </label>
        <Input
          id="repository-branch"
          disabled={isLoading}
          placeholder="Default branch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          className="h-11"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Leave blank to use the repository’s default branch.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Indexing your repository. This can take a few minutes. Keep this
          dialog open until it finishes.
        </p>
      )}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Importing…" : "Import"}
        </Button>
      </div>
    </form>
  );
}
