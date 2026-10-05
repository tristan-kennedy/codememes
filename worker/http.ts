import { PROTOCOL_VERSION, normalizeName } from "../src/shared/protocol";
import { RoomError } from "./state";
import type { ErrorCode } from "../src/shared/protocol";

export function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json(
    { version: PROTOCOL_VERSION, type: "error", code, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function checkOrigin(request: Request): void {
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    throw new RoomError("forbidden", "Open this room from its own website.", 403);
}
export async function readName(request: Request): Promise<string> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new RoomError("invalid", "Send a name as JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new RoomError("invalid", "Enter your name.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512) {
      await reader.cancel();
      throw new RoomError("invalid", "Your name is too long.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RoomError("invalid", "Send a valid name.");
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("name" in body) ||
    typeof body.name !== "string"
  )
    throw new RoomError("invalid", "Enter your name.");
  const name = normalizeName(body.name);
  if (!name)
    throw new RoomError(
      "invalid",
      "Use a name between 1 and 40 characters, without control characters.",
    );
  return name;
}
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function cookieHash(request: Request): Promise<string | null> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("seat="))
    ?.slice(5);
  return token && /^[a-f0-9]{64}$/.test(token) ? hashToken(token) : null;
}
export function seatCookie(code: string, token: string): string {
  return `seat=${token}; Path=/api/rooms/${code}; Max-Age=86400; Secure; HttpOnly; SameSite=Strict`;
}
