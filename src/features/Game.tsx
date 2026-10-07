import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { normalizeClue } from "../shared/protocol";
import type { CardIdentity, GameAction, RoomView } from "../shared/protocol";
import type { RevealFeedback } from "../lib/round-feedback";
import { ClueCount } from "./ClueCount";
import { CardMedia } from "./CardMedia";
import { identityName } from "./Identity";
import { GameIcon } from "./GameIcon";

const teamName = (team: "red" | "blue") => (team === "red" ? "Red" : "Blue");

function TeamRack({
  team,
  remaining,
  coverVariant,
}: {
  team: CardIdentity;
  remaining: number;
  coverVariant: number | null;
}) {
  return (
    <div
      className={`team-rack rack-${team}`}
      data-pile={team}
      role="img"
      aria-label={`${identityName(team)}: ${remaining} left${coverVariant === null ? "" : ", next cover"}`}
    >
      <span className="rack-cover" aria-hidden="true">
        {coverVariant !== null && <img src={`/art/covers/${team}-${coverVariant}.png`} alt="" />}
      </span>
      <strong aria-hidden="true">{remaining}</strong>
    </div>
  );
}

export function Game({
  view,
  usable,
  pending,
  clueError,
  onClueEdit,
  onAction,
  feedback,
  soundEnabled,
  onToggleSound,
}: {
  view: RoomView;
  usable: boolean;
  pending: boolean;
  clueError: string;
  onClueEdit: () => void;
  onAction: (action: GameAction) => void;
  feedback: RevealFeedback | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [peeked, setPeeked] = useState<number | null>(null);
  const [word, setWord] = useState("");
  const [number, setNumber] = useState("1");
  const [error, setError] = useState("");
  const clueInput = useRef<HTMLInputElement>(null);
  const fieldError = error || clueError;
  const heading = useRef<HTMLHeadingElement>(null);
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const game = useRef<HTMLElement>(null);
  const clueBar = useRef<HTMLDivElement>(null);
  const hasClueBar = view.controls.giveClue || Boolean(view.round?.clue && view.phase !== "ended");
  useLayoutEffect(() => {
    const bar = clueBar.current,
      container = game.current;
    if (!bar || !container) return;
    const updateClearance = () =>
      container.style.setProperty("--clue-clearance", `${bar.offsetHeight + 24}px`);
    updateClearance();
    const observer = new ResizeObserver(updateClearance);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      container.style.removeProperty("--clue-clearance");
    };
  }, [hasClueBar]);
  const [flight, setFlight] = useState<{
    id: string;
    index: number;
    src: string;
    style: CSSProperties;
  } | null>(null);
  const activeFlight = flight?.id === feedback?.id ? flight : null;
  useLayoutEffect(() => {
    setFlight(null);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!feedback || motion.matches) return;
    const source = game.current?.querySelector(`[data-pile="${feedback.identity}"] .rack-cover`);
    const target = cardButtons.current[feedback.index];
    if (!source || !target) return;
    const from = source.getBoundingClientRect(),
      to = target.getBoundingClientRect();
    if (
      to.right <= 0 ||
      to.left >= window.innerWidth ||
      to.bottom <= 0 ||
      to.top >= window.innerHeight
    )
      return;
    setFlight({
      id: feedback.id,
      index: feedback.index,
      src: `/art/covers/${feedback.identity}-${feedback.coverVariant}.png`,
      style: {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        "--flight-x": `${from.left - to.left}px`,
        "--flight-y": `${from.top - to.top}px`,
        "--flight-scale-x": from.width / to.width,
        "--flight-scale-y": from.height / to.height,
      } as CSSProperties,
    });
    const cancel = () => setFlight((current) => (current?.id === feedback.id ? null : current));
    window.addEventListener("scroll", cancel, true);
    window.addEventListener("resize", cancel);
    motion.addEventListener("change", cancel);
    const timeout = window.setTimeout(cancel, 650);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("resize", cancel);
      motion.removeEventListener("change", cancel);
    };
  }, [feedback]);
  useLayoutEffect(() => {
    setPeeked(null);
  }, [view.roundId, view.selfId]);
  useEffect(() => {
    heading.current?.focus();
    setWord("");
    setNumber("1");
  }, [view.selfId]);
  useEffect(() => {
    setSelected(null);
    setError("");
  }, [view.revision, view.roundId, view.selfId, usable]);
  useEffect(() => {
    const input = clueInput.current;
    if (!input) return;
    input.setCustomValidity(fieldError);
    if (fieldError && usable) {
      input.focus();
      input.reportValidity();
    }
  }, [fieldError, usable]);
  const round = view.round;
  if (!round) return null;
  const ended = view.phase === "ended";
  const turn = ended
    ? `${teamName(round.outcome!.winner)} wins`
    : `${teamName(round.activeTeam)}'s turn`;
  const stage = round.stage === "clue" ? "Giving a clue" : "Guessing";
  const guessesLeft =
    round.clue?.number === 0 || round.clue?.number === "unlimited"
      ? "Unlimited guesses"
      : `${round.guessesRemaining} ${round.guessesRemaining === 1 ? "guess" : "guesses"} left`;
  const announcement = `${round.lastReveal ? `${round.lastReveal.word}: ${identityName(round.lastReveal.identity)}. ` : ""}${turn}${!ended ? `. ${stage}` : ""}${!ended && round.stage === "guessing" ? `. ${guessesLeft}.` : "."}`;
  return (
    <section
      ref={game}
      className="game"
      data-active-team={ended ? undefined : round.activeTeam}
      data-background-team={ended ? round.outcome!.winner : round.activeTeam}
      aria-labelledby="game-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape") setPeeked(null);
      }}
    >
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="game-edge">
        <div className="cover-piles piles-left">
          <TeamRack
            team="blue"
            remaining={round.remaining.blue}
            coverVariant={round.nextCovers.blue}
          />
          <TeamRack
            team="neutral"
            remaining={round.remaining.neutral}
            coverVariant={round.nextCovers.neutral}
          />
        </div>
        <div
          className={`turn-label ${ended ? "winner-label" : ""} ${feedback?.result ? "celebrating" : ""}`}
        >
          <div className="turn-copy">
            <h2 id="game-heading" ref={heading} tabIndex={-1}>
              {turn}
            </h2>
            {!ended && (
              <span>
                {round.privateKey ? "Spymaster — " : ""}
                {stage}
              </span>
            )}
            {ended && (
              <span>
                {round.outcome!.reason === "assassin"
                  ? `${teamName(round.lastReveal!.byTeam)} found the assassin`
                  : "All agents found"}
              </span>
            )}
          </div>
          <div className="turn-tools">
            <button
              type="button"
              className="game-icon-button sound-toggle"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label="Game sounds"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              <GameIcon kind={soundEnabled ? "sound" : "muted"} />
            </button>
            {ended && view.controls.playAgain && (
              <button
                type="button"
                className="game-icon-button replay-button"
                disabled={!usable || pending}
                onClick={() => onAction({ type: "play_again" })}
                aria-label="Play again"
                title="Play again"
              >
                <GameIcon kind="replay" />
              </button>
            )}
          </div>
        </div>
        <div className="cover-piles piles-right">
          <TeamRack
            team="assassin"
            remaining={round.remaining.assassin}
            coverVariant={round.nextCovers.assassin}
          />
          <TeamRack
            team="red"
            remaining={round.remaining.red}
            coverVariant={round.nextCovers.red}
          />
        </div>
      </div>
      {hasClueBar && (
        <div ref={clueBar} className="clue-slip" role="group" aria-label="Clue">
          {view.controls.giveClue ? (
            <form
              className="clue-form"
              onSubmit={(event) => {
                event.preventDefault();
                const clue = normalizeClue(word),
                  amount = number === "unlimited" ? "unlimited" : Number(number);
                if (
                  !clue ||
                  (amount !== "unlimited" &&
                    (!Number.isInteger(amount) || amount < 0 || amount > 9))
                ) {
                  setError(
                    !clue ? "Use one word for your clue." : "Choose a count from 0 to 9 or ∞.",
                  );
                  return;
                }
                setError("");
                onAction({ type: "clue", word: clue, number: amount });
              }}
            >
              <input
                ref={clueInput}
                aria-label="Your Clue"
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "clue-error" : undefined}
                placeholder="Your Clue"
                value={word}
                onChange={(event) => {
                  event.target.setCustomValidity("");
                  setError("");
                  onClueEdit();
                  setWord(event.target.value);
                }}
                maxLength={40}
                required
                disabled={!usable}
                autoComplete="off"
                spellCheck={false}
              />
              {fieldError && (
                <span id="clue-error" className="visually-hidden" role="alert">
                  {fieldError}
                </span>
              )}
              <ClueCount value={number} onChange={setNumber} disabled={!usable} />
              <button
                className="game-icon-button give-clue"
                disabled={!usable}
                aria-label={pending ? "Sending clue…" : "Give clue"}
                aria-busy={pending}
                title="Give clue"
              >
                <GameIcon kind="clue" />
              </button>
            </form>
          ) : round.clue && !ended ? (
            <>
              <div className="clue-readout">
                <strong className="clue-word">{round.clue.word}</strong>
                <span className="clue-count" aria-label={`Clue count: ${round.clue.number}`}>
                  {round.clue.number === "unlimited" ? "∞" : round.clue.number}
                </span>
              </div>
              <div className="clue-progress">
                <span className="guesses-left">{guessesLeft}</span>
                {view.controls.reveal && (
                  <button
                    className="game-icon-button end-turn"
                    disabled={!usable || !view.controls.endTurn}
                    aria-label="End turn"
                    title="End turn"
                    onClick={() => onAction({ type: "end_turn" })}
                  >
                    <GameIcon kind="close" />
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
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
              className={`meme-card key-card key-${card.identity ?? "neutral"} ${card.revealed ? "revealed-card" : ""} ${selected === index ? "selected-card" : ""} ${activeFlight?.index === index ? "cover-in-flight" : ""} ${peeked === index ? "peeked-card" : ""}`}
            >
              <button
                className="card-face"
                ref={(element) => {
                  cardButtons.current[index] = element;
                }}
                aria-label={`${card.content.name}${card.identity ? `, ${identityName(card.identity)}` : ""}${card.revealed ? `, revealed. ${peeked === index ? "Replace cover" : "Peek underneath"}` : view.controls.reveal ? ". Select card" : ""}`}
                aria-pressed={card.revealed ? undefined : selected === index}
                aria-expanded={card.revealed ? peeked === index : undefined}
                aria-disabled={
                  card.revealed ? activeFlight?.index === index : !usable || !view.controls.reveal
                }
                title={
                  card.revealed
                    ? peeked === index
                      ? "Replace cover"
                      : "Peek underneath"
                    : undefined
                }
                onClick={() => {
                  if (card.revealed) {
                    if (activeFlight?.index !== index)
                      setPeeked((current) => (current === index ? null : index));
                  } else if (view.controls.reveal && usable) {
                    setPeeked(null);
                    setSelected(index);
                  }
                }}
                onBlur={() => setPeeked((current) => (current === index ? null : current))}
              >
                <span className="card-underlay" aria-hidden={card.revealed && peeked !== index}>
                  <CardMedia content={card.content} />
                  <span className="card-name">{card.content.name}</span>
                </span>
                {card.revealed && card.identity && (
                  <img
                    className="identity-cover"
                    src={`/art/covers/${card.identity}-${card.coverVariant}.png`}
                    alt=""
                  />
                )}
              </button>
              {selected === index && view.controls.reveal && !card.revealed && !ended && (
                <button
                  className="game-icon-button guess-confirm"
                  disabled={!usable}
                  aria-label={`Confirm guess: ${card.content.name}`}
                  title={`Confirm guess: ${card.content.name}`}
                  onClick={() => {
                    cardButtons.current[index]?.focus();
                    onAction({ type: "reveal", index });
                  }}
                >
                  <GameIcon kind="check" />
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
      {activeFlight && (
        <img
          key={activeFlight.id}
          className="cover-flight"
          src={activeFlight.src}
          alt=""
          aria-hidden="true"
          style={activeFlight.style}
          onAnimationEnd={() =>
            setFlight((current) => (current?.id === activeFlight.id ? null : current))
          }
          onError={() => setFlight((current) => (current?.id === activeFlight.id ? null : current))}
        />
      )}
      {ended && feedback?.result && (
        <div className="win-confetti" aria-hidden="true">
          {Array.from({ length: 20 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  "--piece": index,
                  "--drift": `${((index * 37) % 180) - 90}px`,
                  "--spin": `${index % 2 ? 480 : -420}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
