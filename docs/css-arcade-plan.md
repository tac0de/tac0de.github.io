# The Power of CSS — implementation contract

Approved 2026-09-09: replace the existing game with a static HTML/CSS collection,
one home and Lumen, Glyph, Relay with three authored levels each. User explicitly
said to begin implementation after the reference, rules and visual proposal.

## Scope and alternatives

One polished game is cheaper to maintain but does not demonstrate the requested
variety. Six experiments favor breadth over complete play loops. The approved
middle option is three distinctive games, each with three playable levels.
Completion means correct input, visible feedback, tested victory, reset, keyboard
and touch operation, responsive layout, and no runtime JavaScript or backend.
No random generation, persistent scores, timing competition, or deployment.

## Architecture and contracts

- One static index.html, shared src/style.css. Fragment links select one level;
  the home is the default. Every level is an independent native form. The URL
  selects a view, radio/checkbox inputs hold temporary state, reset restores the
  form defaults. Switching levels preserves that form until reset or navigation;
  no durable storage is promised. There is no concurrent writer or network state.
- Lumen: fixed mirrors on a grid, each slash/backslash. Beam routes are authored
  from finite geometric ray tracing, including incorrect branches stopping at
  the boundary; all receiver conditions must hold. Two sources on level 3.
  No general physics engine. Native checkbox per two-position mirror.
- Glyph: two/three concentric rings. Each ring has four radio orientations. A
  continuous radial red channel must connect the center anchor and fixed outer
  anchor. Distinct decorative marks provide orientation; level 3 adds dead-end
  ornament. Only complete channel alignment wins.
- Relay: 3/4/5 binary switches; visible gate legend and formulas describe AND,
  XOR, NOT, OR. Light every target while warning stays off. Enumerate all input
  combinations against independent Boolean expectations during verification.
- :has/:checked/:not determine state and victory. @property is decorative only.
  Grid, container queries, oklch, gradients, masks/transforms provide visuals.
  Never hide keyboard inputs with display:none. Focus remains visible. Feedback
  text is real HTML; color is not the sole indicator. Reduced motion removes
  continuous animation. Unsupported :has receives an explanatory fallback.
- Static HTML/CSS is source of truth. Development/verification scripts may use
  Node/Python, but no JS ships or executes in the browser. Existing Vite is only
  build/serve tooling; no dependency additions. Replace the old build entry and
  obsolete TypeScript config as part of authorized HTML/CSS project reset.
- Preserve Git history and recoverable pre-reset snapshot in /private/tmp.
  Keep deployment configuration unchanged. Legacy source/metadata is removed;
  prior traces/evals are retained only if relevant, otherwise in backup.

## Verification and handoff

Static checks: no script/event handlers/remote resources, valid internal links,
unique IDs, all forms and labels, reset controls, nine levels, proper reduced
motion. Independent exhaustive state checks: geometric mirror trace vs visible
beam selectors and winner; glyph rotations vs target; Boolean relay outputs vs
selectors. Browser checks: every game's solve/near-miss/reset, level navigation,
keyboard operation, narrow viewport and overflow; inspect desktop/mobile visuals.
Run node scripts/verify.mjs, including static behavior checks and production build.
Independent design and implementation review are required before handoff.

References: https://www.csszengarden.com/pages/about/ ;
https://www.monumentvalleygame.com/ ;
https://css-tricks.com/how-i-made-a-pure-css-puzzle-game/ ;
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has ;
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property .

## Current visual iteration and cleanup

User selected Kinetic Editorial; scope in docs/kinetic-editorial.md. Puzzle rules,
state.css and fixture geometry remain unchanged. The user explicitly approved
legacy deletion after the initial automatic-review rejection. The approved old
source/config/assets/evals/traces have now been removed. Vite build no longer
requires TypeScript. Protected dist, installed node_modules, Git history,
deployment configuration and recovery snapshots are preserved.
