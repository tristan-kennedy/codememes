import { DurableObject } from "cloudflare:workers";
import { PROTOCOL_VERSION } from "../src/shared/protocol";
import type { ServerMessage } from "../src/shared/protocol";
import { assign, parseCommand, commitTransition, project, RoomError, uniqueName } from "./state";
import type { RoomState, Seat } from "./state";
import { checkOrigin, cookieHash, errorResponse, hashToken, newToken, seatCookie } from "./http";

interface Connection {
  seatId: string;
  connectionId: string;
}
const RECORD = "room";

export class Room extends DurableObject<Env> {
  async create(code: string, name: string): Promise<Response | null> {
    const token = newToken();
    const tokenHash = await hashToken(token);
    const seat: Seat = {
      id: crypto.randomUUID(),
      name,
      tokenHash,
      team: null,
      role: "operative",
      connectionId: null,
    };
    const state = await this.ctx.storage.transaction(async (txn) => {
      if (await txn.get(RECORD)) return null;
      const next: RoomState = {
        schema: 1,
        code,
        phase: "lobby",
        revision: 1,
        roundId: null,
        hostId: seat.id,
        seats: [seat],
        updatedAt: Date.now(),
      };
      await txn.put(RECORD, next);
      return next;
    });
    if (!state) return null;
    return this.joinResponse(state, seat.id, token);
  }

  async join(name: string, existingHash: string | null): Promise<Response> {
    try {
      const token = newToken();
      const tokenHash = await hashToken(token);
      let selfId = "";
      let recovered = false;
      const next = await this.ctx.storage.transaction(async (txn) => {
        const state = await txn.get<RoomState>(RECORD);
        if (!state)
          throw new RoomError(
            "not_found",
            "This room does not exist or has expired. Check the invite or create a room.",
            404,
          );
        const previous = state.seats.find((seat) => seat.tokenHash === existingHash);
        if (previous) {
          selfId = previous.id;
          recovered = true;
          return state;
        }
        selfId = crypto.randomUUID();
        const seat: Seat = {
          id: selfId,
          name: uniqueName(name, state.seats),
          tokenHash,
          team: null,
          role: "operative",
          connectionId: null,
        };
        const joined = {
          ...state,
          seats: [...state.seats, seat],
          revision: state.revision + 1,
          updatedAt: Date.now(),
        };
        // Bound record bytes rather than imposing a product player limit.
        if (new TextEncoder().encode(JSON.stringify(joined)).length > 256 * 1024)
          throw new RoomError("unavailable", "This room is full. Create another room.", 503);
        await txn.put(RECORD, joined);
        return joined;
      });
      this.broadcast(next);
      return this.joinResponse(next, selfId, recovered ? null : token);
    } catch (error) {
      if (error instanceof RoomError) return errorResponse(error.code, error.message, error.status);
      return errorResponse("unavailable", "The room could not be saved. Try again shortly.", 503);
    }
  }

