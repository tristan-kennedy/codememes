import { useEffect, useRef, useState } from "react";
import { normalizeClue } from "../shared/protocol";
import type { CardIdentity, GameAction, RoomView } from "../shared/protocol";

function teamName(team: "red" | "blue") {
  return team === "red" ? "Red" : "Blue";
}
function identityName(identity: CardIdentity) {
  return identity === "red"
    ? "Red agent"
    : identity === "blue"
      ? "Blue agent"
      : identity === "neutral"
        ? "Neutral"
        : "Assassin";
}

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
  const self = view.players.find((player) => player.id === view.selfId);
  const active = teamName(round.activeTeam);
  const selectedWord = selected !== null ? round.cards[selected]?.word : null;
  const ended = view.phase === "ended";
  const instruction = view.waitingFor
    ? `Waiting for ${view.waitingFor.name} to reconnect as ${teamName(view.waitingFor.team)}'s spymaster.`
    : ended
      ? "The complete final key is visible to everyone."
      : self?.role === "watcher"
        ? "You’re watching this round. The public board updates as teams play."
        : view.controls.giveClue
          ? "Give your operatives one word and a number."
          : view.controls.reveal
            ? "Choose a word, then press Reveal. Your selection stays on this device."
            : round.stage === "clue"
              ? `Waiting for ${active}'s spymaster to give a clue.`
              : `Waiting for ${active}'s operatives to choose words.`;
  const turnText = ended
    ? `${teamName(round.outcome!.winner)} team wins`
    : round.stage === "clue"
      ? `${active} to give a clue`
      : `${active} to guess`;
  const announcement = `${round.lastReveal ? `${round.lastReveal.word}: ${identityName(round.lastReveal.identity)}. ` : ""}${turnText}${round.stage === "guessing" && !ended ? `. ${round.guessesRemaining} guesses remaining.` : "."}`;

  return (
    <section className="game" aria-labelledby="game-heading">
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="turn-summary">
        <div>
          <h2
            id="game-heading"
            ref={heading}
            tabIndex={-1}
            className={`turn-${ended ? round.outcome!.winner : round.activeTeam}`}
          >
            {turnText}
          </h2>
          <p>{instruction}</p>
          {ended && (
            <p className="outcome-reason">
              {round.outcome?.reason === "assassin"
                ? `${round.lastReveal?.word} was the assassin. ${teamName(round.lastReveal!.byTeam)} loses.`
                : `All ${teamName(round.outcome!.winner)} agents have been found.`}
            </p>
          )}
        </div>
        <dl className="agent-counts">
          <div className="count-red">
            <dt>Red remaining</dt>
            <dd>{round.remaining.red}</dd>
          </div>
          <div className="count-blue">
            <dt>Blue remaining</dt>
            <dd>{round.remaining.blue}</dd>
          </div>
        </dl>
      </div>
      {round.privateKey && (
        <p className="private-view">
          Private spymaster view · you see the complete key. Share clues, not your screen.
        </p>
      )}
      {!round.privateKey && !ended && (
        <p className="public-view">
          {self?.role === "watcher" ? "Watcher" : "Public board"} · unrevealed identities stay
          hidden.
        </p>
      )}
      {view.controls.giveClue && (
        <form
          className="clue-form"
          onSubmit={(event) => {
            event.preventDefault();
            const clue = normalizeClue(word);
            const amount = Number(number);
            if (!clue || !Number.isInteger(amount) || amount < 1 || amount > 9) {
              setError("Give one word and a whole number from 1 to 9.");
              return;
            }
            setError("");
            onAction({ type: "clue", word: clue, number: amount });
          }}
        >
          <label>
            Clue word
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
            Give clue
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {round.clue && !ended && (
        <div className="current-clue">
          <span>Clue</span>
          <strong>
            {round.clue.word} <span className="clue-number">{round.clue.number}</span>
          </strong>
          <span>
            {round.guessesRemaining} of {round.clue.number + 1} guesses remaining
          </span>
        </div>
      )}
      {view.controls.reveal && (
        <div className="reveal-confirmation">
          <div>
            <span>Selected word</span>
            <strong>{selectedWord ?? "Choose a word below"}</strong>
          </div>
          <button
            className="primary"
            disabled={!usable || selected === null}
            onClick={() => {
              if (selected !== null) onAction({ type: "reveal", index: selected });
            }}
          >
            {pending ? "Saving…" : selectedWord ? `Reveal ${selectedWord}` : "Reveal"}
          </button>
          <button
            className="secondary"
            disabled={!usable || !view.controls.endTurn}
            onClick={() => onAction({ type: "end_turn" })}
          >
            End turn
          </button>
        </div>
      )}
      <div
        className="word-board"
        aria-label={
          ended
            ? "Final board with complete key"
            : round.privateKey
              ? "Private spymaster board"
              : "Public word board"
        }
      >
        {round.cards.map((card, index) => (
          <button
            key={`${view.roundId}-${index}`}
            type="button"
            className={`word-tile ${card.identity ? `identity-${card.identity}` : ""} ${card.revealed ? "revealed" : ""} ${selected === index ? "selected-word" : ""}`}
            disabled={!usable || !view.controls.reveal || card.revealed}
            aria-pressed={selected === index}
            aria-label={`${card.word}, ${card.identity ? identityName(card.identity) : "identity hidden"}, ${card.revealed ? "revealed" : "unrevealed"}`}
            onClick={() => setSelected(index)}
          >
            <span className="tile-word">{card.word}</span>
            <span className="tile-identity">
              {card.identity ? identityName(card.identity) : "Unrevealed"}
            </span>
            <span className="tile-state">
              {card.revealed ? "Revealed" : round.privateKey ? "Key" : ""}
            </span>
          </button>
        ))}
      </div>
      {ended && (
        <div className="round-actions">
          <p className="round-complete">
            Round complete.{" "}
            {view.controls.playAgain
              ? "Return to the lobby with this group to arrange teams and start a fresh board."
              : "The host can choose Play again to return everyone to the lobby."}
          </p>
          {view.controls.playAgain && (
            <button
              className="primary"
              disabled={!usable}
              onClick={() => onAction({ type: "play_again" })}
            >
              Play again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
