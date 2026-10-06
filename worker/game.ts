import { normalizeClue } from "../src/shared/protocol";
import type {
  CardIdentity,
  ClueCount,
  Recognition,
  RoomCommand,
  RoundView,
  Team,
} from "../src/shared/protocol";
import type { RoomState, Seat } from "./state";
import { RoomError } from "./errors";
import { DECK, normalizeRecognition, recognitionView } from "./deck";

export interface RoundState {
  cards: {
    word: string;
    content: Recognition;
    exclusions: string[];
    identity: CardIdentity;
    coverVariant: number;
    revealed: boolean;
  }[];
  startingTeam: Team;
  activeTeam: Team;
  stage: "clue" | "guessing";
  clue: { word: string; number: ClueCount } | null;
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
export function shuffle<T>(source: readonly T[]): T[] {
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
  const coverVariants = {
    red: shuffle(Array.from({ length: startingTeam === "red" ? 9 : 8 }, (_, index) => index + 1)),
    blue: shuffle(Array.from({ length: startingTeam === "blue" ? 9 : 8 }, (_, index) => index + 1)),
    neutral: shuffle([1, 2, 3, 4, 5, 6, 7]),
    assassin: [1],
  };
  return {
    cards: shuffle(
      DECK.filter(
        (entry, index, all) =>
          all.findIndex(
            (candidate) => candidate.recognition.family === entry.recognition.family,
          ) === index,
      ),
    )
      .slice(0, 25)
      .map((entry, index) => ({
        word: entry.recognition.name,
        content: recognitionView(entry.recognition),
        exclusions: [entry.recognition.name, ...entry.aliases, ...entry.visibleWords].map(
          normalizeRecognition,
        ),
        identity: identities[index],
        coverVariant: coverVariants[identities[index]].pop()!,
        revealed: false,
      })),
    startingTeam,
    activeTeam: startingTeam,
    stage: "clue",
    clue: null,
    guessesUsed: 0,
    outcome: null,
    lastReveal: null,
  };
}
export function remaining(round: RoundState): Record<CardIdentity, number> {
  return {
    red: round.cards.filter((card) => card.identity === "red" && !card.revealed).length,
    blue: round.cards.filter((card) => card.identity === "blue" && !card.revealed).length,
    neutral: round.cards.filter((card) => card.identity === "neutral" && !card.revealed).length,
    assassin: round.cards.filter((card) => card.identity === "assassin" && !card.revealed).length,
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
  command: Exclude<RoomCommand, { type: "assign" | "randomize" }>,
  waitingForSpymaster = false,
): RoomState {
  const actor = state.seats.find((seat) => seat.id === actorId);
  if (!actor) throw new RoomError("unauthorized", "Join this room to continue.", 401);
  if (command.revision !== state.revision || command.roundId !== state.roundId)
    throw new RoomError("stale", "The round changed. Check the current board and try again.", 409);
  if (command.type === "play_again" || command.type === "abandon") {
    if (state.hostId !== actorId || actor.role === "watcher")
      throw new RoomError(
        "forbidden",
        "Only the current host can return the group to the lobby.",
        403,
      );
    if (
      command.type === "play_again"
        ? state.phase !== "ended"
        : state.phase !== "playing" || !waitingForSpymaster
    )
      throw new RoomError(
        "forbidden",
        command.type === "play_again"
          ? "Play again is available after the round ends."
          : "Return to the lobby only while the active spymaster is disconnected.",
        403,
      );
    return {
      ...state,
      phase: "lobby",
      roundId: null,
      round: null,
      revision: state.revision + 1,
      updatedAt: Date.now(),
    };
  }
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
    if (
      !word ||
      (command.number !== "unlimited" &&
        (!Number.isInteger(command.number) || command.number < 0 || command.number > 9))
    )
      throw new RoomError("invalid", "Give one word and a count from 0 to 9 or unlimited.");
    if (
      round.cards.some(
        (card) =>
          !card.revealed &&
          card.exclusions.some(
            (value) => normalizeRecognition(value) === normalizeRecognition(word),
          ),
      )
    )
      throw new RoomError(
        "invalid",
        "Your clue cannot be an unrevealed board word, name, alias, or printed word.",
      );
    round.clue = { word, number: command.number };
    round.stage = "guessing";
    round.guessesUsed = 0;
  } else {
    if (actor.role !== "operative" || round.stage !== "guessing" || !round.clue)
      throw new RoomError("forbidden", "Only the active operatives can guess after a clue.", 403);
    if (command.type === "end_turn") {
      if (round.guessesUsed < 1)
        throw new RoomError("invalid", "Reveal at least one card before ending the turn.");
      nextTurn(round);
    } else if (command.type === "reveal") {
      const card = round.cards[command.index];
      const guessLimit =
        typeof round.clue.number === "number" && round.clue.number > 0
          ? round.clue.number + 1
          : Infinity;
      const exhausted = round.guessesUsed >= guessLimit;
      if (!card || card.revealed || exhausted)
        throw new RoomError("invalid", "That card cannot be revealed. Check the current board.");
      // Unrevealed variants form a shuffled cover stack. Whichever meme is
      // guessed gets its identity's next cover, matching the public preview.
      const nextCover = round.cards.find(
        (candidate) => candidate.identity === card.identity && !candidate.revealed,
      )!;
      [card.coverVariant, nextCover.coverVariant] = [nextCover.coverVariant, card.coverVariant];
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
      if (!round.outcome && (card.identity !== actor.team || round.guessesUsed >= guessLimit))
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
      content: recognitionView(card.content),
      revealed: card.revealed,
      ...(ended || privateKey || card.revealed ? { identity: card.identity } : {}),
      ...(card.revealed ? { coverVariant: card.coverVariant } : {}),
    })),
    startingTeam: round.startingTeam,
    activeTeam: round.activeTeam,
    stage: round.stage,
    clue: round.clue ? { word: round.clue.word, number: round.clue.number } : null,
    guessesUsed: round.guessesUsed,
    guessesRemaining: round.clue
      ? typeof round.clue.number === "number" && round.clue.number > 0
        ? Math.max(0, round.clue.number + 1 - round.guessesUsed)
        : round.cards.filter((card) => !card.revealed).length
      : 0,
    remaining: remaining(round),
    nextCovers: {
      red:
        round.cards.find((card) => card.identity === "red" && !card.revealed)?.coverVariant ?? null,
      blue:
        round.cards.find((card) => card.identity === "blue" && !card.revealed)?.coverVariant ??
        null,
      neutral:
        round.cards.find((card) => card.identity === "neutral" && !card.revealed)?.coverVariant ??
        null,
      assassin:
        round.cards.find((card) => card.identity === "assassin" && !card.revealed)?.coverVariant ??
        null,
    },
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
