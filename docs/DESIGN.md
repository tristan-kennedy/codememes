---
name: Codenames
description: A clear, sociable visual direction for a private word game.
---

<!-- SEED: established under the user's delegated design authority before implementation; re-run $impeccable document once there is code to capture actual tokens and components. -->

# Design System: Codenames

## Overview

**Creative North Star: "The Game Table"**

Make the app feel like sitting down to a well-arranged game with friends. A crisp, pale slate ground, white word tiles, dark readable type, and committed red and blue team colors create the identity. The words and revealed identities carry the visual interest. Use original graphics only where they help explain play; the initial direction needs no illustrations or image assets.

The same system serves entry, the lobby, live play, rules, and the result. Its personality comes from generous word lettering, exact alignment, and one signature move: a committed guess changes a word tile into an unmistakable identity tile. Familiar controls and a stable board keep attention on the conversation. No marketing hero, dashboard shell, spy-terminal styling, or decorative status furniture.

**Key Characteristics:**

- A clear shared table with strong word hierarchy.
- Red and blue reserved for teams, paired with explicit names and symbols.
- Flat surfaces, restrained borders, and shallowly rounded tiles.
- Stable card positions and short, purposeful state changes.
- A readable public board and a clearly identified private spymaster view.

This is a directional seed. Nothing here is extracted from a running interface. Exact colors, type sizes, spacing, and component tokens will be measured and recorded during implementation.

## Colors

Use cool light neutrals as the quiet base and red and blue as semantic team colors. The working interface has enough contrast to remain readable on a phone in an ordinary room.

### Primary

Dark ink carries headings, ordinary text, and primary actions that belong to neither team. A primary action must stay recognizable when the active team changes.

### Secondary

Red and Blue identify teams in the roster, turn summary, remaining-agent counts, and card identities. Each has a legible text treatment on its light or saturated surface. Always pair team color with the team name, a simple distinct symbol, or an accessible label.

### Neutral

Pale slate provides the page ground; clean white provides unrevealed word tiles. Neutral revealed cards use a visibly different muted surface with a Neutral label. The assassin uses a dark surface, contrasting text, and an explicit Assassin mark. Selection and keyboard focus remain distinct from a revealed identity.

Exact palette values are to be resolved during implementation and checked in their real combinations. Color must never be the only indication of role, selection, turn, connection, or outcome.

## Typography

Use one system sans-serif stack throughout. A custom font is unnecessary for the first release. Words get the strongest weight and largest practical size; game status comes next; explanations and secondary controls stay quieter.

Keep board words as text, never baked into images. Present board words in uppercase while preserving normal sentence case in the surrounding interface. Choose word-list lengths and responsive type together so every card stays readable without truncation. Ordinary copy targets a comfortable reading size; compact labels remain legible instead of becoming decorative microtype.

Use tabular numerals for remaining-agent counts and the clue allowance. A clue reads as one phrase with its number, with clear separation from team scores. Names may wrap or truncate with their full accessible label; board words may not.

## Layout

Use a shallow page structure rather than persistent application navigation. The live game leads with room identity and invite access, then the current team, clue or required action, and remaining-agent counts. The five-by-five board is the largest region. Supporting controls, roster, and rules stay nearby without competing with the words.

On a wide screen, place the board beside a narrow supporting column. On a phone, place the current turn and clue above the board and secondary information below it. Keep the board in five columns at every width; never reorder cards, turn it into a carousel, or require horizontal scrolling. All twenty-five cards remain discoverable, even when vertical scrolling is necessary. Verify at a narrow phone width and with longer real words.

Use consistent spacing and alignment, with more room between sections than inside a group. Entry presents Create a room and Join room directly. The lobby groups each team's people and roles visibly, with start readiness beside Start game. Rules open as a small readable panel and restore focus to their trigger. Final results retain the board and give the host Play again without adding a separate results dashboard.

## Elevation & Depth

Keep the interface flat. Separation comes from spacing, tonal surfaces, and quiet borders. Word tiles do not jump, tilt, glow, or rise on hover. Use a backdrop only for an actual dialog. Avoid gradients, glass, heavy shadows, textured paper, and ornamental layers.

The identity change after Reveal is the one expressive transition: a short fill-and-label change while the word remains readable. Reduced motion makes the same update immediate. No card-flip sequence, confetti, looping effects, or animations that delay the next move.

## Shapes

Word tiles are evenly sized rectangles with modest rounded corners. Buttons and fields share a similarly restrained corner language. Cards retain their dimensions in selected, revealed, disabled, and focused states. Borders and focus outlines do not change layout.

The private key stays on the same grid as the public board. Spymaster identity information is an intentional persistent label and surface treatment, never a tooltip, a hover-only reveal, or a tiny corner dot. Private-view labeling is visible near the board.

## Do's and Don'ts

### Do

- **Do** make the words and next permitted action the clearest elements.
- **Do** retain card position and word visibility through every state.
- **Do** label Red, Blue, Neutral, and Assassin using more than color.
- **Do** distinguish local selection, committed reveal, keyboard focus, and disconnection.
- **Do** provide deliberate touch targets and a visible Reveal confirmation with the selected word.
- **Do** test actual words, longer names, narrow screens, keyboard use, and reduced motion before recording final tokens.

### Don't

- **Don't** add ornamental badges, extra navigation, or nested cards around every group.
- **Don't** use team color as a generic success/error palette or hide the active team in subtle styling.
- **Don't** hide essential information behind hover or rely on decorative icons without labels.
- **Don't** animate unrevealed cards in ways that imply a hidden identity.
- **Don't** invent live gameplay screenshots, user counts, or social proof.
- **Don't** introduce a component library, theme switcher, or elaborate asset pipeline just to realize this direction.
