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
---

# Design System: Codenames

## Overview

**Creative North Star: "The Game Table"**

A clear shared table for friends. The entry and lobby implement the established seed: pale slate ground, white controls, dark readable type, and committed Red and Blue surfaces. Original paired rectangular marks identify the working product without illustration, decorative furniture, or a marketing shell. System sans-serif typography follows the agreed product constraint.

Tokens above are extracted from [src/styles.css](../src/styles.css). The [.impeccable/design.json](../.impeccable/design.json) sidecar records focus, motion, breakpoints, and component snippets. Game-board, clue, reveal, and result descriptions below preserve the intended direction and do not claim implemented game UI.

**Key Characteristics:**

- Flat, readable surfaces with explicit team names.
- Generous separation between tasks; compact grouping within a player row.
- Persistent, wrapping names and native team/role controls.
- A single quiet page with clear connection and readiness feedback.

## Colors

Dark Ink drives text and primary actions. Slate ground and White controls support the table. Muted Slate remains readable for explanations and presence. Deep Red and Deep Blue identify teams on pale matching surfaces; text labels always accompany color. Violet is reserved for the visible focus outline. Generic errors use a pale amber surface with dark ink rather than misusing a team color.

The current palette uses hex values as its source of truth. Do not introduce gradients, glass, texture, or shadowed panels. Future revealed identities need explicit Red, Blue, Neutral, and Assassin labels and readable surfaces.

## Typography

Use one system sans-serif stack throughout. Headings use the implemented 2–3rem responsive scale, weight 750, and slightly tight tracking. Body text is 1rem with 1.55 line height; supporting text ranges from 0.8125–0.9375rem. Team headings are 1.35rem. Names wrap with `overflow-wrap: anywhere`; full names remain exposed to accessibility APIs. Codes use tabular numerals and grouping, without monospace decoration.

Future board words remain real uppercase text and may never truncate. Their practical scale must be verified against the eventual word list and five-column board.

## Layout

The entry is centered in a 480px task column within a 760px page. It gives Create and Join direct, adjacent choices, then the name/code form and one primary action. The lobby is a 1160px table: heading/code, invite, team groups, unassigned seats, readiness, and role explanation. The host sees native controls on every player; guests see controls only for their own seat.

Teams are side by side above 800px and stacked below. At 540px the invite actions stack and player controls use a full row. Page padding is 24px on desktop and 16px on phones. Every button/select has a 44px minimum height. The 320px lobby supports wrapping names without horizontal scrolling.

Future boards retain five fixed columns and stable positions at every width. Supporting content follows the board on phones and sits beside it on wider screens. Never reorder cards or put the board in a carousel.

## Elevation & Depth

The implemented interface is flat. Spacing, quiet 1px borders, and tonal team surfaces provide separation. No shadows or decorative layers exist. Use a backdrop only for an actual focused dialog.

## Shapes

Controls and team surfaces share a restrained 6px radius. The paired identity mark has small 2px corners. Visible focus uses a 3px outline with a 3px offset and never changes layout. Future word tiles retain equal dimensions through selection, reveal, disabled, and focus states.

## Components

Primary buttons use Dark Ink with white text; secondary buttons use White with quiet borders. Hover changes fill over 140ms with exponential ease-out; reduced motion removes the transition. Inputs and native selects share text, border, padding, and focus treatment. Labels remain visible except full player-specific select labels that use the standard visually hidden pattern.

Team groups contain role headings and simple player lists, without nested cards. Presence is literal Connected/Offline text. Loading, rejected commands, connection loss, and takeover have useful messages; roster controls stay disabled until a usable connection and while awaiting acknowledgement. Readiness explains the missing or extra roles. The native details element provides a small role explanation.

The future committed reveal remains the planned signature interaction: a short fill-and-label change that keeps each word readable, immediate under reduced motion. It is not implemented in the lobby.

## Do's and Don'ts

- **Do** retain the product's direct language and native keyboard/touch affordances.
- **Do** distinguish team, role, host, connection, and permitted controls explicitly.
- **Do** keep long names readable and public identity separate from server authority.
- **Do** verify actual content at desktop and 320px widths before extending tokens.
- **Don't** add ornamental badges, persistent navigation, nested panels, or spy-terminal styling.
- **Don't** use color alone to indicate identity, selection, connection, or outcome.
- **Don't** introduce a font pipeline, component framework, gradients, glass, or shadows.
- **Don't** imply that planned boards, key views, or reveal transitions already exist.
