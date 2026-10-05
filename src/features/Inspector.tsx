import { useEffect, useRef, useState } from "react";
import type { RoundView } from "../shared/protocol";
import { CardMedia } from "./CardMedia";
import { IdentitySymbol, identityName } from "./Identity";

export function Inspector({
  card,
  canSelect,
  onSelect,
  onClose,
}: {
  card: RoundView["cards"][number];
  canSelect: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      className="inspector"
      ref={dialog}
      aria-labelledby="inspect-name"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], summary, input:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="inspector-heading">
        <h2 id="inspect-name">{card.content.name}</h2>
        <button autoFocus onClick={onClose}>
          Close
        </button>
      </div>
      <CardMedia content={card.content} playing={playing} />
      <p className="media-description">{card.content.description}</p>
      {card.identity && (
        <p className={`inspector-identity identity-${card.identity}`}>
          <IdentitySymbol identity={card.identity} />
          {identityName(card.identity)}
          {card.revealed ? " · Revealed" : " · Key"}
        </p>
      )}
      <div className="inspector-actions">
        {card.content.kind === "gif" && (
          <>
            <button onClick={() => setPlaying(!playing)}>
              {playing ? "Pause GIF" : "Play GIF"}
            </button>
            <button disabled={!playing} onClick={() => setPlaying(false)}>
              Stop GIF
            </button>
            <span>Silent · pauses to poster</span>
          </>
        )}
        {canSelect && (
          <button
            className="primary"
            onClick={() => {
              onSelect();
              onClose();
            }}
          >
            Select card
          </button>
        )}
      </div>
      {card.content.attribution && (
        <details>
          <summary>Attribution</summary>
          <p>{card.content.attribution}</p>
        </details>
      )}
    </dialog>
  );
}
