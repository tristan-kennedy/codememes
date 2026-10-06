import { useEffect, useRef, useState } from "react";
import { normalizeClue } from "../shared/protocol";
import type { GameAction, RoomView } from "../shared/protocol";
import { CardMedia } from "./CardMedia";
import { identityName } from "./Identity";

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
        <div className="team-rack rack-blue">
          <span>Blue</span>
          <strong>{round.remaining.blue}</strong>
        </div>
        <div className="turn-label">
          <h2 id="game-heading" ref={heading} tabIndex={-1}>
            {turn}
          </h2>
          {round.privateKey && !ended && <span>Spymaster</span>}
        </div>
        <div className="team-rack rack-red">
          <span>Red</span>
          <strong>{round.remaining.red}</strong>
        </div>
      </div>
      {(view.controls.giveClue || (round.clue && !ended)) && (
        <div className="clue-slip" role="group" aria-label="Clue">
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
                Count
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
              <strong>
                {round.clue.word} <b>{round.clue.number}</b>
              </strong>
              <span>{round.guessesRemaining} guesses left</span>
            </>
          ) : null}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="board-scroll" role="region" aria-label="Game board" tabIndex={0}>
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
              className={`meme-card key-card key-${card.identity ?? "neutral"} ${card.revealed ? "revealed-card" : ""} ${selected === index ? "selected-card" : ""}`}
            >
              <button
                className="card-face"
                aria-label={`${card.content.name}${card.identity ? `, ${identityName(card.identity)}` : ""}${card.revealed ? ", revealed" : ""}${view.controls.reveal && !card.revealed ? ". Select card" : ""}`}
                aria-pressed={selected === index}
                aria-disabled={!usable || !view.controls.reveal || card.revealed}
                onClick={() => {
                  if (view.controls.reveal && usable && !card.revealed) setSelected(index);
                }}
              >
                <CardMedia content={card.content} />
                {card.revealed && card.identity && (
                  <img
                    className="identity-cover"
                    src={`/art/covers/${card.identity}-${card.coverVariant}.png`}
                    alt=""
                  />
                )}
                <span className="card-name">{card.content.name}</span>
              </button>
            </article>
          ))}
        </div>
      </div>
      {(ended ? view.controls.playAgain : view.controls.reveal) && (
        <div className="action-tray">
          {ended ? (
            <>
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
              <button
                className="primary"
                aria-label={
                  selectedCard ? `Reveal ${selectedCard.content.name}` : "Reveal selected card"
                }
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
          ) : null}
        </div>
      )}
    </section>
  );
}
