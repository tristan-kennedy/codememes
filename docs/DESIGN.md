---
name: Codenames
description: A clear, sociable table for a private word game.
colors:
  ink: "#182733"
  muted: "#536572"
  ground: "#eef2f5"
  surface: "#ffffff"
  border: "#becad2"
  red: "#a52b36"
  red-surface: "#fff1f1"
  blue: "#1c5799"
  blue-surface: "#edf5ff"
  focus: "#6553a6"
  selection: "#cfdae5"
  control-hover: "#e1e8ed"
  primary-hover: "#2d4354"
  error-surface: "#fff8df"
  error-border: "#b89c46"
  neutral-surface: "#f2efe6"
  dialog-backdrop: "rgb(24 39 51 / 0.45)"
typography:
  heading:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  team-title:
    fontSize: "1.35rem"
  brand:
    fontSize: "1.15rem"
  intro:
    fontSize: "1.125rem"
  supporting:
    fontSize: "0.9375rem"
  label:
    fontSize: "0.875rem"
  metadata:
    fontSize: "0.8125rem"
  board-word:
    fontSize: "clamp(0.6875rem, 2.75vw, 1.25rem)"
    fontWeight: 750
    lineHeight: 1.2
  board-identity:
    fontSize: "clamp(0.5625rem, 1.4vw, 0.8125rem)"
    lineHeight: 1.2
  board-state:
    fontSize: "clamp(0.5625rem, 1.3vw, 0.75rem)"
    lineHeight: 1.2
  turn-title:
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
  agent-count:
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.2
rounded:
  control: "6px"
  mark: "2px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  word-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 4px"
  word-tile-selected:
    backgroundColor: "{colors.selection}"
  word-tile-red-revealed:
    backgroundColor: "{colors.red}"
    textColor: "{colors.surface}"
  word-tile-blue-revealed:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.surface}"
---

# Design System: Codenames

## Overview

**Creative North Star: "The Game Table"**

A clear shared table for friends. The entry and lobby implement the established seed: pale slate ground, white controls, dark readable type, and committed Red and Blue surfaces. Original paired rectangular marks identify the working product without illustration, decorative furniture, or a marketing shell. System sans-serif typography follows the agreed product constraint.

Tokens above are extracted from [src/styles.css](../src/styles.css). The [.impeccable/design.json](../.impeccable/design.json) sidecar records focus, motion, breakpoints, and component snippets. Entry, lobby, board, clue/reveal controls, results, Rules, and recovery/waiting feedback now implement this world.

**Key Characteristics:**

- Flat, readable surfaces with explicit team names.
- Generous separation between tasks; compact grouping within a player row.
- Persistent, wrapping names and native team/role controls.
- A single quiet page with clear connection, turn, and accepted-action feedback.
- Stable five-column words, private-key warning, and deliberate local selection.

## Colors

Dark Ink drives text and primary actions. Slate ground and White controls support the table. Muted Slate remains readable for explanations and presence. Deep Red and Deep Blue identify teams on pale matching surfaces; text labels always accompany color. Violet is reserved for the visible focus outline. Generic errors use a pale amber surface with dark ink rather than misusing a team color.

The current palette uses hex values as its source of truth, with the actual translucent dialog backdrop retained as RGB. Do not introduce gradients, glass, texture, or shadowed panels. Private Red/Blue identities use pale matching surfaces; committed reveals use deep team fills and white text. Neutral uses warm off-white; Assassin uses Ink and White. Explicit identity and revealed labels accompany color. Selected public words use slate fill and an Ink border; disabled board tiles retain full opacity for reading.

## Typography

Use one system sans-serif stack throughout. Headings use the implemented 2–3rem responsive scale, weight 750, and slightly tight tracking. Body text is 1rem with 1.55 line height; supporting text ranges from 0.8125–0.9375rem. Team headings are 1.35rem. Names wrap with `overflow-wrap: anywhere`; full names remain exposed to accessibility APIs. Codes use tabular numerals and grouping, without monospace decoration.

Board words are real uppercase text and never truncate. The original source list uses words up to six letters; all fit the five-column board at 320px. Word size scales from 11px to 20px, with weight 750 and line height 1.2. Identity/state labels scale from 9px to 13px/12px. Team counts use tabular numerals at 1.75rem; turn headings scale from 1.5rem to 2rem.

