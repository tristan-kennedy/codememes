# Codememes deck contract

Updated by direct request October 5, 2026. The English catalog in [worker/deck.ts](../worker/deck.ts) contains **72 distinct families**, each with sourced local image/GIF media, including **18 animated GIFs**. The original 36 references have sourced media and 36 additional templates expand the library. Classic/recent records the reference era, not a live popularity claim.

## Recognition and media

Images come from Imgflip and Memegen; reaction animations come from Tenor. No playable deck media is original generated artwork. Per-entry source credits, aliases, descriptions, visible-word exclusions and dimensions live in the catalog. Source credits do not claim CC0 licensing for third-party memes.

GIFs animate directly on the board. Inspection, playback controls and unused posters are removed. Tap/click selects a card on every screen size; explicit Reveal commits it. Unguessed operative faces match the neutral spymaster style. Accepted reveals show the existing illustrated identity token over the entire card interior, including the name strip.

Media is hosted under `public/media/`; play makes no third-party media requests. `object-fit: contain` preserves source captions. Loading or failed assets retain the same recognition name and geometry. No uploads, remote embeds, arbitrary URLs or runtime search exists. Keep one current catalog and replace assets in place; there are no dated directories, deck versions or compatibility copies. Deployments may break older rooms or cached clients.

Curate for a casual mixed-age friend group: exclude slurs, targeted harassment, hateful symbols, graphic violence and explicit sexual material. Names identify the reference without explaining its joke.

## Round stability and privacy

Start cryptographically shuffles distinct families and takes 25, then independently randomizes the starting team and 9/8/7/1 identities. Store public recognition and normalized exclusions with the round. Accepted state remains stable through reconnect and persistence; catalog edits do not redeal a running board, but media at its paths can be replaced. Old word-only rounds are not supported.

Internal aliases, visible words, exclusions and curator provenance never appear in snapshots. `recognitionView` allowlists public recognition fields. Identity is projected separately only for spymasters, revealed positions, or all seats after ending. Paths and metadata contain no key.

Clues are one token and a whole number from 0 to 9 or ∞. Zero means avoid associated cards; infinity gives no count. Both allow unlimited guesses, while normal counts allow the number plus one. Exact comparisons normalize NFKC, English lowercase and apostrophes. Unrevealed canonical names, aliases and recorded printed words are excluded; broader associations remain group judgment.

## Assets and validation

Nothing is deployed. The user explicitly authorized removal of obsolete media without compatibility retention. Only current deck files, active portrait tokens, the sourced background SVG and licensed fonts are retained. Obsolete reference sheets, posters, compatibility media and preview captures were removed. [Shipping art provenance](assets/shipping-art.json) records active token prompts and the background's SVG sources.

No new verification or independent review was performed for the direct UI/media edits, at the user's request. Earlier evidence in [TESTING.md](TESTING.md) applies only to unchanged behavior.
