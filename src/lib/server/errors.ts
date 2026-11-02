import { NextResponse } from "next/server";

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof RequestError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  // Never return/log provider payloads, database connection strings or submitted credentials.
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}

export function assertMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const rejectOrigin = () => {
    throw new RequestError("Cross-origin requests are not allowed.", 403);
  };
  if (request.headers.get("sec-fetch-site") === "cross-site") rejectOrigin();
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    // NextURL normalizes loopback IPs to localhost. The HTTP Host header
    // preserves the browser's actual origin; forwarded headers are not trusted.
    if (host !== null && !/^[a-z0-9.:[\]-]+$/i.test(host)) rejectOrigin();
    const targetUrl =
      host === null ? requestUrl : new URL(`${requestUrl.protocol}//${host}`);
    // This is a loopback-only, single-user app. Do not accept attacker-owned
    // Host + Origin pairs that resolve to localhost through DNS rebinding.
    if (!["localhost", "127.0.0.1", "[::1]"].includes(targetUrl.hostname))
      rejectOrigin();
    if (origin !== null) {
      const parsedOrigin = new URL(origin);
      if (
        !["http:", "https:"].includes(parsedOrigin.protocol) ||
        parsedOrigin.origin !== origin ||
        parsedOrigin.origin !== targetUrl.origin
      )
        rejectOrigin();
    }
  } catch {
    rejectOrigin();
  }
  if (
    request.method === "POST" &&
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  ) {
    throw new RequestError("Use Content-Type: application/json.", 415);
  }
}

export async function readObject(
  request: Request,
): Promise<Record<string, unknown>> {
  assertMutationRequest(request);
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestError("Invalid JSON body.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new RequestError("Expected a JSON object.");
  return value as Record<string, unknown>;
}
