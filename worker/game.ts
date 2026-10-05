import { normalizeClue } from "../src/shared/protocol";
import type { CardIdentity, RoomCommand, RoundView, Team } from "../src/shared/protocol";
import type { RoomState, Seat } from "./state";
import { RoomError } from "./errors";
import { WORDS } from "./words";

export interface RoundState {
  cards: { word: string; identity: CardIdentity; revealed: boolean }[];
  startingTeam: Team;
  activeTeam: Team;
  stage: "clue" | "guessing";
  clue: { word: string; number: number } | null;
  guessesUsed: number;
  outcome: { winner: Team; reason: "agents" | "assassin" } | null;
  lastReveal: { word: string; identity: CardIdentity; byTeam: Team } | null;
}
export function otherTeam(team: Team): Team {
  return team === "red" ? "blue" : "red";
}
function randomBelow(limit: number): number {
  // Rejection sampling avoids modulo bias in board/start-team generation.
  const ceiling = Math.floor(0x100000000 / limit) * limit;
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= ceiling);
  return value % limit;
}
function shuffle<T>(source: readonly T[]): T[] {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomBelow(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
export function generateRound(): RoundState {
  const startingTeam = randomBelow(2) === 0 ? "red" : "blue";
  const identities = shuffle<CardIdentity>([
    ...Array<CardIdentity>(9).fill(startingTeam),
    ...Array<CardIdentity>(8).fill(otherTeam(startingTeam)),
    ...Array<CardIdentity>(7).fill("neutral"),
    "assassin",
  ]);
  return {
    cards: shuffle(WORDS)
      .slice(0, 25)
      .map((word, index) => ({ word, identity: identities[index], revealed: false })),
    startingTeam,
    activeTeam: startingTeam,
    stage: "clue",
    clue: null,
    guessesUsed: 0,
    outcome: null,
    lastReveal: null,
  };
}
export function remaining(round: RoundState): Record<Team, number> {
  return {
    red: round.cards.filter((card) => card.identity === "red" && !card.revealed).length,
    blue: round.cards.filter((card) => card.identity === "blue" && !card.revealed).length,
  };
}
export function ready(seats: Seat[]): boolean {
  return (["red", "blue"] as const).every(
    (team) =>
      seats.filter((seat) => seat.team === team && seat.role === "spymaster").length === 1 &&
      seats.some((seat) => seat.team === team && seat.role === "operative"),
  );
}
export function play(
  state: RoomState,
  actorId: string,
  command: Exclude<RoomCommand, { type: "assign" }>,
): RoomState {
  const actor = state.seats.find((seat) => seat.id === actorId);
  if (!actor) throw new RoomError("unauthorized", "Join this room to continue.", 401);
  if (command.revision !== state.revision || command.roundId !== state.roundId)
    throw new RoomError("stale", "The round changed. Check the current board and try again.", 409);
  if (command.type === "start") {
    if (state.phase !== "lobby" || state.hostId !== actorId || actor.role === "watcher")
      throw new RoomError("forbidden", "Only the host can start from the lobby.", 403);
    if (!ready(state.seats))
      throw new RoomError(
        "invalid",
        "Each team needs exactly one spymaster and at least one operative.",
      );
    return {
      ...state,
      phase: "playing",
      roundId: crypto.randomUUID(),
      round: generateRound(),
      revision: state.revision + 1,
      updatedAt: Date.now(),
      seats: state.seats.map((seat) => (seat.team === null ? { ...seat, role: "watcher" } : seat)),
    };
  }
  if (state.phase !== "playing" || !state.round || state.round.outcome)
    throw new RoomError("forbidden", "This round is not accepting game actions.", 403);
  if (actor.team !== state.round.activeTeam || actor.role === "watcher")
    throw new RoomError("forbidden", "Wait for your team's turn.", 403);
  const round = structuredClone(state.round);
  if (command.type === "clue") {
    if (actor.role !== "spymaster" || round.stage !== "clue")
      throw new RoomError("forbidden", "Only the active spymaster can give the next clue.", 403);
    const word = normalizeClue(command.word);
    if (!word || !Number.isInteger(command.number) || command.number < 1 || command.number > 9)
      throw new RoomError("invalid", "Give one word and a whole number from 1 to 9.");
    if (
      round.cards.some(
        (card) =>
          !card.revealed &&
          card.word.toLocaleLowerCase("en-US") === word.toLocaleLowerCase("en-US"),
      )
    )
      throw new RoomError("invalid", "Your clue cannot be an unrevealed board word.");
    round.clue = { word, number: command.number };
    round.stage = "guessing";
    round.guessesUsed = 0;
  } else {
    if (actor.role !== "operative" || round.stage !== "guessing" || !round.clue)
      throw new RoomError("forbidden", "Only the active operatives can guess after a clue.", 403);
    if (command.type === "end_turn") {
      if (round.guessesUsed < 1)
        throw new RoomError("invalid", "Reveal at least one word before ending the turn.");
      nextTurn(round);
    } else if (command.type === "reveal") {
      const card = round.cards[command.index];
      if (!card || card.revealed || round.guessesUsed >= round.clue.number + 1)
        throw new RoomError("invalid", "That word cannot be revealed. Check the current board.");
      card.revealed = true;
      round.guessesUsed += 1;
      round.lastReveal = { word: card.word, identity: card.identity, byTeam: actor.team };
      if (card.identity === "assassin")
        round.outcome = { winner: otherTeam(actor.team), reason: "assassin" };
      else {
        const counts = remaining(round);
        if (counts.red === 0) round.outcome = { winner: "red", reason: "agents" };
        else if (counts.blue === 0) round.outcome = { winner: "blue", reason: "agents" };
      }
      if (
        !round.outcome &&
        (card.identity !== actor.team || round.guessesUsed >= round.clue.number + 1)
      )
        nextTurn(round);
    }
  }
  return {
    ...state,
    phase: round.outcome ? "ended" : "playing",
    round,
    revision: state.revision + 1,
    updatedAt: Date.now(),
  };
}
function nextTurn(round: RoundState): void {
  round.activeTeam = otherTeam(round.activeTeam);
  round.stage = "clue";
  round.clue = null;
  round.guessesUsed = 0;
}
export function projectRound(
  round: RoundState,
  viewer: Seat | undefined,
  ended: boolean,
): RoundView {
  const privateKey = !ended && viewer?.role === "spymaster";
  return {
    cards: round.cards.map((card) => ({
      word: card.word,
      revealed: card.revealed,
      ...(ended || privateKey || card.revealed ? { identity: card.identity } : {}),
    })),
    startingTeam: round.startingTeam,
    activeTeam: round.activeTeam,
    stage: round.stage,
    clue: round.clue ? { word: round.clue.word, number: round.clue.number } : null,
    guessesUsed: round.guessesUsed,
    guessesRemaining: round.clue ? Math.max(0, round.clue.number + 1 - round.guessesUsed) : 0,
    remaining: remaining(round),
    privateKey,
    outcome: round.outcome ? { winner: round.outcome.winner, reason: round.outcome.reason } : null,
    lastReveal: round.lastReveal
      ? {
          word: round.lastReveal.word,
          identity: round.lastReveal.identity,
          byTeam: round.lastReveal.byTeam,
        }
      : null,
  };
}
