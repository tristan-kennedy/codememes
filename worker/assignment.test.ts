import { describe, expect, it } from "vite-plus/test";
import type { AssignCommand } from "../src/shared/protocol";
import { assign } from "./state";
import type { RoomState } from "./state";

function roster(): RoomState {
  return {
    schema: 1,
    code: "ABCDEFGHJKLM",
    phase: "lobby",
    revision: 4,
    roundId: null,
    hostId: "host",
    updatedAt: Date.now() - 1000,
    seats: [
      {
        id: "host",
        name: "Host",
        tokenHash: "test",
        team: "red",
        role: "operative",
        connectionId: "host-connection",
      },
      {
        id: "spy",
        name: "Spy",
        tokenHash: "test",
        team: "red",
        role: "spymaster",
        connectionId: null,
      },
      {
        id: "guest",
        name: "Guest",
        tokenHash: "test",
        team: null,
        role: "operative",
        connectionId: "guest-connection",
      },
    ],
  };
}
function move(state: RoomState, changes: Partial<AssignCommand> = {}): AssignCommand {
  return {
    version: 1,
    type: "assign",
    requestId: "placement",
    revision: state.revision,
    roundId: state.roundId,
    seatId: "guest",
    team: "red",
    role: "spymaster",
    ...changes,
  };
}

describe("server-owned lobby placement", () => {
  it("rejects an occupied slot without changing its offline incumbent or activity", () => {
    const state = roster();
    const before = structuredClone(state);
    expect(() => assign(state, "guest", move(state))).toThrow(/occupied/i);
    expect(state).toEqual(before);
  });
  it("lets the incumbent retain their slot, then requires an explicit host move before replacement", () => {
    const state = roster();
    const retained = assign(state, "host", move(state, { seatId: "spy" }));
    expect(retained.seats[1].role).toBe("spymaster");
    const cleared = assign(retained, "host", move(retained, { seatId: "spy", role: "operative" }));
    const placed = assign(cleared, "guest", move(cleared));
    expect(
      placed.seats
        .filter((seat) => seat.team === "red" && seat.role === "spymaster")
        .map((seat) => seat.id),
    ).toEqual(["guest"]);
  });
  it("accepts only the first competing slot placement; fresh retries still reject occupancy", () => {
    const state = roster();
    state.seats[1].team = "blue";
    const first = assign(state, "guest", move(state));
    expect(() => assign(first, "host", move(state, { seatId: "host" }))).toThrow(/changed/i);
    expect(() => assign(first, "host", move(first, { seatId: "host" }))).toThrow(/occupied/i);
    expect(first.seats[2].role).toBe("spymaster");
  });
  it("checks membership, host/self authority, phase, revision and round before placement", () => {
    const state = roster();
    expect(() => assign(state, "missing", move(state))).toThrow(/join/i);
    expect(() => assign(state, "guest", move(state, { seatId: "spy", role: "operative" }))).toThrow(
      /only the host/i,
    );
    expect(() => assign({ ...state, phase: "playing" }, "host", move(state))).toThrow(/lobby/i);
    expect(() => assign(state, "guest", move(state, { revision: 3 }))).toThrow(/changed/i);
    expect(() => assign(state, "guest", move(state, { roundId: "prior-round" }))).toThrow(
      /changed/i,
    );
  });
  it("admits a watcher into an open operative destination only between rounds", () => {
    const state = roster();
    state.seats[2].role = "watcher";
    const placed = assign(state, "guest", move(state, { role: "operative", team: "blue" }));
    expect(placed.seats[2]).toMatchObject({ id: "guest", role: "operative", team: "blue" });
    expect(() =>
      assign({ ...state, phase: "ended" }, "guest", move(state, { role: "operative" })),
    ).toThrow(/lobby/i);
  });
});
