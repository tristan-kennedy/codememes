import { describe, expect, it, vi } from "vite-plus/test";
import type { RoomState } from "./state";
import type { ServerMessage } from "../src/shared/protocol";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: DurableObjectState,
      public env: Env,
    ) {}
  },
}));
import { Room } from "./room";

function fixture(failure?: "write" | "commit") {
  let stored: RoomState = {
    schema: 1,
    code: "ABCDEFGHJKLM",
    phase: "lobby",
    revision: 5,
    roundId: null,
    hostId: "host",
    updatedAt: 0,
    seats: [
      {
        id: "host",
        name: "Host",
        tokenHash: "private-hash",
        team: null,
        role: "operative",
        connectionId: "host-connection",
      },
      {
        id: "guest",
        name: "Guest",
        tokenHash: "private-hash-2",
        team: null,
        role: "operative",
        connectionId: "guest-connection",
      },
    ],
  };
  const published: { seat: string; message: ServerMessage }[] = [];
  const order: string[] = [];
  const sockets = stored.seats.map(
    (seat) =>
      ({
        readyState: 1,
        deserializeAttachment: () => ({ seatId: seat.id, connectionId: seat.connectionId }),
        send: (message: string) => {
          order.push("publish");
          published.push({ seat: seat.id, message: JSON.parse(message) as ServerMessage });
        },
      }) as unknown as WebSocket,
  );
  const storage = {
    get: async () => structuredClone(stored),
    transaction: async (callback: (txn: DurableObjectTransaction) => Promise<unknown>) => {
      let draft = structuredClone(stored);
      const result = await callback({
        get: async () => structuredClone(draft),
        put: async (_key: string, next: RoomState) => {
          if (failure === "write") throw new Error("Injected write failure");
          draft = structuredClone(next);
        },
      } as unknown as DurableObjectTransaction);
      if (failure === "commit") throw new Error("Injected commit failure");
      order.push("commit");
      stored = draft;
      return result;
    },
  } as unknown as DurableObjectStorage;
  const ctx = {
    storage,
    id: { toString: () => "room-object" },
    getWebSockets: () => sockets,
  } as unknown as DurableObjectState;
  const env = { COMMAND_RATE: { limit: async () => ({ success: true }) } } as unknown as Env;
  return {
    room: new Room(ctx, env),
    sockets,
    published,
    order,
    state: () => structuredClone(stored),
  };
}
const command = {
  version: 1,
  type: "assign",
  requestId: "change-1",
  revision: 5,
  roundId: null,
  seatId: "host",
  team: "red",
  role: "spymaster",
};

describe("Room command commit boundary", () => {
  for (const failure of ["write", "commit"] as const) {
    it(`rejects ${failure} failures without state change, acknowledgement, or broadcast`, async () => {
      const check = fixture(failure);
      await check.room.webSocketMessage(check.sockets[0], JSON.stringify(command));
      expect(check.state().revision).toBe(5);
      expect(check.state().seats[0].team).toBeNull();
      expect(check.published).toHaveLength(1);
      expect(check.published[0].seat).toBe("host");
      expect(check.published[0].message).toMatchObject({
        type: "error",
        code: "unavailable",
        requestId: "change-1",
        view: { revision: 5 },
      });
      expect(JSON.stringify(check.published)).not.toContain("private-hash");
    });
  }
  it("commits before acknowledging and broadcasting and reloads durable state on reconstruction", async () => {
    const check = fixture();
    await check.room.webSocketMessage(check.sockets[0], JSON.stringify(command));
    expect(check.order).toEqual(["commit", "publish", "publish"]);
    expect(check.state().revision).toBe(6);
    expect(check.published[0].message).toMatchObject({
      type: "snapshot",
      requestId: "change-1",
      view: { revision: 6 },
    });
    expect(check.published[1].message).toMatchObject({ type: "snapshot", view: { revision: 6 } });
    const ctx = (check.room as unknown as { ctx: DurableObjectState }).ctx;
    const env = (check.room as unknown as { env: Env }).env;
    const reconstructed = new Room(ctx, env);
    await reconstructed.webSocketMessage(
      check.sockets[0],
      JSON.stringify({ ...command, revision: 6, requestId: "change-2", team: "blue" }),
    );
    expect(check.state().revision).toBe(7);
    expect(check.state().seats[0].team).toBe("blue");
  });
  it("rejects a superseded connection even with a fresh revision", async () => {
    const check = fixture();
    const sendError = vi.fn();
    const superseded = {
      deserializeAttachment: () => ({ seatId: "host", connectionId: "old" }),
      send: sendError,
    } as unknown as WebSocket;
    await check.room.webSocketMessage(superseded, JSON.stringify(command));
    expect(check.state().revision).toBe(5);
    expect(check.published).toHaveLength(0);
    expect(sendError).toHaveBeenCalledWith(expect.stringContaining('"code":"replaced"'));
    expect(sendError).not.toHaveBeenCalledWith(expect.stringContaining('"view"'));
  });
});
