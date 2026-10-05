import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { RoomConnection } from "./lib/room-connection";
import type { ConnectionStatus } from "./lib/room-connection";
import {
  displayCode,
  NAME_LIMIT,
  normalizeCode,
  normalizeName,
  PROTOCOL_VERSION,
} from "./shared/protocol";
import type { PlayerView, Role, RoomView, ServerMessage, Team } from "./shared/protocol";

function inviteCode(): string | null {
  const match = /^\/room\/([^/]+)\/?$/.exec(location.pathname);
  try {
    return match ? normalizeCode(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}
async function requestRoom(path: string, name: string): Promise<RoomView> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const message = (await response.json()) as ServerMessage;
  if (!response.ok || message.type !== "snapshot")
    throw new Error(
      message.type === "error" ? message.message : "The room could not be opened. Try again.",
    );
  return message.view;
}

export function App() {
  const [code, setCode] = useState(inviteCode);
  const [view, setView] = useState<RoomView | null>(null);
  const [mode, setMode] = useState<"create" | "join">(code ? "join" : "create");
  const [name, setName] = useState("");
  const [enteredCode, setEnteredCode] = useState(code ? displayCode(code) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(code));
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState("");
  const connection = useRef<RoomConnection | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetch(`/api/rooms/${code}/view`)
      .then(async (response) => {
        const message = (await response.json()) as ServerMessage;
        if (cancelled) return;
        if (message.type === "snapshot") setView(message.view);
        else if (message.code !== "unauthorized") setError(message.message);
      })
      .catch(() => {
        if (!cancelled) setError("The room could not be reached. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const roomCode = view?.code;
  useEffect(() => {
    if (!roomCode) return;
    const next = new RoomConnection(roomCode, setView, setStatus, setError, () =>
      setPending(false),
    );
    connection.current = next;
    next.connect();
    return () => {
      next.close();
      connection.current = null;
    };
  }, [roomCode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const displayName = normalizeName(name);
    if (!displayName) {
      setError("Enter a name between 1 and 40 characters.");
      return;
    }
    const normalized = normalizeCode(enteredCode);
    if (mode === "join" && !normalized) {
      setError("Enter the 12-character code from your invite. Spaces and hyphens are welcome.");
      return;
    }
    setLoading(true);
    try {
      const next = await requestRoom(
        mode === "create" ? "/api/rooms" : `/api/rooms/${normalized}/join`,
        displayName,
      );
      history.replaceState(null, "", `/room/${next.code}`);
      setView(next);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The room could not be opened. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function update(player: PlayerView, team: Team | null, role: Role) {
    if (!view || status !== "connected" || pending) return;
    setError("");
    const sent = connection.current?.send({
      version: PROTOCOL_VERSION,
      type: "assign",
      requestId: crypto.randomUUID(),
      revision: view.revision,
      roundId: view.roundId,
      seatId: player.id,
      team,
      role,
    });
    if (sent) setPending(true);
    else {
      setStatus("disconnected");
      setError("Connection lost. Reconnect before changing the roster.");
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied.`);
    } catch {
      setCopied("Copy is unavailable here. Select the invite link or code below.");
    }
  }

  function backToEntry() {
    connection.current?.close();
    setCode(null);
    setView(null);
    setEnteredCode("");
    setMode("create");
    setError("");
    setLoading(false);
    history.replaceState(null, "", "/");
  }

  const self = view?.players.find((player) => player.id === view.selfId);
  const usable = status === "connected" && !pending;
  const invite = view ? `${location.origin}/room/${view.code}` : "";

  function playerRow(player: PlayerView) {
    if (!view) return null;
    const allowed =
      player.id === view.selfId ? view.controls.assignSelf : view.controls.assignOthers;
    return (
      <li key={player.id} className="player-row">
        <div className="player-name">
          <span>{player.name}</span>
          <span className="player-meta">
            {player.id === view.selfId ? "You · " : ""}
            {player.isHost ? "Host · " : ""}
            {player.connected ? "Connected" : "Offline"}
          </span>
        </div>
        {allowed ? (
          <div className="player-controls">
            <label>
              <span className="visually-hidden">Team for {player.name}</span>
              <select
                value={player.team ?? ""}
                disabled={!usable}
                onChange={(event) =>
                  update(
                    player,
                    event.target.value === "" ? null : (event.target.value as Team),
                    player.role,
                  )
                }
              >
                <option value="">Unassigned</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </select>
            </label>
            <label>
              <span className="visually-hidden">Role for {player.name}</span>
              <select
                value={player.role}
                disabled={!usable}
                onChange={(event) => update(player, player.team, event.target.value as Role)}
              >
                <option value="operative">Operative</option>
                <option value="spymaster">Spymaster</option>
              </select>
            </label>
          </div>
        ) : (
          <span className="role-label">
            {player.role === "spymaster" ? "Spymaster" : "Operative"}
          </span>
        )}
      </li>
    );
  }

  return (
    <main className={view ? "table" : "entry"}>
      <header className="page-header">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            backToEntry();
          }}
        >
          Codenames
          <span className="brand-mark" aria-hidden="true">
            <i></i>
            <i></i>
          </span>
        </a>
        {view && (
          <span className="connection" role="status">
            {status === "connected"
              ? "Connected"
              : status === "connecting"
                ? "Connecting…"
                : status === "replaced"
                  ? "Seat open in another tab"
                  : "Disconnected"}
          </span>
        )}
      </header>
      {!view ? (
        <section className="entry-body" aria-labelledby="entry-heading">
          <h1 id="entry-heading">A table for your friends.</h1>
          <p className="intro">Create a private room, share the invite, and choose your teams.</p>
          <div className="entry-tabs" role="group" aria-label="Room action">
            <button
              type="button"
              aria-pressed={mode === "create"}
              className={mode === "create" ? "selected" : ""}
              onClick={() => {
                setMode("create");
                setError("");
              }}
            >
              Create a room
            </button>
            <button
              type="button"
              aria-pressed={mode === "join"}
              className={mode === "join" ? "selected" : ""}
              onClick={() => {
                setMode("join");
                setError("");
              }}
            >
              Join a room
            </button>
          </div>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            {mode === "join" && (
              <label>
                Room code
                <input
                  name="room-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="ABCD-EFGH-JKLM"
                  value={enteredCode}
                  onChange={(event) => setEnteredCode(event.target.value)}
                  disabled={loading}
                  aria-describedby="code-help"
                />
                <span id="code-help" className="field-help">
                  12 characters. Spaces and hyphens are optional.
                </span>
              </label>
            )}
            <label>
              Your name
              <input
                name="display-name"
                autoComplete="nickname"
                maxLength={NAME_LIMIT}
                placeholder="The name your friends know"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={loading} type="submit">
              {loading ? "Opening room…" : mode === "create" ? "Create room" : "Join room"}
            </button>
          </form>
          <p className="entry-note">No accounts. Just an invite and your name.</p>
          <p className="foundation-note">Lobby preview · playing rounds is coming next.</p>
        </section>
      ) : (
        <>
          <section className="lobby-heading">
            <div>
              <h1>Your room</h1>
              <p>Choose a team and a role. The host can arrange everyone.</p>
            </div>
            <div className="room-code">
              <span>Room code</span>
              <button
                aria-label={`Copy room code ${displayCode(view.code)}`}
                onClick={() => {
                  void copy(displayCode(view.code), "Room code");
                }}
              >
                {displayCode(view.code)}
              </button>
            </div>
          </section>
          <section className="invite-row" aria-label="Invite friends">
            <label>
              Invite link
              <input readOnly value={invite} onFocus={(event) => event.target.select()} />
            </label>
            <button
              className="secondary"
              onClick={() => {
                void copy(invite, "Invite link");
              }}
            >
              Copy invite
            </button>
          </section>
          <p className="copy-feedback" role="status">
            {copied}
          </p>
          {(status === "disconnected" || status === "replaced") && (
            <div className="connection-recovery">
              <p>
                {status === "replaced"
                  ? "Another tab took over your seat. Reconnect to take it back."
                  : "You’re disconnected. Your team and role are saved."}
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  connection.current?.connect();
                }}
              >
                Reconnect
              </button>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="teams">
            {(["red", "blue"] as const).map((team) => (
              <section key={team} className={`team ${team}`} aria-labelledby={`${team}-heading`}>
                <h2 id={`${team}-heading`}>
                  {team === "red" ? "Red team" : "Blue team"}
                  <span>
                    {view.players.filter((player) => player.team === team).length} players
                  </span>
                </h2>
                {(["spymaster", "operative"] as const).map((role) => (
                  <div className="role-group" key={role}>
                    <h3>{role === "spymaster" ? "Spymaster" : "Operatives"}</h3>
                    <ul>
                      {view.players
                        .filter((player) => player.team === team && player.role === role)
                        .map(playerRow)}
                    </ul>
                    {!view.players.some(
                      (player) => player.team === team && player.role === role,
                    ) && (
                      <p className="empty-slot">
                        {role === "spymaster"
                          ? "One spymaster needed"
                          : "At least one operative needed"}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
          {view.players.some((player) => player.team === null) && (
            <section className="unassigned">
              <h2>Choose a team</h2>
              <ul>{view.players.filter((player) => player.team === null).map(playerRow)}</ul>
            </section>
          )}
          <section className="readiness" aria-labelledby="readiness-heading">
            <div>
              <h2 id="readiness-heading">
                {view.readiness.ready ? "Teams are ready" : "Getting the teams ready"}
              </h2>
              {view.readiness.ready ? (
                <p>Each team has one spymaster and at least one operative.</p>
              ) : (
                <ul>
                  {view.readiness.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <p className="round-note">Playing rounds is coming next.</p>
          </section>
          <details className="role-help">
            <summary>What do the roles do?</summary>
            <p>
              <strong>Spymasters</strong> see the secret key and give clues.{" "}
              <strong>Operatives</strong> discuss those clues and choose words. Each team needs
              exactly one spymaster and at least one operative.
            </p>
          </details>
          <footer>
            <span>{self ? `Playing as ${self.name}` : ""}</span>
            <button className="text-button" onClick={backToEntry}>
              Back to entry
            </button>
          </footer>
        </>
      )}
    </main>
  );
}
