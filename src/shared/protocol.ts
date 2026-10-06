// Browser-safe types only. Internal room records belong in worker/.
export const PROTOCOL_VERSION = 1 as const;
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const NAME_LIMIT = 40;
export type Team = "red" | "blue";
export type PlayingRole = "operative" | "spymaster";
export type Role = PlayingRole | "watcher";
export type CardIdentity = Team | "neutral" | "assassin";
export type Phase = "lobby" | "playing" | "ended";
export type SeatId = string;

export function normalizeCode(value: string): string | null {
  if (value.length > 32) return null;
  const code = value.toUpperCase().replace(/[\s-]/g, "");
  return code.length === 12 && code.split("").every((letter) => CODE_ALPHABET.includes(letter))
    ? code
    : null;
}
export function displayCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}
export function normalizeName(value: string): string | null {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= NAME_LIMIT && !/[\p{Cc}\p{Cf}]/u.test(name)
    ? name
    : null;
}

export interface PlayerView {
  id: SeatId;
  name: string;
  team: Team | null;
  role: Role;
  isHost: boolean;
  connected: boolean;
}
export interface RoomView {
  code: string;
  phase: Phase;
  revision: number;
  roundId: string | null;
  selfId: SeatId;
  players: PlayerView[];
  readiness: { ready: boolean; reasons: string[] };
  waitingFor: { seatId: SeatId; name: string; team: Team } | null;
  controls: {
    assignSelf: boolean;
    assignOthers: boolean;
    startRound: boolean;
    giveClue: boolean;
    reveal: boolean;
    endTurn: boolean;
    playAgain: boolean;
    abandon: boolean;
  };
  round: RoundView | null;
}
// Recognition only. Curator metadata and hidden assignments never cross this boundary.
export interface Recognition {
  id: string;
  family: string;
  name: string;
  description: string;
  kind: "phrase" | "image" | "gif";
  phrase: string;
  asset?: string;
  poster?: string;
  width: number;
  height: number;
  attribution?: string;
}
export interface RoundView {
  cards: {
    word: string;
    content: Recognition;
    revealed: boolean;
    identity?: CardIdentity;
    coverVariant?: number;
  }[];
  startingTeam: Team;
  activeTeam: Team;
  stage: "clue" | "guessing";
  clue: { word: string; number: number } | null;
  guessesUsed: number;
  guessesRemaining: number;
  remaining: Record<Team, number>;
  privateKey: boolean;
  outcome: { winner: Team; reason: "agents" | "assassin" } | null;
  lastReveal: { word: string; identity: CardIdentity; byTeam: Team } | null;
}
export interface CommandBase {
  version: typeof PROTOCOL_VERSION;
  requestId: string;
  revision: number;
  roundId: string | null;
}
export interface AssignCommand extends CommandBase {
  type: "assign";
  seatId: SeatId;
  team: Team | null;
  role: PlayingRole;
}
export interface RandomizeCommand extends CommandBase {
  type: "randomize";
}
export type RoomCommand =
  | AssignCommand
  | RandomizeCommand
  | (CommandBase & { type: "start" | "end_turn" | "play_again" | "abandon" })
  | (CommandBase & { type: "clue"; word: string; number: number })
  | (CommandBase & { type: "reveal"; index: number });
export type GameAction =
  | { type: "randomize" | "start" | "end_turn" | "play_again" | "abandon" }
  | { type: "clue"; word: string; number: number }
  | { type: "reveal"; index: number };

export function normalizeClue(word: string): string | null {
  const normalized = word.normalize("NFKC").trim();
  return normalized.length > 0 &&
    normalized.length <= 40 &&
    /^[^\s\p{Cc}\p{Cf}]+$/u.test(normalized) &&
    /\p{L}/u.test(normalized)
    ? normalized
    : null;
}
export type ErrorCode =
  | "invalid"
  | "forbidden"
  | "stale"
  | "not_found"
  | "unauthorized"
  | "replaced"
  | "rate_limited"
  | "unavailable";
export type ServerMessage =
  | { version: typeof PROTOCOL_VERSION; type: "snapshot"; view: RoomView; requestId?: string }
  | {
      version: typeof PROTOCOL_VERSION;
      type: "error";
      code: ErrorCode;
      message: string;
      requestId?: string;
      view?: RoomView;
    };
