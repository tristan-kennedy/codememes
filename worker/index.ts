import { CODE_ALPHABET, normalizeCode } from "../src/shared/protocol";
import { checkOrigin, cookieHash, errorResponse, readName } from "./http";
import { RoomError } from "./state";
export { Room } from "./room";

function randomCode(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))]
    .map((byte) => CODE_ALPHABET[byte & 31])
    .join("");
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (
        request.method !== "GET" ||
        request.headers.has("Upgrade") ||
        request.headers.has("Origin")
      )
        checkOrigin(request);
      const actorKey = request.headers.get("CF-Connecting-IP") ?? "local";
      if (url.pathname === "/api/rooms" && request.method === "POST") {
        if (!(await env.CREATE_RATE.limit({ key: actorKey })).success)
          return errorResponse(
            "rate_limited",
            "Too many rooms created. Wait a minute and try again.",
            429,
          );
        const name = await readName(request);
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = randomCode();
          const response = await env.ROOMS.getByName(code).create(code, name);
          if (response) return response;
        }
        return errorResponse("unavailable", "Room creation is busy. Try again.", 503);
      }
      const match = /^\/api\/rooms\/([^/]+)\/(join|socket|view)$/.exec(url.pathname);
      if (!match) return errorResponse("not_found", "That API route does not exist.", 404);
      if (url.search)
        return errorResponse("invalid", "Room API routes do not accept query parameters.", 400);
      const code = normalizeCode(decodeURIComponent(match[1]));
      if (match[2] === "join" && request.method === "POST") {
        if (!(await env.JOIN_RATE.limit({ key: actorKey })).success)
          return errorResponse(
            "rate_limited",
            "Too many join attempts. Wait a minute and try again.",
            429,
          );
        if (!code)
          return errorResponse("invalid", "Use the 12-character room code from your invite.", 400);
        const name = await readName(request);
        return await env.ROOMS.getByName(code).join(name, await cookieHash(request));
      }
      if (!code)
        return errorResponse("invalid", "Use the 12-character room code from your invite.", 400);
      if ((match[2] === "socket" || match[2] === "view") && request.method === "GET") {
        if (match[2] === "socket" && !(await env.JOIN_RATE.limit({ key: actorKey })).success)
          return errorResponse(
            "rate_limited",
            "Too many connection attempts. Wait a minute and try again.",
            429,
          );
        // Canonical API paths are required so the room-scoped cookie is sent.
        if (match[1] !== code)
          return errorResponse("invalid", "Use the canonical room address.", 400);
        return await env.ROOMS.getByName(code).fetch(request);
      }
      return errorResponse("invalid", "This route does not accept that method.", 405);
    } catch (error) {
      if (error instanceof RoomError) return errorResponse(error.code, error.message, error.status);
      return errorResponse("unavailable", "The room could not be saved. Try again shortly.", 503);
    }
  },
} satisfies ExportedHandler<Env>;
