# Codememes deck contract

Implemented October 5, 2026. The English `deck-2026-10-05` catalog in [worker/deck.ts](../worker/deck.ts) contains **36 distinct families** (27 classic, 9 recent), curated for a casual mixed-age group. Classic/recent dates the reference era; it is not a live popularity claim. Exclude slurs, targeted harassment, hateful symbols, graphic violence and explicit sexual material. No runtime search, uploads, remote embeds or media API exists.

## Recognition and representation

The catalog records stable ID/family, canonical name, aliases, explicitly recorded standalone visible words, non-spoiling description, representation kind, full phrase/fallback, 600×400 geometry, and dated provenance. Phrase representations identify familiar references without redistributing uncertain third-party images. Names identify rather than explain. No ordinary noun filler is dealt.

| Reference family              | Representation                                  | Era     |
| ----------------------------- | ----------------------------------------------- | ------- |
| This is fine                  | Phrase                                          | Classic |
| One does not simply           | Phrase                                          | Classic |
| Doge / Such wow. Much amaze.  | Phrase                                          | Classic |
| Distracted boyfriend          | Phrase                                          | Classic |
| Change my mind                | Phrase                                          | Classic |
| Surprised Pikachu             | Phrase                                          | Classic |
| Expanding brain               | Phrase                                          | Classic |
| Woman yelling at a cat        | Phrase                                          | Classic |
| Confused math lady            | Phrase                                          | Classic |
| Hide the pain Harold          | Phrase                                          | Classic |
| Success kid                   | Phrase                                          | Classic |
| Drake approves                | Phrase                                          | Classic |
| Rickroll                      | Phrase                                          | Classic |
| All your base                 | Phrase                                          | Classic |
| Ceiling cat                   | Phrase                                          | Classic |
| Nyan cat                      | Phrase                                          | Classic |
| Keyboard cat                  | Phrase                                          | Classic |
| Is this a pigeon?             | Phrase                                          | Classic |
| Two buttons                   | Phrase                                          | Classic |
| Stonks                        | Phrase                                          | Classic |
| Always has been               | Phrase                                          | Classic |
| They're the same picture      | Phrase                                          | Classic |
| We have that at home          | Phrase                                          | Classic |
| UNO reverse card              | Phrase                                          | Classic |
| Let him cook                  | Phrase                                          | Recent  |
| Girl dinner                   | Phrase                                          | Recent  |
| Very demure, very mindful     | Phrase                                          | Recent  |
| Bombastic side eye            | Phrase                                          | Recent  |
| Just put the fries in the bag | Phrase                                          | Recent  |
| Aura farming                  | Phrase                                          | Recent  |
| Six seven                     | Phrase                                          | Recent  |
| Delulu is the solulu          | Phrase                                          | Recent  |
| Main character energy         | Phrase                                          | Recent  |
| Press F to pay respects       | Original key/lettering image                    | Classic |
| 404 Not Found                 | Original error typography image                 | Classic |
| DVD screensaver               | Original gently bouncing lettering GIF + poster | Classic |

The two still graphics and DVD animation are original Codememes typesetting, dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). They contain no copied screenshots or logos. [prepare-media.py](../scripts/prepare-media.py) records deterministic composition, dimensions and frame timing. Reference names convey recognition, with no affiliation. Public on-demand attribution identifies original graphics and license. The GIF is 40 frames at 10 fps: constant color, continuous gentle movement, no flashing or audio. This is a constrained curated starting deck; it does not claim exact source photography.

## Pinned content, assets and legacy rooms

Start cryptographically shuffles distinct families and takes 25, then independently shuffles 9/8/7/1 identities and randomizes the starting team. Store `contentVersion`, public recognition and normalized exclusions with every card in the room transaction. Reconnect, JSON reconstruction, hibernation and later catalog changes read stored recognition; they do not look up mutable catalog names or paths. Each position remains fixed until the round ends or is explicitly abandoned.

Schema 1 stays additive. An old round lacking `content`/`contentVersion` is projected as `legacy-words-v1`, with its original word, position, key, reveals and exact-word clue rule intact. Projection creates a phrase view without rewriting storage. Ordinary play continues; Play again/abandon clears it and the next Start uses the meme catalog. A live board is never silently upgraded.

Media is shipped under immutable `public/media/deck-2026-10-05/` paths. **Retain every released media directory indefinitely by default**, and never overwrite a file at a released path. The current build copies this directory unchanged; focused checks verify every persisted catalog asset exists, and native reconstruction preserves full recognition. A later release changes version/path and keeps prior directories. Retirement requires evidence that no persisted room references that version; the 24-hour deadline measures inactivity and can be refreshed by accepted commands, so it is not a maximum round age. Deployment remains unperformed.

## Clues and privacy

One-token clues and numbers 1–9 retain existing formatting/rules. Exact comparisons normalize NFKC, lowercase English and straight/curly apostrophes. An unrevealed reference blocks its canonical name, aliases and recorded standalone printed words. `fine`, `FINE` and fullwidth `ｆｉｎｅ` are blocked by This is fine; `fire` remains group judgment. Revealed cards cease blocking. No OCR or semantic moderation runs in play.

Internal aliases, visible words, exclusions and curator provenance never appear in snapshots. [recognitionView](../worker/deck.ts) explicitly allowlists only public ID/family/name/description/kind/phrase/asset/poster/dimensions/attribution. Identity is separately projected only for spymasters, accepted revealed positions, or all seats after ending. Paths, image metadata and loading order carry no key. Host status alone grants no key. Error/recovery projections reuse the same allowlist; tokens and internal state never enter browser storage or application logs.

## Inspection and budgets

Faces show stills/posters first, with full text present while media loads or fails. `object-fit: contain` preserves captions; names stay real text. Inspection opens a native modal with trapped/restored focus and Escape. Any role may inspect any card, including revealed cards. Desktop magnify is separate from selection; below 540px the face inspects. Select card sets only a local preview and explicit global Reveal commits. Inspection, playback and selection have no network game command or room activity effect.

GIF Play starts only on request. Pause and Stop restore the readable poster; closing unmounts playback. Reduced motion has no automatic animation. The only cover settle animation is under `prefers-reduced-motion: no-preference`; accepted state/announcements remain equivalent.

Actual shipping sizes: image stills 4.2/4.4 kB, GIF poster 1.8 kB, GIF 91.1 kB; covers 7.6–23.7 kB; cardstock 0.23 kB and the original static decorative SVG pattern 2.8 kB. Budgets for this release: still/poster ≤10 kB, cover ≤30 kB, material ≤10 kB, explicitly requested GIF ≤100 kB. Three OFL font files total 518.1 kB, loaded locally with swap fallback. Reference images/contact sheets remain in docs and are never loaded by gameplay. [Shipping art provenance](assets/shipping-art.json) holds exact built-in generation prompts/reference roles; all generated outputs were inspected before local WebP optimization.

[TESTING.md](TESTING.md) records applicable validation and browser/runtime evidence, including remaining device/runtime limits.
