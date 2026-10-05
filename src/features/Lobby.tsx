import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { PlayerView, PlayingRole, RoomView, Team } from "../shared/protocol";
import "./lobby.css";

const destinations = [
  { id: "red-spy", label: "Red · Spymaster", team: "red", role: "spymaster" },
  { id: "red-op", label: "Red · Operatives", team: "red", role: "operative" },
  { id: "blue-spy", label: "Blue · Spymaster", team: "blue", role: "spymaster" },
  { id: "blue-op", label: "Blue · Operatives", team: "blue", role: "operative" },
  { id: "unassigned", label: "Unassigned / Watch", team: null, role: "operative" },
] as const;
type Destination = (typeof destinations)[number];
type Gesture = {
  seatId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  target: Destination | null;
};

function matches(player: PlayerView, destination: Destination) {
  return destination.team === null
    ? player.team === null || player.role === "watcher"
    : player.team === destination.team && player.role === destination.role;
}
function Grip() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[6, 12, 18].flatMap((y) =>
        [8, 16].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />),
      )}
    </svg>
  );
}

export function Lobby({
  view,
  usable,
  pending,
  onAssign,
  onStart,
}: {
  view: RoomView;
  usable: boolean;
  pending: boolean;
  onAssign: (player: PlayerView, team: Team | null, role: PlayingRole) => void;
  onStart: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [choice, setChoice] = useState<Destination | null>(null);
  const [drag, setDrag] = useState<Gesture | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const gesture = useRef<Gesture | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const captor = useRef<HTMLButtonElement | null>(null);
  const picker = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const submitted = useRef<{ seatId: string; destination: Destination; revision: number } | null>(
    null,
  );
  const priorPending = useRef(pending);
  const selection = view.players.find((player) => player.id === picked);
  const host = view.players.find((player) => player.isHost)?.id;

  function permitted(player: PlayerView) {
    return (
      usable && (player.id === view.selfId ? view.controls.assignSelf : view.controls.assignOthers)
    );
  }
  function occupied(destination: Destination, seatId: string) {
    return (
      destination.role === "spymaster" &&
      view.players.some((player) => player.id !== seatId && matches(player, destination))
    );
  }
  function stopGesture() {
    const current = gesture.current;
    gesture.current = null;
    if (current && captor.current?.hasPointerCapture(current.pointerId))
      captor.current.releasePointerCapture(current.pointerId);
    captor.current = null;
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    setDrag(null);
  }
  function cancel(restoreFocus = false) {
    stopGesture();
    setPicked(null);
    setChoice(null);
    if (restoreFocus) opener.current?.focus();
  }
  function focusAcceptedPiece(seatId: string) {
    const target = root.current?.querySelector<HTMLButtonElement>(
      `[data-seat-id="${seatId}"] .piece-name`,
    );
    if (target && !target.disabled) target.focus();
    else root.current?.focus();
  }

  useEffect(() => {
    const move = submitted.current;
    if (move && !pending && priorPending.current) {
      const player = view.players.find((seat) => seat.id === move.seatId);
      setAnnouncement(
        player && matches(player, move.destination) && view.revision > move.revision
          ? `${player.name} placed in ${move.destination.label}.`
          : "Placement was not accepted. Check the roster and try again.",
      );
      submitted.current = null;
      focusAcceptedPiece(move.seatId);
    }
    priorPending.current = pending;
  }, [pending, view]);

  // Every gesture is based on one accepted roster. Reconnect never replays it.
  useEffect(() => {
    const interruptedSeat = picked ?? gesture.current?.seatId;
    stopGesture();
    setPicked(null);
    setChoice(null);
    if (!usable && !pending) submitted.current = null;
    if (interruptedSeat) focusAcceptedPiece(interruptedSeat);
  }, [view.revision, view.roundId, view.selfId, host, usable, pending]);
  useEffect(() => {
    if (picked) picker.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [picked]);
  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );
  useEffect(() => {
    const interrupt = () => {
      const seatId = picked ?? gesture.current?.seatId;
      if (!seatId) return;
      cancel();
      focusAcceptedPiece(seatId);
      setAnnouncement("Placement canceled.");
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [picked]);

  function pick(player: PlayerView, button: HTMLButtonElement) {
    if (!permitted(player)) return;
    opener.current = button;
    setPicked(player.id);
    setChoice(null);
    setAnnouncement(`${player.name} picked. Choose a destination, then Place. Escape cancels.`);
  }
  function place(player: PlayerView, destination: Destination) {
    if (!permitted(player) || submitted.current) return;
    if (occupied(destination, player.id)) {
      setAnnouncement(`${destination.label} is occupied. Move its spymaster first.`);
      cancel(true);
      return;
    }
    submitted.current = { seatId: player.id, destination, revision: view.revision };
    cancel();
    setAnnouncement(`Placing ${player.name} in ${destination.label}…`);
    onAssign(player, destination.team, destination.role);
  }
  function targetAt(x: number, y: number) {
    const id = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-destination]")
      ?.dataset.destination;
    return destinations.find((destination) => destination.id === id) ?? null;
  }
  function edgeScroll() {
    const current = gesture.current;
    if (!current?.moved) {
      scrollFrame.current = null;
      return;
    }
    const edge = 64;
    const distance =
      current.y < edge
        ? -Math.ceil((edge - current.y) / 5)
        : current.y > innerHeight - edge
          ? Math.ceil((current.y - innerHeight + edge) / 5)
          : 0;
    if (distance) {
      window.scrollBy(0, Math.max(-18, Math.min(18, distance)));
      current.target = targetAt(current.x, current.y);
      setDrag({ ...current });
    }
    scrollFrame.current = requestAnimationFrame(edgeScroll);
  }
  function lift(event: PointerEvent<HTMLButtonElement>, player: PlayerView) {
    if (event.button !== 0 || !event.isPrimary || !permitted(player)) return;
    opener.current = event.currentTarget;
    captor.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      seatId: player.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      target: null,
    };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX;
    current.y = event.clientY;
    current.moved ||= Math.hypot(current.x - current.startX, current.y - current.startY) >= 6;
    if (!current.moved) return;
    current.target = targetAt(current.x, current.y);
    setDrag({ ...current });
    if (scrollFrame.current === null) scrollFrame.current = requestAnimationFrame(edgeScroll);
  }
  function drop(event: PointerEvent<HTMLButtonElement>, player: PlayerView) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    stopGesture();
    if (!current.moved) pick(player, event.currentTarget);
    else if (current.target) place(player, current.target);
    else {
      cancel(true);
      setAnnouncement("Placement canceled. Drop in a named destination.");
    }
  }

  function piece(player: PlayerView) {
    const allowed =
      player.id === view.selfId ? view.controls.assignSelf : view.controls.assignOthers;
    const initials = player.name
      .trim()
      .split(/\s+/)
      .map((part) => Array.from(part)[0])
      .slice(0, 2)
      .join("");
    return (
      <li
        data-seat-id={player.id}
        className={`player-piece${picked === player.id || drag?.seatId === player.id ? " is-picked" : ""}`}
        key={player.id}
      >
        {allowed && (
          <button
            type="button"
            className="piece-grip"
            disabled={!usable}
            aria-label={`Move ${player.name}: drag or choose destination`}
            onPointerDown={(event) => lift(event, player)}
            onPointerMove={move}
            onPointerUp={(event) => drop(event, player)}
            onPointerCancel={() => cancel()}
            onLostPointerCapture={() => {
              if (gesture.current) cancel();
            }}
            onClick={(event) => {
              // Pointer clicks are handled by pointer-up; keyboard/AT clicks
              // still open the same destination picker.
              if (event.detail === 0) pick(player, event.currentTarget);
            }}
          >
            <Grip />
          </button>
        )}
        <button
          type="button"
          className="piece-name"
          disabled={!allowed || !usable}
          aria-label={`${allowed ? "Pick up " : ""}${player.name}${player.id === view.selfId ? ", you" : ""}${player.isHost ? ", host" : ""}, ${player.connected ? "connected" : "offline"}`}
          aria-pressed={picked === player.id}
          onClick={(event) => pick(player, event.currentTarget)}
        >
          <span className="piece-initials" aria-hidden="true">
            {initials}
          </span>
          <span className="piece-label">
            <strong>{player.name}</strong>
            <small>
              {player.id === view.selfId ? "You · " : ""}
              {player.isHost ? "Host · " : ""}
              {player.connected ? "Connected" : "Offline"}
            </small>
          </span>
        </button>
      </li>
    );
  }
  function destinationArea(destination: Destination) {
    const members = view.players.filter((player) => matches(player, destination));
    const pendingHere = pending && submitted.current?.destination.id === destination.id;
    const hovered = drag?.target?.id === destination.id;
    return (
      <section
        key={destination.id}
        data-destination={destination.id}
        className={`lobby-destination${hovered ? " is-target" : ""}${hovered && occupied(destination, drag!.seatId) ? " is-occupied" : ""}`}
        aria-labelledby={`destination-${destination.id}`}
      >
        <h3 id={`destination-${destination.id}`}>
          {destination.team === null
            ? "Unassigned / Watch"
            : destination.role === "spymaster"
              ? "Spymaster"
              : "Operatives"}
        </h3>
        <ul className="player-pieces">{members.map(piece)}</ul>
        {members.length === 0 && (
          <p className="lobby-empty">
            {destination.team === null
              ? "Choose a team"
              : destination.role === "spymaster"
                ? "Needs spymaster"
                : "Needs operative"}
          </p>
        )}
        {pendingHere && (
          <p className="placement-preview">
            Placing {view.players.find((player) => player.id === submitted.current?.seatId)?.name}…
          </p>
        )}
      </section>
    );
  }

  return (
    <div
      ref={root}
      className="tabletop-lobby"
      role="region"
      aria-label="Team arrangement"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape" && (picked || gesture.current)) {
          event.preventDefault();
          cancel(true);
          setAnnouncement("Placement canceled.");
        }
      }}
    >
      {selection && (
        <section className="placement-picker" aria-label={`Place ${selection.name}`}>
          <strong>Move {selection.name}</strong>
          <div ref={picker} className="destination-choices" role="group" aria-label="Destination">
            {destinations.map((destination) => (
              <button
                type="button"
                key={destination.id}
                aria-pressed={choice?.id === destination.id}
                disabled={!usable || occupied(destination, selection.id)}
                onClick={() => setChoice(destination)}
              >
                {destination.label}
                {occupied(destination, selection.id) ? " · occupied" : ""}
              </button>
            ))}
          </div>
          <div className="placement-actions">
            <button
              type="button"
              className="primary"
              disabled={!choice || !usable}
              onClick={() => {
                if (choice) place(selection, choice);
              }}
            >
              Place
            </button>
            <button
              type="button"
              onClick={() => {
                cancel(true);
                setAnnouncement("Placement canceled.");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      <div className="lobby-team-areas">
        {(["red", "blue"] as const).map((team) => (
          <section className={`lobby-team ${team}`} key={team} aria-labelledby={`lobby-${team}`}>
            <h2 id={`lobby-${team}`}>
              <span className="lobby-team-symbol" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {team === "red" ? (
                    <path d="M6 21V3h13l-4 5 4 5H6" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </span>
              {team === "red" ? "Red" : "Blue"}
            </h2>
            {destinations.filter((destination) => destination.team === team).map(destinationArea)}
          </section>
        ))}
      </div>
      <div className="lobby-shared-tray">{destinationArea(destinations[4])}</div>
      <section className="lobby-start" aria-label="Round readiness">
        <div id="lobby-readiness">
          {view.readiness.ready ? "Teams ready" : view.readiness.reasons.join(" ")}
        </div>
        {view.players.some((player) => player.id === view.selfId && player.isHost) ? (
          <button
            type="button"
            className="primary"
            disabled={!usable || !view.controls.startRound}
            aria-describedby="lobby-readiness"
            onClick={onStart}
          >
            {pending ? "Saving…" : "Start"}
          </button>
        ) : (
          <span>Waiting for the host to Start</span>
        )}
      </section>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
      {drag && (
        <div className="dragged-piece" aria-hidden="true" style={{ left: drag.x, top: drag.y }}>
          {view.players.find((player) => player.id === drag.seatId)?.name}
        </div>
      )}
    </div>
  );
}
