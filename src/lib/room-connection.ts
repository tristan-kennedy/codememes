import { PROTOCOL_VERSION } from "../shared/protocol";
import type { ErrorCode, RoomCommand, RoomView, ServerMessage } from "../shared/protocol";

export type ConnectionStatus =
  | "connecting"
  | "reconnecting"
  | "connected"
  | "disconnected"
  | "replaced"
  | "expired"
  | "unauthorized";
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
export class RoomConnection {
  private socket: WebSocket | null = null;
  private stopped = false;
  private generation = 0;
  private retries = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private handshake: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private code: string,
    private onView: (view: RoomView) => void,
    private onStatus: (status: ConnectionStatus) => void,
    private onError: (message: string, code?: ErrorCode, requestId?: string) => void,
    private onSettled: () => void,
  ) {}
  connect(): void {
    this.close();
    this.stopped = false;
    this.retries = 0;
    this.onStatus("connecting");
    this.onSettled();
    void this.attempt(this.generation);
  }
  private async attempt(generation: number): Promise<void> {
    try {
      const response = await fetch(`/api/rooms/${this.code}/view`, {
        signal: AbortSignal.timeout(10000),
      });
      const message = (await response.json()) as ServerMessage;
      if (this.stopped || generation !== this.generation) return;
      if (message.version !== PROTOCOL_VERSION) {
        this.stop("disconnected", "This page needs an update. Refresh to continue.");
        return;
      }
      if (message.type === "error") {
        if (message.code === "not_found" || message.code === "unauthorized") {
          this.stop(message.code === "not_found" ? "expired" : "unauthorized", message.message);
          return;
        }
        this.onError(message.message);
        this.retry(generation);
        return;
      }
      if (!response.ok) throw new Error("Room snapshot unavailable");
      this.onView(message.view);
      const url = new URL(`/api/rooms/${this.code}/socket`, location.origin);
      url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url);
      this.socket = socket;
      const current = () =>
        !this.stopped && generation === this.generation && this.socket === socket;
      this.handshake = setTimeout(() => {
        if (current()) socket.close();
      }, 10000);
      socket.onmessage = (event) => {
        if (!current()) return;
        let update: ServerMessage;
        try {
          update = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          this.stop("disconnected", "The room sent an unreadable update. Refresh to continue.");
          return;
        }
        if (update.version !== PROTOCOL_VERSION) {
          this.stop("disconnected", "This page needs an update. Refresh to continue.");
          return;
        }
        if (update.type === "snapshot") {
          this.clearHandshake();
          this.onView(update.view);
          this.onStatus("connected");
          this.retries = 0;
          this.onError("");
          if (update.requestId) this.onSettled();
        } else {
          if (update.view) this.onView(update.view);
          this.onError(update.message, update.code, update.requestId);
          this.onSettled();
          if (update.code === "replaced") this.stop("replaced", update.message);
          else if (update.code === "not_found" || update.code === "unauthorized")
            this.stop(update.code === "not_found" ? "expired" : "unauthorized", update.message);
        }
      };
      socket.onclose = (event) => {
        if (!current()) return;
        this.clearHandshake();
        this.socket = null;
        this.onSettled();
        if (event.code === 4001 || event.code === 4004)
          this.stop(
            event.code === 4001 ? "replaced" : "expired",
            event.code === 4001
              ? "Another tab took over your seat. Reconnect to take it back."
              : "This room has expired. Create a room to play again.",
          );
        else this.retry(generation);
      };
      socket.onerror = () => {
        if (current())
          this.onError(
            "Connection interrupted. Accepted progress is saved; checking the room again.",
          );
      };
    } catch {
      if (!this.stopped && generation === this.generation) this.retry(generation);
    }
  }
  private retry(generation: number): void {
    this.onSettled();
    const delay = RETRY_DELAYS[this.retries++];
    if (delay === undefined) {
      this.onStatus("disconnected");
      this.onError("The room could not be reached after several attempts. Reconnect to try again.");
      return;
    }
    this.onStatus("reconnecting");
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.attempt(generation);
    }, delay);
  }
  private clearHandshake(): void {
    if (this.handshake !== null) clearTimeout(this.handshake);
    this.handshake = null;
  }
  private stop(status: ConnectionStatus, message: string): void {
    this.close();
    this.onStatus(status);
    this.onError(message);
    this.onSettled();
  }
  send(command: RoomCommand): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN || this.stopped) return false;
    this.socket.send(JSON.stringify(command));
    return true;
  }
  close(): void {
    this.stopped = true;
    this.generation++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.clearHandshake();
    this.socket?.close();
    this.socket = null;
  }
}
