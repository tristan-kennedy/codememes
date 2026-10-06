---
version: 1
slug: "src-features-game-tsx"
primary_target: "src/features/Game.tsx"
related_targets: ["src/App.tsx"]
---

# Codememes table and lobby

Status: pale playfield, shared controls and companion lobby implemented, October 5, 2026. Mode: Operate. Primary target: src/features/Game.tsx; related target: src/App.tsx. The matching lobby arrangement is implemented in src/features/Lobby.tsx.

The user pinned a physical card-game table, sparse copy, original AI meme covers and a drag-and-drop lobby. Answers: mixed classics/current references; host moves anyone, others move themselves. Preserve rules, privacy, recovery and deliberate Reveal. Source product/design/deck documents own global details.

## Direction contract

THESIS: The game occupies the screen; cards and pieces carry the experience without a marketing or instructional shell.

OWN-WORLD: Pale off-white playfield, full-height blue-left/red-right gradient and sparse sourced Trollface/Forever Alone/Okay Guy/Me Gusta/Yao Ming SVGs at 7% opacity. Clean white controls, dark ink and Red/Blue accents surround cream printed cards, tan Neutral/charcoal Assassin covers and restrained contact shadows. The user explicitly rejects green felt. Covers retain large faces, simple backgrounds and dominant category color; Assassin is a predominantly black Wojak-style portrait. DESIGN.md records the approved background and supplied cover references.

STORY: Join friends, place your named piece, read a clue, discuss a meme and commit a deliberate guess.

FIRST VIEWPORT: Five-by-five board dominates; small edge tools, compact team/count racks, one flat clue row and a reachable action row. Lobby replaces the board with named role destinations.

FORM: The October 5 user-pinned background revision replaces the green-felt world and overrides the exploratory assignment (seed d55a6ea8). Preserve physical board/card geometry; let controls look like styled UI. The signature accepted reveal settles a cover onto the card; accepted lobby placement settles a player piece. Tap and keyboard are equivalent paths.

FINISH: The user requested minimum direct edits without verification, review, commits or PRs; preserve that authorization boundary. Active media sources remain documented.

The tabletop uses the current sourced 72-family deck, inline GIF animation, neutral operative faces, padded private identity cards and full picture-token covers. Background SVG sources and token prompts remain in shipping-art.json. Latest direct edits were not verified at the user's request; obsolete assets, references and local captures were removed.

Use the board palette throughout this surface: Red dark/primary/light `#8e2927`/`#ff6247`/`#ffa477`; Blue dark/primary/light `#1d507b`/`#0badd7`/`#42d4ea`. The full-height background gradient uses primary colors at 24% edge opacity, fading toward the center.

Latest UI simplification: flat non-card controls and name tags, uppercase card labels, centered entry logo, no repeated Connected/empty-seat/role/instruction/footer copy. Preserve essential actions, applicable You/Host/Offline labels, blocked readiness, recovery and accessible announcements. Latest direct edits were not verified at the user’s request.
