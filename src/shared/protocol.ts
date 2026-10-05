// Browser-safe types only. Internal room records belong in worker/.
export const PROTOCOL_VERSION = 1 as const;
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const NAME_LIMIT = 40;
export type Team = "red" | "blue";
export type Role = "operative" | "spymaster";
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
  controls: { assignSelf: boolean; assignOthers: boolean; startRound: boolean };
}
export interface AssignCommand {
  version: typeof PROTOCOL_VERSION;
  type: "assign";
  requestId: string;
  revision: number;
  roundId: string | null;
  seatId: SeatId;
  team: Team | null;
  role: Role;
}
export type RoomCommand = AssignCommand;
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