## Layout

The entry is centered in a 480px task column within a 760px page. It gives Create and Join direct, adjacent choices, then the name/code form and one primary action. The lobby is a 1160px table: heading/code, invite, team groups, unassigned seats, readiness, and role explanation. The host sees native controls on every player; guests see controls only for their own seat.

Teams are side by side above 800px and stacked below. At 540px the invite actions stack and player controls use a full row. Page padding is 24px on desktop and 16px on phones. Every button/select has a 44px minimum height. The 320px lobby supports wrapping names without horizontal scrolling.

Boards retain five fixed columns and stable positions at every width. Tiles have 120px minimum height on desktop and 92px on phones; gaps change from 8px to 4px below 540px. Turn/count/clue information precedes the board; roster/supporting content follows. The operative confirmation action stays above the board with sticky positioning and wraps on phones. Never reorder cards or put the board in a carousel.

## Elevation & Depth

The implemented interface is flat. Spacing, quiet 1px borders, and tonal team surfaces provide separation. No shadows or decorative layers exist. Use a backdrop only for an actual focused dialog.

## Shapes

Controls, tiles, dialogs, and team surfaces share a restrained 6px radius. The paired identity mark has small 2px corners. Visible focus uses a 3px outline with a 3px offset and never changes layout. Word tiles retain equal dimensions through selection, reveal, disabled, and focus states; their fixed 2px border carries selection without changing geometry.

## Components

Primary buttons use Dark Ink with white text; secondary buttons use White with quiet borders. Hover changes fill over 140ms with exponential ease-out; reduced motion removes the transition. Inputs and native selects share text, border, padding, and focus treatment. Labels remain visible except full player-specific select labels that use the standard visually hidden pattern.

Team groups contain role headings and simple player lists, without nested cards. Presence is literal Connected/Offline text. Loading, rejected commands, connection loss, and takeover have useful messages; roster controls stay disabled until a usable connection and while awaiting acknowledgement. Readiness explains the missing or extra roles. The native details element provides a small role explanation.

Recovery preserves the accepted board while actions pause and automatic backoff checks the room. The banner names Reconnecting, terminal takeover, unavailable connection, or expiry literally, with one relevant recovery action. A disconnected active spymaster is named in a quiet waiting row with saved-seat instructions. It uses existing type/color tokens, 16px margin/padding, 1px borders, wrapping text, and a 70ch reading width. Connection loss clears local selection; returning socket snapshots determine roles, host, and permitted actions.

The committed reveal is a short 140ms fill/color change with exponential ease-out that keeps each word readable; the revealed label and counts update only after server acceptance. Reduced motion makes tile/control changes immediate. Local selection sends no update and names the chosen word beside explicit Reveal; revision changes clear that choice. The active spy has a clue/number form; accepted clues shrink and wrap within the available width, exposing every character without truncation. Other players receive concise role/turn instructions. The final board exposes every identity with a literal winner and reason.

Play again remains below the existing final board, with one host action and a short return-to-lobby explanation. Host abandonment appears beside the missing-spymaster waiting signal with explicit board-discard/group-preservation copy. Action rows use existing primary/secondary buttons, flex wrapping, a 16px gap, 24px vertical margin, and a 70ch reading width. They wrap naturally on phones. Accepted return focuses the Team lobby heading, preserves the roster/invite, and removes old board/clue/private state. A fresh UUID mounts a new board with reset selection/clue inputs and focuses its turn heading. Watchers see their current role explicitly in the lobby's native role select before choosing a playing role.

Rules uses a native modal dialog to protect reading focus, with an explicit Close rules button, Escape dismissal, and focus returned to Rules. Accepted reveal/turn announcements use one restrained live region; no typing/selection/presence chatter is announced.

## Do's and Don'ts

- **Do** retain the product's direct language and native keyboard/touch affordances.
- **Do** distinguish team, role, host, connection, and permitted controls explicitly.
- **Do** keep long names readable and public identity separate from server authority.
- **Do** verify actual content at desktop and 320px widths before extending tokens.
- **Don't** add ornamental badges, persistent navigation, nested panels, or spy-terminal styling.
- **Don't** use color alone to indicate identity, selection, connection, or outcome.
- **Don't** introduce a font pipeline, component framework, gradients, glass, or shadows.
- **Don't** imply deployed availability or round history exists.