  async fetch(request: Request): Promise<Response> {
    try {
      if (request.headers.has("Upgrade") || request.headers.has("Origin")) checkOrigin(request);
      const hash = await cookieHash(request);
      const isSocket = new URL(request.url).pathname.endsWith("/socket");
      if (isSocket && request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        throw new RoomError("invalid", "Use a WebSocket connection.", 426);
      let connection: Connection | undefined;
      const state = await this.ctx.storage.transaction(async (txn) => {
        const current = await txn.get<RoomState>(RECORD);
        if (!current)
          throw new RoomError("not_found", "This room does not exist or has expired.", 404);
        const seat = current.seats.find((entry) => entry.tokenHash === hash);
        if (!seat) throw new RoomError("unauthorized", "Join this room to continue.", 401);
        connection = { seatId: seat.id, connectionId: crypto.randomUUID() };
        if (!isSocket) return current;
        const next = {
          ...current,
          revision: current.revision + 1,
          seats: current.seats.map((entry) =>
            entry.id === seat.id ? { ...entry, connectionId: connection!.connectionId } : entry,
          ),
        };
        await txn.put(RECORD, next);
        return next;
      });
      if (!isSocket)
        return Response.json(this.snapshot(state, connection!.seatId), {
          headers: { "Cache-Control": "no-store" },
        });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment(connection);
      this.ctx.acceptWebSocket(server);
      for (const other of this.ctx.getWebSockets()) {
        if (other !== server && this.identity(other)?.seatId === connection!.seatId) {
          this.send(other, {
            version: PROTOCOL_VERSION,
            type: "error",
            code: "replaced",
            message: "Your seat is now open in another tab. Reconnect to take it back.",
          });
          other.close(4001, "Seat taken over");
        }
      }
      this.broadcast(state);
      return new Response(null, { status: 101, webSocket: client });
    } catch (error) {
      if (error instanceof RoomError) return errorResponse(error.code, error.message, error.status);
      return errorResponse("unavailable", "The room could not be saved. Try again shortly.", 503);
    }
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const identity = this.identity(socket);
    let requestId: string | undefined;
    try {
      if (!identity) throw new RoomError("unauthorized", "Join this room again.", 401);
      if (
        !(
          await this.env.COMMAND_RATE.limit({ key: `${this.ctx.id.toString()}:${identity.seatId}` })
        ).success
      )
        throw new RoomError("rate_limited", "Too many changes. Wait a minute and try again.", 429);
      if (typeof message !== "string" || new TextEncoder().encode(message).length > 2048)
        throw new RoomError("invalid", "Send a small text command.");
      let raw: unknown;
      try {
        raw = JSON.parse(message);
      } catch {
        throw new RoomError("invalid", "Send a valid room command.");
      }
      const command = parseCommand(raw);
      requestId = command.requestId;
      await commitTransition(
        this.ctx.storage,
        (current) => {
          if (
            current.seats.find((seat) => seat.id === identity.seatId)?.connectionId !==
            identity.connectionId
          )
            throw new RoomError(
              "replaced",
              "Your seat is open in another tab. Reconnect to take it back.",
              403,
            );
          return assign(current, identity.seatId, command);
        },
        (next) => this.broadcast(next, socket, requestId),
      );
    } catch (error) {
      const failure =
        error instanceof RoomError
          ? error
          : new RoomError(
              "unavailable",
              "The change could not be saved. Check the roster and try again.",
              503,
            );
      const state = await this.ctx.storage.get<RoomState>(RECORD).catch(() => undefined);
      const authorized =
        identity &&
        state?.seats.find((seat) => seat.id === identity.seatId)?.connectionId ===
          identity.connectionId;
      this.send(socket, {
        version: PROTOCOL_VERSION,
        type: "error",
        code: failure.code,
        message: failure.message,
        requestId,
        ...(authorized && state ? { view: this.view(state, identity.seatId) } : {}),
      });
    }
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    socket.close();
    const state = await this.ctx.storage.get<RoomState>(RECORD);
    if (state) this.broadcast(state);
  }
  async webSocketError(socket: WebSocket): Promise<void> {
    await this.webSocketClose(socket);
  }
  private identity(socket: WebSocket): Connection | null {
    return socket.deserializeAttachment() as Connection | null;
  }
  private connected(state: RoomState): Set<string> {
    return new Set(
      this.ctx
        .getWebSockets()
        .filter((socket) => socket.readyState === WebSocket.OPEN)
        .map((socket) => this.identity(socket))
        .filter(
          (identity): identity is Connection =>
            !!identity &&
            state.seats.some(
              (seat) => seat.id === identity.seatId && seat.connectionId === identity.connectionId,
            ),
        )
        .map((identity) => identity.seatId),
    );
  }
  private view(state: RoomState, selfId: string) {
    return project(state, selfId, this.connected(state));
  }
  private snapshot(state: RoomState, selfId: string, requestId?: string): ServerMessage {
    return {
      version: PROTOCOL_VERSION,
      type: "snapshot",
      view: this.view(state, selfId),
      ...(requestId ? { requestId } : {}),
    };
  }
  private send(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      /* Closed sockets receive no updates. */
    }
  }
  private broadcast(state: RoomState, requester?: WebSocket, requestId?: string): void {
    for (const socket of this.ctx.getWebSockets()) {
      const identity = this.identity(socket);
      if (
        identity &&
        state.seats.some(
          (seat) => seat.id === identity.seatId && seat.connectionId === identity.connectionId,
        )
      )
        this.send(
          socket,
          this.snapshot(state, identity.seatId, socket === requester ? requestId : undefined),
        );
    }
  }
  private joinResponse(state: RoomState, selfId: string, token: string | null): Response {
    return Response.json(this.snapshot(state, selfId), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        ...(token ? { "Set-Cookie": seatCookie(state.code, token) } : {}),
      },
    });
  }
}
