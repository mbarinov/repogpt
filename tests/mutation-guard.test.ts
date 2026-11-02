import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertMutationRequest, RequestError } from "@/lib/server/errors";

function request(headers: Record<string, string>, method = "POST") {
  return new NextRequest("http://127.0.0.1:3100/api/settings", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
function expectForbidden(value: Request) {
  try {
    assertMutationRequest(value);
    expect.fail("Expected the origin guard to reject this request");
  } catch (error) {
    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).status).toBe(403);
  }
}

describe("mutation origin validation", () => {
  it.each(["POST", "DELETE"])(
    "accepts browser %s when NextURL normalizes the loopback host",
    (method) => {
      const value = request(
        {
          Host: "127.0.0.1:3100",
          Origin: "http://127.0.0.1:3100",
          "Sec-Fetch-Site": "same-origin",
        },
        method,
      );
      expect(new URL(value.url).hostname).toBe("localhost");
      expect(() => assertMutationRequest(value)).not.toThrow();
    },
  );
  it("accepts an explicitly normalized request URL with its actual HTTP Host", () => {
    expect(() =>
      assertMutationRequest(
        new Request("http://localhost:3100/api/settings", {
          method: "POST",
          headers: {
            Host: "127.0.0.1:3100",
            Origin: "http://127.0.0.1:3100",
            "Content-Type": "application/json",
          },
        }),
      ),
    ).not.toThrow();
  });
  it("accepts the actual localhost origin even when the request URL uses 127.0.0.1", () => {
    expect(() =>
      assertMutationRequest(
        new Request("http://127.0.0.1:3100/api/settings", {
          method: "POST",
          headers: {
            Host: "localhost:3100",
            Origin: "http://localhost:3100",
            "Content-Type": "application/json",
          },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects matching attacker Host and Origin as well as remote hosts without Origin", () => {
    expectForbidden(
      request({
        Host: "attacker.example:3100",
        Origin: "http://attacker.example:3100",
      }),
    );
    expectForbidden(request({ Host: "attacker.example:3100" }));
    expectForbidden(
      request({ Host: "192.168.1.1:3100", Origin: "http://192.168.1.1:3100" }),
    );
  });
  it("accepts IPv6 and default ports using URL origin semantics", () => {
    expect(() =>
      assertMutationRequest(
        new Request("http://localhost/api/settings", {
          method: "DELETE",
          headers: { Host: "[::1]:80", Origin: "http://[::1]" },
        }),
      ),
    ).not.toThrow();
  });
  it("still allows CLI requests without Origin", () => {
    expect(() =>
      assertMutationRequest(request({ Host: "127.0.0.1:3100" })),
    ).not.toThrow();
  });
  it.each([
    "http://localhost:3100",
    "http://127.0.0.1:3101",
    "https://127.0.0.1:3100",
    "https://evil.example",
    "null",
    "",
    "not-a-url",
    "http://127.0.0.1:3100/path",
    "http://user@127.0.0.1:3100",
  ])("rejects a different or malformed Origin: %s", (origin) => {
    expectForbidden(request({ Host: "127.0.0.1:3100", Origin: origin }));
  });
  it("never authorizes with X-Forwarded-Host or X-Forwarded-Proto", () => {
    expectForbidden(
      request({
        Host: "127.0.0.1:3100",
        Origin: "https://evil.example",
        "X-Forwarded-Host": "evil.example",
        "X-Forwarded-Proto": "https",
      }),
    );
  });
  it.each([
    "127.0.0.1:3100@evil.example",
    "127.0.0.1:3100/path",
    "evil.example?x",
    "",
    "[invalid]",
  ])("rejects malformed Host: %s", (host) => {
    expectForbidden(request({ Host: host, Origin: "http://127.0.0.1:3100" }));
  });
  it("rejects cross-site fetches even with matching Origin or no Origin", () => {
    expectForbidden(
      request({
        Host: "127.0.0.1:3100",
        Origin: "http://127.0.0.1:3100",
        "Sec-Fetch-Site": "cross-site",
      }),
    );
    expectForbidden(
      request({ Host: "127.0.0.1:3100", "Sec-Fetch-Site": "cross-site" }),
    );
  });
});
