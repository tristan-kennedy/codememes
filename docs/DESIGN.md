---
name: Codememes
description: Physical meme cards on a warm charcoal playfield with a full-screen tint for the active team.
# User-approved October 5 revision and accessible lobby implemented.
colors:
  table: "#303238"
  surface: "#3b3e46"
  surface-edge: "#626771"
  card: "#f5e9cf"
  card-edge: "#ddcba5"
  ink: "#f3f1ec"
  muted-ink: "#c3c5cc"
  red: "#ff6247"
  red-deep: "#8e2927"
  red-light: "#ffa477"
  blue: "#0badd7"
  blue-deep: "#1d507b"
  blue-light: "#42d4ea"
  neutral: "#c8ad7f"
  assassin: "#252323"
  on-table: "#f3f1ec"
  on-team: "#ffffff"
  on-primary: "#242838"
  focus: "#42d4ea"
  focus-on-team: "#ffe08a"
  focus-on-card: "#1d507b"
  selection: "#f2c65c"
  selection-outline: "#f2c65c"
  selection-edge: "#f2c65c"
  hover: "#484c56"
  blue-surface: "color-mix(in srgb, #1d507b 38%, #3b3e46)"
  red-surface: "color-mix(in srgb, #8e2927 38%, #3b3e46)"
typography:
  brand:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "clamp(1.125rem, 2vw, 1.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
  meme-phrase:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "clamp(0.875rem, 1.3vw, 1.125rem)"
    fontWeight: 800
    lineHeight: 1.1
  card-name:
    fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif'
    fontSize: "clamp(0.75rem, 1vw, 0.9375rem)"
    fontWeight: 700
    lineHeight: 1.2
  clue:
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.15
rounded:
  card: "10px"
  control: "8px"
  player-piece: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  meme-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "8px"
  action:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  red-cover:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-team}"
    rounded: "{rounded.card}"
  blue-cover:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.on-team}"
    rounded: "{rounded.card}"
  neutral-cover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  assassin-cover:
    backgroundColor: "{colors.assassin}"
    textColor: "{colors.on-team}"
    rounded: "{rounded.card}"
---

# Design System: Codememes

Latest October 6 header refinement: the host's Play again action is a 48px cartoon replay icon beside Game sounds in the winner header, replacing the bottom action tray. Both icons share chunky white shapes, team-colored outlines and soft shadows. Sound has a finite 360ms hover bounce and a press squash when motion is allowed; its stable accessible toggle name is Game sounds, with the current action in its hover title. All header links use regular-weight text, transparent surfaces and a simple underline on hover in setup and play.

The Players list uses the same sourced role portraits as setup, compact team-colored pieces and readable role/name captions. Its panel anchors to the full header tools and stays within their width. Outside clicks dismiss Players while inside interactions retain it. Rules keeps its native modal, Escape handling and trigger-focus restoration; a 48px cartoon X and backdrop clicks dismiss it. Team captions, destinations and readiness now use Operative/Operatives.

Latest team-page revision: show two open team rosters on the charcoal table, without enclosing team panels or permanent role boxes. Each full-width player piece carries a slightly tilted, white-edged meme portrait, a readable name and a short role caption. Reuse sourced `public/media/roll-safe.webp` for Spymaster and `public/media/much-wow.webp` for Guesser; Watching uses the same Doge portrait in grayscale. No source image is edited or duplicated. Team headings use the existing white/colored-outline Bricolage treatment at `clamp(2.5rem, 4vw, 3.5rem)`; names use 1.5rem on desktop and 1.25rem on phones. Filled pieces use the established team surfaces and 12px corners.

The spymaster is the first piece in each roster. Empty roles show illustrated, named drop hints; populated roles identify themselves on the pieces. Dropping elsewhere in a team, including its heading, assigns Guesser. A spymaster drop remains explicit and rejects an occupied spot. Keep the centered six-dot grip, dragging from the whole piece, compact Watching area and separate host Randomize/Start controls. Role captions, accessible destinations and readiness text use Operative/Operatives. Placement feedback overlays its destination instead of changing layout.

