# Product: Codememes

<!-- impeccable:product-schema 1 -->

Codememes is a private, account-free meme association game for friends. It keeps the existing two-team clue-and-guess rules, replacing the noun deck with recognizable memes and presenting the game as physical cards on a shared table.

The latest October 5 direct request supersedes the earlier text/inspection/motion requirements below: new rounds use 72 references with local images or GIFs, never text-only catalog entries. GIFs animate on the board without an inspector. Tap/click selects directly on every screen size; Reveal remains explicit. Full identity-colored cards and name strips replace the private-key corner icons. No new verification was requested for these edits; prior evidence applies only to unchanged behavior.

This direction supersedes the original word-game product and visual baseline, agreed October 5, 2026. Entry, synchronized lobbies, complete meme rounds, sourced media cards, original illustrated covers, tabletop styling, recovery/expiry, and subsequent rounds with the same group are implemented. Named player pieces can be dragged from anywhere on their tags; the host may also randomize teams and roles. The server rejects occupied spymaster placements without swapping or demoting the incumbent.

The user's subsequent October 5 visual revision replaces green felt with the supplied pale background: blue light from the left edge, red from the right, and sourced Trollface, Forever Alone, Okay Guy, Me Gusta and Yao Ming SVGs. The latest request removes white SVG backgrounds, softens the faces, softens the full-height Blue-left/Red-right gradient and shares the board�s three-shade team palettes throughout the UI, and removes unused reference assets, posters and compatibility media because nothing is deployed. Keep the physical game board/cards and original illustrated covers; use clean, styled white UI surfaces with readable dark text and red/blue accents. [DESIGN.md](DESIGN.md) and the Impeccable sidecar own the updated tokens and implementation status.

## Platform

web

## Stack

React and TypeScript with Vite, using Vite+ (`vp`) for package management and development tooling. Plain CSS, one Cloudflare Worker with Static Assets, and one SQLite-backed Durable Object per room with native hibernating WebSockets. Keep one package and deployment; no component framework, authentication service, or external database at launch. [ARCHITECTURE.md](ARCHITECTURE.md) records existing boundaries and plan research.

Meme metadata is curated with the application in one current catalog. Sourced images and animation files are served as application assets and replaced in place without artwork/deck versions or compatibility retention; no live internet search or third-party media API is needed during play. [MEME-DECK.md](MEME-DECK.md) defines the content contract. Node.js runs local tooling; the Workers runtime runs the backend. No Cloudflare service or deployment has been created.

## Users

Friends playing on a voice call or in the same room on their own devices. Design for four to twelve players, including first-time players, across phones, tablets, and desktops.

The deck mixes internet classics with current memes. Shared recognition and associations are the fun; knowing every meme is not a prerequisite. An identifiable name and a sourced image or GIF establish the reference without explaining its history.

The host starts and restarts rounds. Each team has one spymaster who gives clues and at least one operative who guesses.

## Product Purpose

Get an existing group from an invite into a complete meme game with very little setup. The board feels like a real game laid out on a table. Success means time spent making associations, laughing, and discussing clues instead of managing controls or reading interface copy.

## Positioning

A small social game for an existing group of friends. One shared board and private spymaster information are the core experience. The website opens directly into creating or joining a game; the game itself is the visual centerpiece. Competition, discovery, profiles, and social networking are outside the product.

## Operating Context

1. Enter a display name on the main page to create a room. The room has an unguessable invite link.
2. Open an invite link and enter a name to join its room. The same name form handles both entry points; there is no Create/Join choice or manual code entry. In the lobby, move your named player piece into Red or Blue, choosing its spymaster slot or operative area. Players move themselves; the host can move anyone. An unassigned/watch area is available. Duplicate names stay visibly disambiguated.
3. The host starts once each team has exactly one spymaster and at least one operative. The starting team is random. A drag never starts a round automatically.
4. The active spymaster gives one word and a number. Their operatives discuss it outside the app, select a meme card locally, and explicitly reveal it. GIFs play on the board; tap/click selects locally and Reveal commits.
5. Play alternates until a team wins or reveals the assassin. The final board stays visible with a small result and host Play again action. Play again returns this group to the lobby; Start creates a fresh board after teams are ready.

