import type { Recognition } from "../src/shared/protocol";

export const CONTENT_VERSION = "deck-2026-10-05";
export interface CatalogEntry {
  recognition: Recognition;
  aliases: string[];
  visibleWords: string[];
  provenance: { curated: string; era: "classic" | "recent"; representation: string };
}
// Phrases are intentional recognition representations, never ordinary noun filler.
// Classic and recent refer to the reference's era, not a live popularity ranking.
const phrases: [string, string, string[], "classic" | "recent"][] = [
  ["this-is-fine", "This is fine", ["fine"], "classic"],
  ["one-does-not", "One does not simply", ["boromir"], "classic"],
  ["much-wow", "Such wow. Much amaze.", ["doge", "much wow"], "classic"],
  ["distracted-boyfriend", "Distracted boyfriend", ["distracted boyfriend"], "classic"],
  ["change-my-mind", "Change my mind", ["change my mind"], "classic"],
  ["surprised-pikachu", "Surprised Pikachu", ["shocked pikachu"], "classic"],
  ["expanding-brain", "Expanding brain", ["galaxy brain"], "classic"],
  ["woman-yelling-cat", "Woman yelling at a cat", ["smudge"], "classic"],
  ["distracted-math", "Confused math lady", ["math lady", "confused lady"], "classic"],
  ["hide-the-pain", "Hide the pain Harold", ["harold"], "classic"],
  ["success-kid", "Success kid", ["success baby"], "classic"],
  ["drake-hotline", "Drake approves", ["drake", "hotline bling"], "classic"],
  ["rickroll", "Never gonna give you up", ["rickroll", "rickrolling"], "classic"],
  ["all-your-base", "All your base are belong to us", ["all your base"], "classic"],
  ["ceiling-cat", "Ceiling cat is watching you", ["ceiling cat"], "classic"],
  ["nyan-cat", "Nyan cat", ["nyan"], "classic"],
  ["keyboard-cat", "Play him off, keyboard cat", ["keyboard cat"], "classic"],
  ["is-this-pigeon", "Is this a pigeon?", ["pigeon"], "classic"],
  ["two-buttons", "Two buttons, one sweaty choice", ["two buttons"], "classic"],
  ["stonks", "Stonks", ["stonk"], "classic"],
  ["always-has-been", "Always has been", ["wait it's all"], "classic"],
  ["they-same", "They're the same picture", ["same picture"], "classic"],
  ["we-have-home", "We have that at home", ["at home"], "classic"],
  ["uno-reverse", "UNO reverse card", ["reverse card"], "classic"],
  ["let-him-cook", "Let him cook", ["cooking"], "recent"],
  ["girl-dinner", "Girl dinner", ["girl dinner"], "recent"],
  ["very-demure", "Very demure, very mindful", ["demure", "mindful"], "recent"],
  ["side-eye", "Bombastic side eye", ["side eye"], "recent"],
  ["fries-bag", "Just put the fries in the bag", ["fries in the bag"], "recent"],
  ["aura-farming", "Aura farming", ["aura"], "recent"],
  ["six-seven", "Six seven", ["67", "sixseven"], "recent"],
  ["delulu", "Delulu is the solulu", ["delulu", "solulu"], "recent"],
  ["main-character", "Main character energy", ["main character"], "recent"],
];
function words(value: string): string[] {
  return value.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? [];
}
export const DECK: readonly CatalogEntry[] = [
  ...phrases.map(([id, phrase, aliases, era]) => ({
    recognition: {
      id,
      family: id,
      name: phrase,
      description: `Printed phrase: ${phrase}`,
      kind: "phrase" as const,
      phrase,
      width: 600,
      height: 400,
    },
    aliases,
    visibleWords: words(phrase),
    provenance: {
      curated: "2026-10-05",
      era,
      representation:
        "Recognition phrase; original typesetting, no third-party image redistributed.",
    },
  })),
  ...(
    [
      [
        "press-f",
        "Press F to pay respects",
        "image",
        "press-f.webp",
        undefined,
        ["press f"],
        "Original lettered keyboard-key graphic; no game screenshot.",
      ],
      [
        "404",
        "404 Not Found",
        "image",
        "404.webp",
        undefined,
        ["404", "not found"],
        "Original error-message typography; no operating-system screenshot.",
      ],
      [
        "dvd-screensaver",
        "DVD screensaver",
        "gif",
        "dvd.gif",
        "dvd-poster.webp",
        ["bouncing dvd", "dvd"],
        "Original gently bouncing DVD lettering; no copied logo. 10 fps, no flashes or audio.",
      ],
    ] as const
  ).map(([id, name, kind, asset, poster, aliases, representation]) => ({
    recognition: {
      id,
      family: id,
      name,
      description:
        kind === "gif"
          ? "DVD lettering gently bounces around a dark screen."
          : `Printed graphic: ${name}`,
      kind,
      phrase: name,
      asset: `/media/${CONTENT_VERSION}/${asset}`,
      ...(poster ? { poster: `/media/${CONTENT_VERSION}/${poster}` } : {}),
      width: 600,
      height: 400,
      attribution:
        "Original Codememes graphic, 2026. CC0 1.0. Reference names identify internet memes; no affiliation.",
    },
    aliases: [...aliases],
    visibleWords: words(name),
    provenance: { curated: "2026-10-05", era: "classic" as const, representation },
  })),
];

// Explicit allowlist also protects against future curator fields being persisted/public.
export function recognitionView(source: Recognition): Recognition {
  return {
    id: source.id,
    family: source.family,
    name: source.name,
    description: source.description,
    kind: source.kind,
    phrase: source.phrase,
    width: source.width,
    height: source.height,
    ...(source.asset ? { asset: source.asset } : {}),
    ...(source.poster ? { poster: source.poster } : {}),
    ...(source.attribution ? { attribution: source.attribution } : {}),
  };
}
export function legacyRecognition(word: string, index: number): Recognition {
  return {
    id: `legacy-${index}`,
    family: `legacy-${index}`,
    name: word,
    description: `Printed word: ${word}`,
    kind: "phrase",
    phrase: word,
    width: 600,
    height: 400,
  };
}
export function normalizeRecognition(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[’]/g, "'").trim();
}
