# Kinetic Editorial — accepted visual direction

User selected “01 로 구현” after discussing three visual directions. Scope is
visual presentation and CSS interaction, retaining all nine puzzle rules. The
user separately approved old/legacy deletion (“구/레거시는 지워줘도 되고”).

## Design

Paper #f0eee6, ink #171715, vermilion #eb3c22. A large cropped CSS wordmark owns the
home; a red disc and cut-out typography establish the poster language. Three
asymmetric, flat experiment panels replace equal product cards. One oversized
Lumen panel, a compact Glyph circle and a Relay type/diagram panel share a strict
underlying grid. Game names, numbering and start affordances remain readable.
Precise mono annotations contrast with huge dense system sans typography.
No downloaded fonts, images, dependencies or browser scripts.

Home includes an optional native checkbox “Break the grid” that changes the poster
composition through sibling selectors; it never hides navigation or affects game
state. All interaction also works by touch/keyboard. Hover/focus reveals use
simple translation/rotation and clipped paper reveals; optional entry motion
uses CSS only. Reduced motion suppresses transitions/animations. Actual gameplay
remains in independent forms with existing URL targets and state selectors.
Game chrome uses large editorial headings, a vertical red rule and print-like
instruction columns; board geometry, input sizes, color distinctions and rules
remain intact. At <=760px the composition becomes a deliberate vertical poster
with no horizontal overflow or overlapping controls. At 320px all links remain
reachable. No state mutation across views other than current form inputs.

## Cleanup

Delete only approved obsolete src/main.ts, tsconfig.json, public/og-image.png,
public/favicon.svg, evals/cases.json and three old traces/*.json (inventory checked).
Update package name/build to static Vite, remove unused TypeScript dev dependency
and its lock entry. Preserve installed node_modules, protected dist, Git history,
.github deployment configuration and the existing recovery tar/diff. Remove stale
outpost/eval metadata, update current docs. New UI gets a CSS-like typographic
identity; no replacement favicon asset is necessary.

## Acceptance

1. Home unmistakably follows the selected typographic poster direction; red,
   paper and black, asymmetric compositions, no residual purple/card design.
2. Break-grid control and game links work with mouse/touch/keyboard; no obscured
   headings/links at desktop, 390px, 320px. Game panels keep focus and reset.
3. Existing 236-state verifier passes; production contains HTML/CSS only.
   Browser solve/near-miss/reset for representative games, all nine view links,
   and mobile geometry checked after visual changes.
4. Independent design and final implementation review; no deployment or commit.

## English and theme consistency follow-up (2026-09-09)

The user requested English throughout the website and a closer match between
preview artwork and the playable board. All visible strings, hints, metadata,
and accessible labels now use English. Shared `--game-surface`, `--game-ink`, and
`--game-mark` tokens bind each preview to its game: vermilion Lumen, paper Glyph,
and ink Relay. Mirrors and switches use flat editorial shapes; legacy teal/gold/
sage materials and solved-state glows are removed. Lumen sources and receivers
carry matching channel numbers. Puzzle rules, native inputs, selectors and
rotation geometry remain unchanged. Only presentation declarations in state.css
were updated. This is a local presentation correction, with no deployment.
