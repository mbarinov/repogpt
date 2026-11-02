// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Repository } from "@prisma/client";
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
import { Import } from "@/app/repositories/import";
import { List } from "@/app/repositories/list";
import { ConfigurationForm } from "@/app/settings/client";
import { MessageInput } from "@/components/message-input";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => vi.clearAllMocks());
describe("import feedback", () => {
  it("waits for completion and prevents repeated imports", async () => {
    let resolve!: () => void;
    const onImport = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(<Import onImport={onImport} />);
    fireEvent.change(screen.getByLabelText("GitHub repository URL"), {
      target: { value: "https://github.com/org/repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(
      (screen.getByRole("button", { name: "Importing…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(toast).not.toHaveBeenCalled();
    resolve();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Success" }),
      ),
    );
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith({
      url: "https://github.com/org/repo",
      branch: "",
    });
  });
  it("preserves input and does not show success after failure", async () => {
    render(
      <Import
        onImport={async () => {
          throw new Error("Import failed");
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("GitHub repository URL"), {
      target: { value: "https://github.com/org/repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Error" }),
      ),
    );
    expect(
      (screen.getByLabelText("GitHub repository URL") as HTMLInputElement)
        .value,
    ).toBe("https://github.com/org/repo");
  });
});
it("does not label failed repositories ready or link to chat", () => {
  render(
    <List
      repos={[
        {
          id: "repo",
          name: "org/repo",
          status: "ERROR",
          error: "Import failed",
        } as Repository,
      ]}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.queryByLabelText("Ready")).toBeNull();
  expect(screen.getByLabelText("Import failed")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open chat" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Open chat" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("uses configured booleans, sends blank preserved credentials and handles offline failure", async () => {
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetch);
  render(<ConfigurationForm hasOpenAiKey hasGithubAccessToken />);
  expect(
    (screen.getByLabelText("OpenAI API Key") as HTMLInputElement).value,
  ).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error" }),
    ),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    openAiKey: "",
    githubAccessToken: "",
  });
});
it("clear is not a submit button and empty messages cannot be sent", () => {
  render(
    <MessageInput
      input=""
      handleInputChange={vi.fn()}
      handleSubmit={vi.fn()}
      isLoading={false}
      hasMessages
      repositories={[]}
      selectedRepoId={null}
      onClear={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Clear" }).getAttribute("type"),
  ).toBe("button");
  expect(
    (screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("keeps delete confirmation open on failure and allows cancellation", async () => {
  const onDelete = vi.fn().mockRejectedValue(new Error("Deletion failed"));
  render(
    <List
      repos={[
        { id: "repo", name: "org/repo", status: "IMPORTED" } as Repository,
      ]}
      onDelete={onDelete}
    />,
  );
  fireEvent.click(screen.getByText("Repository settings", { exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Delete org/repo" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Deletion failed"),
  );
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(onDelete).toHaveBeenCalledTimes(1);
});
it("allows removing an interrupted loading import with a warning", async () => {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <List
      repos={[
        { id: "repo", name: "org/repo", status: "LOADING" } as Repository,
      ]}
      onDelete={onDelete}
    />,
  );
  fireEvent.click(screen.getByText("Repository settings", { exact: true }));
  const trigger = screen.getByRole("button", {
    name: "Delete org/repo",
  }) as HTMLButtonElement;
  expect(trigger.disabled).toBe(false);
  fireEvent.click(trigger);
  expect(screen.getByText(/active or interrupted import/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(onDelete).toHaveBeenCalledWith("repo"));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});
it("shows a failed-refresh warning while keeping the previous index available", () => {
  render(
    <List
      repos={[
        {
          id: "repo",
          name: "org/repo",
          status: "IMPORTED",
          error: "Embedding failed.",
        } as Repository,
      ]}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.queryByLabelText("Ready")).toBeNull();
  expect(screen.getByLabelText("Refresh failed")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    "chat uses the previous index",
  );
  expect(
    screen.getByRole("link", { name: "Open chat" }).getAttribute("href"),
  ).toBe("/?repoId=repo");
});

function repository(
  id: string,
  status: Repository["status"] = "IMPORTED",
): Repository {
  return {
    id,
    name: `example/${id}`,
    url: `https://github.com/example/${id}`,
    status,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
it("selects repositories and never offers a chat link for an unindexed selection", () => {
  render(
    <List
      repos={[repository("ready"), repository("waiting", "NOT_STARTED")]}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByRole("heading", { name: "example/ready" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Open chat" }).getAttribute("href"),
  ).toBe("/?repoId=ready");
  fireEvent.click(
    screen.getByRole("button", { name: "Select example/waiting" }),
  );
  expect(screen.getByRole("heading", { name: "example/waiting" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open chat" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Open chat" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("suggestions carry the selected repository and an editable prompt", () => {
  render(<List repos={[repository("ready")]} onDelete={vi.fn()} />);
  const suggestion = screen.getByRole("link", {
    name: "How is the project structured?",
  });
  const href = new URL(suggestion.getAttribute("href")!, "http://localhost");
  expect(href.searchParams.get("repoId")).toBe("ready");
  expect(href.searchParams.get("prompt")).toBe(
    "How is the project structured?",
  );
});
it("falls back to an existing repository after the selection is removed", () => {
  const { rerender } = render(
    <List
      repos={[repository("first"), repository("second")]}
      onDelete={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Select example/second" }),
  );
  rerender(<List repos={[repository("first")]} onDelete={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "example/first" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Open chat" }).getAttribute("href"),
  ).toBe("/?repoId=first");
});
it("renders an actionable empty library without stale repository controls", () => {
  render(<List repos={[]} onDelete={vi.fn()} />);
  expect(screen.getByText(/No repositories yet/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open chat" })).toBeNull();
  expect(screen.queryByText("Repository settings", { exact: true })).toBeNull();
});

it("guards repeated form submissions, trims input, and closes only after success", async () => {
  let finish!: () => void;
  const onImport = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  const { container } = render(
    <Import onImport={onImport} onSuccess={onSuccess} onCancel={onCancel} />,
  );
  fireEvent.change(screen.getByLabelText("GitHub repository URL"), {
    target: { value: "https://github.com/org/repo" },
  });
  fireEvent.change(screen.getByLabelText("Branch"), {
    target: { value: " main " },
  });
  fireEvent.submit(container.querySelector("form")!);
  fireEvent.submit(container.querySelector("form")!);
  expect(onImport).toHaveBeenCalledTimes(1);
  expect(onImport).toHaveBeenCalledWith({
    url: "https://github.com/org/repo",
    branch: "main",
  });
  expect(
    (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(onSuccess).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(onCancel).not.toHaveBeenCalled();
});
it("keeps a retry's repository URL and provides an inline error", async () => {
  render(
    <Import
      initialUrl="https://github.com/org/private"
      onImport={async () => {
        throw new Error("Check GitHub access.");
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Check GitHub access."),
  );
  expect(
    (screen.getByLabelText("GitHub repository URL") as HTMLInputElement).value,
  ).toBe("https://github.com/org/private");
  expect(
    (
      screen.getByRole("button", {
        name: "Import",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
