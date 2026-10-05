import { describe, expect, it } from "vite-plus/test";
import type { RoomCommand, Team } from "../src/shared/protocol";
import { generateRound, otherTeam, play } from "./game";
import { parseCommand, project } from "./state";
import type { RoomState } from "./state";
import { WORDS } from "./words";

function fixture(): RoomState {
  return {
    schema: 1,
    code: "ABCDEFGHJKLM",
    phase: "playing",
    revision: 10,
    roundId: "round-1",
    updatedAt: 0,
    hostId: "red-op",
    seats: [
      {
        id: "red-op",
        name: "Host",
        team: "red",
        role: "operative",
        tokenHash: "private-1",
        connectionId: "c1",
      },
      {
        id: "red-spy",
        name: "Red spy",
        team: "red",
        role: "spymaster",
        tokenHash: "private-2",
        connectionId: "c2",
      },
      {
        id: "blue-op",
        name: "Blue op",
        team: "blue",
        role: "operative",
        tokenHash: "private-3",
        connectionId: "c3",
      },
      {
        id: "blue-spy",
        name: "Blue spy",
        team: "blue",
        role: "spymaster",
        tokenHash: "private-4",
        connectionId: "c4",
      },
      {
        id: "watcher",
        name: "Watcher",
        team: null,
        role: "watcher",
        tokenHash: "private-5",
        connectionId: "c5",
      },
    ],
    round: {
      cards: WORDS.slice(0, 25).map((word, index) => ({
        word,
        identity: index < 9 ? "red" : index < 17 ? "blue" : index < 24 ? "neutral" : "assassin",
        revealed: false,
      })),
      startingTeam: "red",
      activeTeam: "red",
      stage: "clue",
      clue: null,
      guessesUsed: 0,
      outcome: null,
      lastReveal: null,
    },
  };
}
function command(
  state: RoomState,
  action: Record<string, unknown>,
): Exclude<RoomCommand, { type: "assign" }> {
  return parseCommand({
    version: 1,
    requestId: "test",
    revision: state.revision,
    roundId: state.roundId,
    ...action,
  }) as Exclude<RoomCommand, { type: "assign" }>;
}
function clue(state = fixture(), number = 1) {
  return play(
    state,
    `${state.round!.activeTeam}-spy`,
    command(state, { type: "clue", word: "signal", number }),
  );
}
function reveal(state: RoomState, index: number) {
  return play(state, `${state.round!.activeTeam}-op`, command(state, { type: "reveal", index }));
}

