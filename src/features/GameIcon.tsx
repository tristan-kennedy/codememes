export function GameIcon({
  kind,
}: {
  kind:
    | "check"
    | "close"
    | "clue"
    | "play"
    | "replay"
    | "plus"
    | "shuffle"
    | "chevron"
    | "sound"
    | "muted";
}) {
  if (kind === "sound" || kind === "muted") {
    return (
      <svg
        className="cartoon-game-icon sound-game-icon"
        viewBox="0 0 34 34"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path fill="var(--color-ink)" d="M4 12h6l9-8v26l-9-8H4Z" />
        <g fill="none">
          <path
            strokeWidth={kind === "sound" ? 5 : 4.5}
            d={kind === "sound" ? "M23 11q6 6 0 12m4-16q8 10 0 20" : "m24 13 7 8m0-8-7 8"}
          />
          <path
            stroke="var(--color-ink)"
            strokeWidth={2}
            d={kind === "sound" ? "M23 11q6 6 0 12m4-16q8 10 0 20" : "m24 13 7 8m0-8-7 8"}
          />
        </g>
      </svg>
    );
  }
  const shapes = {
    clue: "M3 27c8 0 11-3 11-10v-4H8L21 2l11 11h-6v6c0 9-10 14-22 12Z",
    chevron: "m6 10 11 9 11-9 4 5-15 13L2 15Z",
    check: "M4 15 8 11q1-1 2 0l5 5L27 4q1-1 2 0l3 3q1 1 0 2L16 28q-1 1-2 0L4 17q-1-1 0-2Z",
    close: "M8 4 17 12 25 3 31 9 22 18 30 26 24 32 16 23 8 30 2 24 11 16 3 10Z",
    play: "M9 4q-2-1-2 2v22q0 3 3 1l19-11q2-1 0-3Z",
    replay:
      "M29 11C25 2 12 1 5 9C-1 16 2 28 12 31C20 34 28 29 31 23L25 20C23 25 16 28 11 24C6 21 5 14 10 10C14 6 21 7 24 12L18 12L29 21L33 10Z",
    plus: "M12 3 21 4 20 12 30 13 29 22 20 21 19 31 10 30 11 21 2 20 3 11 12 12Z",
  };
  return (
    <svg
      className="cartoon-game-icon"
      viewBox="0 0 34 34"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "shuffle" ? (
        <>
          <path
            fill="none"
            strokeWidth={7}
            d="M4 8h4c8 0 8 18 18 18h4m-6-6 6 6-6 5M4 26h4c8 0 8-18 18-18h4m-6-5 6 5-6 6"
          />
          <path
            className="shuffle-ink"
            fill="none"
            strokeWidth={3.5}
            d="M4 8h4c8 0 8 18 18 18h4m-6-6 6 6-6 5M4 26h4c8 0 8-18 18-18h4m-6-5 6 5-6 6"
          />
        </>
      ) : (
        <path d={shapes[kind]} />
      )}
    </svg>
  );
}
