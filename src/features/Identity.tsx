import type { CardIdentity } from "../shared/protocol";

export function identityName(identity: CardIdentity) {
  return identity === "red"
    ? "Red agent"
    : identity === "blue"
      ? "Blue agent"
      : identity === "neutral"
        ? "Neutral"
        : "Assassin";
}
export function IdentitySymbol({ identity }: { identity: CardIdentity }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      {identity === "red" ? (
        <path d="M6 21V3h13l-4 5 4 5H6" />
      ) : identity === "blue" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </>
      ) : identity === "neutral" ? (
        <path d="m12 2 9 10-9 10L3 12Z" />
      ) : (
        <>
          <path d="M5 14V9a7 7 0 0 1 14 0v5l-3 2v5H8v-5Z" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
          <path d="m12 13-1 2h2ZM11 18v3m3-3v3" />
        </>
      )}
    </svg>
  );
}
