# Verification — 2026-09-09

- Independent design review: APPROVE, no blocking design defect.
- `node scripts/verify.mjs`: PASS. All 236 combinations across nine puzzles;
  independent cell-by-cell ray tracing checks 137 visible ray segments and each
  receiver, unique solutions, incorrect states, ring-angle rules, all gate outputs.
- Production build succeeds; output HTML contains no script or event handlers,
  no JavaScript/WASM asset is shipped, all referenced local assets resolve.
- Actual in-app Chromium browser: each of the nine levels passed default losing
  state, solved state, one-control near-miss and reset.
- Browser visual checks found and fixed an inline rotation overriding Glyph's
  input rules, and mobile mirror touch targets overlapping. Glyph now gets its
  angles only from the selected radio inputs; an explicit regression rejects
  inline --turn values. Mobile optical boards use a fixed 300px height independent
  of their desktop aspect ratio.
- Final Chromium checks: all nine solve/near-miss/reset cases pass after fixes.
- At 320px: Lumen levels have no overlapping/clipped inputs and 44px mirror
  targets; Glyph 3 and Relay 3 have no horizontal overflow. Relay 3's narrowest
  input is approximately 38px wide at 320px, with separated controls.
- Glyph ArrowRight changes the selected orientation with visible focus; Tab
  advances to the next ring group. All solved Glyph 3 transforms settle to
  identity rotation and the channel visibly connects to north.
- Relay 1 is solvable with Space and Tab, and Enter on reset restores defaults.
- Independent review found a skip link changing the current game fragment to
  #main. Fixed with view-specific skip links and focusable game sections. Browser
  activation preserves #relay-1 and its checked input, focuses the game section,
  and exposes only the current view's skip link. Added structural regression.
- Independent implementation review: APPROVE, no blocking issue. Reviewer also
  confirmed Glyph solve/near-miss/reset and state-preserving skip link in Chrome.
- Final home mobile check at 390px: no horizontal overflow. A decorative orbit
  was hidden at small widths to keep the tagline unobstructed.
- Final verified artifact: power-of-css-build-j5GHv3 in the OS temporary directory.
  Current local preview: http://127.0.0.1:4173/ . No deploy or commit performed.

No Firefox/Safari execution or screen reader announcement test has been performed.
The tests prove authored state behavior, not broad device compatibility or long-term
replay value. All artwork and game behavior in the loaded document use HTML/CSS.

## Kinetic Editorial iteration

- User approved visual direction01 and explicitly approved legacy deletion.
- Independent design review APPROVE. Home rewritten as an interactive poster;
  game chrome restyled without changing state.css or puzzle fixtures.
- Configured checks pass:236 states,137 ray segments, current static production
  build, no JS/WASM, package-lock consistency, approved obsolete files absent.
- Both poster states at1280/390/320 pass clientWidth-based overflow/control checks;
  checkbox responds to keyboard Space with visible focus. A minimum-body-width
  issue on320px was fixed. All nine game views solve/near-miss/reset in browser.
- At320px Lumen3/Glyph3/Relay3 inputs stay in view with no overlap or overflow.
  Board entry initially clipped early clicks; opacity-only entry fixed it and the
  all-nine fast-entry play regression passed. Puzzle state and geometry unchanged.
- Small red text uses a darker ink with measured5.70:1 contrast on paper. Bright
  vermilion remains on shapes/large type. Reduced-motion animation suppression
  verified in source; OS/browser media emulation not exercised by the main agent.
- Independent reviewer Chrome320: Glyph solve, keyboard near-miss, Enter reset,
  view/state-preserving skip link, radio focus and home checkbox all pass.
- Final configured verification passes production artifact power-of-css-build-e4AGZx.
  Independent final review APPROVE: no blocking defects. Firefox/Safari and
  screen-reader announcements remain untested.
- Legacy cleanup is complete. Protected build/dependency directories, deployment,
  Git history and recovery copies remain unchanged. No deployment/commit.

## English and matched game themes — 2026-09-09

- `node scripts/verify.mjs` passes: nine levels, 236 exhaustive states, 137 ray
  segments, production build and HTML/CSS-only checks. Added English document
  language and absence-of-Korean guards for website copy and accessible labels.
- In-app browser checked all nine puzzles: solve, one-input near miss, reset.
  All 27 checks passed after the theme change.
- Home and all nine game views checked at 320, 390 and 1280px: no horizontal
  overflow and no Korean visible text (30 layout checks).
- Computed preview/board backgrounds agree: Lumen rgb(235,60,34), Glyph
  rgb(240,238,230), Relay rgb(23,23,21). Visually inspected all three boards.
- Final static preview artifact: power-of-css-build-hHZrCT. No runtime JS,
  dependencies, game-state rules or deployment configuration changed.

Independent breakage review: APPROVE. All 122 state selectors unchanged;
independent verifier and 320px Chrome Lumen keyboard/gameplay checks passed.
Safari/Firefox and screen-reader announcements were not tested in this follow-up.
