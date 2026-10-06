import { DurableObject } from "cloudflare:workers";
import { PROTOCOL_VERSION } from "../src/shared/protocol";
import type { ServerMessage } from "../src/shared/protocol";
import {
  assign,
  randomize,
  parseCommand,
  commitTransition,
  project,
  RoomError,
  uniqueName,
} from "./state";
import type { RoomState, Seat } from "./state";
import { play } from "./game";
import { CLEANUP_RETRY, deadline, reconcile, missingSpymaster } from "./lifecycle";
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
        emptySince: Date.now(),
      };
      await txn.put(RECORD, next);
      await txn.setAlarm(deadline(next));
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
      const next = await commitTransition(
        this.ctx.storage,
        (current) => {
          const state = reconcile(current, this.connected(current));
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
            role: state.phase === "lobby" ? "operative" : "watcher",
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
          return joined;
        },
        (next) => this.broadcast(next),
      );
      return this.joinResponse(next, selfId, recovered ? null : token);
    } catch (error) {
      if (error instanceof RoomError) {
        if (error.code === "not_found") await this.cleanupExpired();
        return errorResponse(error.code, error.message, error.status);
      }
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
      const state = await commitTransition(
        this.ctx.storage,
        (current) => {
          const seat = current.seats.find((entry) => entry.tokenHash === hash);
          if (!seat) throw new RoomError("unauthorized", "Join this room to continue.", 401);
          connection = { seatId: seat.id, connectionId: crypto.randomUUID() };
          if (!isSocket) return reconcile(current, this.connected(current));
          const next = {
            ...current,
            revision: current.revision + 1,
            seats: current.seats.map((entry) =>
              entry.id === seat.id ? { ...entry, connectionId: connection!.connectionId } : entry,
            ),
          };
          const connected = this.connected(current);
          connected.add(seat.id);
          return reconcile(next, connected);
        },
        () => {},
      );
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
      if (error instanceof RoomError) {
        if (error.code === "not_found") await this.cleanupExpired();
        return errorResponse(error.code, error.message, error.status);
      }
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
      if (
        raw &&
        typeof raw === "object" &&
        "requestId" in raw &&
        typeof raw.requestId === "string" &&
        /^[\w-]{1,64}$/.test(raw.requestId)
      )
        requestId = raw.requestId;
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
          const connected = this.connected(current);
          const state = reconcile(current, connected);
          const missing = missingSpymaster(state, connected);
          if (
            missing &&
            command.type !== "assign" &&
            command.type !== "randomize" &&
            command.type !== "start" &&
            command.type !== "abandon"
          )
            throw new RoomError(
              "forbidden",
              `Waiting for ${missing.name}, ${missing.team === "red" ? "Red" : "Blue"}'s spymaster, to reconnect.`,
              403,
            );
          const next =
            command.type === "assign"
              ? assign(state, identity.seatId, command)
              : command.type === "randomize"
                ? randomize(state, identity.seatId, command, connected)
                : play(state, identity.seatId, command, !!missing);
          return reconcile(next, connected);
        },
        (next) => this.broadcast(next, socket, requestId),
      );
    } catch (error) {
      let failure =
        error instanceof RoomError
          ? error
          : new RoomError(
              "unavailable",
              "The change could not be saved. Check the room and try again.",
              503,
            );
      let state = await this.ctx.storage.get<RoomState>(RECORD).catch(() => undefined);
      if (state && Date.now() >= deadline(state)) {
        try {
          await commitTransition(
            this.ctx.storage,
            (current) => current,
            () => {},
          );
        } catch (expiry) {
          if (expiry instanceof RoomError) failure = expiry;
          else
            failure = new RoomError(
              "unavailable",
              "The room could not be checked. Reconnect to try again.",
              503,
            );
        }
        state = await this.ctx.storage.get<RoomState>(RECORD).catch(() => undefined);
      }
      if (state && Date.now() >= deadline(state)) {
        // The deadline revokes access even if storage cannot commit deletion.
        // Preserve the scheduled deadline or arrange an earlier cleanup retry.
        await this.ctx.storage.setAlarm(Date.now() + CLEANUP_RETRY).catch(() => undefined);
        this.expireSockets();
        state = undefined;
        failure = new RoomError(
          "not_found",
          "This room has expired. Create a room to play again.",
          404,
        );
      }
      if (failure.code === "not_found") await this.cleanupExpired();
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
    try {
      await commitTransition(
        this.ctx.storage,
        (state) => reconcile(state, this.connected(state, socket)),
        (next) => this.broadcast(next),
      );
    } catch (error) {
      if (error instanceof RoomError && error.code === "not_found") await this.cleanupExpired();
      else {
        this.lifecycleUnavailable();
        // Retry the same durable reconciliation through the single alarm.
        await this.ctx.storage.setAlarm(Date.now() + CLEANUP_RETRY);
      }
    }
  }
  async webSocketError(socket: WebSocket): Promise<void> {
    await this.webSocketClose(socket);
  }
  async alarm(): Promise<void> {
    try {
      await commitTransition(
        this.ctx.storage,
        (state) => reconcile(state, this.connected(state)),
        (next) => this.broadcast(next),
      );
    } catch (error) {
      if (error instanceof RoomError && error.code === "not_found") await this.cleanupExpired();
      else {
        this.lifecycleUnavailable();
        await this.ctx.storage.setAlarm(Date.now() + CLEANUP_RETRY);
        throw error; // Cloudflare retries a failed alarm; no success was published.
      }
    }
  }
  private lifecycleUnavailable(): void {
    for (const socket of this.ctx.getWebSockets())
      this.send(socket, {
        version: PROTOCOL_VERSION,
        type: "error",
        code: "unavailable",
        message: "Room recovery could not be saved. Reconnect to fetch the latest accepted state.",
      });
  }
  private async cleanupExpired(): Promise<void> {
    // Protect this rare deallocation boundary from explicit creation racing
    // between the missing-record check and atomic SQLite deleteAll().
    await this.ctx.blockConcurrencyWhile(async () => {
      if (await this.ctx.storage.get(RECORD)) return;
      try {
        await this.ctx.storage.deleteAll();
      } catch (error) {
        this.lifecycleUnavailable();
        throw error;
      }
      this.expireSockets();
    });
  }
  private expireSockets(): void {
    for (const socket of this.ctx.getWebSockets()) {
      this.send(socket, {
        version: PROTOCOL_VERSION,
        type: "error",
        code: "not_found",
        message: "This room has expired. Create a room to play again.",
      });
      socket.close(4004, "Room expired");
    }
  }
  private identity(socket: WebSocket): Connection | null {
    return socket.deserializeAttachment() as Connection | null;
  }
  private connected(state: RoomState, excluded?: WebSocket): Set<string> {
    return new Set(
      this.ctx
        .getWebSockets()
        .filter((socket) => socket !== excluded && socket.readyState === WebSocket.OPEN)
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
        socket.readyState === WebSocket.OPEN &&
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
