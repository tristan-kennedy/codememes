import { describe, expect, it } from "vite-plus/test";
import type { RoomCommand, Team } from "../src/shared/protocol";
import { generateRound, otherTeam, play } from "./game";
import { assign, parseCommand, project } from "./state";
import type { RoomState } from "./state";
import { DECK } from "./deck";
import { readFileSync, existsSync } from "node:fs";

// Short labels keep rule fixtures independent of the current catalog's names.
const TEST_LABELS = [
  "APPLE",
  "BEACH",
  "BELL",
  "BIRD",
  "BOOK",
  "BRIDGE",
  "CAR",
  "CAT",
  "CHAIR",
  "CLOUD",
  "COIN",
  "DOG",
  "DOOR",
  "FISH",
  "FLOWER",
  "GLASS",
  "GRASS",
  "HAND",
  "HILL",
  "HORSE",
  "HOUSE",
  "KEY",
  "LAKE",
  "MOON",
  "STAR",
];

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
      cards: TEST_LABELS.map((word, index) => ({
        word,
        content: { ...DECK[index].recognition, name: word, phrase: word },
        exclusions: [word],
        identity: index < 9 ? "red" : index < 17 ? "blue" : index < 24 ? "neutral" : "assassin",
        coverVariant: index < 9 ? index + 1 : index < 17 ? index - 8 : index < 24 ? index - 16 : 1,
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
): Exclude<RoomCommand, { type: "assign" | "randomize" }> {
  return parseCommand({
    version: 1,
    requestId: "test",
    revision: state.revision,
    roundId: state.roundId,
    ...action,
  }) as Exclude<RoomCommand, { type: "assign" | "randomize" }>;
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
  it("pins a suitable distinct mixed-media catalog and public recognition without curator fields", () => {
    expect(DECK.length).toBeGreaterThan(25);
    expect(new Set(DECK.map((entry) => entry.recognition.id)).size).toBe(DECK.length);
    expect(new Set(DECK.map((entry) => entry.recognition.family)).size).toBe(DECK.length);
    expect(new Set(DECK.map((entry) => entry.recognition.kind))).toEqual(new Set(["image", "gif"]));
    for (const entry of DECK) {
      expect(entry.provenance.curated).toBe("2026-10-05");
      expect(entry.recognition.description).toBeTruthy();
      expect(entry.recognition.asset).toBeTruthy();
      expect(entry.recognition.width).toBeGreaterThan(0);
      expect(entry.recognition.height).toBeGreaterThan(0);
      for (const path of [entry.recognition.asset, entry.recognition.poster].filter(
        Boolean,
      ) as string[]) {
        expect(path.startsWith("/media/")).toBe(true);
        expect(existsSync(`public${path}`)).toBe(true);
      }
    }
    const gif = readFileSync(
      `public${DECK.find((entry) => entry.recognition.id === "dvd-screensaver")!.recognition.asset}`,
    );
    expect(gif.subarray(0, 6).toString()).toBe("GIF89a");
    const state = fixture();
    state.round = generateRound();
    const restored = JSON.parse(JSON.stringify(state)) as RoomState;
    expect(restored.round).toEqual(state.round);
    expect(new Set(restored.round?.cards.map((card) => card.content?.family)).size).toBe(25);
    // Future catalog/curator changes cannot replace a live round's pinned data.
    restored.round!.cards[0].content!.name = "Pinned old edition";
    restored.round!.cards[0].exclusions = ["oldedition"];
    restored.round!.activeTeam = "red";
    const publicView = project(restored, "red-op", new Set());
    expect(publicView.round?.cards[0].content.name).toBe("Pinned old edition");
    expect(JSON.stringify(publicView)).not.toMatch(
      /exclusions|aliases|visibleWords|provenance|curated/,
    );
    expect(publicView.round?.cards.every((card) => !("identity" in card))).toBe(true);
    expect(() =>
      play(restored, "red-spy", command(restored, { type: "clue", word: "oldedition", number: 1 })),
    ).toThrow("printed word");
    for (const seat of ["red-spy", "blue-spy"])
      expect(
        project(restored, seat, new Set()).round?.cards.every((card) => "identity" in card),
      ).toBe(true);
  });
  it("rejects normalized recognition names, aliases and visible words only while unrevealed", () => {
    const state = fixture();
    state.round = generateRound();
    state.round.activeTeam = "red";
    const fine = DECK.find((entry) => entry.recognition.id === "this-is-fine")!;
    const existing = state.round.cards.findIndex(
      (card) => card.content?.id === fine.recognition.id,
    );
    if (existing > 0)
      [state.round.cards[0], state.round.cards[existing]] = [
        state.round.cards[existing],
        state.round.cards[0],
      ];
    state.round.cards[0] = {
      word: fine.recognition.name,
      content: fine.recognition,
      exclusions: [fine.recognition.name, ...fine.aliases, ...fine.visibleWords],
      identity: "red",
      coverVariant: 1,
      revealed: false,
    };
    for (const word of ["fine", "FINE", "ｆｉｎｅ"])
      expect(() =>
        play(state, "red-spy", command(state, { type: "clue", word, number: 1 })),
      ).toThrow("printed word");
    expect(
      play(state, "red-spy", command(state, { type: "clue", word: "fire", number: 1 })).round?.clue
        ?.word,
    ).toBe("fire");
    state.round.cards[0].revealed = true;
    expect(
      play(state, "red-spy", command(state, { type: "clue", word: "fine", number: 1 })).round
        ?.stage,
    ).toBe("guessing");
  });
  it("returns only the host's ended round to the same lobby and resets the fresh round without history", () => {
    const ended = reveal(clue(), 24);
    ended.emptySince = null;
    ended.updatedAt -= 1000;
    for (const actor of ["red-spy", "watcher"])
      expect(() => play(ended, actor, command(ended, { type: "play_again" }))).toThrow(
        "Only the current host",
      );
    const old = command(ended, { type: "play_again" });
    const lobby = play(ended, "red-op", old);
    expect(lobby).toMatchObject({
      code: ended.code,
      hostId: ended.hostId,
      seats: ended.seats,
      emptySince: null,
      phase: "lobby",
      roundId: null,
      round: null,
      revision: ended.revision + 1,
    });
    expect(lobby.updatedAt).toBeGreaterThan(ended.updatedAt);
    expect(project(lobby, "red-spy", new Set()).round).toBeNull();
    expect(() => play(lobby, "red-op", old)).toThrow("round changed");
    const next = play(lobby, "red-op", command(lobby, { type: "start" }));
    expect(next.roundId).not.toBe(ended.roundId);
    expect(next.round).toMatchObject({
      stage: "clue",
      clue: null,
      guessesUsed: 0,
      lastReveal: null,
      outcome: null,
    });
    expect(next.round?.cards.every((card) => !card.revealed)).toBe(true);
    expect(next.round?.cards).not.toEqual(ended.round?.cards);
    expect(
      project(next, "red-op", new Set()).round?.cards.every((card) => !("identity" in card)),
    ).toBe(true);
    expect(() =>
      play(next, "red-op", command(next, { type: "reveal", index: 0, roundId: ended.roundId })),
    ).toThrow("round changed");
  });
  it("admits watchers and changes spymaster privacy in both directions only through the preserved lobby", () => {
    const ended = reveal(clue(), 24);
    let lobby = play(ended, "red-op", command(ended, { type: "play_again" }));
    const change = (actor: string, seatId: string, team: Team, role: "operative" | "spymaster") => {
      lobby = assign(
        lobby,
        actor,
        parseCommand({
          version: 1,
          requestId: "role",
          revision: lobby.revision,
          roundId: lobby.roundId,
          type: "assign",
          seatId,
          team,
          role,
        }) as Extract<RoomCommand, { type: "assign" }>,
      );
    };
    expect(() => change("watcher", "watcher", "blue", "spymaster")).toThrow("occupied");
    change("red-op", "blue-spy", "blue", "operative");
    expect(project(lobby, "watcher", new Set()).readiness.ready).toBe(false);
    change("watcher", "watcher", "blue", "spymaster");
    change("red-op", "red-spy", "red", "operative");
    expect(() => play(lobby, "red-op", command(lobby, { type: "start" }))).toThrow("Each team");
    change("red-op", "red-op", "red", "spymaster");
    const next = play(lobby, "red-op", command(lobby, { type: "start" }));
    for (const actor of ["watcher", "red-op"])
      expect(project(next, actor, new Set()).round?.privateKey).toBe(true);
    for (const actor of ["red-spy", "blue-spy"])
      expect(
        project(next, actor, new Set()).round?.cards.every((card) => !("identity" in card)),
      ).toBe(true);
    expect(() =>
      assign(
        next,
        "red-op",
        parseCommand({
          version: 1,
          requestId: "locked",
          revision: next.revision,
          roundId: next.roundId,
          type: "assign",
          seatId: "red-spy",
          team: "red",
          role: "spymaster",
        }) as Extract<RoomCommand, { type: "assign" }>,
      ),
    ).toThrow("in the lobby");
  });
  it("only abandons live play as current host while the active spymaster is absent", () => {
    const state = clue();
    const action = command(state, { type: "abandon" });
    expect(() => play(state, "red-op", action)).toThrow("disconnected");
    for (const actor of ["red-spy", "watcher"])
      expect(() => play(state, actor, action, true)).toThrow("Only the current host");
    const lobby = play(state, "red-op", action, true);
    expect(lobby.seats).toEqual(state.seats);
    expect(lobby).toMatchObject({ phase: "lobby", round: null, roundId: null });
    expect(() => play(lobby, "red-op", command(lobby, { type: "abandon" }), true)).toThrow(
      "disconnected",
    );
    expect(() => play(state, "red-op", command(state, { type: "play_again" }))).toThrow(
      "after the round ends",
    );
  });
  it("generates distinct fixed boards with correct identity counts", () => {
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
