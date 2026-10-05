import { PROTOCOL_VERSION } from "../src/shared/protocol";
import type { RoomCommand, RoomView, Role, Team, ErrorCode } from "../src/shared/protocol";

export interface Seat {
  id: string;
  name: string;
  tokenHash: string;
  team: Team | null;
  role: Role;
  connectionId: string | null;
}
export interface RoomState {
  schema: 1;
  code: string;
  phase: "lobby";
  revision: number;
  roundId: null;
  hostId: string;
  seats: Seat[];
  updatedAt: number;
}
export class RoomError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function parseCommand(value: unknown): RoomCommand {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new RoomError("invalid", "Send a valid room command.");
  const cmd = value as Record<string, unknown>;
  const keys = ["version", "type", "requestId", "revision", "roundId", "seatId", "team", "role"];
  if (
    Object.keys(cmd).length !== keys.length ||
    Object.keys(cmd).some((key) => !keys.includes(key)) ||
    cmd.version !== PROTOCOL_VERSION ||
    cmd.type !== "assign" ||
    typeof cmd.requestId !== "string" ||
    !/^[\w-]{1,64}$/.test(cmd.requestId) ||
    !Number.isSafeInteger(cmd.revision) ||
    (cmd.revision as number) < 0 ||
    cmd.roundId !== null ||
    typeof cmd.seatId !== "string" ||
    !/^[\w-]{1,64}$/.test(cmd.seatId) ||
    ![null, "red", "blue"].includes(cmd.team as Team | null) ||
    !["operative", "spymaster"].includes(cmd.role as Role)
  ) {
    throw new RoomError("invalid", "This command is invalid. Refresh the room and try again.");
  }
  return cmd as unknown as RoomCommand;
}
export function assign(state: RoomState, actorId: string, command: RoomCommand): RoomState {
  const actor = state.seats.find((seat) => seat.id === actorId);
  if (!actor) throw new RoomError("unauthorized", "Join this room to continue.", 401);
  if (command.seatId !== actorId && state.hostId !== actorId)
    throw new RoomError("forbidden", "Only the host can arrange other players.", 403);
  if (state.phase !== "lobby")
    throw new RoomError("forbidden", "Team and role changes are available in the lobby.", 403);
  if (command.revision !== state.revision || command.roundId !== state.roundId)
    throw new RoomError("stale", "The room changed. Check the updated roster and try again.", 409);
  if (!state.seats.some((seat) => seat.id === command.seatId))
    throw new RoomError("invalid", "That player is no longer in the room.");
  return {
    ...state,
    revision: state.revision + 1,
    updatedAt: Date.now(),
    seats: state.seats.map((seat) =>
      seat.id === command.seatId ? { ...seat, team: command.team, role: command.role } : seat,
    ),
  };
}
export function project(state: RoomState, selfId: string, connected: Set<string>): RoomView {
  const reasons: string[] = [];
  for (const team of ["red", "blue"] as const) {
    const members = state.seats.filter((seat) => seat.team === team);
    const spymasters = members.filter((seat) => seat.role === "spymaster").length;
    const label = team === "red" ? "Red" : "Blue";
    if (spymasters !== 1)
      reasons.push(`${label} needs exactly one spymaster (${spymasters} selected).`);
    if (!members.some((seat) => seat.role === "operative"))
      reasons.push(`${label} needs at least one operative.`);
  }
  return {
    code: state.code,
    phase: state.phase,
    revision: state.revision,
    roundId: state.roundId,
    selfId,
    players: state.seats.map((seat) => ({
      id: seat.id,
      name: seat.name,
      team: seat.team,
      role: seat.role,
      isHost: seat.id === state.hostId,
      connected: connected.has(seat.id),
    })),
    readiness: { ready: reasons.length === 0, reasons },
    controls: {
      assignSelf: state.phase === "lobby",
      assignOthers: state.phase === "lobby" && state.hostId === selfId,
      startRound: false,
    },
  };
}
export function uniqueName(name: string, seats: Seat[]): string {
  let candidate = name;
  let suffix = 2;
  const used = new Set(seats.map((seat) => seat.name.toLocaleLowerCase("en-US")));
  while (used.has(candidate.toLocaleLowerCase("en-US"))) candidate = `${name} (${suffix++})`;
  return candidate;
}

// Read/validate/transition/persist within the transaction; project/broadcast
// only after the transaction commits. A failed write or commit publishes nothing.
export async function commitTransition(
  storage: DurableObjectStorage,
  transition: (current: RoomState) => RoomState,
  publish: (next: RoomState) => void,
): Promise<RoomState> {
  const next = await storage.transaction(async (txn) => {
    const current = await txn.get<RoomState>("room");
    if (!current) throw new RoomError("not_found", "This room has expired.", 404);
    const updated = transition(current);
    await txn.put("room", updated);
    return updated;
  });
  publish(next);
  return next;
}
