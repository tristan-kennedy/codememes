import type { RoomState } from "./state";

export const EMPTY_TTL = 60 * 60 * 1000;
export const IDLE_TTL = 24 * 60 * 60 * 1000;
export const CLEANUP_RETRY = 2000;
export function deadline(state: RoomState): number {
  return Math.min(
    state.updatedAt + IDLE_TTL,
    state.emptySince == null ? Infinity : state.emptySince + EMPTY_TTL,
  );
}
export function reconcile(state: RoomState, connected: Set<string>, now = Date.now()): RoomState {
  const eligible = state.seats.filter((seat) => seat.role !== "watcher" && connected.has(seat.id));
  const hostId = eligible.some((seat) => seat.id === state.hostId)
    ? state.hostId
    : (eligible[0]?.id ?? null);
  const emptySince = connected.size > 0 ? null : (state.emptySince ?? now);
  if (hostId === state.hostId && emptySince === state.emptySince) return state;
  return {
    ...state,
    hostId,
    emptySince,
    revision: state.revision + (hostId === state.hostId ? 0 : 1),
  };
}
export function missingSpymaster(state: RoomState, connected: Set<string>) {
  if (state.phase !== "playing" || !state.round) return null;
  const spy = state.seats.find(
    (seat) => seat.team === state.round!.activeTeam && seat.role === "spymaster",
  );
  return spy && !connected.has(spy.id) ? { seatId: spy.id, name: spy.name, team: spy.team! } : null;
}
