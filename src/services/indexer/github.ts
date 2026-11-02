import { Document } from "@langchain/core/documents";
import { RequestError } from "@/lib/server/errors";

const MAX_FILES = 2000;
const MAX_FILE_BYTES = 256_000;
const MAX_TOTAL_BYTES = 10_000_000;

export function parseRepositoryUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 500)
    throw new RequestError("Enter a GitHub repository URL.");
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new RequestError("Enter a valid GitHub repository URL.");
  }
  const match = /^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url.pathname);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match
  ) {
    throw new RequestError(
      "Use https://github.com/owner/repository without a branch or query string.",
    );
  }
  const [, owner, repo] = match;
  if ([owner, repo].some((part) => part === "." || part === ".."))
    throw new RequestError("Invalid repository path.");
  return {
    owner,
    repo,
    name: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
  };
}

export function parseBranch(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (
    typeof value !== "string" ||
    value.length > 255 ||
    /[\x00-\x20~^:?*\[\\]/.test(value) ||
    value.includes("..") ||
    value.includes("@{") ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.endsWith(".")
  ) {
    throw new RequestError("Enter a valid branch name.");
  }
  return value;
}

// Keep manifests, dotfiles and CI configuration; ignore generated content, binaries and secrets.
export function shouldIndexPath(path: string): boolean {
  if (
    /(^|\/)(node_modules|dist|build|coverage|\.git|\.next|vendor|\.venv|__pycache__)(\/|$)/.test(
      path,
    )
  )
    return false;
  if (
    /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock)$/.test(
      path,
    )
  )
    return false;
  if (
    /(^|\/)(\.env(?:\..*)?|id_rsa|id_ed25519)$/.test(path) &&
    !/\.env\.(example|sample|template)$/.test(path)
  )
    return false;
  if (
    /\.(pem|key|p12|pfx|png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|eot|mp[34]|mov|sqlite|db|exe|dll|so|map|min\.js)$/i.test(
      path,
    )
  )
    return false;
  return true;
}

export async function loadGithubDocuments(
  repositoryUrl: string,
  token: string,
  branch?: string,
  request: typeof fetch = fetch,
): Promise<Document[]> {
  const { owner, repo } = parseRepositoryUrl(repositoryUrl);
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const get = async (path: string) => {
    let response: Response;
    try {
      response = await request(`${base}${path}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      throw new RequestError("Could not connect to GitHub. Please retry.", 502);
    }
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status))
        throw new RequestError(
          "GitHub access failed. Check the repository and branch, token expiry, and Contents: Read permission for this repository (including organization approval).",
          422,
        );
      throw new RequestError(
        "GitHub could not load this repository. Please retry later.",
        502,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new RequestError(
        "GitHub returned an invalid response. Please retry.",
        502,
      );
    }
  };
  const selectedBranch = branch ?? (await get("")).default_branch;
  if (typeof selectedBranch !== "string")
    throw new RequestError("GitHub did not return a default branch.", 502);
  const tree = await get(
    `/git/trees/${encodeURIComponent(selectedBranch)}?recursive=1`,
  );
  if (tree.truncated)
    throw new RequestError(
      "This repository is too large to index completely. Choose a smaller repository.",
      422,
    );
  if (!Array.isArray(tree.tree))
    throw new RequestError("GitHub returned an invalid repository tree.", 502);
  type Entry = {
    type: string;
    mode: string;
    path: string;
    size: number;
    sha: string;
  };
  const entries = (tree.tree as Entry[]).filter(
    (entry) =>
      entry.type === "blob" &&
      entry.mode !== "120000" &&
      typeof entry.path === "string" &&
      shouldIndexPath(entry.path) &&
      entry.size <= MAX_FILE_BYTES,
  );
  if (
    entries.length > MAX_FILES ||
    entries.reduce((sum, entry) => sum + entry.size, 0) > MAX_TOTAL_BYTES
  )
    throw new RequestError(
      "This repository exceeds the indexing limit (2,000 files / 10 MB of source).",
      422,
    );
  const documents: Document[] = [];
  let loadedBytes = 0;
  // Bound GitHub concurrency and pin each file to its immutable blob SHA.
  for (let offset = 0; offset < entries.length; offset += 5) {
    const batch = await Promise.all(
      entries.slice(offset, offset + 5).map(async (entry) => {
        if (!/^[a-f0-9]{40,64}$/i.test(entry.sha))
          throw new RequestError(
            "GitHub returned an invalid file reference.",
            502,
          );
        const blob = await get(`/git/blobs/${entry.sha}`);
        if (blob.encoding !== "base64" || typeof blob.content !== "string")
          throw new RequestError(
            "GitHub returned an unsupported file encoding.",
            502,
          );
        const buffer = Buffer.from(blob.content, "base64");
        loadedBytes += buffer.length;
        if (loadedBytes > MAX_TOTAL_BYTES)
          throw new RequestError(
            "This repository exceeds the 10 MB source limit.",
            422,
          );
        if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) return null;
        const content = buffer.toString("utf8");
        if (!content.trim() || content.includes("\uFFFD")) return null;
        return new Document({
          pageContent: content,
          metadata: { source: entry.path, sha: entry.sha },
        });
      }),
    );
    for (const doc of batch) if (doc) documents.push(doc);
  }
  return documents;
}
