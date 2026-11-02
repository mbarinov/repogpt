import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ImportProps {
  onImport: ({ url, branch }: { url: string; branch: string }) => Promise<void>;
}

export function Import({ onImport }: ImportProps) {
  const [repoUrl, setRepoUrl] = React.useState<string>("");
  const [branch, setBranch] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!repoUrl) {
      toast({
        title: "Error",
        description: "Please enter a valid GitHub repository URL.",
        variant: "destructive",
      });
      return;
    }

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      await onImport({
        url: repoUrl,
        branch,
      });

      setRepoUrl("");

      toast({
        title: "Success",
        description: "Repository imported and ready to chat.",
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
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Import GitHub Repository</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="GitHub repository URL"
          type="url"
          disabled={isLoading}
          placeholder="Enter GitHub repo URL"
          className="min-w-0"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <Input
          type="text"
          disabled={isLoading}
          aria-label="Branch"
          placeholder="Default branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full sm:w-36 sm:shrink-0"
        />
        <Button disabled={isLoading} onClick={handleImport}>
          {isLoading ? "Importing…" : "Import"}
        </Button>
      </div>
    </div>
  );
}