No built-in chat, voice, tutorial tour, or turn timer. Rules open only when needed. Late arrivals watch the public board and can take a playing seat between rounds.

## Capabilities and Constraints

### One ruleset, meme content

- Each round has twenty-five distinct meme references in a fixed five-by-five board. Positions and content remain fixed through the round. Each meme has a sourced image or GIF.
- The starting team has nine agents; the other has eight. Seven cards are neutral and one is the assassin. Media type and meme subject have no relationship to the randomly assigned identity.
- During play, both spymasters see the complete key; operatives and viewers see meme faces and revealed identities only. Once the round ends, every seat receives the complete key for the final board. Identity covers are a separate layer, not the playable memes. Covers use eight distinct meme characters per team plus a ninth double-agent character in both colors, seven distinct neutral characters and one assassin. Each round independently shuffles these covers without repeats within an identity and persists each choice. Cover variants reach clients only after reveal, independent of board position and playable meme.
- A clue remains one word and a whole number from one through nine. No zero or unlimited clues. The server rejects a normalized, case-insensitive exact match to an unrevealed card's canonical name, a curated recognition alias, or a standalone word visibly printed in its phrase/caption. For example, `fine` is blocked by an unrevealed "This is fine" card; `fire` is judged by the group. Curators explicitly record visible words; no OCR or semantic policing runs during play. Legacy word boards retain their exact board-word exclusions.
- Operatives may reveal up to the clue number plus one cards. They may end the turn after at least one guess. A correct own-team reveal allows another guess while allowance remains.
- A neutral or opposing agent ends the turn. The assassin immediately loses the round. A team wins as soon as all its agents are revealed, including when the other team reveals its last agent.
- No undo, voting, hints, scoring across rounds, or custom rules. Selecting previews only that player's choice; explicit Reveal commits it. Selection is not a team vote.

### Meme deck and media

- One curated English deck mixes classics and recent references. Use a sourced image or GIF that makes each meme recognizable on the board.
- Each reference has a stable ID, canonical recognition name, accessible description, approved representation, and fallback. Avoid duplicate templates disguised as separate captions in one board. Names identify memes; they are not explanations.
- Source real meme images/GIFs from the internet when appropriate, recording provenance and permitted reuse. Do not create original artwork or substitute text-only entries for playable memes. No arbitrary uploads/URLs, embeds, scraping, or live search in the product.
- GIF cards animate directly on the board; there is no inspector or separate playback control. Reject flashing media.
- Missing/slow media never blocks a turn: keep card geometry and show the canonical phrase/name. Every player receives the same pinned content version; catalog edits cannot change a live board.
- Curate for a casual mixed-age friend group: exclude slurs, targeted harassment, hateful symbols, graphic violence, and explicit sexual material. Edginess is not the house style. This is deck curation, not a moderation platform.

### Lobby and authority

- Manual team arrangement uses drag-and-drop. Each team has one spymaster slot and an operative area, plus a shared unassigned/watch area. Names stay visible; the host is marked.
- A host-only Randomize action beside Start balances all connected players between Red and Blue, choosing one spymaster per team and assigning the rest as operatives. Disconnected seats return to unassigned. It requires two connected players and saves one accepted roster; Start remains separate and requires one operative per team.
- Players move only themselves; the authenticated host can move anyone, including disconnected seats. Both use server-validated assignments. Picking up a piece does not confer authority.
- An occupied spymaster slot rejects a new drop; it never silently demotes or swaps its occupant. The host moves the incumbent first. Invalid/stale moves restore accepted placement with a brief reason. Planned server validation must enforce occupancy atomically; the current server accepts duplicate spymasters and blocks Start through readiness.
- Drag any part of the name tag with a pointer or touch. A centered six-dot grip identifies movable pieces. Ordinary scrolling remains available outside the pieces. Clicking a name or tapping a grip does not open a menu. Escape cancels an active drag; there is no tap or keyboard placement path, as requested by the user.
- Essential lobby information is Invite, names, Red/Blue, Spymaster/Operatives, compact presence, and Start. Disabled Start briefly explains the specific missing seat; no permanent role-description panels.
- Roster changes stay lobby-only. Local movement is a temporary preview; server acceptance owns placement. Disconnected or pending clients cannot submit new moves.