Latest cartoon refinement: the transparent header wordmark uses bubbly warm-white letters with primary Blue outlines around CODE and primary Red outlines around MEMES, retaining the hooded face inside the O. The favicon stays unchanged. Entry and setup actions share chunky outlined SVGs, white outlined lettering and a brief press response; team headings and draggable name pieces use Bricolage with consistent 12px corners. Guesser selection gives only the card face a 300ms squash-and-spring, with the gold frame staying steady and the check popping into place. Name pieces settle in 200ms after placement. These motions run only when reduced motion is not requested; no continuous UI animation is introduced.

Name and clue validation use their own field errors and native popovers. Name errors clear on editing; authoritative clue validation is matched to the submitted clue request. Operational errors use a dismissible fixed overlay on all screens, keeping forms valid for retry and preserving page geometry. Long names fit the solo selector and wrap within setup pieces on phones.

Clue validation belongs to the field: local errors and rejected server clues use the native validation popover, an invalid border and an accessible field description, without inserting a paragraph or moving the board. Editing clears the error. The check and X use chunky white SVG shapes with colored outlines and soft offset shadows, matching the remaining-count lettering; transparent buttons retain 48px targets. Board scrolling includes 8px clearance for the raised selection outline, preserving card geometry.

Latest background revision: use warm charcoal `#303238`, dark control surfaces `#3b3e46`, lighter hover surfaces `#484c56`, warm off-white labels and light muted text. Both the home page and lobby stay flat charcoal. During play, both sides use the active team's color at 12% edge, 4% near-center and 3% center opacity. The results screen keeps the winning team's tint, including when the winner differs from the last active team. Game exposes the public background team separately from the active-turn attribute. Keep the existing three shades per team. Sourced SVG geometry is unchanged; a light-ink luminance mask at 55% opacity over its 7% source opacity softens and unifies the watermark while preserving face detail. Card media, cover art and geometry are unchanged. The browser color pass below is recorded in TESTING.md; no independent review, commit, PR or deployment was performed.

Latest during-game UI refinement: align the header tools, turn/count row and clue controls to the board. Blue, Neutral, Assassin and Red racks each preview their next actual cover with a large overlapping remaining count. Covers retain their landscape ratio, unique variants and random order; a reveal uses the previewed cover regardless of the chosen board position. The full-width clue form has an inline "Your Clue" placeholder, an outlined-number 0–9/∞ picker and a chunky curved send arrow. The picker has keyboard navigation and 44px minimum targets; narrow screens wrap its choices into five columns. Both zero and infinity allow unlimited guesses; zero means avoid associated cards. The outlined turn heading sits on a softly tinted charcoal surface with a 48px sound toggle. Group player names with their roles in the roster, and keep paused-round recovery and its action together. A green check at the selected card's top right confirms a guess; a red X beside the remaining guesses ends the turn. These SVG icon buttons use 48px targets, accessible action names and hover labels. Play again appears beside Sound in the winner header. Card media, artwork and geometry are preserved.

Latest responsive refinement: cover previews and board cards share grid sizing, with five columns at 1000px and above, four at 600–999px and two below 600px. Tablet and phone place the turn heading above the previews; phones pair Blue/Red above Neutral/Assassin. The board flows vertically without horizontal panning. Phone clue controls remain sticky while scrolling, and keyboard-focus clearance follows the bar's measured height so long clues cannot obscure card actions. Source media resolution and 3:2 card/cover geometry are preserved.

Newly accepted covers travel from their matching pile to the selected card in 560ms, with a brief landing fallback if scrolling cancels the flight. Existing covers and restored snapshots remain still. Short synthesized sounds distinguish own-team agents, opposing agents, neutral cards and the assassin, then add a viewer-relative win/loss phrase on a terminal reveal. Sounds start only after a user gesture; the remembered mute preference stops current and scheduled tones. A fresh win gets a brief heading pop and 20 paper confetti pieces while retaining the visible board and winner-colored background. Spatial effects respect reduced motion. Invite success replaces the fixed-width button's label with "Copied!", with an accessible announcement and no inserted visible message; clipboard fallback uses a fixed overlay.

