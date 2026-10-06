import assert from "node:assert/strict";
import WebSocket from "ws";

// Explicit, bounded smoke check: one disposable room and five seats.
// Authentication cookies and private keys stay in memory and are never printed.
const origin = process.argv[2];
assert(
  origin === "https://codememes.tristan-kennedy.workers.dev" ||
    /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin ?? ""),
  "Supply the approved Codememes HTTPS origin or a local emulation origin",
);
const headers = { Origin: origin, "Content-Type": "application/json" };
const clients = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(predicate) {
  const start = Date.now();
  while (!predicate()) {
    assert(Date.now() - start < 15000, "Timed out waiting for a permitted snapshot");
    await delay(25);
  }
}
async function open(code, cookie) {
  const ws = new WebSocket(`${origin.replace(/^http/, "ws")}/api/rooms/${code}/socket`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  const client = { ws, code, cookie, inbox: [], view: null, closeCode: null };
  clients.push(client);
  ws.on("error", () => {});
  ws.on("close", (closeCode) => {
    client.closeCode = closeCode;
  });
  ws.on("message", (data) => {
    assert(Buffer.isBuffer(data));
    const message = JSON.parse(data.toString("utf8"));
    client.inbox.push(message);
    if (message.view) client.view = message.view;
  });
  await wait(() => client.view !== null);
  return client;
}
async function post(path, name) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
  assert.equal(response.status, 200, "Room entry must succeed");
  const cookie = response.headers.get("set-cookie");
  assert(cookie?.includes("Secure") && cookie.includes("HttpOnly"));
  assert(cookie.includes("SameSite=Strict"));
  const message = await response.json();
  return open(message.view.code, cookie.split(";")[0]);
}
async function command(client, action, revision = client.view.revision) {
  const requestId = crypto.randomUUID();
  client.ws.send(
    JSON.stringify({
      version: 1,
      requestId,
      revision,
      roundId: client.view.roundId,
      ...action,
    }),
  );
  await wait(() => client.inbox.some((message) => message.requestId === requestId));
  await delay(100);
  return client.inbox.find((message) => message.requestId === requestId);
}
async function accept(client, action) {
  const result = await command(client, action);
  assert.equal(result.type, "snapshot", `Expected accepted ${action.type}`);
  return result.view;
}
function publicBoard(client) {
  assert(
    client.view.round.cards.every((card) => card.revealed || !Object.hasOwn(card, "identity")),
  );
  const encoded = JSON.stringify(client.view);
  for (const field of ["tokenHash", "clueExclusions", "sourceUrl", "coverVariant", "aliases"])
    assert(!encoded.includes(`"${field}"`), `Private field ${field} must be absent`);
}
try {
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert(html.includes("<title>Codememes</title>"));
  if (origin.startsWith("https:")) {
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.equal(home.headers.get("referrer-policy"), "same-origin");
  }
  const unknown = await fetch(`${origin}/api/not-a-route`);
  assert.equal(unknown.status, 404);
  assert(unknown.headers.get("content-type").includes("application/json"));
  assert.equal(unknown.headers.get("cache-control"), "no-store");

  const host = await post("/api/rooms", "Release operative");
  const code = host.code;
  const redSpy = await post(`/api/rooms/${code}/join`, "Red release spymaster");
  const blueOp = await post(`/api/rooms/${code}/join`, "Blue release operative");
  const blueSpy = await post(`/api/rooms/${code}/join`, "Blue release spymaster");
  for (const [client, team, role] of [
    [host, "red", "operative"],
    [redSpy, "red", "spymaster"],
    [blueOp, "blue", "operative"],
    [blueSpy, "blue", "spymaster"],
  ])
    await accept(host, { type: "assign", seatId: client.view.selfId, team, role });
  await accept(host, { type: "start" });
  const watcher = await post(`/api/rooms/${code}/join`, "Release watcher");
  assert.equal(watcher.view.players.find((p) => p.id === watcher.view.selfId).role, "watcher");
  for (const client of [host, blueOp, watcher]) publicBoard(client);
  for (const spy of [redSpy, blueSpy])
    assert(spy.view.round.cards.every((card) => Object.hasOwn(card, "identity")));

  const deepLink = await fetch(`${origin}/room/${code}`);
  assert.equal(deepLink.status, 200);
  assert((await deepLink.text()).includes("<title>Codememes</title>"));
  const unauth = await fetch(`${origin}/api/rooms/${code}/view`);
  assert.equal(unauth.status, 401);
  const hostile = await fetch(`${origin}/api/rooms/${code}/join`, {
    method: "POST",
    headers: { ...headers, Origin: "https://example.com" },
    body: JSON.stringify({ name: "Denied" }),
  });
  assert.equal(hostile.status, 403);

  const team = host.view.round.activeTeam;
  const spy = team === "red" ? redSpy : blueSpy;
  const operative = team === "red" ? host : blueOp;
  const roundId = host.view.roundId;
  const names = host.view.round.cards.map((card) => card.content.name).join("|");
  await accept(spy, { type: "clue", word: "quartz", number: 9 });
  const own = spy.view.round.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.identity === team)
    .map(({ index }) => index);
  const staleRevision = operative.view.revision;
  const results = await Promise.all([
    command(operative, { type: "reveal", index: own[0] }, staleRevision),
    command(operative, { type: "reveal", index: own[1] }, staleRevision),
  ]);
  assert.equal(results.filter((result) => result.type === "snapshot").length, 1);
  assert.equal(
    results.filter((result) => result.type === "error" && result.code === "stale").length,
    1,
  );
  for (const index of own) {
    if (!operative.view.round.cards[index].revealed)
      await accept(operative, { type: "reveal", index });
  }
  assert.equal(host.view.phase, "ended");
  assert.equal(host.view.round.outcome.winner, team);
  assert(watcher.view.round.cards.every((card) => Object.hasOwn(card, "identity")));
  await accept(host, { type: "play_again" });
  await accept(host, {
    type: "assign",
    seatId: watcher.view.selfId,
    team: "red",
    role: "operative",
  });
  await accept(host, { type: "start" });
  assert.notEqual(host.view.roundId, roundId);
  assert.notEqual(host.view.round.cards.map((card) => card.content.name).join("|"), names);
  publicBoard(watcher);

  const activeSpy = host.view.round.activeTeam === "red" ? redSpy : blueSpy;
  const spyId = activeSpy.view.selfId;
  activeSpy.ws.close();
  await wait(() => host.view.waitingFor?.seatId === spyId);
  assert.equal(host.view.controls.reveal, false);
  const returnedSpy = await open(code, activeSpy.cookie);
  assert.equal(returnedSpy.view.selfId, spyId);
  await wait(() => host.view.waitingFor === null);
  const hostId = host.view.selfId;
  host.ws.close();
  await wait(() => blueOp.view.players.some((p) => p.isHost && p.id !== hostId));
  const returnedHost = await open(code, host.cookie);
  assert.equal(returnedHost.view.selfId, hostId);
  assert(!returnedHost.view.players.find((p) => p.id === hostId).isHost);
  publicBoard(returnedHost);
  const replacement = await open(code, host.cookie);
  assert.equal(replacement.view.selfId, hostId);
  assert.equal(replacement.view.players.length, 5);
  await wait(() => returnedHost.closeCode !== null);
  assert.equal(returnedHost.closeCode, 4001);
  assert(
    returnedHost.inbox.some((message) => message.type === "error" && message.code === "replaced"),
  );
  const stored = await fetch(`${origin}/api/rooms/${code}/view`, {
    headers: { Cookie: host.cookie },
  });
  assert.equal(stored.status, 200);
  const snapshot = await stored.json();
  assert.equal(snapshot.view.roundId, replacement.view.roundId);
  assert.equal(snapshot.view.selfId, hostId);
  console.log(
    `PASS release smoke (${origin.startsWith("https:") ? "HTTPS/static headers verified" : "local emulation; HTTPS/static headers skipped"}): SPA/API routing, secure cookie attributes, authenticated WebSockets, private/public/watcher views, competing reveals, full round/rematch, watcher admission, absent-spy recovery, host transfer, duplicate-tab takeover and stored snapshots. One disposable room; tokens/keys kept in memory.`,
  );
} finally {
  for (const client of clients) client.ws.close();
  await delay(300);
  for (const client of clients)
    if (client.ws.readyState !== WebSocket.CLOSED) client.ws.terminate();
}