### Rooms and privacy

- Rooms are private by invite, not listed publicly. No passwords, accounts, profiles, or durable identities.
- The server owns the key, turn, clue, reveals, and outcome. Every action validates the authenticated room seat, role, phase, active turn, current round, and revision.
- Hidden identities never reach public clients through HTML, page data, network messages, logs, storage, or media metadata. Meme IDs, filenames, captions, and loading order must not encode the key. Host privileges do not grant it.
- Lock teams/roles during a round. Watchers may choose a playing role in the next lobby. An absent active spymaster keeps their seat; play waits for reconnection, or the host explicitly abandons the interrupted round to the lobby. This discards the board while preserving the group; it is never undo or a silent role swap.
- Persist rooms in their Durable Object so hibernation, eviction, or restart does not end play. A room cookie reclaims the same seat while the room exists. Reconnect fetches accepted state without replaying commands. Stale/duplicate reveals return current state; disabled controls never suggest unaccepted success.
- Transfer host controls to the earliest connected seated player, excluding watchers. With only watchers connected, no host exists; the first existing seated player returning becomes host. A later former host does not reclaim authority.
- Expire after one empty hour or twenty-four hours without meaningful activity. Creation, new-seat joins, and accepted roster/game commands count; reads, reconnects, disconnects, inspection, media playback, local selection, and rejected commands do not. Expiry offers Create room.

### Scope boundaries

Private multiplayer with one curated English meme deck. Exclude matchmaking, public directories, bots or AI spymasters, accounts, payments, rankings, achievements, saved history, user uploads, custom packs, live meme feeds, localization, native apps, and production analytics. AI creates original visual assets; it does not generate each room's deck or judge clues during play.

## Brand Commitments

**Codememes** is the product and repository name. An independent game inspired by Codenames-style rules; no official affiliation is claimed. Use original branding and original identity-cover art. The physical card-game arrangement is the visual reference, with warm materials and recognizable printed pieces. The supplied Blue-CODE/Red-MEMES wordmark is a reference for an adapted compact mark, not final logo artwork.

Red, Blue, Neutral, and Assassin retain their game meanings. AI-generated original meme-character portraits distinguish the four covers, with immediately recognizable category colors and a predominantly black Wojak-style Assassin. User-supplied examples guide composition and require original adaptations. Keep readable names and accessible symbols separate from illustration so play works without decorative art. [DESIGN.md](DESIGN.md) owns the visual system and token art direction.

## Voice and Tone

Sparse, friendly, literal labels: Create room, Join room, Start, Clue, Reveal, End turn, Play again. Humor lives in the cards and covers. No tagline, promotional paragraph, always-visible tutorial, narrated role instructions, or repeated "unrevealed" label on every card. Keep essential labels, names, clue/counts, accessible descriptions, and brief actionable errors. Additional explanation belongs behind help.

## Accessibility & Inclusion

Lobby movement requires a pointer or touch drag, as requested by the user. Other controls retain keyboard access. Preserve focus and concise announcements for accepted assignments, turns, and reveals. Identity uses full card colors and accessible names; visible identity icons are removed. Media has equivalent recognition text and non-spoiling descriptions. Phone cards select directly; Reveal stays explicit. Preserve five stable columns, deliberate confirmation, reduced motion, and no time pressure.

## Evidence on Hand

Local Workers, focused-handler, native workerd and browser evidence covers meme rules, privacy, persisted recognition, legacy compatibility, recovery, inspection and subsequent rounds; see [TESTING.md](TESTING.md). Original shipping art and supplied reference artwork are recorded separately. Earlier evidence covers occupied-slot races and authorized drag/tap/keyboard lobby placement. The current drag-only revision was not verified at the user's request. No production deployment, usage research, physical-device study, or elapsed twenty-four-hour observation exists.

## Product Principles

- Put friends into the game quickly.
- Let the cards, clue, and physical game pieces carry the screen.
- Make memes recognizable without explaining the joke.
- Protect the key and make irreversible guesses deliberate.
- Keep one ruleset, one curated deck, and one useful recovery path.
