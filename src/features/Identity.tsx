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
