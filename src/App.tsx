import { useCallback, useEffect, useRef, useState } from "react";
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
import type {
  PlayerView,
  PlayingRole,
  RoomCommand,
  GameAction,
  RoomView,
  ServerMessage,
  Team,
} from "./shared/protocol";
import { Game } from "./features/Game";
import { Rules } from "./features/Rules";
import { Lobby } from "./features/Lobby";

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
  const [copyFallback, setCopyFallback] = useState<{ value: string; label: string } | null>(null);
  const connection = useRef<RoomConnection | null>(null);
  const lobbyMount = useRef<HTMLDivElement>(null);
  const discardDialog = useRef<HTMLDialogElement>(null);
  const discardTrigger = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef(view?.phase);
  const acceptView = useCallback((next: RoomView) => {
    setView((current) =>
      current?.code === next.code && current.revision > next.revision ? current : next,
    );
  }, []);

  useEffect(() => {
    if (view?.phase === "lobby" && previousPhase.current && previousPhase.current !== "lobby")
      lobbyMount.current?.querySelector<HTMLElement>('[role="region"]')?.focus();
    previousPhase.current = view?.phase;
  }, [view?.phase]);
  useEffect(() => {
    setPending(false);
    setError("");
  }, [view?.roundId]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetch(`/api/rooms/${code}/view`)
      .then(async (response) => {
        const message = (await response.json()) as ServerMessage;
        if (cancelled) return;
        if (message.type === "snapshot") acceptView(message.view);
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
  }, [code, acceptView]);

  const roomCode = view?.code;
  useEffect(() => {
    if (!roomCode) return;
    const next = new RoomConnection(roomCode, acceptView, setStatus, setError, () =>
      setPending(false),
    );
    connection.current = next;
    next.connect();
    return () => {
      next.close();
      connection.current = null;
    };
  }, [roomCode, acceptView]);

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
      acceptView(next);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The room could not be opened. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function dispatch(
    action: GameAction | { type: "assign"; seatId: string; team: Team | null; role: PlayingRole },
  ) {
    if (!view || status !== "connected" || pending) return;
    setError("");
    const sent = connection.current?.send({
      version: PROTOCOL_VERSION,
      ...action,
      requestId: crypto.randomUUID(),
      revision: view.revision,
      roundId: view.roundId,
    } as RoomCommand);
    if (sent) setPending(true);
    else {
      setStatus("disconnected");
      setError("Connection lost. Reconnect before making a change.");
    }
  }
  function update(player: PlayerView, team: Team | null, role: PlayingRole) {
    dispatch({ type: "assign", seatId: player.id, team, role });
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFallback(null);
      setCopied(`${label} copied.`);
    } catch {
      setCopyFallback({ value, label });
      setCopied(
        `Copy is unavailable here. Select the ${label.toLowerCase()} below and copy it manually.`,
      );
    }
  }

  function backToEntry() {
    connection.current?.close();
    setPending(false);
    setStatus("connecting");
    setCopied("");
    setCopyFallback(null);
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

  return (
    <main
      className={
        view ? `table ${view.phase === "lobby" ? "lobby-table" : "playing-table"}` : "entry"
      }
    >
      <header className="page-header">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            backToEntry();
          }}
        >
          <span className="brand-code">CODE</span>
          <span className="brand-memes">MEMES</span>
        </a>
        {view && (
          <div className="room-tools">
            <>
              <button
                aria-label={`Copy room code ${displayCode(view.code)}`}
                onClick={() => {
                  void copy(displayCode(view.code), "Room code");
                }}
              >
                {displayCode(view.code)}
              </button>
              <button
                onClick={() => {
                  void copy(invite, "Invite link");
                }}
              >
                Invite
              </button>
              {view.phase !== "lobby" && (
                <details className="game-roster">
                  <summary>
                    Players ({view.players.filter((player) => player.connected).length})
                  </summary>
                  <ul>
                    {view.players.map((player) => (
                      <li key={player.id}>
                        <strong>{player.name}</strong> · {player.team ?? "Watching"} · {player.role}
                        {player.isHost ? " · Host" : ""}
                        {!player.connected ? " · Offline" : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
            <Rules />
            <span className="connection" role="status">
              {status === "connected"
                ? "Connected"
                : status === "reconnecting"
                  ? "Reconnecting…"
                  : status === "expired"
                    ? "Room expired"
                    : status === "unauthorized"
                      ? "Seat unavailable"
                      : status === "connecting"
                        ? "Connecting…"
                        : status === "replaced"
                          ? "Seat replaced"
                          : "Disconnected"}
            </span>
          </div>
        )}
      </header>
      {!view ? (
        <section className="entry-body" aria-labelledby="entry-heading">
          <h1 id="entry-heading">{mode === "create" ? "Create a room" : "Join a room"}</h1>
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
        </section>
      ) : (
        <>
          <p className={`copy-feedback ${copied ? "" : "empty-feedback"}`} role="status">
            {copied}
          </p>
          {copyFallback && (
            <div className="copy-fallback">
              <label>
                {copyFallback.label}
                <input
                  readOnly
                  autoFocus
                  value={copyFallback.value}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <button
                onClick={() => {
                  setCopyFallback(null);
                  setCopied("");
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          {(status === "disconnected" ||
            status === "replaced" ||
            status === "reconnecting" ||
            status === "expired" ||
            status === "unauthorized") && (
            <div className="connection-recovery">
              <p>
                {status === "expired"
                  ? "This room has expired. Create a room to play again."
                  : status === "unauthorized"
                    ? "This browser no longer has your room seat. Join again with the invite."
                    : status === "reconnecting"
                      ? "Reconnecting automatically. Accepted progress is saved; your actions are paused."
                      : status === "replaced"
                        ? "Another tab took over your seat. Reconnect to take it back."
                        : "You’re disconnected. Your team and role are saved."}
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  if (status === "expired" || status === "unauthorized") backToEntry();
                  else connection.current?.connect();
                }}
              >
                {status === "expired"
                  ? "Create a room"
                  : status === "unauthorized"
                    ? "Back to entry"
                    : "Reconnect"}
              </button>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {view.waitingFor && (
            <p className="waiting-room" role="status">
              Waiting for {view.waitingFor.name} to reconnect as{" "}
              {view.waitingFor.team === "red" ? "Red" : "Blue"} spymaster.
            </p>
          )}
          {view.controls.abandon && (
            <div className="round-actions">
              <button
                className="secondary"
                ref={discardTrigger}
                disabled={!usable}
                onClick={() => discardDialog.current?.showModal()}
              >
                Abandon round
              </button>
              <dialog
                className="rules-dialog"
                ref={discardDialog}
                aria-labelledby="discard-title"
                onClose={() => discardTrigger.current?.focus()}
              >
                <h2 id="discard-title">Discard this board?</h2>
                <p>
                  Return everyone to the lobby. Your group keeps its seats; this board and clue are
                  discarded.
                </p>
                <div className="inspector-actions">
                  <button autoFocus onClick={() => discardDialog.current?.close()}>
                    Cancel
                  </button>
                  <button
                    className="primary"
                    disabled={!usable || !view.controls.abandon}
                    onClick={() => {
                      discardDialog.current?.close();
                      dispatch({ type: "abandon" });
                    }}
                  >
                    Discard board
                  </button>
                </div>
              </dialog>
            </div>
          )}
          {view.round && (
            <Game
              key={view.roundId}
              view={view}
              usable={usable}
              pending={pending}
              onAction={dispatch}
            />
          )}
          {view.phase === "lobby" && (
            <div ref={lobbyMount}>
              <h1 className="visually-hidden">Arrange teams</h1>
              <Lobby
                view={view}
                usable={usable}
                pending={pending}
                onAssign={update}
                onStart={() => dispatch({ type: "start" })}
              />
            </div>
          )}
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
