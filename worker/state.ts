import { PROTOCOL_VERSION, normalizeClue } from "../src/shared/protocol";
import type {
  AssignCommand,
  RandomizeCommand,
  RoomCommand,
  RoomView,
  Role,
  Team,
  Phase,
} from "../src/shared/protocol";
import { RoomError } from "./errors";
import { projectRound, shuffle } from "./game";
import type { RoundState } from "./game";
import { CLEANUP_RETRY, deadline, missingSpymaster } from "./lifecycle";
export { RoomError } from "./errors";

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
  phase: Phase;
  revision: number;
  roundId: string | null;
  round?: RoundState | null;
  hostId: string | null;
  emptySince?: number | null;
  seats: Seat[];
  updatedAt: number;
}
export function parseCommand(value: unknown): RoomCommand {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new RoomError("invalid", "Send a valid room command.");
  const cmd = value as Record<string, unknown>;
  const fields: Record<string, string[]> = {
    assign: ["seatId", "team", "role"],
    randomize: [],
    start: [],
    clue: ["word", "number"],
    reveal: ["index"],
    end_turn: [],
    play_again: [],
    abandon: [],
  };
  const kind = typeof cmd.type === "string" ? cmd.type : "";
  if (!Object.hasOwn(fields, kind))
    throw new RoomError("invalid", "This room command is not supported.");
  const keys = ["version", "type", "requestId", "revision", "roundId", ...fields[kind]];
  if (
    Object.keys(cmd).length !== keys.length ||
    Object.keys(cmd).some((key) => !keys.includes(key)) ||
    cmd.version !== PROTOCOL_VERSION ||
    typeof cmd.requestId !== "string" ||
    !/^[\w-]{1,64}$/.test(cmd.requestId) ||
    !Number.isSafeInteger(cmd.revision) ||
    (cmd.revision as number) < 0 ||
    (cmd.roundId !== null &&
      (typeof cmd.roundId !== "string" || !/^[\w-]{1,64}$/.test(cmd.roundId)))
  ) {
    throw new RoomError("invalid", "This command is invalid. Refresh the room and try again.");
  }
  if (
    kind === "assign" &&
    (typeof cmd.seatId !== "string" ||
      !/^[\w-]{1,64}$/.test(cmd.seatId) ||
      ![null, "red", "blue"].includes(cmd.team as Team | null) ||
      !["operative", "spymaster"].includes(cmd.role as Role))
  )
    throw new RoomError("invalid", "Choose a valid player, team, and role.");
  if (
    kind === "clue" &&
    (typeof cmd.word !== "string" ||
      cmd.word.length > 40 ||
      !normalizeClue(cmd.word) ||
      !Number.isInteger(cmd.number) ||
      (cmd.number as number) < 1 ||
      (cmd.number as number) > 9)
  )
    throw new RoomError("invalid", "Give one word and a whole number from 1 to 9.");
  if (
    kind === "reveal" &&
    (!Number.isInteger(cmd.index) || (cmd.index as number) < 0 || (cmd.index as number) >= 25)
  )
    throw new RoomError("invalid", "Choose an unrevealed word on this board.");
  return cmd as unknown as RoomCommand;
}
export function assign(state: RoomState, actorId: string, command: AssignCommand): RoomState {
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
  if (
    command.team !== null &&
    command.role === "spymaster" &&
    state.seats.some(
      (seat) =>
        seat.id !== command.seatId && seat.team === command.team && seat.role === "spymaster",
    )
  )
    throw new RoomError(
      "invalid",
      `${command.team === "red" ? "Red" : "Blue"}’s spymaster slot is occupied. Move its spymaster first.`,
    );
  return {
    ...state,
    revision: state.revision + 1,
    updatedAt: Date.now(),
    seats: state.seats.map((seat) =>
      seat.id === command.seatId ? { ...seat, team: command.team, role: command.role } : seat,
    ),
  };
}
export function randomize(
  state: RoomState,
  actorId: string,
  command: RandomizeCommand,
  connected: Set<string>,
): RoomState {
  if (!state.seats.some((seat) => seat.id === actorId))
    throw new RoomError("unauthorized", "Join this room to continue.", 401);
  if (state.hostId !== actorId || state.phase !== "lobby")
    throw new RoomError("forbidden", "Only the host can randomize teams in the lobby.", 403);
  if (command.revision !== state.revision || command.roundId !== state.roundId)
    throw new RoomError("stale", "The room changed. Check the updated roster and try again.", 409);
  const players = shuffle(state.seats.filter((seat) => connected.has(seat.id)));
  if (players.length < 2)
    throw new RoomError("invalid", "At least two connected players are needed to randomize teams.");
  const teams = shuffle<Team>(["red", "blue"]);
  const assignments = new Map<string, { team: Team; role: Role }>(
    players.map((seat, index) => [
      seat.id,
      { team: teams[index % 2], role: index < 2 ? "spymaster" : "operative" },
    ]),
  );
  return {
    ...state,
    revision: state.revision + 1,
    updatedAt: Date.now(),
    seats: state.seats.map((seat) => ({
      ...seat,
      ...(assignments.get(seat.id) ?? { team: null, role: "operative" as const }),
    })),
  };
}
export function project(state: RoomState, selfId: string, connected: Set<string>): RoomView {
  const self = state.seats.find((seat) => seat.id === selfId);
  const waitingFor = missingSpymaster(state, connected);
  const active = state.phase === "playing" && !waitingFor && self?.team === state.round?.activeTeam;
  const guessing = active && self?.role === "operative" && state.round?.stage === "guessing";
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
    waitingFor,
    controls: {
      assignSelf: state.phase === "lobby",
      assignOthers: state.phase === "lobby" && state.hostId === selfId,
      startRound: state.phase === "lobby" && state.hostId === selfId && reasons.length === 0,
      giveClue: !!active && self?.role === "spymaster" && state.round?.stage === "clue",
      reveal: !!guessing,
      endTurn: !!guessing && (state.round?.guessesUsed ?? 0) > 0,
      playAgain: state.phase === "ended" && state.hostId === selfId && self?.role !== "watcher",
      abandon:
        state.phase === "playing" &&
        !!waitingFor &&
        state.hostId === selfId &&
        self?.role !== "watcher",
    },
    round: state.round ? projectRound(state.round, self, state.phase === "ended") : null,
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
    if (!current || Date.now() >= deadline(current)) {
      if (current) await txn.delete("room");
      // Keep a durable retry until deleteAll actually deallocates storage and
      // atomically removes the alarm. A failed cleanup needs no new traffic.
      await txn.setAlarm(Date.now() + CLEANUP_RETRY);
      return null;
    }
    const updated = transition(current);
    if (updated !== current) await txn.put("room", updated);
    if ((await txn.getAlarm()) !== deadline(updated)) await txn.setAlarm(deadline(updated));
    return updated;
  });
  if (!next)
    throw new RoomError(
      "not_found",
      "This room does not exist or has expired. Create a room to play again.",
      404,
    );
  publish(next);
  return next;
}
