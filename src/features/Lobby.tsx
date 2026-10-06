import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { PlayerView, PlayingRole, RoomView, Team } from "../shared/protocol";
import "./lobby.css";
import { GameIcon } from "./GameIcon";

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
      <circle cx="9" cy="7" r="1.6" />
      <circle cx="15" cy="7" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="17" r="1.6" />
      <circle cx="15" cy="17" r="1.6" />
    </svg>
  );
}

export function RolePortrait({ role }: { role: "spymaster" | "operative" | "watcher" }) {
  return (
    <img
      className={`role-portrait portrait-${role}`}
      src={role === "spymaster" ? "/media/roll-safe.webp" : "/media/much-wow.webp"}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={72}
      height={72}
    />
  );
}

export function Lobby({
  view,
  usable,
  pending,
  onAssign,
  onRandomize,
  onStart,
}: {
  view: RoomView;
  usable: boolean;
  pending: boolean;
  onAssign: (player: PlayerView, team: Team | null, role: PlayingRole) => void;
  onRandomize: () => void;
  onStart: () => void;
}) {
  const [drag, setDrag] = useState<Gesture | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const gesture = useRef<Gesture | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const opener = useRef<HTMLLIElement | null>(null);
  const captor = useRef<HTMLLIElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const submitted = useRef<{ seatId: string; destination: Destination; revision: number } | null>(
    null,
  );
  const priorPending = useRef(pending);
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
    if (restoreFocus) opener.current?.focus();
  }
  function focusAcceptedPiece(seatId: string) {
    const target = root.current?.querySelector<HTMLLIElement>(`[data-seat-id="${seatId}"]`);
    if (target?.tabIndex === 0 && target.getAttribute("aria-disabled") !== "true") target.focus();
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
    const interruptedSeat = gesture.current?.seatId;
    stopGesture();
    if (!usable && !pending) submitted.current = null;
    if (interruptedSeat) focusAcceptedPiece(interruptedSeat);
  }, [view.revision, view.roundId, view.selfId, host, usable, pending]);
  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );
  useEffect(() => {
    const interrupt = () => {
      const seatId = gesture.current?.seatId;
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
  }, []);
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
  function lift(event: PointerEvent<HTMLLIElement>, player: PlayerView) {
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
  function move(event: PointerEvent<HTMLLIElement>) {
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
  function drop(event: PointerEvent<HTMLLIElement>, player: PlayerView) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    stopGesture();
    if (current.moved && current.target) place(player, current.target);
    else if (current.moved) {
      cancel(true);
      setAnnouncement("Placement canceled. Drop in a named destination.");
    }
  }

  function piece(player: PlayerView) {
    const allowed =
      player.id === view.selfId ? view.controls.assignSelf : view.controls.assignOthers;
    const details = [
      player.id === view.selfId && "You",
      player.isHost && "Host",
      !player.connected && "Offline",
    ]
      .filter(Boolean)
      .join(" · ");
    const role = player.team === null || player.role === "watcher" ? "watcher" : player.role;
    const roleName =
      role === "spymaster" ? "Spymaster" : role === "watcher" ? "Watching" : "Operative";
    return (
      <li
        data-seat-id={player.id}
        data-role={role}
        className={`player-piece${allowed ? " is-movable" : ""}${drag?.seatId === player.id ? " is-picked" : ""}`}
        key={player.id}
        tabIndex={allowed ? 0 : undefined}
        aria-disabled={allowed ? !usable : undefined}
        aria-label={
          allowed ? `Drag ${player.name}, ${roleName}${details ? `, ${details}` : ""}` : undefined
        }
        onPointerDown={(event) => lift(event, player)}
        onPointerMove={move}
        onPointerUp={(event) => drop(event, player)}
        onPointerCancel={() => cancel()}
        onLostPointerCapture={() => {
          if (gesture.current) cancel();
        }}
      >
        <RolePortrait role={role} />
        <div className="piece-name">
          <span className="piece-label">
            <strong>{player.name}</strong>
            <small>
              {roleName}
              {details ? ` · ${details}` : ""}
            </small>
          </span>
        </div>
        {allowed && (
          <span className="piece-grip" aria-hidden="true">
            <Grip />
          </span>
        )}
      </li>
    );
  }
  function destinationArea(destination: Destination) {
    const members = view.players.filter((player) => matches(player, destination));
    const pendingHere = pending && submitted.current?.destination.id === destination.id;
    const hovered = drag?.target?.id === destination.id;
    const roleName =
      destination.team === null
        ? "Unassigned / Watch"
        : destination.role === "spymaster"
          ? "Spymaster"
          : "Operatives";
    return (
      <section
        key={destination.id}
        data-destination={destination.id}
        className={`lobby-destination destination-${destination.team === null ? "watch" : destination.role}${hovered ? " is-target" : ""}${hovered && occupied(destination, drag!.seatId) ? " is-occupied" : ""}`}
        aria-label={destination.label}
      >
        {destination.team === null && <h2>{roleName}</h2>}
        <ul className="player-pieces">{members.map(piece)}</ul>
        {members.length === 0 && (
          <div className="empty-role">
            {destination.team !== null && <RolePortrait role={destination.role} />}
            <span>
              <strong>{destination.team === null ? "Drop here to watch" : roleName}</strong>
              {destination.team !== null && <small>Drag a player here</small>}
            </span>
          </div>
        )}
        {pendingHere && (
          <p className="placement-preview" role="status">
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
        if (event.key === "Escape" && gesture.current) {
          event.preventDefault();
          cancel(true);
          setAnnouncement("Placement canceled.");
        }
      }}
    >
      <div className="lobby-team-areas">
        {(["blue", "red"] as const).map((team) => (
          <section
            className={`lobby-team ${team}`}
            data-destination={`${team}-op`}
            key={team}
            aria-labelledby={`lobby-${team}`}
          >
            <h2 id={`lobby-${team}`}>{team === "red" ? "Red" : "Blue"}</h2>
            {destinations.filter((destination) => destination.team === team).map(destinationArea)}
          </section>
        ))}
      </div>
      <div className="lobby-shared-tray">{destinationArea(destinations[4])}</div>
      <section className="lobby-start" aria-label="Round readiness">
        {!view.readiness.ready && <p id="lobby-readiness">{view.readiness.reasons.join(" ")}</p>}
        <div className="lobby-start-actions">
          {view.controls.assignOthers && (
            <button
              type="button"
              className="secondary toon-action"
              disabled={!usable || view.players.filter((player) => player.connected).length < 2}
              title="Randomize connected players into balanced teams and roles"
              onClick={onRandomize}
            >
              <GameIcon kind="shuffle" />
              <span className="toon-label">Randomize</span>
            </button>
          )}
          <button
            type="button"
            className="primary toon-action"
            disabled={host !== view.selfId || !usable || !view.controls.startRound}
            aria-describedby={!view.readiness.ready ? "lobby-readiness" : undefined}
            title={host !== view.selfId ? "The host starts the round" : undefined}
            onClick={onStart}
          >
            <GameIcon kind="play" />
            <span className="toon-label">{pending ? "Saving…" : "Start"}</span>
          </button>
        </div>
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
