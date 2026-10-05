import assert from "node:assert/strict";
import WebSocket from "ws";

// Only local emulation. Tokens are kept in memory and never logged or saved.
const origin = process.argv[2] ?? "http://127.0.0.1:5173";
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const actor = `verify-${crypto.randomUUID()}`;
const headers = { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": actor };
const sockets = [];
async function post(path, body, extraHeaders = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { ...headers, ...extraHeaders },
    body: JSON.stringify(body),
  });
  return { response, message: await response.json() };
}
function safe(view) {
  const encoded = JSON.stringify(view);
  for (const forbidden of ["token", "Hash", "connectionId", "updatedAt", "schema", "key"])
    assert(!encoded.includes(forbidden), `public view leaked ${forbidden}`);
}
async function open(code, cookie) {
  const ws = new WebSocket(`${origin.replace("http", "ws")}/api/rooms/${code}/socket`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  sockets.push(ws);
  const inbox = [];
  ws.on("message", (data) => {
    assert(Buffer.isBuffer(data));
    inbox.push(JSON.parse(data.toString("utf8")));
  });
  ws.on("error", () => {});
  await wait(() => inbox.length > 0);
  return { ws, inbox, latest: () => inbox.filter((message) => message.view).at(-1)?.view };
}
async function rejectedUpgrade(code, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${origin.replace("http", "ws")}/api/rooms/${code}/socket`, {
      headers: { Origin: origin, ...extraHeaders },
    });
    ws.on("open", () => {
      ws.close();
      reject(new Error("Unauthorized upgrade succeeded"));
    });
    ws.on("unexpected-response", (_request, response) => {
      response.resume();
      resolve(response.statusCode !== 101);
    });
    // Vite's local upgrade proxy closes denied upgrades without forwarding
    // the HTTP status. The test separately verifies HTTP origin/auth errors.
    ws.on("error", () => resolve(true));
  });
}
async function wait(predicate) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 5000) throw new Error("Timed out waiting for a socket update");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
function send(client, overrides = {}) {
  const view = client.latest();
  const requestId = crypto.randomUUID();
  client.ws.send(
    JSON.stringify({
      version: 1,
      type: "assign",
      requestId,
      revision: view.revision,
      roundId: null,
      seatId: view.selfId,
      team: "red",
      role: "operative",
      ...overrides,
    }),
  );
  return requestId;
}
async function result(client, id) {
  await wait(() => client.inbox.some((message) => message.requestId === id));
  return client.inbox.find((message) => message.requestId === id);
}
try {
  assert.equal(
    (await post("/api/rooms", { name: "Alex" }, { Origin: "https://elsewhere.invalid" })).response
      .status,
    403,
  );
  assert.equal((await post("/api/rooms", { name: "Alex", isHost: true })).response.status, 400);
  const created = await post("/api/rooms", { name: "Alex" });
  assert.equal(created.response.status, 200);
  const code = created.message.view.code;
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
  const rawCookie = created.response.headers.get("set-cookie");
  assert.match(
    rawCookie,
    new RegExp(`Path=/api/rooms/${code};.*Secure; HttpOnly; SameSite=Strict`),
  );
  const hostCookie = rawCookie.split(";")[0];
  safe(created.message.view);
  const formatted = code
    .toLowerCase()
    .match(/.{1,4}/g)
    .join("-");
  const joined = await post(`/api/rooms/${formatted}/join`, { name: "Alex" });
  assert.equal(joined.response.status, 200);
  assert.equal(joined.message.view.code, code);
  assert.equal(joined.message.view.players[1].name, "Alex (2)");
  const guestCookie = joined.response.headers.get("set-cookie").split(";")[0];
  assert.equal(await rejectedUpgrade(code), true);
  assert.equal(
    await rejectedUpgrade(code, { Origin: "https://elsewhere.invalid", Cookie: hostCookie }),
    true,
  );
  const missing = await post("/api/rooms/222222222222/join", { name: "Alex" });
  assert.equal(missing.response.status, 404);
  assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
  assert((await (await fetch(`${origin}/room/${code}`)).text()).includes('<div id="root">'));
  assert.equal(
    (await fetch(`${origin}/api/rooms/${code}/view`, { headers: { Origin: origin } })).status,
    401,
  );
  const host = await open(code, hostCookie);
  const guest = await open(code, guestCookie);
  await wait(() => host.latest().revision === guest.latest().revision);
  assert.equal(host.latest().controls.assignOthers, true);
  assert.equal(guest.latest().controls.assignOthers, false);
  let action = send(guest, { seatId: host.latest().selfId, team: "blue" });
  assert.equal((await result(guest, action)).code, "forbidden");
  const before = guest.latest().revision;
  action = send(guest, { revision: before - 1 });
  assert.equal((await result(guest, action)).code, "stale");
  assert.equal(guest.latest().revision, before);
  guest.ws.send('{"isHost":true}');
  await wait(() => guest.inbox.some((message) => message.code === "invalid"));
  action = send(guest, { team: "blue", role: "spymaster" });
  assert.equal((await result(guest, action)).type, "snapshot");
  await wait(() =>
    host
      .latest()
      .players.some((player) => player.id === guest.latest().selfId && player.role === "spymaster"),
  );
  action = send(host, { seatId: guest.latest().selfId, team: "red", role: "operative" });
  assert.equal((await result(host, action)).type, "snapshot");
  await wait(() => guest.latest().revision === host.latest().revision);
  for (const [name, team, role] of [
    ["Robin", "red", "spymaster"],
    ["Sam", "blue", "operative"],
  ]) {
    const added = await post(`/api/rooms/${code}/join`, { name });
    assert.equal(added.response.status, 200);
    await wait(() => host.latest().revision === added.message.view.revision);
    action = send(host, { seatId: added.message.view.selfId, team, role });
    assert.equal((await result(host, action)).type, "snapshot");
  }
  action = send(host, { team: "blue", role: "spymaster" });
  assert.equal((await result(host, action)).type, "snapshot");
  assert.equal(host.latest().readiness.ready, true);
  assert.equal(host.latest().controls.startRound, false);
  const replacement = await open(code, hostCookie);
  await wait(() => host.ws.readyState === WebSocket.CLOSED);
  assert(host.inbox.some((message) => message.code === "replaced"));
  assert.equal(replacement.latest().selfId, host.latest().selfId);
  const restored = await (
    await fetch(`${origin}/api/rooms/${code}/view`, {
      headers: { Origin: origin, Cookie: guestCookie },
    })
  ).json();
  assert.equal(
    restored.view.players.find((player) => player.id === guest.latest().selfId).team,
    "red",
  );
  safe(restored.view);
  for (const client of [host, guest, replacement])
    for (const message of client.inbox) if (message.view) safe(message.view);
  const priorOversized = guest.inbox.length;
  guest.ws.send("x".repeat(2049));
  await wait(() => guest.inbox.slice(priorOversized).some((message) => message.code === "invalid"));
  const revisionBeforeRate = guest.latest().revision;
  for (let index = 0; index < 61; index++) guest.ws.send("invalid-json");
  await wait(() => guest.inbox.some((message) => message.code === "rate_limited"));
  assert.equal(guest.latest().revision, revisionBeforeRate);
  let rateLimited = false;
  for (let index = 0; index < 31; index++) {
    const attempt = await post("/api/rooms/222222222222/join", { name: "Alex" });
    if (attempt.response.status === 429) {
      rateLimited = true;
      break;
    }
    assert.equal(attempt.response.status, 404);
  }
  assert(rateLimited, "local JOIN_RATE did not reject bounded requests");
  rateLimited = false;
  for (let index = 0; index < 11; index++) {
    const attempt = await post("/api/rooms", { name: "Rate check" });
    if (attempt.response.status === 429) {
      rateLimited = true;
      break;
    }
    assert.equal(attempt.response.status, 200);
  }
  assert(rateLimited, "local CREATE_RATE did not reject bounded requests");
  console.log(
    "PASS local Workers: origin/shape/upgrade checks, create/join normalization, missing rooms, secure cookie flags, deep links, API errors, allowlisted views, authority, stale/oversized commands, synchronized roster, valid readiness, takeover, durable fetch, create/join/command rates.",
  );
} finally {
  for (const socket of sockets) socket.close();
}
