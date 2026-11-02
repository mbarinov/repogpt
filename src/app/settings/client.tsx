"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface ConfigurationFormProps {
  hasOpenAiKey?: boolean;
  hasGithubAccessToken?: boolean;
}

export function ConfigurationForm(props: ConfigurationFormProps) {
  const [openAiKey, setOpenAiKey] = useState<string>("");
  const [githubAccessToken, setGithubAccessToken] = useState<string>("");
  const [showOpenAIKey, setShowOpenAIKey] = useState<boolean>(false);
  const [showGithubKey, setShowGithubKey] = useState<boolean>(false);
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState({
    openai: props.hasOpenAiKey,
    github: props.hasGithubAccessToken,
  });
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openAiKey, githubAccessToken }),
      });
      if (!response.ok) throw new Error("Failed to save API keys.");
      setConfigured({ openai: true, github: true });
      setOpenAiKey("");
      setGithubAccessToken("");
      setShowOpenAIKey(false);
      setShowGithubKey(false);
      toast({ title: "Saved", description: "API keys saved." });
    } catch {
      toast({
        title: "Error",
        description: "Could not save API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="openai-key">OpenAI API Key</Label>
        <div className="relative">
          <Input
            id="openai-key"
            type={showOpenAIKey ? "text" : "password"}
            placeholder={
              configured.openai
                ? "Configured — leave blank to keep"
                : "Enter your OpenAI API key"
            }
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
            className="bg-beige-50 border-beige-300 pr-10"
            required={!configured.openai}
            autoComplete="off"
            disabled={saving}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-beige-700 hover:text-beige-900 hover:bg-beige-200"
            aria-label={showOpenAIKey ? "Hide OpenAI key" : "Show OpenAI key"}
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
          >
            {showOpenAIKey ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-sm text-beige-700">
          OpenAI key is needed for indexing and requests. Your OpenAI API key is
          stored in this server’s database. Run RepoGPT locally; it has no
          authentication.
        </p>
        <p className="text-sm text-beige-700">
          To get your OpenAI API key, visit{" "}
          <a
            href="https://platform.openai.com/account/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            OpenAI API Keys
          </a>
          .
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="github-key">GitHub API Key</Label>
        <div className="relative">
          <Input
            id="github-key"
            type={showGithubKey ? "text" : "password"}
            placeholder={
              configured.github
                ? "Configured — leave blank to keep"
                : "Enter your GitHub API key"
            }
            value={githubAccessToken}
            onChange={(e) => setGithubAccessToken(e.target.value)}
            className="bg-beige-50 border-beige-300 pr-10"
            required={!configured.github}
            autoComplete="off"
            disabled={saving}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-beige-700 hover:text-beige-900 hover:bg-beige-200"
            aria-label={
              showGithubKey ? "Hide GitHub token" : "Show GitHub token"
            }
            onClick={() => setShowGithubKey(!showGithubKey)}
          >
            {showGithubKey ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-sm text-beige-700">
          GitHub Access Token is needed for reading repository contents. Your
          GitHub API key is stored in this server’s database. Run RepoGPT
          locally; it has no authentication.
        </p>
        <p className="text-sm text-beige-700">
          To get your GitHub Access Token, visit{" "}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            GitHub Tokens
          </a>
          .
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          asChild
          className="w-full bg-gray-400 text-white hover:bg-gray-500"
        >
          <Link href="/repositories">Import Repos</Link>
        </Button>
      </div>
    </form>
  );
}
