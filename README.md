# The Power of CSS

A playable collection built entirely with HTML and CSS. Three games, nine authored
puzzles, no runtime JavaScript, canvas, backend, remote font or image dependencies.

- **Lumen** — turn slash/backslash mirrors to connect each light source to its
  receiver. Wrong turns display their actual paths to the boundary. Level 3 has
  two independent light sources.
- **Glyph** — rotate two or three concentric rings to join a red channel from
  the fixed center to the north anchor. Short red marks in level 3 are dead ends.
- **Relay** — toggle switches to satisfy the visible Boolean conditions. Light
  every target while leaving the warning lamp off.

Open `index.html` directly or serve the project as static files. Each level has
its own fragment URL, such as `index.html#lumen-1`. Mouse, touch and keyboard work:
Tab moves between controls, Space toggles, arrow keys change a radio group's
orientation. Each form has an independent reset. Navigating between fragments
keeps temporary form state; browser reload/restore behavior is browser-dependent.
No durable progress, random levels, scores or time limits are provided.

Modern browsers with `:has()` support are required. The UI includes a fallback
message for unsupported browsers and honors reduced motion. `@property` animation
is decorative. Core puzzle state uses native inputs and CSS selectors.

## Source and checks

- `index.html`: all views, native inputs, geometry and feedback text.
- `src/style.css`: responsive presentation and CSS artwork.
- `src/state.css`: finite input conditions, rays, gates and victory selectors.
- `tests/levels.json`: authored geometry, angles and Boolean rules.
- `scripts/check-puzzles.mjs`: independent cell-by-cell optical tracing and
  exhaustive state checks (236 states), plus static and production asset checks.

Run `node scripts/verify.mjs`. This runs the state checks, the existing configured
build into a fresh temporary directory, and verifies no JS is shipped. It leaves
protected `dist/` untouched and prints the production artifact path. Vite is used only for build/serve tooling; the old TypeScript dependency and
configuration were removed. No dependencies were added. A development
Vite server may inject its development client; direct static serving and the
production output have no runtime JavaScript.

## Visual direction and cleanup

Kinetic Editorial: paper, black and vermilion; oversized cropped CSS typography,
asymmetric experiment panels, and a native “Shift the page” checkbox that repositions
the poster. All links remain reachable in either composition. Game rules are
unchanged; reduced motion suppresses entry and interaction animation.

The user explicitly approved legacy cleanup. Old game source, TypeScript config
and dependency, old public imagery/icon, obsolete evals and three historical
traces were removed. Package/project names now match this collection. Installed
node_modules and protected dist are left to their package/build tools. Git history
and the deployment workflow remain unchanged.

Recovery copies (temporary, not permanent archives):

- `/private/tmp/gh-portfolio-before-css-20260909.tar.gz` and matching `.patch`
- `/private/tmp/css-arcade-before-editorial-20260909.tar.gz`

See `docs/kinetic-editorial.md` for accepted visual scope,
`docs/css-arcade-plan.md` for puzzle contracts, and
`docs/css-arcade-verification.md` for verification evidence and limits.

All website copy and accessible labels are English. Preview artwork and game boards
share per-game CSS theme tokens: vermilion Lumen, paper Glyph, and ink Relay.
Lumen channels also carry matching numbers, so color is not the only cue.
