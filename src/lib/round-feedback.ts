import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CardIdentity, RoomView, Team } from "../shared/protocol";

export interface RevealFeedback {
  id: string;
  index: number;
  identity: CardIdentity;
  coverVariant: number;
  sound: "good" | "opponent" | "neutral" | "assassin";
  result: "win" | "loss" | null;
}

// Only a new, contiguous accepted reveal produces feedback. Initial snapshots,
// perspective changes and missed history never replay the round's effects.
export function revealFeedback(
  before: RoomView | null,
  after: RoomView | null,
): RevealFeedback | null {
  if (
    !before?.round ||
    !after?.round ||
    before.phase !== "playing" ||
    before.code !== after.code ||
    before.roundId !== after.roundId ||
    after.revision !== before.revision + 1
  )
    return null;
  const added = after.round.cards.flatMap((card, index) =>
    card.revealed && !before.round!.cards[index]?.revealed ? [index] : [],
  );
  if (added.length !== 1 || !after.round.lastReveal) return null;
  const index = added[0],
    card = after.round.cards[index];
  if (!card.identity || !card.coverVariant) return null;
  const viewerTeam: Team =
    before.players.find((player) => player.id === before.selfId)?.team ??
    after.round.lastReveal.byTeam;
  return {
    id: `${after.roundId}-${after.revision}`,
    index,
    identity: card.identity,
    coverVariant: card.coverVariant,
    sound:
      card.identity === "neutral" || card.identity === "assassin"
        ? card.identity
        : card.identity === viewerTeam
          ? "good"
          : "opponent",
    result: after.round.outcome
      ? after.round.outcome.winner === viewerTeam
        ? "win"
        : "loss"
      : null,
  };
}

function playFeedback(
  context: AudioContext,
  feedback: RevealFeedback,
  voices: Set<OscillatorNode>,
) {
  const tone = (
    frequency: number,
    end: number,
    offset: number,
    duration: number,
    type: OscillatorType = "sine",
  ) => {
    const start = context.currentTime + offset;
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    voices.add(oscillator);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  };
  if (feedback.sound === "good") {
    tone(520, 750, 0, 0.12);
    tone(780, 980, 0.1, 0.18);
  } else if (feedback.sound === "opponent") {
    tone(360, 190, 0, 0.2, "triangle");
    tone(220, 130, 0.13, 0.2);
  } else if (feedback.sound === "neutral") tone(260, 75, 0, 0.12, "triangle");
  else {
    tone(130, 45, 0, 0.4, "sawtooth");
    tone(65, 40, 0.1, 0.35);
  }
  if (feedback.result === "win")
    [523, 659, 784, 1047].forEach((frequency, index) =>
      tone(frequency, frequency, 0.38 + index * 0.1, 0.28, "triangle"),
    );
  else if (feedback.result === "loss") {
    tone(300, 220, 0.4, 0.24, "triangle");
    tone(220, 110, 0.62, 0.3, "triangle");
  }
}

export function useRoundFeedback(view: RoomView | null) {
  const previous = useRef<RoomView | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const voices = useRef(new Set<OscillatorNode>());
  const [feedback, setFeedback] = useState<RevealFeedback | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("codememes.sound") !== "off";
    } catch {
      return true;
    }
  });
  const resumeAudio = useCallback(() => {
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
    } catch {
      /* Audio is optional on unsupported/blocked browsers. */
    }
  }, []);
  useEffect(() => {
    const unlock = (event: Event) => {
      if (!event.isTrusted || !soundEnabled) return;
      resumeAudio();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundEnabled, resumeAudio]);
  useEffect(
    () => () => {
      const context = audio.current;
      audio.current = null;
      void context?.close().catch(() => {});
    },
    [],
  );
  // Publish accepted reveal feedback before paint so the board can hand its cover
  // to the flight without briefly displaying a second, already-placed copy.
  useLayoutEffect(() => {
    const next = revealFeedback(previous.current, view);
    const changedPerspective =
      previous.current?.code !== view?.code ||
      previous.current?.roundId !== view?.roundId ||
      previous.current?.selfId !== view?.selfId;
    previous.current = view;
    if (changedPerspective) setFeedback(null);
    if (!next) return;
    setFeedback(next);
    if (soundEnabled && !document.hidden && audio.current?.state === "running") {
      try {
        playFeedback(audio.current, next, voices.current);
      } catch {
        /* Keep play usable if audio fails. */
      }
    }
  }, [view, soundEnabled]);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const toggleSound = () => {
    const enabled = !soundEnabled;
    if (enabled) resumeAudio();
    else {
      for (const oscillator of voices.current) {
        try {
          oscillator.stop();
        } catch {
          /* An already-ended voice is silent. */
        }
      }
      voices.current.clear();
    }
    try {
      localStorage.setItem("codememes.sound", enabled ? "on" : "off");
    } catch {
      /* Session preference still works. */
    }
    setSoundEnabled(enabled);
  };
  return { feedback, soundEnabled, toggleSound };
}
