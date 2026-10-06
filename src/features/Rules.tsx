import { useRef } from "react";
import { GameIcon } from "./GameIcon";

export function Rules() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button className="text-button" ref={trigger} onClick={() => dialog.current?.showModal()}>
        Rules
      </button>
      <dialog
        className="rules-dialog"
        ref={dialog}
        aria-labelledby="rules-title"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            event.currentTarget.close();
        }}
      >
        <div className="rules-heading">
          <h2 id="rules-title">How to play</h2>
          <button
            type="button"
            className="game-icon-button rules-close"
            onClick={() => dialog.current?.close()}
            aria-label="Close rules"
            title="Close rules"
          >
            <GameIcon kind="close" />
          </button>
        </div>
        <h3>Two teams, two roles</h3>
        <p>
          Each team has one spymaster and at least one operative. Spymasters see the complete secret
          key; operatives see only revealed identities. Discuss clues with your friends outside the
          app.
        </p>
        <h3>Give a clue</h3>
        <p>
          The active spymaster gives one word and a count from 0 to 9 or ∞. The number tells the
          team how many cards relate to the clue. A clue cannot match an unrevealed meme's name,
          recognition alias, or a printed word (for example, “fine” in “This is fine”). Your group
          judges broader associations.
        </p>
        <h3>Choose, then reveal</h3>
        <p>
          Active operatives tap or click a card to select it, then press its green check to confirm
          the guess. GIFs play directly on the board. Reveals cannot be undone. A team can guess up
          to the clue number plus one. Zero means avoid related cards; ∞ gives no count. Both allow
          unlimited guesses. After at least one guess, the red X beside the clue ends the turn
          early.
        </p>
        <h3>Pass the turn</h3>
        <p>
          Your own agent allows another guess while guesses remain. A neutral or opposing agent ends
          the turn. Using all allowed guesses also ends the turn. The next team's spymaster gives a
          new clue.
        </p>
        <h3>Win the round</h3>
        <p>
          The starting team has nine agents; the other has eight. Seven cards are neutral and one is
          the assassin. A team wins as soon as all its agents are revealed, even by the other team.
          Revealing the assassin immediately loses the round. Everyone sees the final key.
        </p>
      </dialog>
    </>
  );
}
