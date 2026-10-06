import { play } from "../../worker/game";
import { RoomError } from "../../worker/errors";
import { assign, parseCommand, project, randomize, uniqueName } from "../../worker/state";
import type { RoomState, Seat } from "../../worker/state";
import { PROTOCOL_VERSION } from "../shared/protocol";
import type { ErrorCode, RoomCommand, RoomView } from "../shared/protocol";
import type { ConnectionStatus } from "./room-connection";

// Development-only, in-memory room using the same transitions and projections as the server.
export class SoloRoom {
  followTurn = true;
  private state: RoomState;
  private selfId: string;
  private stopped = true;

  constructor(
    name: string,
    private onView: (view: RoomView) => void,
    private onStatus: (status: ConnectionStatus) => void,
    private onError: (message: string, code?: ErrorCode, requestId?: string) => void,
    private onSettled: () => void,
  ) {
    if (!import.meta.env.DEV) throw new Error("Solo test is available only in development.");
    const seats: Seat[] = [];
    for (const [index, player] of [
      { name: name || "You", team: "red", role: "operative" },
      { name: "Alex", team: "red", role: "spymaster" },
      { name: "Blair", team: "blue", role: "spymaster" },
      { name: "Casey", team: "blue", role: "operative" },
    ].entries()) {
      seats.push({
        id: `solo-${index}`,
        name: uniqueName(player.name, seats),
        team: player.team as Seat["team"],
        role: player.role as Seat["role"],
        tokenHash: "",
        connectionId: `solo-${index}`,
      });
    }
    this.selfId = seats[0].id;
    this.state = {
      schema: 1,
      code: "23456789ABCD",
      phase: "lobby",
      revision: 0,
      roundId: null,
      round: null,
      hostId: this.selfId,
      emptySince: null,
      seats,
      updatedAt: Date.now(),
    };
  }

  private connected(): Set<string> {
    return new Set(this.state.seats.map((seat) => seat.id));
  }

  snapshot(): RoomView {
    return project(this.state, this.selfId, this.connected());
  }

  connect(): void {
    this.stopped = false;
    this.onStatus("connected");
    this.onView(this.snapshot());
    this.onSettled();
  }

  close(): void {
    this.stopped = true;
  }

  playAs(seatId: string): void {
    if (this.stopped || !this.state.seats.some((seat) => seat.id === seatId)) return;
    this.selfId = seatId;
    this.onView(this.snapshot());
  }

  setFollowTurn(value: boolean): void {
    if (this.stopped) return;
    this.followTurn = value;
    if (value) this.followActiveSeat();
    this.onView(this.snapshot());
  }

  send(command: RoomCommand): boolean {
    const actorId = this.selfId;
    return this.run(() => {
      const parsed = parseCommand(command);
      this.state =
        parsed.type === "assign"
          ? assign(this.state, actorId, parsed)
          : parsed.type === "randomize"
            ? randomize(this.state, actorId, parsed, this.connected())
            : play(this.state, actorId, parsed);
    }, command.requestId);
  }

  resetRound(): boolean {
    return this.run(() => {
      const lobby: RoomState = { ...this.state, phase: "lobby", roundId: null, round: null };
      this.state = play(lobby, lobby.hostId!, {
        version: PROTOCOL_VERSION,
        type: "start",
        requestId: crypto.randomUUID(),
        revision: lobby.revision,
        roundId: null,
      });
    });
  }

  private followActiveSeat(): void {
    if (this.state.phase === "ended") {
      this.selfId = this.state.hostId!;
    } else if (this.state.phase === "playing" && this.state.round) {
      const { activeTeam, stage } = this.state.round;
      const role = stage === "clue" ? "spymaster" : "operative";
      const next = this.state.seats.find((seat) => seat.team === activeTeam && seat.role === role);
      if (next) this.selfId = next.id;
    }
  }

  private run(transition: () => void, requestId?: string): boolean {
    if (this.stopped) return false;
    // Settle after the caller marks its action pending, like a room acknowledgement.
    queueMicrotask(() => {
      if (this.stopped) return;
      try {
        this.onError("");
        transition();
        if (this.followTurn) this.followActiveSeat();
        this.onView(this.snapshot());
      } catch (failure) {
        this.onError(
          failure instanceof Error ? failure.message : "That action could not be saved.",
          failure instanceof RoomError ? failure.code : undefined,
          requestId,
        );
      } finally {
        this.onSettled();
      }
    });
    return true;
  }
}
