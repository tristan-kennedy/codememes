import assert from "node:assert/strict";
import WebSocket from "ws";

const origin = "http://127.0.0.1:5173";
const actorKey = `game-check-${crypto.randomUUID()}`;
const headers = {
  Origin: origin,
  "Content-Type": "application/json",
  "CF-Connecting-IP": actorKey,
};
const sockets = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(predicate) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 5000) throw new Error("Timed out waiting for game update");
    await delay(10);
  }
}
async function join(code, name) {
  const response = await fetch(`${origin}/api/rooms/${code}/join`, {
    method: "POST",
    headers: { ...headers, "CF-Connecting-IP": `${actorKey}-${crypto.randomUUID()}` },
    body: JSON.stringify({ name }),
  });
  const message = await response.json();
  assert.equal(response.status, 200);
  assert.equal(message.type, "snapshot");
  const cookie = response.headers.get("set-cookie").split(";")[0];
  return open(code, cookie);
}
async function open(code, cookie) {
  const ws = new WebSocket(`${origin.replace("http", "ws")}/api/rooms/${code}/socket`, {
    headers: {
      Origin: origin,
      Cookie: cookie,
      "CF-Connecting-IP": `${actorKey}-${crypto.randomUUID()}`,
    },
  });
  sockets.push(ws);
  const inbox = [];
  ws.on("message", (data) => {
    assert(Buffer.isBuffer(data));
    inbox.push(JSON.parse(data.toString("utf8")));
  });
  ws.on("error", () => {});
  await wait(() => inbox.some((message) => message.type === "snapshot"));
  return {
    ws,
    cookie,
    code,
    inbox,
    view: () => inbox.filter((message) => message.view).at(-1)?.view,
  };
}
async function command(client, action) {
  const requestId = crypto.randomUUID();
  client.ws.send(
    JSON.stringify({
      version: 1,
      requestId,
      revision: client.view().revision,
      roundId: client.view().roundId,
      ...action,
    }),
  );
  await wait(() => client.inbox.some((message) => message.requestId === requestId));
  await delay(20);
  return client.inbox.find((message) => message.requestId === requestId);
}

