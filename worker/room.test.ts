import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { EMPTY_TTL, IDLE_TTL, deadline, reconcile } from "./lifecycle";
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

function fixture(failure?: "write" | "commit" | "alarm" | "delete", initial?: RoomState) {
  let stored: RoomState | undefined = initial ?? {
    schema: 1,
    code: "ABCDEFGHJKLM",
    phase: "lobby",
    revision: 5,
    roundId: null,
    hostId: "host",
    updatedAt: Date.now(),
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
  let alarmAt: number | null = null;
  const sockets = stored.seats.map((seat) => {
    let status = 1;
    return {
      get readyState() {
        return status;
      },
      close: () => {
        status = 3;
      },
      deserializeAttachment: () => ({ seatId: seat.id, connectionId: seat.connectionId }),
      send: (message: string) => {
        order.push("publish");
        published.push({ seat: seat.id, message: JSON.parse(message) as ServerMessage });
      },
    } as unknown as WebSocket;
  });
  let queued: Promise<unknown> = Promise.resolve();
  const storage = {
    get: async () => structuredClone(stored),
    transaction: (callback: (txn: DurableObjectTransaction) => Promise<unknown>) => {
      const transaction = queued.then(async () => {
        let draft = structuredClone(stored);
        let draftAlarm = alarmAt;
        const result = await callback({
          get: async () => structuredClone(draft),
          getAlarm: async () => draftAlarm,
          setAlarm: async (next: number) => {
            if (failure === "alarm") throw new Error("Injected alarm failure");
            draftAlarm = next;
          },
          delete: async () => {
            draft = undefined;
            return true;
          },
          deleteAlarm: async () => {
            draftAlarm = null;
          },
          put: async (_key: string, next: RoomState) => {
            if (failure === "write") throw new Error("Injected write failure");
            draft = structuredClone(next);
          },
        } as unknown as DurableObjectTransaction);
        if (failure === "commit") throw new Error("Injected commit failure");
        order.push("commit");
        stored = draft;
        alarmAt = draftAlarm;
        return result;
      });
      queued = transaction.catch(() => undefined);
      return transaction;
    },
    setAlarm: async (next: number) => {
      alarmAt = next;
    },
    deleteAll: async () => {
      if (failure === "delete") throw new Error("Injected deallocation failure");
      stored = undefined;
      alarmAt = null;
      order.push("deleteAll");
    },
  } as unknown as DurableObjectStorage;
  const ctx = {
    storage,
    id: { toString: () => "room-object" },
    getWebSockets: () => sockets,
    blockConcurrencyWhile: async (callback: () => Promise<unknown>) => callback(),
  } as unknown as DurableObjectState;
  const env = { COMMAND_RATE: { limit: async () => ({ success: true }) } } as unknown as Env;
  return {
    room: new Room(ctx, env),
    sockets,
    published,
    order,
    state: () => structuredClone(stored!),
    record: () => structuredClone(stored),
    alarm: () => alarmAt,
    fail: (next?: typeof failure) => {
      failure = next;
    },
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

describe("Room occupied-slot transaction boundary", () => {
  it("settles competing placements once and rejects an occupied retry without publication or activity", async () => {
    const check = fixture();
    await Promise.all([
      check.room.webSocketMessage(check.sockets[0], JSON.stringify(command)),
      check.room.webSocketMessage(
        check.sockets[1],
        JSON.stringify({
          ...command,
          requestId: "competing-placement",
          seatId: "guest",
        }),
      ),
    ]);
    const accepted = check.state();
    expect(accepted.revision).toBe(6);
    expect(
      accepted.seats
        .filter((seat) => seat.team === "red" && seat.role === "spymaster")
        .map((seat) => seat.id),
    ).toEqual(["host"]);
    expect(
      check.published.find((entry) => entry.message.requestId === "competing-placement")?.message,
    ).toMatchObject({ type: "error", code: "stale", view: { revision: 6 } });

    const publications = check.published.length;
    await check.room.webSocketMessage(
      check.sockets[1],
      JSON.stringify({
        ...command,
        requestId: "occupied-retry",
        revision: 6,
        seatId: "guest",
      }),
    );
    expect(check.state()).toEqual(accepted);
    expect(check.published.slice(publications)).toHaveLength(1);
    expect(check.published.at(-1)).toMatchObject({
      seat: "guest",
      message: {
        type: "error",
        code: "invalid",
        requestId: "occupied-retry",
        view: { revision: 6, round: null },
      },
    });
    expect(check.published.at(-1)?.message).toHaveProperty(
      "message",
      "Red’s spymaster slot is occupied. Move its spymaster first.",
    );
    expect(JSON.stringify(check.published)).not.toContain("private-hash");
  });
});

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

afterEach(() => vi.restoreAllMocks());
describe("Room recovery and expiry boundary", () => {
  it("hands host to the earliest open seated socket, excludes watchers, and preserves activity time", async () => {
    const check = fixture(undefined, playing());
    const previous = check.state();
    await check.room.webSocketClose(check.sockets[0]);
    expect(check.state().hostId).toBe("red-op-2");
    expect(check.state().updatedAt).toBe(previous.updatedAt);
    await check.room.webSocketClose(check.sockets[1]);
    expect(check.state().hostId).toBe("spy");
    await check.room.webSocketClose(check.sockets[2]);
    expect(check.state().hostId).toBeNull();
    expect(check.state().emptySince).toBeNull(); // Connected watcher keeps room nonempty.
    expect(check.published.at(-1)?.message).toMatchObject({
      view: {
        waitingFor: { seatId: "spy" },
        controls: { reveal: false, giveClue: false, assignOthers: false },
      },
    });
    const restored = reconcile(check.state(), new Set(["watcher", "red-op-2"]));
    expect(restored.hostId).toBe("red-op-2");
    expect(reconcile(restored, new Set(["watcher", "red-op-2", "red-op"])).hostId).toBe("red-op-2");
  });
  it("keeps a disconnected spymaster's seat/key and rejects play while waiting", async () => {
    const check = fixture(undefined, playing());
    await check.room.webSocketClose(check.sockets[2]);
    expect(check.state().seats[2].role).toBe("spymaster");
    const previous = check.state();
    await check.room.webSocketMessage(
      check.sockets[0],
      JSON.stringify({ ...revealCommand, revision: previous.revision }),
    );
    expect(check.state()).toEqual(previous);
    expect(check.published.at(-1)?.message).toMatchObject({
      type: "error",
      code: "forbidden",
      view: { waitingFor: { seatId: "spy" } },
    });
    expect(check.published.at(-1)?.message).not.toHaveProperty("view.round.cards.0.identity");
  });
  it("schedules exact empty deadlines, survives early alarms, and deallocates/ closes at the boundary idempotently", async () => {
    const check = fixture();
    const now = Date.now();
    const time = vi.spyOn(Date, "now").mockReturnValue(now);
    await check.room.webSocketClose(check.sockets[0]);
    await check.room.webSocketClose(check.sockets[1]);
    expect(check.state().emptySince).toBe(now);
    expect(check.alarm()).toBe(now + EMPTY_TTL);
    time.mockReturnValue(now + EMPTY_TTL - 1);
    await check.room.alarm();
    expect(check.record()).toBeDefined();
    expect(check.alarm()).toBe(now + EMPTY_TTL);
    time.mockReturnValue(now + EMPTY_TTL);
    await check.room.alarm();
    expect(check.record()).toBeUndefined();
    expect(check.alarm()).toBeNull();
    expect(check.order).toContain("deleteAll");
    await check.room.alarm();
    expect(check.record()).toBeUndefined();
  });
  it("expires idle open sockets at 24 hours, rejects malformed late requests, and never returns an expired key", async () => {
    const initial = playing();
    const check = fixture(undefined, initial);
    vi.spyOn(Date, "now").mockReturnValue(initial.updatedAt + IDLE_TTL);
    await check.room.webSocketMessage(check.sockets[0], "malformed");
    expect(check.record()).toBeUndefined();
    expect(check.sockets.every((socket) => socket.readyState === 3)).toBe(true);
    expect(
      check.published.every(
        ({ message }) =>
          message.type === "error" && message.code === "not_found" && !("view" in message),
      ),
    ).toBe(true);
    const missing = await check.room.join("Late guest", null);
    expect(missing.status).toBe(404);
    expect(check.record()).toBeUndefined();
  });
  it("cancels empty expiry on reconnect without extending meaningful inactivity", () => {
    const state = { ...playing(), emptySince: Date.now() - EMPTY_TTL + 1, hostId: null };
    const returned = reconcile(state, new Set(["red-op"]));
    expect(returned.emptySince).toBeNull();
    expect(returned.updatedAt).toBe(state.updatedAt);
    expect(deadline(returned)).toBe(state.updatedAt + IDLE_TTL);
  });
  it("rolls back gameplay when alarm scheduling fails and retries failed deallocation without a false success", async () => {
    const check = fixture("alarm", playing());
    const previous = check.state();
    await check.room.webSocketMessage(check.sockets[0], JSON.stringify(revealCommand));
    expect(check.state()).toEqual(previous);
    expect(check.published).toHaveLength(1);
    expect(check.published[0].message).toMatchObject({ type: "error", code: "unavailable" });
    const expiring = fixture("delete", playing());
    vi.spyOn(Date, "now").mockReturnValue(expiring.state().updatedAt + IDLE_TTL);
    await expect(expiring.room.alarm()).rejects.toThrow("deallocation failure");
    expect(expiring.record()).toBeUndefined();
    expect(expiring.alarm()).toBe(Date.now() + 2000);
    expect(
      expiring.published.every(
        ({ message }) => message.type === "error" && message.code === "unavailable",
      ),
    ).toBe(true);
    expiring.fail();
    await expiring.room.alarm();
    expect(expiring.order).toContain("deleteAll");
    expect(expiring.sockets.every((socket) => socket.readyState === 3)).toBe(true);
  });
  it("keeps a durable cleanup alarm after request-triggered deallocation failure without new traffic", async () => {
    const initial = playing();
    const check = fixture("delete", initial);
    const time = vi.spyOn(Date, "now").mockReturnValue(initial.updatedAt + IDLE_TTL);
    await expect(check.room.join("Late join", null)).rejects.toThrow("deallocation failure");
    expect(check.record()).toBeUndefined();
    const retryAt = check.alarm();
    expect(retryAt).toBe(Date.now() + 2000);
    check.fail();
    time.mockReturnValue(retryAt!);
    await check.room.alarm(); // Simulated delivery of the persisted alarm only.
    expect(check.alarm()).toBeNull();
    expect(check.order).toContain("deleteAll");
    expect(check.sockets.every((socket) => socket.readyState === 3)).toBe(true);
  });
  for (const raw of [JSON.stringify(revealCommand), "malformed"])
    it(`revokes every expired view despite persistent commit failure for ${raw === "malformed" ? "malformed" : "valid"} commands`, async () => {
      const initial = playing();
      const check = fixture("commit", initial);
      vi.spyOn(Date, "now").mockReturnValue(initial.updatedAt + IDLE_TTL);
      await check.room.webSocketMessage(check.sockets[2], raw);
      expect(check.record()).toEqual(initial);
      expect(
        check.published.every(
          ({ message }) =>
            message.type === "error" && message.code === "not_found" && !("view" in message),
        ),
      ).toBe(true);
      expect(check.alarm()).toBe(Date.now() + 2000);
      check.fail();
      await check.room.alarm();
      expect(check.record()).toBeUndefined();
      expect(check.alarm()).toBeNull();
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
    updatedAt: Date.now(),
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
  for (const type of ["play_again", "abandon"])
    for (const failure of ["write", "commit", "alarm"] as const)
      it(`keeps the current round and publishes no success when ${type} hits ${failure} failure`, async () => {
        const initial = playing();
        if (type === "play_again") {
          initial.phase = "ended";
          initial.round!.outcome = { winner: "red", reason: "agents" };
        }
        const check = fixture(failure, initial);
        if (type === "abandon") check.sockets[2].close();
        await check.room.webSocketMessage(
          check.sockets[0],
          JSON.stringify({ ...revealCommand, type, index: undefined }),
        );
        expect(check.state()).toEqual(initial);
        expect(check.published).toHaveLength(1);
        expect(check.published[0].message).toMatchObject({
          type: "error",
          code: "unavailable",
          view: { roundId: "round-1" },
        });
        expect(check.order).toEqual(["publish"]);
      });
  it("serializes competing Play again requests and returns only the cleared current lobby on old-round errors", async () => {
    const initial = playing();
    initial.phase = "ended";
    initial.round!.outcome = { winner: "red", reason: "agents" };
    const check = fixture(undefined, initial);
    const action = { ...revealCommand, type: "play_again", index: undefined };
    await Promise.all([
      check.room.webSocketMessage(check.sockets[0], JSON.stringify(action)),
      check.room.webSocketMessage(
        check.sockets[0],
        JSON.stringify({ ...action, requestId: "competing" }),
      ),
    ]);
    expect(check.state()).toMatchObject({
      phase: "lobby",
      roundId: null,
      round: null,
      revision: 11,
      seats: initial.seats,
    });
    expect(check.order[0]).toBe("commit");
    const snapshots = check.published.filter(({ message }) => message.type === "snapshot");
    expect(snapshots).toHaveLength(4);
    expect(
      snapshots.every(({ message }) => "view" in message && message.view?.round === null),
    ).toBe(true);
    expect(check.published.at(-1)?.message).toMatchObject({
      code: "stale",
      view: { round: null, roundId: null },
    });
    await check.room.webSocketMessage(
      check.sockets[2],
      JSON.stringify({
        ...revealCommand,
        type: "clue",
        index: undefined,
        word: "old-clue",
        number: 1,
      }),
    );
    expect(check.published.at(-1)?.message).toMatchObject({ code: "stale", view: { round: null } });
  });
  it("uses transferred host and socket-derived missing-spymaster authority for abandon versus an old reveal", async () => {
    const check = fixture(undefined, playing());
    await check.room.webSocketClose(check.sockets[0]);
    await check.room.webSocketClose(check.sockets[2]);
    const before = check.state();
    expect(before.hostId).toBe("red-op-2");
    const action = {
      ...revealCommand,
      type: "abandon",
      index: undefined,
      revision: before.revision,
    };
    await check.room.webSocketMessage(check.sockets[3], JSON.stringify(action));
    expect(check.published.at(-1)?.message).toMatchObject({ code: "forbidden" });
    await Promise.all([
      check.room.webSocketMessage(check.sockets[1], JSON.stringify(action)),
      check.room.webSocketMessage(
        check.sockets[1],
        JSON.stringify({ ...revealCommand, revision: before.revision }),
      ),
    ]);
    expect(check.state()).toMatchObject({
      phase: "lobby",
      round: null,
      roundId: null,
      hostId: "red-op-2",
      seats: before.seats,
    });
    expect(check.published.at(-1)?.message).toMatchObject({
      code: "stale",
      view: { round: null, controls: { abandon: false } },
    });
    expect(check.alarm()).toBe(check.state().updatedAt + IDLE_TTL);
  });
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
