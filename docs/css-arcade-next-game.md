# Next CSS game proposal — ORBITAL

## Direction

Add one game that feels unlike Lumen, Glyph, and Relay: a spatial routing
puzzle where the player rotates orbital gates to send signals to matching
satellites. The board is not a conventional grid; it is a set of nested
orbits with moving-looking, but fully deterministic, CSS geometry.

Working title: **Orbital**

One-line promise: **Keep the signal in orbit.**

## Why this is the right next game

- Lumen is path tracing on a square grid.
- Glyph is radial alignment.
- Relay is Boolean switching.
- Orbital combines radial geometry, timing-like visual feedback, and spatial
  constraints without duplicating any of those rules.

The player rotates 3–5 orbital gates. Each gate has four native radio states.
The signal exits a gate at one of four bearings; a level is solved only when
all signals arrive at satellites with the same symbol and channel.

## Modern CSS used intentionally

### `@property`

Register typed custom properties such as `--orbit-angle` (`<angle>`) and
`--signal-progress` (`<number>`). Selector state assigns their values, so
transforms and conic gradients interpolate cleanly without JavaScript.

### Anchor positioning

Use an orbit hub as the anchor for satellite labels and status markers. The
fallback remains absolute positioning with the same authored coordinates, so
unsupported browsers still receive a playable board.

### Container queries

The board changes its annotation density and control arrangement based on the
available board width, not only the viewport width. This keeps the game usable
inside a narrow panel or an embedded preview.

### Scroll-driven animation

Use `view()` only for the level briefing and post-solve diagram: as the player
scrolls into the board, the orbital legend assembles. It is decorative and
never affects victory, input, or accessibility.

### Existing state primitives

Native radios hold the four orientations. `:checked`, `:has()`, sibling
selectors, and authored finite ray segments determine signal visibility and
victory. No runtime JavaScript, random state, timer, or persistence.

## Proposed levels

1. **First orbit** — two gates, one signal, one receiver. Teaches bearing and
   the four-state control.
2. **Crossing paths** — three gates and two signals. Wrong crossings visibly
   deflect but do not count as a match.
3. **Gravity well** — four gates, a decoy satellite, and a central blocker.
   The shortest-looking route is intentionally wrong.

Optional later levels can introduce a one-way gate or a split signal, but the
first release should stop at three levels until the controls feel effortless.

## Visual language

Keep the Kinetic Editorial system but introduce a dark observatory panel:
paper page, ink orbit lines, vermilion signal, and one pale blue receiver
channel. The blue is semantic and sparse, not a return to the old palette.
Use numbered bearings, small instrument labels, and an oversized “ORBITAL”
wordmark in the home preview.

## Acceptance checks

- All states are finite and exhaustively verifiable in `scripts/verify.mjs`.
- Every gate remains keyboard-operable with visible focus and touch-sized
  controls.
- Unsupported anchor positioning and scroll timelines degrade to static
  geometry and no loss of puzzle access.
- `prefers-reduced-motion: reduce` removes the decorative orbit animation.
- Three levels solve, fail visibly, reset, and preserve the URL/HTML/CSS-only
  contract.
- Existing 236-state verification for Lumen, Glyph, and Relay remains green.

## Alternatives considered

### CASCADE — CSS signal propagation

Style queries and nested containers would make a chain of tiles react to
neighboring state. Very novel, but browser support and debugging complexity
are higher; it is better as a later experimental branch.

### FOLD — paper engineering puzzle

Uses 3D transforms, `clip-path`, and perspective to fold a sheet into a target
shape. Strong visual identity, but it overlaps Glyph's alignment language and
would be harder to make the solution legible to screen-reader users.

## Decision

Proceed with **Orbital** as the next prototype. Build one playable level first,
verify the state model and fallback behavior, then expand to levels 2–3 only if
the interaction is clear at 320px and with keyboard input.

References: [CSS `@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40property),
[scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations),
[container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries).
