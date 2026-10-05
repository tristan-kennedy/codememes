import { PROTOCOL_VERSION } from "../shared/protocol";
import type { RoomCommand, RoomView, ServerMessage } from "../shared/protocol";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "replaced";
export class RoomConnection {
  private socket: WebSocket | null = null;
  private stopped = false;
  constructor(
    private code: string,
    private onView: (view: RoomView) => void,
    private onStatus: (status: ConnectionStatus) => void,
    private onError: (message: string) => void,
    private onSettled: () => void,
  ) {}
  connect(): void {
    this.stopped = false;
    this.onStatus("connecting");
    const url = new URL(`/api/rooms/${this.code}/socket`, location.origin);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onmessage = (event) => {
      if (this.stopped || this.socket !== socket) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        this.onError("The room sent an unreadable update. Refresh to continue.");
        return;
      }
      if (message.version !== PROTOCOL_VERSION) {
        this.onError("This page needs an update. Refresh to continue.");
        this.close();
        return;
      }
      if (message.type === "snapshot") {
        this.onView(message.view);
        this.onStatus("connected");
        if (message.requestId) this.onSettled();
      } else if (message.type === "error") {
        if (message.view) this.onView(message.view);
        this.onError(message.message);
        this.onSettled();
        if (message.code === "replaced") this.onStatus("replaced");
      }
    };
    socket.onclose = (event) => {
      if (this.stopped || this.socket !== socket) return;
      this.onStatus(event.code === 4001 ? "replaced" : "disconnected");
      this.onSettled();
    };
    socket.onerror = () => {
      if (!this.stopped) this.onError("Connection lost. Reconnect to see the current roster.");
    };
  }
  send(command: RoomCommand): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(command));
    return true;
  }
  close(): void {
    this.stopped = true;
    this.socket?.close();
    this.socket = null;
  }
}
