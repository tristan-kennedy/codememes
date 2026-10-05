import { useRef } from "react";

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
      >
        <div className="rules-heading">
          <h2 id="rules-title">How to play</h2>
          <button className="secondary" onClick={() => dialog.current?.close()}>
            Close rules
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
          The active spymaster gives one word and a whole number from 1 to 9. The number tells the
          team how many words relate to the clue. A clue cannot exactly match an unrevealed board
          word. Your group judges broader language disputes.
        </p>
        <h3>Choose, then reveal</h3>
        <p>
          Active operatives select a word locally, then press Reveal to commit it. Reveals cannot be
          undone. A team can guess up to the clue number plus one. After at least one guess, they
          may end their turn early.
        </p>
        <h3>Pass the turn</h3>
        <p>
          Your own agent allows another guess while guesses remain. A neutral or opposing agent ends
          the turn. Using all allowed guesses also ends the turn. The next team's spymaster gives a
          new clue.
        </p>
        <h3>Win the round</h3>
        <p>
          The starting team has nine agents; the other has eight. Seven words are neutral and one is
          the assassin. A team wins as soon as all its agents are revealed, even by the other team.
          Revealing the assassin immediately loses the round. Everyone sees the final key.
        </p>
      </dialog>
    </>
  );
}