describe("Authoritative complete-round rules", () => {
  it("curates a unique short list and generates distinct fixed boards with correct identity counts", () => {
    expect(new Set(WORDS).size).toBe(WORDS.length);
    expect(WORDS.every((word) => /^[A-Z]{1,6}$/.test(word))).toBe(true);
    for (let index = 0; index < 30; index++) {
      const round = generateRound();
      expect(round.cards).toHaveLength(25);
      expect(new Set(round.cards.map((card) => card.word)).size).toBe(25);
      for (const [identity, count] of [
        [round.startingTeam, 9],
        [otherTeam(round.startingTeam), 8],
        ["neutral", 7],
        ["assassin", 1],
      ] as const)
        expect(round.cards.filter((card) => card.identity === identity)).toHaveLength(count);
    }
  });
  it("only starts a ready lobby as host, converts unassigned seats to watchers and creates a fresh round ID", () => {
    const state = { ...fixture(), phase: "lobby" as const, roundId: null, round: null };
    expect(() => play(state, "red-spy", command(state, { type: "start" }))).toThrow(
      "Only the host",
    );
    const missing = { ...state, seats: state.seats.filter((seat) => seat.id !== "blue-op") };
    expect(() => play(missing, "red-op", command(missing, { type: "start" }))).toThrow("Each team");
    const next = play(state, "red-op", command(state, { type: "start" }));
    expect(next.phase).toBe("playing");
    expect(next.roundId).not.toBeNull();
    expect(next.roundId).not.toBe("round-1");
    expect(next.seats.find((seat) => seat.id === "watcher")?.role).toBe("watcher");
  });
  it("validates shape, role, turn, round and bounded single-word clues without dictionary policing", () => {
    const state = fixture();
    for (const action of [
      { type: "clue", word: "two words", number: 1 },
      { type: "clue", word: "hello", number: 0 },
      { type: "clue", word: "hello", number: 1.2 },
      { type: "reveal", index: 25 },
      { type: "start", isHost: true },
    ])
      expect(() => command(state, action)).toThrow();
    for (const actor of ["red-op", "blue-spy", "watcher"])
      expect(() =>
        play(state, actor, command(state, { type: "clue", word: "signal", number: 1 })),
      ).toThrow();
    expect(() =>
      play(
        state,
        "red-spy",
        command(state, { type: "clue", word: state.round!.cards[0].word.toLowerCase(), number: 1 }),
      ),
    ).toThrow("unrevealed board word");
    expect(() =>
      play(
        state,
        "red-spy",
        command(state, { type: "clue", word: "signal", number: 1, roundId: "old-round" }),
      ),
    ).toThrow("round changed");
    expect(
      play(state, "red-spy", command(state, { type: "clue", word: "R2D2", number: 9 })).round?.clue,
    ).toEqual({ word: "R2D2", number: 9 });
    state.round!.cards[0].revealed = true;
    expect(
      play(
        state,
        "red-spy",
        command(state, { type: "clue", word: state.round!.cards[0].word, number: 1 }),
      ).round?.stage,
    ).toBe("guessing");
  });
  it("allows own agents up to number+1, rejects early End turn and passes on exhaustion", () => {
    const state = clue();
    expect(() => play(state, "red-op", command(state, { type: "end_turn" }))).toThrow(
      "at least one",
    );
    const first = reveal(state, 0);
    expect(first.round?.activeTeam).toBe("red");
    expect(first.round?.guessesUsed).toBe(1);
    expect(state.round?.cards[0].revealed).toBe(false);
    const next = reveal(first, 1);
    expect(next.round?.activeTeam).toBe("blue");
    expect(next.round?.stage).toBe("clue");
    expect(next.round?.clue).toBeNull();
    expect(() => reveal(next, 2)).toThrow();
    expect(play(first, "red-op", command(first, { type: "end_turn" })).round?.activeTeam).toBe(
      "blue",
    );
  });
  for (const index of [9, 17])
    it(`ends a nonterminal turn on ${index === 9 ? "opposing" : "neutral"} reveal`, () => {
      const next = reveal(clue(), index);
      expect(next.round?.activeTeam).toBe("blue");
      expect(next.phase).toBe("playing");
      expect(next.round?.cards[index].revealed).toBe(true);
    });
  it("immediately loses on assassin and rejects terminal commands", () => {
    const next = reveal(clue(), 24);
    expect(next.phase).toBe("ended");
    expect(next.round?.outcome).toEqual({ winner: "blue", reason: "assassin" });
    expect(() => play(next, "red-op", command(next, { type: "reveal", index: 0 }))).toThrow(
      "not accepting",
    );
  });
  for (const team of ["red", "blue"] as Team[])
    it(`wins immediately when the last ${team} agent is revealed`, () => {
      const state = clue();
      const index = team === "red" ? 0 : 9;
      state.round!.cards.forEach((card, cardIndex) => {
        if (card.identity === team && cardIndex !== index) card.revealed = true;
      });
      const next = reveal(state, index);
      expect(next.phase).toBe("ended");
      expect(next.round?.outcome).toEqual({ winner: team, reason: "agents" });
    });
  it("rejects stale/duplicate reveals without mutating current state", () => {
    const state = clue();
    const old = command(state, { type: "reveal", index: 0 });
    const next = play(state, "red-op", old);
    expect(() => play(next, "red-op", old)).toThrow("round changed");
    expect(() => reveal(next, 0)).toThrow("cannot be revealed");
    expect(next.round?.guessesUsed).toBe(1);
  });
  it("projects keys only to both spymasters during play and to everyone at the end", () => {
    const state = reveal(clue(), 0);
    for (const id of ["red-op", "blue-op", "watcher"]) {
      const view = project(state, id, new Set());
      expect(view.round?.cards.filter((card) => "identity" in card)).toHaveLength(1);
      expect(view.round?.privateKey).toBe(false);
      expect(JSON.stringify(view)).not.toContain("private-");
    }
    for (const id of ["red-spy", "blue-spy"]) {
      expect(
        project(state, id, new Set()).round?.cards.filter((card) => "identity" in card),
      ).toHaveLength(25);
      expect(project(state, id, new Set()).round?.privateKey).toBe(true);
    }
    const ended = reveal(clue(), 24);
    for (const id of ended.seats.map((seat) => seat.id))
      expect(
        project(ended, id, new Set()).round?.cards.filter((card) => "identity" in card),
      ).toHaveLength(25);
    expect(project(state, "watcher", new Set()).controls).toMatchObject({
      assignSelf: false,
      assignOthers: false,
      startRound: false,
      giveClue: false,
      reveal: false,
      endTurn: false,
    });
  });
});