Latest palette revision: use only the board tiles� three shades per team throughout the UI: Red dark `#8e2927`, primary `#ff6247`, light `#ffa477`; Blue dark `#1d507b`, primary `#0badd7`, light `#42d4ea`. Medium fills use dark Ink; dark fills use white. The background gradient uses the primary colors at 24% opacity at the edges and 12% near the center.

Latest background and cleanup revision: use actual sourced Trollface, Forever Alone, Okay Guy, Me Gusta and Yao Ming SVGs at 7% opacity with a full-height Blue-left/Red-right linear gradient at 24% edge opacity. Cards have generous padding; unguessed operative cards match neutral spymaster cards, and accepted covers conceal the words. Obsolete reference sheets, poster files and bindings, compatibility media and preview captures are removed; nothing is deployed. No verification was requested.

Latest October 5 direct revision: every new-round meme has image/GIF media; GIFs animate directly on the board and inspection is removed. Tap/click selects on phones and desktops, followed by explicit Reveal. Private-key cards follow the supplied full-color reference: bright Red/Blue, tan Neutral or gray Assassin faces, lighter outer edges, and dark name strips. Identity symbols are removed from cards and team racks; names and accessible identity labels remain. This direction supersedes the earlier inspector, poster-first and symbol requirements below. These direct edits have no new verification evidence, as requested.

Latest lobby refinement: team areas, destinations, player pieces and placement surfaces use consistent 10px corners. Team headings use names and background colors without identity icons; movable name tags use centered six-dot drag grips.

Latest branding revision: the user-supplied logo and favicon are recolored toward the board�s primary Blue `#0badd7` and Red `#ff6247` with transparent outer backgrounds. The shared header uses `public/brand/logo.png` at 240-360px wide; `public/brand/favicon.png` supplies the favicon and touch icon. [shipping-art.json](assets/shipping-art.json) records the supplied files and built-in edit prompts.

Latest UI simplification: card recognition labels and text fallbacks display in uppercase while canonical deck text and embedded image captions remain unchanged. Center the image logo above the entry form. Entry, clues, actions and lobby placement controls use flat rows rather than raised white panels. Player pieces use transparent outlined name tags without initials or routine Connected labels. Keep You, Host and Offline only when applicable. Remove redundant role/instruction/footer text; show readiness and recovery messages only when needed, with Rules and player details available on demand. Blue counts sit left and Red right, matching the lobby/background. These direct edits were not verified at the user�s request.

## Overview

**Creative North Star: "The meme night table."**

Open the room and see the game: twenty-five real-looking cards on a warm charcoal playfield, with a full-screen Blue or Red tint following the active team's turn. Sourced Trollface, Forever Alone, Okay Guy, Me Gusta and Yao Ming SVG linework gives the background personality. Cream cardstock, printed illustrations, restrained thickness, and soft contact shadows keep the board touchable. Controls use dark surfaces, warm off-white labels and deliberate Red/Blue accents.

The user's October 5 revision rejects green felt and pins the pale background direction. It preserves the physical card-game arrangement, sparse copy, original meme covers, and drag-and-drop lobby, while replacing the surrounding material and control styling. Impeccable informs hierarchy, contrast, interaction, and accessibility within this brief. [PRODUCT.md](PRODUCT.md) owns rules and permissions.

**Status: pale playfield, game and accessible lobby implemented.** The five-column board, mixed-media deck, inspector, local selection, accepted identity covers and self-hosted fonts are implemented in #10. Its prior felt screenshots are superseded. #11 integrates named drag/tap/keyboard pieces, occupied-slot rejection and compact room/readiness tools in [Lobby.tsx](../src/features/Lobby.tsx) and [lobby.css](../src/features/lobby.css). Exact-revision independent review and CI are recorded in the corresponding PRs. References guide original assets and are not shipped as application media.

