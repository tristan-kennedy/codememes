import { useEffect, useRef, useState } from "react";
import { normalizeClue } from "../shared/protocol";
import type { GameAction, RoomView } from "../shared/protocol";
import { CardMedia } from "./CardMedia";
import { IdentitySymbol, identityName } from "./Identity";
import { Inspector } from "./Inspector";

const teamName = (team: "red" | "blue") => (team === "red" ? "Red" : "Blue");
export function Game({
  view,
  usable,
  pending,
  onAction,
}: {
  view: RoomView;
  usable: boolean;
  pending: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [inspecting, setInspecting] = useState<number | null>(null);
  const [word, setWord] = useState("");
  const [number, setNumber] = useState("1");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    setSelected(null);
    setError("");
  }, [view.revision, view.roundId, usable]);
  const round = view.round;
  if (!round) return null;
  const self = view.players.find((player) => player.id === view.selfId);
  const ended = view.phase === "ended";
  const selectedCard = selected !== null ? round.cards[selected] : null;
  const turn = ended
    ? `${teamName(round.outcome!.winner)} wins`
    : `${teamName(round.activeTeam)} · ${round.stage === "clue" ? "Clue" : "Guess"}`;
  const announcement = `${round.lastReveal ? `${round.lastReveal.word}: ${identityName(round.lastReveal.identity)}. ` : ""}${turn}${!ended && round.stage === "guessing" ? `. ${round.guessesRemaining} guesses left.` : "."}`;
  return (
    <section
      className="game"
      data-active-team={ended ? undefined : round.activeTeam}
      aria-labelledby="game-heading"
    >
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="game-edge">
        <div className="team-rack rack-red">
          <IdentitySymbol identity="red" />
          <span>Red</span>
          <strong>{round.remaining.red}</strong>
        </div>
        <div className="turn-label">
          <h2 id="game-heading" ref={heading} tabIndex={-1}>
            {turn}
          </h2>
          <span>
            {round.privateKey
              ? "Spymaster · private key"
              : self?.role === "watcher"
                ? "Watching"
                : `${teamName(self?.team ?? "red")} operative`}
          </span>
        </div>
        <div className="team-rack rack-blue">
          <IdentitySymbol identity="blue" />
          <span>Blue</span>
          <strong>{round.remaining.blue}</strong>
        </div>
      </div>
      <div className="clue-slip">
        {view.controls.giveClue ? (
          <form
            className="clue-form"
            onSubmit={(event) => {
              event.preventDefault();
              const clue = normalizeClue(word),
                amount = Number(number);
              if (!clue || !Number.isInteger(amount) || amount < 1 || amount > 9) {
                setError("Give one word and a number from 1 to 9.");
                return;
              }
              setError("");
              onAction({ type: "clue", word: clue, number: amount });
            }}
          >
            <label>
              Clue
              <input
                value={word}
                onChange={(event) => setWord(event.target.value)}
                maxLength={40}
                required
                disabled={!usable}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label>
              Number
              <input
                type="number"
                min={1}
                max={9}
                step={1}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                required
                disabled={!usable}
              />
            </label>
            <button className="primary" disabled={!usable}>
              {pending ? "Saving…" : "Give clue"}
            </button>
          </form>
        ) : round.clue && !ended ? (
          <>
            <span>Clue</span>
            <strong>
              {round.clue.word} <b>{round.clue.number}</b>
            </strong>
            <span>{round.guessesRemaining} guesses left</span>
          </>
        ) : (
          <span>
            {ended
              ? round.outcome?.reason === "assassin"
                ? `${round.lastReveal?.word} was the assassin.`
                : "All winning agents found."
              : view.waitingFor
                ? `Waiting for ${view.waitingFor.name}`
                : `Waiting for ${teamName(round.activeTeam)}'s spymaster`}
          </span>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div
        className="meme-board"
        aria-label={
          ended
            ? "Final board with complete key"
            : round.privateKey
              ? "Private spymaster board"
              : "Public meme board"
        }
      >
        {round.cards.map((card, index) => (
          <article
            key={`${view.roundId}-${index}`}
            className={`meme-card ${selected === index ? "selected-card" : ""}`}
          >
            <button
              className="card-face"
              aria-label={`${card.content.name}${card.identity ? `, ${identityName(card.identity)}` : ""}${card.revealed ? ", revealed" : ""}. ${view.controls.reveal && !card.revealed ? "Select card on desktop, inspect on phone" : "Inspect card"}`}
              aria-pressed={selected === index}
              onClick={() => {
                if (
                  matchMedia("(max-width: 539px)").matches ||
                  !view.controls.reveal ||
                  !usable ||
                  card.revealed
                )
                  setInspecting(index);
                else setSelected(index);
              }}
            >
              <CardMedia content={card.content} />
              {card.revealed && card.identity && (
                <img
                  className="identity-cover"
                  src={`/art/table-v1/${card.identity}.webp`}
                  alt=""
                />
              )}
              {card.identity && (
                <span className={`identity-tab identity-${card.identity}`}>
                  <IdentitySymbol identity={card.identity} />
                  <span className="visually-hidden">{identityName(card.identity)}</span>
                </span>
              )}
              <span className="card-name">{card.content.name}</span>
            </button>
            <button
              className="inspect-card"
              aria-label={`Inspect ${card.content.name}`}
              onClick={() => setInspecting(index)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="10" cy="10" r="6" />
                <path d="m14.5 14.5 6 6" />
              </svg>
            </button>
          </article>
        ))}
      </div>
      <div className="action-tray">
        {ended ? (
          <>
            <span>Round complete</span>
            {view.controls.playAgain && (
              <button
                className="primary"
                disabled={!usable}
                onClick={() => onAction({ type: "play_again" })}
              >
                Play again
              </button>
            )}
          </>
        ) : view.controls.reveal ? (
          <>
            <span className="selection-name">
              {selectedCard ? selectedCard.content.name : "Select a card"}
            </span>
            <button
              className="primary"
              disabled={!usable || selected === null}
              onClick={() => {
                if (selected !== null) onAction({ type: "reveal", index: selected });
              }}
            >
              {pending ? "Saving…" : "Reveal"}
            </button>
            <button
              disabled={!usable || !view.controls.endTurn}
              onClick={() => onAction({ type: "end_turn" })}
            >
              End turn
            </button>
          </>
        ) : (
          <span>
            {round.privateKey ? "Give clues; keep your key private." : "Inspect any card."}
          </span>
        )}
      </div>
      {inspecting !== null && (
        <Inspector
          key={`${view.roundId}-${inspecting}`}
          card={round.cards[inspecting]}
          canSelect={usable && view.controls.reveal && !round.cards[inspecting].revealed}
          onSelect={() => setSelected(inspecting)}
          onClose={() => setInspecting(null)}
        />
      )}
    </section>
  );
}
