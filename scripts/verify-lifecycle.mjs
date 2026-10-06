import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

// Isolated workerd/SQLite verification, using Wrangler's locked Miniflare.
// Test-only RPC methods and failure injection never enter the app bundle.
const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare } = require("miniflare");
const bundle = await readFile("dist/codememes/index.js", "utf8");
const harness = `
import { Room } from "./room.js";
export class NativeRoom extends Room {
  constructor(ctx, env) {
    const failure = { remaining: 0 };
    super(ctx, { ...env, COMMAND_RATE: { limit: async () => ({ success: true }) } });
    const deleteAll = ctx.storage.deleteAll.bind(ctx.storage);
    Object.defineProperty(ctx.storage, "deleteAll", { value: async () => {
      if (failure.remaining-- > 0) throw new Error("Injected one-shot deleteAll failure");
      return deleteAll();
    } });
    this.failure = failure;
  }
  async seed(mode) {
    await this.ctx.storage.put("room", { schema:1,code:"ABCDEFGHJKLM",phase:"lobby",revision:1,roundId:null,hostId:null,seats:[],updatedAt:0,emptySince:null });
    await this.ctx.storage.put("allocation-marker", true);
    await this.ctx.storage.setAlarm(Date.now() + (mode === "alarm" ? 50 : 10000));
    this.failure.remaining = 1;
  }
  async summary() { return { keys: (await this.ctx.storage.list()).size, alarm: await this.ctx.storage.getAlarm() }; }
  async expireByRequest() { try { await super.join("Late join", null); return "unexpected success"; } catch (error) { return error.message; } }
  async repeatAlarm() { await super.alarm(); }
}
export default { async fetch(request, env) {
  const [mode, action] = new URL(request.url).pathname.slice(1).split("/");
  const room = env.ROOMS.getByName(mode);
  if (mode === "wake") {
    if (action === "create") return await room.create("ABCDEFGHJKLM", (await request.json()).name);
    if (action === "join") return await room.join((await request.json()).name, null);
    return await room.fetch(request);
  }
  if (action === "seed") { await room.seed(mode); return Response.json({ seeded: true }); }
  if (action === "expire") return Response.json({ result: await room.expireByRequest() });
  if (action === "alarm") { await room.repeatAlarm(); return Response.json({ retried: true }); }
  return Response.json(await room.summary());
} };
`;
const runtime = new Miniflare({
  workers: [
    {
      config: {
        name: "lifecycle-check",
        compatibilityDate: "2026-10-04",
        manifest: {
          mainModule: "native-lifecycle.js",
          modulesRoot: process.cwd(),
          modules: {
            "native-lifecycle.js": { type: "esm", contents: harness },
            "room.js": { type: "esm", contents: bundle },
          },
        },
        exports: { NativeRoom: { type: "durable-object", storage: "sqlite" } },
        env: {
          ROOMS: { type: "durable-object", worker: "lifecycle-check", exportName: "NativeRoom" },
        },
      },
    },
  ],
});
try {
  const call = async (mode, action) => {
    const response = await runtime.dispatchFetch(`http://lifecycle.local/${mode}/${action}`);
    if (response.status !== 200) throw new Error((await response.text()).slice(0, 4000));
    assert.equal(response.status, 200);
    return response.json();
  };
  for (const mode of ["request", "alarm"]) {
    await call(mode, "seed");
    if (mode === "request") {
      const failure = await runtime.dispatchFetch("http://lifecycle.local/request/expire");
      assert.equal(failure.status, 500); // blockConcurrencyWhile aborts the failed instance.
      assert.match(await failure.text(), /deleteAll failure/);
    }
    // No polling, client traffic, or manual alarm invocation during recovery.
    await new Promise((resolve) => setTimeout(resolve, 3100));
    assert.deepEqual(await call(mode, "summary"), { keys: 0, alarm: null });
    console.log(
      `PASS native SQLite ${mode}-triggered expiry: one-shot deleteAll failure recovered through automatic alarm delivery; all keys/alarm removed`,
    );
    await call(mode, "alarm");
    assert.deepEqual(await call(mode, "summary"), { keys: 0, alarm: null });
  }
  const sockets = [];
  const until = async (predicate) => {
    const started = Date.now();
    while (!predicate()) {
      if (Date.now() - started > 5000) throw new Error("Native socket update timed out");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const seat = async (action, name) => {
    const response = await runtime.dispatchFetch(`http://lifecycle.local/wake/${action}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    const upgrade = await runtime.dispatchFetch("http://lifecycle.local/wake/socket", {
      headers: { Origin: "http://lifecycle.local", Cookie: cookie, Upgrade: "websocket" },
    });
    assert.equal(upgrade.status, 101);
    const socket = upgrade.webSocket;
    const inbox = [];
    socket.addEventListener("message", ({ data }) => inbox.push(JSON.parse(data)));
    socket.accept();
    sockets.push(socket);
    await until(() => inbox.some((message) => message.type === "snapshot"));
    return { socket, inbox, view: () => inbox.filter((message) => message.view).at(-1).view };
  };
  const command = async (client, action) => {
    const requestId = crypto.randomUUID();
    client.socket.send(
      JSON.stringify({
        version: 1,
        requestId,
        revision: client.view().revision,
        roundId: client.view().roundId,
        ...action,
      }),
    );
    await until(() => client.inbox.some((message) => message.requestId === requestId));
    const result = client.inbox.find((message) => message.requestId === requestId);
    assert.equal(result.type, "snapshot", result.code);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return result.view;
  };
  try {
    const host = await seat("create", "Wake operative");
    const redSpy = await seat("join", "Wake Red spy");
    const blueOp = await seat("join", "Wake Blue operative");
    const blueSpy = await seat("join", "Wake Blue spy");
    for (const [client, team, role] of [
      [host, "red", "operative"],
      [redSpy, "red", "spymaster"],
      [blueOp, "blue", "operative"],
      [blueSpy, "blue", "spymaster"],
    ])
      await command(host, { type: "assign", seatId: client.view().selfId, team, role });
    await command(host, { type: "start" });
    const team = host.view().round.activeTeam;
    const spy = team === "red" ? redSpy : blueSpy;
    const operative = team === "red" ? host : blueOp;
    await command(spy, { type: "clue", word: "signal", number: 1 });
    const index = spy.view().round.cards.findIndex((card) => card.identity === team);
    await command(operative, { type: "reveal", index });
    const before = structuredClone(host.view());
    await runtime.unsafeEvictDurableObject("lifecycle-check", "NativeRoom", {
      name: "wake",
      webSockets: "hibernate",
    });
    await command(operative, { type: "end_turn" });
    assert.deepEqual(host.view().round.cards, before.round.cards);
    assert.deepEqual(host.view().round.remaining, before.round.remaining);
    assert.equal(host.view().selfId, before.selfId);
    assert.deepEqual(host.view().players, before.players);
    assert.equal(host.view().round.activeTeam, team === "red" ? "blue" : "red");
    assert.equal(host.view().round.stage, "clue");
    assert.equal(host.view().round.privateKey, false);
    assert(
      host
        .view()
        .round.cards.filter((card) => !card.revealed)
        .every((card) => !("identity" in card)),
    );
    for (const client of [redSpy, blueSpy]) {
      assert.equal(client.view().round.privateKey, true);
      assert(client.view().round.cards.every((card) => "identity" in card));
    }
    console.log(
      "PASS native workerd eviction/hibernating-socket wake: accepted live round, attachments, roles, host, revealed board/counts and personalized keys reconstructed before End turn",
    );
  } finally {
    for (const socket of sockets) socket.close();
  }
} finally {
  await runtime.dispose();
}