Use the official [CGE component/rules reference](https://czechgames.com/files/rules/codenames-rules-en.pdf) to understand the physical five-by-five arrangement and covering gesture. Geometry and semantics are the reference; branding, artwork, frames, and composition are original.

The memorable interaction is an accepted reveal: an illustrated identity cover settles onto the selected meme card. The matching lobby gesture picks up a named player piece and places it into a team/role area. Both gestures inhabit the same tabletop world.

## Colors

Use the pale `table` ground across entry, lobby and game. Blue and Red edge glows stay soft, static and outside the central reading area. White `surface` and neutral `surface-edge` belong to controls, pickers and dialogs; cream `card` and `card-edge` belong to physical meme cards. The board�s Red and Blue palettes identify teams; tan Neutral and charcoal Assassin identify covers. The background watermark is decorative, low contrast and widely spaced, never a competing card or hidden-key cue.

Ink and Muted Ink are readable labels on pale, white and cream surfaces. On-team is for dark red, dark blue and charcoal controls; medium primary fills use dark Ink. Team labels on light surfaces use their deep team color. Keep readable labels on the playfield and controls.

Identity combines hue and shape: Red's angular pennant, Blue's round target, Neutral's hollow diamond, and Assassin's skull. Implement a coherent authored vector symbol set alongside raster art, with concise accessible names. Team counts pair a symbol and small Red/Blue label. Card identity labels remain in the inspector and accessibility tree; the board needs no repeated paragraphs of state text.

Selection uses a dark golden `selection-edge` outline and small raised offset, never a team tint. Light Gold remains text selection and the filled-action inset focus cue. Focus is a 3px deep Blue outer outline with 3px offset on light surroundings; filled primary actions add a Gold inset next to their team fill. This keeps focus visible against both surfaces and distinguishable from selection. Errors use a clean white status surface with Ink and brief cause/action; Red remains a team identity.

## Typography

Lobby Blue/Red destination fills are `#42d4ea`/`#ffa477`, with dashed edges `#0badd7`/`#ff6247`. The shared tray uses `#fafaf9` and `#c8cbd4`; initials use `#a3a8b6`. These are quiet surface/edge tones, not text colors. Picked pieces and drop targets use the dark golden `selection-outline` for visible contrast on pale surfaces. Team headings use a readable 20px step; named pieces use 15px labels and 12px presence text.

Type serves pieces rather than explanatory text. Bricolage Grotesque at 800 gives phrase cards and the active clue warm printed lettering, and remains in phrases and clues while the header uses the supplied image wordmark. Atkinson Hyperlegible at 400/700 serves names, inputs, labels, and controls. Self-host required font files and licenses when building; system fallbacks keep play usable while loading. No giant game-screen display heading.

The supplied wordmark example suggests a compact, heavy condensed italic mark: **CODE** in Blue, **MEMES** in Red, with a small monochrome Wojak motif inside the O. Adapt this into original lettering and illustration, using the game's palette and a flat printed treatment. Simplify or omit the face at small sizes so Codememes stays readable. Keep the mark small at the game edge; the example's oversized presentation is not the game layout. The latest supplied logo and favicon now provide the installed brand artwork.

Canonical phrases retain recognizable spelling, punctuation and case in the deck; card recognition labels and text fallbacks display in uppercase without rewriting source captions. Image/GIF cards have one canonical recognition name in a cream bottom strip; phrase cards let the phrase occupy the face. Names identify cards, without explaining the joke. Original captions embedded in source memes are content and stay intact.

Names wrap in player pieces or expose the full name on activation. Core labels never shrink below 12px. A long phrase gets a compact readable recognition label on its small face and its complete representation in inspection; ellipsis cannot be the only identifier. Code/count numerals are tabular, with no decorative monospace.

## Layout

### Game first

On desktop the board occupies approximately 70-80% of the useful viewport, centered between compact team/count racks. The implemented table is up to 1360px wide with a board up to 1280px. Whole cards use a landscape 3:2 ratio in five stable columns and rows. The board keeps a 900px minimum width and scrolls horizontally on smaller screens. Use 12px gaps on roomy screens and 4-6px on phones. Adjust racks/margins before shrinking the board.

A small top edge holds Codememes, room/invite, Rules, and compact presence. The active team's rack gets a clear pointer and accessible turn text. One flat clue row sits close to the board; the active spymaster�s clue form occupies that same space. Operatives get a flat Reveal/End turn action row; the selected card remains indicated on the board and named in the Reveal button�s accessible label. Keep controls outside card content; Reveal remains explicit.

No hero, tagline, welcome paragraph, stats dashboard, large "your turn" heading, permanent roster, instructional sidebar, or repeated "unrevealed/identity hidden" labels. The board dominates the first viewport. Remaining text has a job: meme content, recognition names, players, counts/team labels, clue, controls, and brief recovery. Extended roster and Rules are opened explicitly.

The game centers a board up to 1280px wide with landscape 3:2 cards. Narrow screens keep five columns and readable names through horizontal board scrolling, with a sticky explicit action tray. GIFs animate on the board with contained imagery, and selection is direct on every screen size. Revised meme-character covers live under `public/art/covers`; [shipping-art.json](assets/shipping-art.json) holds exact prompts and supplied reference roles. Use the supplied Codenames Blue/Red room, neutral picket-fence and assassin street-lamp backgrounds, replacing the foreground characters with recognizable memes in their own familiar clothing or natural fur, rather than the reference agent outfits. Pepe uses the blue team tones. Keep only the current artwork and replace it in place without versioned directories. Eight characters per team plus a shared ninth Wojak in both colors, seven neutral characters and the original black-hoodie Wojak assassin match the physical game's eight agents per color, double agent, seven bystanders and one assassin. Assign unique, randomly shuffled variants when dealing, persist them and expose variants only after reveal. Remove the previous four portrait assets, including the unfamiliar neutral character. Unused felt is removed from shipping assets. Sourced Trollface, Forever Alone, Okay Guy, Me Gusta and Yao Ming SVG geometry remains in use at `public/art/playfield.svg` (7% opacity, 960 by 720px repeat); CSS supplies a full-height Blue-left/Red-right linear gradient at 24% edge opacity, fading to a soft neutral center. [shipping-art.json](assets/shipping-art.json) credits each source. The shared header uses the larger supplied image wordmark with its hooded face inside the O, recolored toward the primary Blue/Red palette. Identity colors and accessible labels replace board symbols; accepted covers conceal the entire name strip. The latest cover changes were not verified at the user's request.

UI hover surfaces use subtle neutral or team-tinted fills with dark text. Small tools use 12/13/14px steps; count numerals use 20/26px and full inspector phrases reach 44px. Dialog backdrops use `rgb(27 31 44 / 0.55)`. Neutral hover uses `#f3f1ec`, Blue/Red areas `#42d4ea`/`#ffa477`; compact entry uses a 12px radius and `0 6px 20px rgb(27 31 44 / 0.10)` shadow. Lobby team headings use 1.25rem (20px); named pieces use 10px corners. The prior native roster is removed. These and the 12/13/14px small-tool steps, 20/26px counts, 44px inspector text are intentional detector advisories. Record any final implementation-specific tones with their contrast roles; do not retain pale on-felt label colors on the new light playfield.

The private spymaster view keeps readable meme faces with an identity edge tab and distinct symbol from the permitted server snapshot, plus one small Spymaster marker. Do not cover all memes with portraits before reveal or render a key for public clients and hide it with CSS.

### Phones and tablets

Keep five columns and stable positions; no carousel or team-based reordering. Below about 900px move team racks into one compact row. At 320px, 8px page margins and 4px gaps surround a horizontally scrolling board with a 900px minimum width. Cards retain their landscape ratio and readable recognition names. Source images/GIFs remain contained without changing files, intrinsic resolution or animation. Revealed artwork fills the entire card edge to edge with matching rounded corners, concealing its padding, frame and recognition label.

On desktop, each card has an explicit magnify control separate from card selection: the face selects when guessing is permitted; magnify only inspects. Below 540px, the whole card opens inspection, so a roughly 58px-wide face does not have to contain two competing 44px targets. The phone inspector offers a separate 44px Select action to permitted operatives; choosing it sets the local preview and closes inspection. The global Reveal remains a separate explicit action. Every inspect/select control has a reachable 44px target with no overlap.

The inspector displays full media/poster, recognition name, optional GIF Play/Pause, and Close. Opening or playing media never selects a card. Public users never receive private identities there. Escape closes and restores opener focus; explicit Select returns focus to the selected board position.

Allow vertical scrolling in narrow portrait layouts; keep the action tray reachable without hiding the last row. Never shrink to unreadable stamps just to force five rows above the fold. Landscape/tablet views use available width; rotation is optional.

### Entry and lobby

Entry uses the continuous pale playfield, a centered image logo and one bare name form. The main URL creates a room; an invite URL enters its room. There are no mode controls or manual room-code fields. Use Red/Blue accents and one prominent action, without promotional copy or a demo board competing with entry.

The lobby is a team arrangement table. Red/Blue areas sit side by side on desktop, each with one named Spymaster slot above its Operatives area. Unassigned/watch pieces use a shared shallow tray. Player pieces are flat outlined name tags with a line-based drag handle and only applicable You, Host or Offline details. No profile or avatar service.

Stack team areas on phones with persistent labels. Manual lobby movement uses dragging from any part of the name tag, with a centered six-dot grip identifying movable pieces. There is no destination menu or keyboard placement. Dragging near an edge scrolls the page; ordinary swipes outside pieces still scroll. Preserve Escape cancellation and accepted-move announcements. The host has Randomize beside Start to balance connected players and choose one spymaster per team in one accepted update. Keep those actions together when the readiness row wraps. These direct revisions were not verified at the user's request.

Only authorized pieces lift. Pending placement shows a temporary destination ghost while accepted placement remains discernible; acceptance settles it, rejection restores it with one short reason. An occupied spymaster slot rejects without swapping. Concurrent moves, disconnects, and host changes resolve through latest server state.

Invite stays at the edge and copies the room URL. Start sits between/below teams and becomes available under existing readiness rules. Readiness reasons appear only when blocked. Long role descriptions belong in Rules.

## Elevation & Depth

Depth represents pieces: faint cardstock edge, soft downward resting shadow, stronger picked-up shadow, and cover laid over the face after reveal. Target `0 2px 4px rgb(27 31 44 / 0.16)` at rest and `0 10px 18px rgb(27 31 44 / 0.22)` while lifted. Clean controls have restrained borders and small shadows. Edge light belongs to the background; do not give individual controls luminous halos, glass, or hard block shadows.

Use a static decorative SVG tile with original simplified troll/reaction/Doge/Wojak-style line faces and small plus/pixel marks, as explicitly requested by the user. Keep faces approximately 40-70px, widely spaced and around 2-4% opacity; reduce their visibility beneath cards and controls. CSS radial gradients provide the subtle edge light. A faint paper-grain raster is optional; it must remain almost invisible and have recorded provenance. Cardstock grain stays on cards. Media retains its own colors without team tinting. Decorative assets have no interaction or accessible content and never encode room/card identity.

## Shapes

Cards/covers share 10px corners and aligned landscape silhouettes. Controls use 8px; small movable player pieces may be pill-shaped. The table is continuous, not a giant rounded container inside another card.

Keep pieces straight at rest. A 2-degree lift may accompany a drag; random board rotation adds no clarity. Focus, selection, loading, and reveal preserve geometry/hit areas. The cream recognition strip remains real readable text when a cover arrives.

## Components

### Meme faces and inspection

One geometry holds three forms: a printed phrase; an image with name strip; or a GIF poster with name strip and inspect/play affordance. Use `object-fit: contain` to preserve recognition-critical captions/faces. Curated cream padding fills remaining space. [MEME-DECK.md](MEME-DECK.md) keeps representations recognizable and stable.

Load stills/posters first. GIF playback is explicit, muted, and controllable in the inspector. Reduced motion starts with stills and leaves playback optional. Failed media falls back to the canonical phrase/name in the same geometry, with no broken-image icon or substitute reference. Inspection stays available to watchers/spymasters and for revealed cards.

### AI-generated identity covers

Generate four original meme-character cover families: Red agent, Blue agent, Neutral bystander, and Assassin. Follow the physical pieces' portrait-led composition: a large head-and-shoulders character, expressive face, bold ink outlines, broad areas of color, and a quiet background. One recognizable reaction establishes the joke. Avoid elaborate scenery, tiny props, ornamental inset frames, and captions. One strong master per family is enough initially; variations must preserve immediate category recognition.

The existing cover assets use large expressive faces, bold outlines, layered shading, simple scene hints and dominant category color. Their exact generation prompts remain in [shipping-art.json](assets/shipping-art.json). Obsolete reference sheets and their links have been removed.

| Family   | Art direction                                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red      | A recognizable meme/reaction portrait, predominantly Red across both character and background. Keep pale highlights small so the whole piece still reads Red.                                                                                                                |
| Blue     | A different recognizable meme/reaction portrait, predominantly Blue across both character and background. Use the same linework and print treatment as Red.                                                                                                                  |
| Neutral  | A deadpan everyday reaction portrait with a broad tan field and muted illustration. Keep it visibly distinct from the two teams.                                                                                                                                             |
| Assassin | A Wojak-style reaction portrait against a predominantly near-black field, with restrained gray/cream facial lines. It must read as the black piece even at phone-card size; a small dark border around a pale face is insufficient. Keep the separate skull identity symbol. |

Red, Blue, and Neutral character choices remain open for asset generation. The sheet demonstrates recognizable meme characters rather than generic animals with meme-like props; preserve that direct recognition when choosing the cast. The source conversation's latest Assassin refinement calls for Wojak. The black reaction portrait demonstrates the required dark treatment, while the hooded face in the wordmark offers another character cue. Adapt the drawing, pose, scene, and card finish; the exact characters, pairings, and pixels in these examples are not final assets or fixed allegiances for playable memes.

For implementation produce separate full-frame landscape covers in the board's geometry, without baked-in shadows, UI text, category symbols, or sheet gutters. Recompose the square portrait examples for this landscape frame; do not stretch their faces. Apply edges, shadows, symbols, and readable recognition strips as reusable semantic layers. Judge each cover at its actual desktop and phone sizes: the category should be immediately clear, the face recognizable, and detail subordinate to both. Record the exact generation prompt and source references with each resulting asset.

Do not trace commercial agent portraits or recreate branded frames. Do not synthesize a "real" meme image when exact recognition matters: board memes use their curated phrase or approved source; generated art serves original covers/materials. Cover identity is independent of the meme below.

An accepted reveal lays the cover over the upper face in a 180ms downward settle with `cubic-bezier(0.16, 1, 0.3, 1)`. Cover the recognition strip so only the picture token remains. Counts/identity change only on server acceptance, never while pending. Reduced motion makes placement immediate with the same concise announcement.

### Controls, state, and endings

Clean white controls use short labels, clear borders, and 44px minimum hit targets. Filled Blue/Red actions, team-tinted regions and deliberate spacing establish hierarchy; secondary controls remain neutral. Inputs have real labels, themed caret/selection, and readable placeholders. Tooltips supplement accessible names; touch users can discover all actions. Keep physical simulation on cards, covers and movable pieces rather than disguising every UI control as cardstock.

Selection stays local and clears on connection loss or revision/round change. Pending disables repeats. Reconnection, absent spymaster, takeover, rejection, and expiry show only when relevant in one compact white status surface. Preserve accepted board while paused. Sparse copy does not remove actionable recovery.

The final board receives all identities from the server and stays on the table. Put "Red wins"/"Blue wins" near its rack, with outcome available and host Play again following the board. Accepted lobby return removes board/clue/private state and focuses the roster. Host abandonment belongs in the absent-spymaster state with compact explicit confirmation that it discards this board and keeps the group.

Rules uses a small modal with protected reading focus, Escape/Close, and focus restoration. Inspection uses a modal/full-screen sheet for readable media and a separate focus context. Ordinary arrangement and turns stay on the table.

## Do's and Don'ts

- Let pieces occupy the screen; avoid a marketing/dashboard shell.
- Use the approved pale background with soft Red/Blue edge light and sparse meme faces; never reintroduce green felt.
- Style controls as clean, readable UI while keeping the real-game board and illustrated covers.
- Put humor in cards and art, keeping essential action labels literal.
- Keep names, clue, counts, and recovery readable; minimal copy still carries necessary information.
- Preserve positions, private/public boundaries, deliberate Reveal, and accepted-state feedback.
- Drag any part of a name tag for manual lobby movement, per the user's direction; the host may also Randomize. Keep other controls keyboard-accessible.
- Respect [reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), keep content inspectable, and test the real deck at 320px.
- Record provenance and optimize media, covers, and material before shipping.
- Never autoplay a wall of GIFs, reveal by inspection, encode a key in media, or claim production deployment already exists.
