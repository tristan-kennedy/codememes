import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { RoomConnection } from "./room-connection";
import type { RoomView } from "../shared/protocol";

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  constructor() {
    Socket.instances.push(this);
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  receive(message: unknown) {
    this.readyState = 1;
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}
const view = {
  code: "ABCDEFGHJKLM",
  revision: 5,
  roundId: "round-1",
  selfId: "self",
  phase: "playing",
} as RoomView;
const snapshot = (revision = 5) => ({ version: 1, type: "snapshot", view: { ...view, revision } });
function fixture() {
  const onView = vi.fn(),
    onStatus = vi.fn(),
    onError = vi.fn(),
    onSettled = vi.fn();
  return {
    connection: new RoomConnection(view.code, onView, onStatus, onError, onSettled),
    onView,
    onStatus,
    onError,
    onSettled,
  };
}
beforeEach(() => {
  Socket.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("location", { origin: "http://localhost:5173" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => snapshot() })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Bounded client recovery", () => {
  it("ignores an old reconnect fetch after a newer connection restores the next round", async () => {
    let resolveOld!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const check = fixture();
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    const current = { ...snapshot(12), view: { ...view, revision: 12, roundId: "next-round" } };
    Socket.instances[0].receive(current);
    resolveOld({ ok: true, json: async () => snapshot(5) } as Response);
    await vi.advanceTimersByTimeAsync(0);
    expect(check.onView).toHaveBeenLastCalledWith(current.view);
    expect(Socket.instances).toHaveLength(1);
    check.connection.close();
  });
  it("ignores discarded socket callbacks after a new lobby/round snapshot", async () => {
    const check = fixture();
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    const old = Socket.instances[0];
    old.receive(snapshot());
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    const current = { ...snapshot(13), view: { ...view, revision: 13, roundId: "next-round" } };
    Socket.instances[1].receive(current);
    old.receive(snapshot(5));
    old.onclose?.({ code: 4004 });
    expect(check.onView).toHaveBeenLastCalledWith(current.view);
    expect(check.onStatus).toHaveBeenLastCalledWith("connected");
    check.connection.close();
  });
  it("fetches fresh permitted state, settles losses, and never replays a sent command", async () => {
    const check = fixture();
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    const first = Socket.instances[0];
    first.receive(snapshot(6));
    expect(check.onStatus).toHaveBeenLastCalledWith("connected");
    check.connection.send({
      version: 1,
      type: "reveal",
      requestId: "pending",
      revision: 6,
      roundId: "round-1",
      index: 0,
    });
    first.close();
    expect(check.onStatus).toHaveBeenLastCalledWith("reconnecting");
    expect(check.onSettled).toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => snapshot(9) } as Response);
    await vi.advanceTimersByTimeAsync(1000);
    const second = Socket.instances[1];
    expect(check.onView).toHaveBeenLastCalledWith(snapshot(9).view);
    second.receive(snapshot(10));
    expect(first.send).toHaveBeenCalledTimes(1);
    expect(second.send).not.toHaveBeenCalled();
    expect(check.onView).toHaveBeenLastCalledWith(snapshot(10).view);
    check.connection.close();
  });
  it("limits repeated failures to six increasing retry delays and permits explicit retry", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Offline"));
    const check = fixture();
    check.connection.connect();
    await vi.runAllTimersAsync();
    expect(fetch).toHaveBeenCalledTimes(7);
    expect(check.onStatus).toHaveBeenLastCalledWith("disconnected");
    expect(check.onError).toHaveBeenLastCalledWith(expect.stringContaining("several attempts"));
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(8);
    check.connection.close();
    await vi.runAllTimersAsync();
    expect(fetch).toHaveBeenCalledTimes(8);
  });
  for (const code of ["not_found", "unauthorized"])
    it(`stops retrying terminal ${code} recovery responses`, async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ version: 1, type: "error", code, message: "Recovery unavailable" }),
      } as Response);
      const check = fixture();
      check.connection.connect();
      await vi.runAllTimersAsync();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(check.onStatus).toHaveBeenLastCalledWith(
        code === "not_found" ? "expired" : "unauthorized",
      );
      expect(Socket.instances).toHaveLength(0);
    });
  it("does not automatically fight an authoritative replacement connection", async () => {
    const check = fixture();
    check.connection.connect();
    await vi.advanceTimersByTimeAsync(0);
    Socket.instances[0].receive(snapshot());
    Socket.instances[0].receive({
      version: 1,
      type: "error",
      code: "replaced",
      message: "Seat taken over",
    });
    await vi.runAllTimersAsync();
    expect(check.onStatus).toHaveBeenLastCalledWith("replaced");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      check.connection.send({
        version: 1,
        type: "end_turn",
        requestId: "old",
        revision: 5,
        roundId: "round-1",
      }),
    ).toBe(false);
  });
});