async function accepted(client, action) {
  const result = await command(client, action);
  assert.equal(result.type, "snapshot", JSON.stringify(result));
  return result.view;
}
async function rejected(client, action, code) {
  const previous = client.view().revision;
  const result = await command(client, action);
  assert.equal(result.type, "error");
  assert.equal(result.code, code);
  assert.equal(result.view.revision, previous);
  return result;
}
function privateCards(client) {
  return client.view().round.cards;
}
function indexOf(client, identity) {
  return privateCards(client).findIndex((card) => !card.revealed && card.identity === identity);
}
async function prepare() {
  const response = await fetch(`${origin}/api/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Host operative" }),
  });
  assert.equal(response.status, 200);
  const { view } = await response.json();
  const host = await open(view.code, response.headers.get("set-cookie").split(";")[0]);
  const redSpy = await join(view.code, "Red spymaster");
  const blueOp = await join(view.code, "Blue operative");
  const blueSpy = await join(view.code, "Blue spymaster");
  const redOp2 = await join(view.code, "Second Red operative");
  for (const [client, team, role] of [
    [host, "red", "operative"],
    [redSpy, "red", "spymaster"],
    [blueOp, "blue", "operative"],
    [blueSpy, "blue", "spymaster"],
    [redOp2, "red", "operative"],
  ])
    await accepted(host, { type: "assign", seatId: client.view().selfId, team, role });
  await rejected(redSpy, { type: "start" }, "forbidden");
  await accepted(host, { type: "start" });
  const watcher = await join(view.code, "Late watcher");
  assert.equal(
    watcher.view().players.find((seat) => seat.id === watcher.view().selfId).role,
    "watcher",
  );
  const members = [host, redSpy, blueOp, blueSpy, redOp2, watcher];
  const spies = { red: redSpy, blue: blueSpy },
    ops = { red: host, blue: blueOp };
  const current = () => host.view();
  const activeSpy = () => spies[current().round.activeTeam];
  const activeOp = () => ops[current().round.activeTeam];
  const privacy = () => {
    for (const client of members) {
      const snapshot = client.view(),
        round = snapshot.round;
      assert.equal(round.cards.length, 25);
      assert.equal(new Set(round.cards.map((card) => card.word)).size, 25);
      const isSpy = client === redSpy || client === blueSpy;
      for (const card of round.cards)
        assert.equal("identity" in card, snapshot.phase === "ended" || isSpy || card.revealed);
      assert.equal(round.privateKey, snapshot.phase === "playing" && isSpy);
      assert(!JSON.stringify(snapshot).match(/tokenHash|connectionId|updatedAt|schema/));
    }
  };
  await delay(30);
  privacy();
  assert.equal(current().round.remaining[current().round.startingTeam], 9);
  assert.equal(
    current().round.remaining[current().round.startingTeam === "red" ? "blue" : "red"],
    8,
  );
  await rejected(
    host,
    { type: "assign", seatId: host.view().selfId, team: "blue", role: "spymaster" },
    "forbidden",
  );
  await rejected(watcher, { type: "reveal", index: 0 }, "forbidden");
  await rejected(activeSpy(), { type: "clue", word: "two words", number: 1 }, "invalid");
  await rejected(
    activeSpy(),
    { type: "clue", word: privateCards(activeSpy())[0].word.toLowerCase(), number: 1 },
    "invalid",
  );
  await rejected(activeSpy(), { type: "clue", word: "signal", number: 0 }, "invalid");
  await rejected(
    activeSpy(),
    { type: "clue", word: "signal", number: 1, roundId: "prior-round" },
    "stale",
  );
  return {
    host,
    redSpy,
    blueOp,
    blueSpy,
    redOp2,
    watcher,
    members,
    spies,
    ops,
    current,
    activeSpy,
    activeOp,
    privacy,
  };
}

if (process.argv[2] === "--fixture") {
  const code = process.argv[3];
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
  let spy = await join(code, "Blue spymaster");
  let operative = await join(code, "Blue operative");
  let watcher;
  console.log(
    "Fixture seats joined and connected. Tokens remain only in memory; no game actions sent.",
  );
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (input) => {
    try {
      const action = JSON.parse(input.trim());
      let result;
      if (action.type === "status") result = { type: "snapshot", view: (watcher ?? spy).view() };
      else if (action.type === "watcher") {
        watcher = await join(code, "Recovery watcher");
        result = { type: "snapshot", view: watcher.view() };
      } else if (action.type === "disconnect") {
        for (const client of action.seat === "both"
          ? [spy, operative]
          : [action.seat === "spy" ? spy : operative])
          client.ws.close();
        console.log("Requested fixture seat disconnect; tokens retained only in memory.");
        return;
      } else if (action.type === "reconnect") {
        if (action.seat === "spy") spy = await open(code, spy.cookie);
        else operative = await open(code, operative.cookie);
        result = { type: "snapshot", view: (action.seat === "spy" ? spy : operative).view() };
      } else if (action.type === "clue") result = await command(spy, action);
      else if (action.type === "reveal-category") {
        const index = spy
          .view()
          .round.cards.findIndex((card) => card.identity === action.category && !card.revealed);
        result = await command(operative, { type: "reveal", index });
      } else if (action.type === "end_turn") result = await command(operative, action);
      else throw new Error("Unknown fixture action");
      console.log(
        JSON.stringify({
          type: result.type,
          code: result.code,
          message: result.message,
          phase: result.view?.phase,
          activeTeam: result.view?.round?.activeTeam,
          stage: result.view?.round?.stage,
          guessesRemaining: result.view?.round?.guessesRemaining,
          outcome: result.view?.round?.outcome,
          host: result.view?.players.find((player) => player.isHost)?.name ?? null,
          controls: result.view?.controls,
        }),
      );
    } catch (error) {
      console.log(error.message);
    }
  });
} else {
  try {
    const round = await prepare();
    await accepted(round.activeSpy(), { type: "clue", word: "signal", number: 1 });
    await rejected(round.activeOp(), { type: "end_turn" }, "invalid");
    await rejected(round.activeSpy(), { type: "reveal", index: 0 }, "forbidden");
    const firstTeam = round.current().round.activeTeam;
    const firstIndex = indexOf(round.activeSpy(), firstTeam);
    const before = round.current().revision;
    await accepted(round.activeOp(), { type: "reveal", index: firstIndex });
    assert.equal(round.current().round.guessesRemaining, 1);
    assert.equal(round.current().round.activeTeam, firstTeam);
    await rejected(round.activeOp(), { type: "reveal", index: firstIndex }, "invalid");
    await rejected(round.activeOp(), { type: "reveal", index: 0, revision: before }, "stale");
    await accepted(round.activeOp(), { type: "end_turn" });
    await accepted(round.activeSpy(), { type: "clue", word: "signal", number: 1 });
    const team = round.current().round.activeTeam;
    await accepted(round.activeOp(), { type: "reveal", index: indexOf(round.activeSpy(), team) });
    await accepted(round.activeOp(), { type: "reveal", index: indexOf(round.activeSpy(), team) });
    assert.equal(round.current().round.stage, "clue");
    assert.notEqual(round.current().round.activeTeam, team);
    // Arrange the turn through ordinary legal play, then submit two operative
    // reveals against one durable revision. Exactly one can commit.
    if (round.current().round.activeTeam !== "red") {
      await accepted(round.activeSpy(), { type: "clue", word: "signal", number: 1 });
      await accepted(round.activeOp(), {
        type: "reveal",
        index: indexOf(round.activeSpy(), "neutral"),
      });
    }
    await accepted(round.redSpy, { type: "clue", word: "signal", number: 9 });
    const indexes = privateCards(round.redSpy)
      .flatMap((card, index) => (card.identity === "red" && !card.revealed ? [index] : []))
      .slice(0, 2);
    const revision = round.current().revision;
    const outcomes = await Promise.all([
      command(round.host, { type: "reveal", index: indexes[0], revision }),
      command(round.redOp2, { type: "reveal", index: indexes[1], revision }),
    ]);
    assert.equal(outcomes.filter((message) => message.type === "snapshot").length, 1);
    assert.equal(outcomes.filter((message) => message.code === "stale").length, 1);
    while (round.current().phase === "playing")
      await accepted(round.host, { type: "reveal", index: indexOf(round.redSpy, "red") });
    assert.deepEqual(round.current().round.outcome, { winner: "red", reason: "agents" });
    round.privacy();
    await rejected(round.host, { type: "reveal", index: 0 }, "forbidden");
    await rejected(round.host, { type: "start" }, "forbidden");
    const persisted = await fetch(`${origin}/api/rooms/${round.host.code}/view`, {
      headers: { Origin: origin, Cookie: round.host.cookie },
    });
    assert.deepEqual((await persisted.json()).view.round, round.current().round);
    console.log(
      "PASS public/private/late-watcher projections, clues, budget, explicit End turn, stale/competing reveals, complete agent victory and persisted final key",
    );

    const opposing = await prepare();
    const starting = opposing.current().round.activeTeam;
    const target = starting === "red" ? "blue" : "red";
    for (let count = 0; count < 8; count++) {
      assert.equal(opposing.current().round.activeTeam, starting);
      await accepted(opposing.activeSpy(), { type: "clue", word: "signal", number: 1 });
      await accepted(opposing.activeOp(), {
        type: "reveal",
        index: indexOf(opposing.activeSpy(), target),
      });
      if (opposing.current().phase === "ended") break;
      assert.equal(opposing.current().round.activeTeam, target);
      await accepted(opposing.activeSpy(), { type: "clue", word: "signal", number: 1 });
      // A neutral reveal immediately passes a turn; one own agent plus End
      // turn covers the final iteration when seven neutral cards are used.
      const neutral = indexOf(opposing.activeSpy(), "neutral");
      await accepted(opposing.activeOp(), {
        type: "reveal",
        index: neutral >= 0 ? neutral : indexOf(opposing.activeSpy(), target),
      });
      if (neutral < 0 && opposing.current().phase === "playing")
        await accepted(opposing.activeOp(), { type: "end_turn" });
    }
    assert.deepEqual(opposing.current().round.outcome, { winner: target, reason: "agents" });
    opposing.privacy();
    console.log(
      "PASS neutral/opposing turn endings and revealing the opponent's last agent wins for that opponent",
    );

    const assassin = await prepare();
    const revealingTeam = assassin.current().round.activeTeam;
    await accepted(assassin.activeSpy(), { type: "clue", word: "signal", number: 1 });
    await accepted(assassin.activeOp(), {
      type: "reveal",
      index: indexOf(assassin.activeSpy(), "assassin"),
    });
    assert.deepEqual(assassin.current().round.outcome, {
      winner: revealingTeam === "red" ? "blue" : "red",
      reason: "assassin",
    });
    assassin.privacy();
    await rejected(assassin.ops[revealingTeam], { type: "end_turn" }, "forbidden");
    console.log(
      "PASS immediate assassin loss, final key for every seat, and terminal action rejection",
    );
  } finally {
    for (const socket of sockets) socket.close();
  }
}
