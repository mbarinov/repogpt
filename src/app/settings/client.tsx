"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EyeIcon, EyeOffIcon, CheckCircle2 } from "lucide-react";

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
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [configured, setConfigured] = useState({
    openai: props.hasOpenAiKey,
    github: props.hasGithubAccessToken,
  });
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
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
      setFeedback({
        error: false,
        message: "Connections updated. You’re ready to import repositories.",
      });
      toast({ title: "Saved", description: "API keys saved." });
    } catch {
      setFeedback({
        error: true,
        message: "Could not save API keys. Please try again.",
      });
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="openai-key" className="text-base font-semibold">
            OpenAI API Key
          </Label>
          {configured.openai && (
            <span className="inline-flex items-center gap-1.5 text-xs text-teal-800">
              <CheckCircle2 size={14} />
              Configured
            </span>
          )}
        </div>
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
            className="h-12 border-slate-200 bg-white pr-12"
            required={!configured.openai}
            autoComplete="off"
            disabled={saving}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={saving}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-slate-100 hover:text-teal-900"
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
        <p className="text-sm leading-6 text-slate-500">
          Used to index code and generate answers. API usage is billed to your
          OpenAI account.
        </p>
        <p className="text-sm leading-6 text-slate-500">
          To get your OpenAI API key, visit{" "}
          <a
            href="https://platform.openai.com/account/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-800 underline underline-offset-2 hover:text-teal-950"
          >
            OpenAI API Keys
          </a>
          .
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="github-key" className="text-base font-semibold">
            GitHub API Key
          </Label>
          {configured.github && (
            <span className="inline-flex items-center gap-1.5 text-xs text-teal-800">
              <CheckCircle2 size={14} />
              Configured
            </span>
          )}
        </div>
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
            className="h-12 border-slate-200 bg-white pr-12"
            required={!configured.github}
            autoComplete="off"
            disabled={saving}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={saving}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-slate-100 hover:text-teal-900"
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
        <p className="text-sm leading-6 text-slate-500">
          Used to read repository contents. For private repositories, grant read
          access to their contents.
        </p>
        <p className="text-sm leading-6 text-slate-500">
          To get your GitHub Access Token, visit{" "}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-800 underline underline-offset-2 hover:text-teal-950"
          >
            GitHub Tokens
          </a>
          .
        </p>
      </div>

      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${feedback.error ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}
        >
          {feedback.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Button
          type="submit"
          disabled={saving}
          className="min-w-28 bg-teal-900 text-white hover:bg-teal-800"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-slate-200 text-teal-900"
        >
          <Link href="/repositories">Repositories</Link>
        </Button>
      </div>
    </form>
  );
}
