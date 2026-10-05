import { describe, expect, it, vi } from "vite-plus/test";
import type { RoomState } from "./state";
import type { ServerMessage } from "../src/shared/protocol";
import { generateRound } from "./game";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      public ctx: DurableObjectState,
      public env: Env,
    ) {}
  },
}));
import { Room } from "./room";

function fixture(failure?: "write" | "commit", initial?: RoomState) {
  let stored: RoomState = initial ?? {
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
  let queued: Promise<unknown> = Promise.resolve();
  const storage = {
    get: async () => structuredClone(stored),
    transaction: (callback: (txn: DurableObjectTransaction) => Promise<unknown>) => {
      const transaction = queued.then(async () => {
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
      });
      queued = transaction.catch(() => undefined);
      return transaction;
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

function playing(): RoomState {
  const round = generateRound();
  round.startingTeam = round.activeTeam = "red";
  round.cards.forEach((card, index) => {
    card.identity = index < 9 ? "red" : index < 17 ? "blue" : index < 24 ? "neutral" : "assassin";
  });
  round.stage = "guessing";
  round.clue = { word: "signal", number: 2 };
  return {
    schema: 1,
    code: "ABCDEFGHJKLM",
    phase: "playing",
    revision: 10,
    roundId: "round-1",
    hostId: "red-op",
    updatedAt: 0,
    round,
    seats: [
      {
        id: "red-op",
        name: "Host",
        team: "red",
        role: "operative",
        tokenHash: "private-op",
        connectionId: "op-connection",
      },
      {
        id: "red-op-2",
        name: "Other operative",
        team: "red",
        role: "operative",
        tokenHash: "private-op-2",
        connectionId: "op-connection-2",
      },
      {
        id: "spy",
        name: "Spymaster",
        team: "red",
        role: "spymaster",
        tokenHash: "private-spy",
        connectionId: "spy-connection",
      },
      {
        id: "watcher",
        name: "Watcher",
        team: null,
        role: "watcher",
        tokenHash: "private-watcher",
        connectionId: "watcher-connection",
      },
    ],
  };
}
const revealCommand = {
  version: 1,
  type: "reveal",
  requestId: "reveal-1",
  revision: 10,
  roundId: "round-1",
  index: 0,
};
describe("Room game transition boundary", () => {
  for (const failure of ["write", "commit"] as const)
    it(`rejects a reveal on ${failure} failure without revealing or publishing success`, async () => {
      const check = fixture(failure, playing());
      const previous = check.state();
      await check.room.webSocketMessage(check.sockets[0], JSON.stringify(revealCommand));
      expect(check.state()).toEqual(previous);
      expect(check.order).toEqual(["publish"]);
      expect(check.published).toHaveLength(1);
      expect(check.published[0].message).toMatchObject({
        type: "error",
        code: "unavailable",
        view: { revision: 10 },
      });
      expect(check.published[0].message).toHaveProperty("view.round.cards.0.revealed", false);
      expect(check.published[0].message).not.toHaveProperty("view.round.cards.0.identity");
    });
  it("serializes competing reveals at one revision, broadcasts personalized keys after commit, and reconstructs the accepted round", async () => {
    const check = fixture(undefined, playing());
    await Promise.all([
      check.room.webSocketMessage(check.sockets[0], JSON.stringify(revealCommand)),
      check.room.webSocketMessage(
        check.sockets[1],
        JSON.stringify({ ...revealCommand, requestId: "competing", index: 1 }),
      ),
    ]);
    expect(check.state().revision).toBe(11);
    expect(check.state().round?.cards.filter((card) => card.revealed)).toHaveLength(1);
    expect(check.order[0]).toBe("commit");
    const snapshots = check.published.filter(({ message }) => message.type === "snapshot");
    expect(snapshots).toHaveLength(4);
    for (const { seat, message } of snapshots) {
      if (message.type !== "snapshot") continue;
      expect(message.view.round?.cards.filter((card) => "identity" in card)).toHaveLength(
        seat === "spy" ? 25 : 1,
      );
      expect(JSON.stringify(message)).not.toContain("private-");
    }
    expect(check.published.at(-1)?.message).toMatchObject({
      type: "error",
      code: "stale",
      requestId: "competing",
      view: { revision: 11 },
    });
    const { ctx, env } = check.room as unknown as { ctx: DurableObjectState; env: Env };
    await new Room(ctx, env).webSocketMessage(
      check.sockets[0],
      JSON.stringify({
        ...revealCommand,
        requestId: "after-reconstruction",
        revision: 11,
        index: 24,
      }),
    );
    expect(check.state().phase).toBe("ended");
    expect(check.state().round?.outcome).toEqual({ winner: "blue", reason: "assassin" });
    for (const { message } of check.published.slice(-4)) {
      if (message.type !== "snapshot") throw new Error("Expected terminal snapshot");
      expect(message.view.round?.cards.filter((card) => "identity" in card)).toHaveLength(25);
      expect(message.view.controls.reveal).toBe(false);
    }
    const ended = check.state();
    await check.room.webSocketMessage(
      check.sockets[0],
      JSON.stringify({ ...revealCommand, revision: 12, requestId: "terminal" }),
    );
    expect(check.state()).toEqual(ended);
    expect(check.published.at(-1)?.message).toMatchObject({
      type: "error",
      code: "forbidden",
      requestId: "terminal",
    });
  });
});
