# Product

<!-- impeccable:product-schema 1 -->

This is the agreed planning baseline for a Codenames-style clone. The user delegated product and design decisions with simplicity as the priority. The choices below are project decisions, not claims about an implemented app.

## Platform

web

## Stack

Delegated: React and TypeScript with Vite, using Vite+ (`vp`) for package management and development tooling as in Golf Club Curator. Use plain CSS, one Cloudflare Worker with Static Assets, and one SQLite-backed Durable Object per room with native hibernating WebSockets. Keep one package and deployment; no monorepo packages, component framework, authentication service, or external database at launch. [ARCHITECTURE.md](ARCHITECTURE.md) records the concrete boundaries and current plan research.

This is a future stack choice only. No application scaffold, dependencies, Cloudflare resources, or deployment is established yet. Node.js runs local tooling; Cloudflare's Workers runtime runs the application backend. Workers Free supports this baseline within its quotas.

## Users

Friends playing a casual word-association game together, either remotely on a voice call or in the same room using their own devices. Design for four to twelve players, including people who have never played before. Phones, tablets, and desktop browsers share the same game.

The host starts and restarts rounds. Each of two teams has one spymaster who gives clues and at least one operative who guesses.

## Product Purpose

Let a group create a private room, share a link, choose teams, and play a complete word game with very little setup. Success means the group spends its time discussing clues instead of managing the interface.

## Positioning

A small, account-free game for an existing group of friends. One shared board and private spymaster information are the core experience. Competition, discovery, profiles, and social networking are outside the product.

## Operating Context

1. The host creates a room and enters a display name. The room has an unguessable invite link and a short join code.
2. Friends join by link or code, enter a name, and choose Red or Blue and a role. The host may adjust the lobby roster. Duplicate names are disambiguated visibly.
3. The host starts once each team has exactly one spymaster and at least one operative. The starting team is chosen randomly.
4. The active spymaster submits a clue and number. Their operatives discuss it outside the app and reveal guesses in the app.
5. Play alternates until a team wins or reveals the assassin. The final board is visible to everyone; the host can start a new round with the same roster.

There is no built-in chat, voice, tutorial tour, or turn timer. A short Rules panel explains roles, clues, guesses, and victory. Late arrivals can watch the public board and take a playing seat between rounds.

## Capabilities and Constraints

### One ruleset

- Each round has twenty-five distinct English words in a fixed five-by-five board. Board positions stay fixed through the round.
- The starting team has nine agents; the other has eight. Seven cards are neutral and one is the assassin.
- Both spymasters see the complete key. Operatives and viewers see only words and already revealed identities.
- A clue is one word and a whole number from one through nine. No zero or unlimited clues in the initial version. Reject an empty clue, multiple words, or an exact case-insensitive match to an unrevealed board word. The group judges broader language disputes; no dictionary or semantic policing.
- The active team's operatives may reveal up to the clue number plus one cards. They may end the turn after at least one guess. A correct own-team reveal allows another guess while the allowance remains.
- A neutral or opposing agent ends the turn. Revealing the assassin immediately loses the round. A team wins as soon as all of its agents are revealed, including when the other team reveals its last agent.
- No undo, voting, hints, scoring across rounds, or custom rules. Selecting a card previews that player's choice; an explicit Reveal action commits it. Selection is not a team vote.
- Use a small, curated, locally maintained English word list. Avoid slurs, needlessly explicit words, and ambiguous duplicates. Do not copy a commercial game's word list or assets.

### Rooms and authority

- Rooms are intended for friends, accessible by invite rather than listed publicly. Invites grant access; there are no passwords, accounts, profiles, or durable identities.
- The server owns the key, turn, clue, revealed cards, and outcome. Every action validates the player's room seat, role, active turn, and current round revision.
- Hidden identities never reach an operative or viewer through HTML, page data, network messages, logs, or client storage. A role change is not a client-side toggle. Host privileges do not grant the key.
- Lock team and spymaster assignments during a round. Watchers may take seats only in the next lobby. A disconnected spymaster retains their seat; their team waits for reconnection or the host abandons the round back to the lobby.
- Persist the current room in its Durable Object's SQLite-backed storage so hibernation, eviction, or runtime restart does not end the game. Rooms remain temporary through explicit expiry. Refresh or a brief disconnect can reclaim the same seat with a room-scoped browser cookie while the room exists. Reconnect fetches current state instead of replaying pending guesses.
- Reject stale or duplicate reveal submissions and return current state. Disable game actions while disconnected; never speculate that a card was revealed successfully.
- If the host leaves, transfer host controls to the earliest remaining connected seated player. An empty room expires after one hour; a room expires after twenty-four hours without activity. These limits also apply to an abandoned round. Show an expired-room message with Create a room as recovery.

### Scope boundaries

The initial release is private multiplayer with one English ruleset. Exclude matchmaking, public room directories, bots or AI spymasters, accounts, payments, rankings, achievements, saved game history, custom word packs, localization, native apps, spectators with extra controls, and production analytics.

## Brand Commitments

**Codenames** is the repository and working project name. The product is an independent Codenames-style game; no official affiliation is claimed. Create original identity and interface assets. Public branding can be decided before release without reopening the game rules.

## Voice and Tone

Use short, friendly, literal language: Create a room, Join room, Give clue, Reveal, End turn, Play again. Explain whose turn it is and what the current player can do. Recovery messages state what happened and give one useful next action. Avoid spy-themed jargon in essential controls.

## Accessibility & Inclusion

Core flows work with keyboard and touch. Give cards meaningful accessible names, preserve visible focus, and announce turn changes and committed reveals without noisy repeated announcements. Team and card identity use text or symbols as well as color. Keep the board readable on a narrow phone, support reduced motion, and avoid time pressure.

## Evidence on Hand

This repository contains planning and contribution documentation, GitHub configuration, and a project-local Impeccable skill. There is no playable game, final word list, visual implementation, user research, usage data, or deployment. The GitHub Project starts empty; no implementation issues or stories are authorized by this setup.

## Product Principles

- Get an existing group into the game quickly.
- Keep the board and current turn understandable at a glance.
- Protect the key and make irreversible guesses deliberate.
- Prefer one clear rule and one useful recovery path over settings and automation.
- Add infrastructure only when a demonstrated need justifies it.
