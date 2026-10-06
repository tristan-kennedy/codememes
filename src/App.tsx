import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { RoomConnection } from "./lib/room-connection";
import type { ConnectionStatus } from "./lib/room-connection";
import type { SoloRoom } from "./lib/solo-room";
import { NAME_LIMIT, normalizeCode, normalizeName, PROTOCOL_VERSION } from "./shared/protocol";
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
  const [solo, setSolo] = useState<SoloRoom | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(code));
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState("");
  const [copyFallback, setCopyFallback] = useState<{ value: string; label: string } | null>(null);
  const connection = useRef<Pick<RoomConnection, "connect" | "close" | "send"> | null>(null);
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
    if (!copied || copyFallback) return;
    const timeout = window.setTimeout(() => setCopied(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [copied, copyFallback]);

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
    if (!code || solo) return;
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
  }, [code, solo, acceptView]);

  const roomCode = view?.code;
  useEffect(() => {
    if (!roomCode) return;
    const next =
      solo ??
      new RoomConnection(roomCode, acceptView, setStatus, setError, () => setPending(false));
    connection.current = next;
    next.connect();
    return () => {
      next.close();
      connection.current = null;
    };
  }, [roomCode, solo, acceptView]);

  async function startSolo() {
    if (!import.meta.env.DEV) return;
    setLoading(true);
    setError("");
    try {
      const { SoloRoom } = await import("./lib/solo-room");
      const next = new SoloRoom(normalizeName(name) ?? "You", acceptView, setStatus, setError, () =>
        setPending(false),
      );
      setSolo(next);
      acceptView(next.snapshot());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Solo test could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const displayName = normalizeName(name);
    if (!displayName) {
      setError("Enter a name between 1 and 40 characters.");
      return;
    }
    setLoading(true);
    try {
      const next = await requestRoom(code ? `/api/rooms/${code}/join` : "/api/rooms", displayName);
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

  function backToEntry(inviteRoom: string | null = null) {
    connection.current?.close();
    setSolo(null);
    setPending(false);
    setStatus("connecting");
    setCopied("");
    setCopyFallback(null);
    setCode(inviteRoom);
    setView(null);
    setError("");
    setLoading(false);
    history.replaceState(null, "", inviteRoom ? `/room/${inviteRoom}` : "/");
  }

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
          <img className="brand-logo" src="/brand/logo.png" alt="Codememes" />
        </a>
        {view && (
          <div className="room-tools">
            <>
              {!solo && (
                <button
                  onClick={() => {
                    void copy(invite, "Invite link");
                  }}
                >
                  Invite
                </button>
              )}
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
            <button className="text-button" onClick={() => backToEntry()}>
              Leave room
            </button>
          </div>
        )}
      </header>
      {!view ? (
        <section className="entry-body" aria-labelledby="entry-heading">
          <h1 id="entry-heading">{code ? "Enter your name" : "Create a room"}</h1>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
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
              {loading ? "Opening room…" : code ? "Enter room" : "Create room"}
            </button>
          </form>
          {import.meta.env.DEV && !code && (
            <button className="solo-entry" disabled={loading} onClick={() => void startSolo()}>
              Solo test
            </button>
          )}
        </section>
      ) : (
        <>
          {import.meta.env.DEV && solo && (
            <div className="solo-controls" role="group" aria-label="Solo test controls">
              <label>
                Play as
                <select
                  value={view.selfId}
                  disabled={!usable}
                  onChange={(event) => solo.playAs(event.target.value)}
                >
                  {view.players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                      {player.isHost ? " (Host)" : ""} —{" "}
                      {player.team
                        ? `${player.team === "red" ? "Red" : "Blue"} ${player.role}`
                        : "Unassigned"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={solo.followTurn}
                  disabled={!usable}
                  onChange={(event) => solo.setFollowTurn(event.target.checked)}
                />
                Follow turn
              </label>
              <button
                disabled={!usable}
                onClick={() => {
                  if (solo.resetRound()) setPending(true);
                }}
              >
                Reset round
              </button>
            </div>
          )}
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
          {(status === "connecting" ||
            status === "disconnected" ||
            status === "replaced" ||
            status === "reconnecting" ||
            status === "expired" ||
            status === "unauthorized") && (
            <div className="connection-recovery" role="status">
              <p>
                {status === "connecting"
                  ? "Connecting…"
                  : status === "expired"
                    ? "This room has expired. Create a room to play again."
                    : status === "unauthorized"
                      ? "This browser no longer has your room seat. Enter your name to rejoin."
                      : status === "reconnecting"
                        ? "Reconnecting automatically. Accepted progress is saved; your actions are paused."
                        : status === "replaced"
                          ? "Another tab took over your seat. Reconnect to take it back."
                          : "You’re disconnected. Your team and role are saved."}
              </p>
              {status !== "connecting" && (
                <button
                  className="secondary"
                  onClick={() => {
                    setError("");
                    if (status === "expired") backToEntry();
                    else if (status === "unauthorized") backToEntry(view.code);
                    else connection.current?.connect();
                  }}
                >
                  {status === "expired"
                    ? "Create a room"
                    : status === "unauthorized"
                      ? "Enter your name"
                      : "Reconnect"}
                </button>
              )}
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
                <div className="dialog-actions">
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
              key={`${view.roundId}-${view.selfId}`}
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
                onRandomize={() => dispatch({ type: "randomize" })}
                onStart={() => dispatch({ type: "start" })}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
