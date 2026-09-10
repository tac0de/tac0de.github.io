# The Power of CSS

## Agent learning platform direction

The next product direction is a backend-free CSS practice platform for AI agents:
discover a task, implement CSS, receive local verification feedback, and apply the
experience to new tasks. The current playable collection remains available below.
Implemented: two Relay practice tasks, one transfer task, Chromium verification,
failed-attempt reflections, separate baseline/recall workspaces, optional cost records,
and HTML/JSON comparison reports. Automatic curriculum progression remains future
work. Learning gains have not been measured.

See [product requirements](docs/agent-css-platform-product.md) and
[technical contracts](docs/agent-css-platform-design.md). The website
remains HTML/CSS-only, with a separate local evaluator and no server API or account.

### Local agent practice

Visit [the learning platform](https://tac0de.github.io/learn/) and follow the
[complete agent guide](public/learn/agent-guide.md). The website explains the workflow;
the agent executes the commands locally from this source checkout.

Run the complete prescribed-CSS walkthrough (no model calls):

```sh
node scripts/agent-css/main.mjs demo /tmp/css-learning-demo
# Open /tmp/css-learning-demo/report/index.html.
```

Open `public/learn/index.html` for the static guide. From this checkout, with Node.js
24+ and an installed Chrome/Chromium:

```sh
node scripts/agent-css/main.mjs list
node scripts/agent-css/main.mjs prepare relay-and /tmp/css-relay-practice
# Edit only /tmp/css-relay-practice/submission.css.
node scripts/agent-css/main.mjs check /tmp/css-relay-practice
node scripts/agent-css/main.mjs report /tmp/css-relay-practice
```

The destination must not exist. Use `relay-xor` and a new directory for the second
practice task. Commands print JSON. `check` exits 0 for passed, 1 for failed, 2 for
invalid input/environment/interruption. Set `AGENT_CSS_CHROME` to an installed
browser executable if it is not in the macOS Chrome or Linux Chromium default path.
The tested environment is Node 24.2 and macOS Chrome 152; other environments have
not been verified. In sandboxed agent environments, launching Chrome may require
execution permission; a failed launch is an environment error, never a puzzle score.

Only CSS changes are accepted. This first track excludes CSS escapes, external
resources, animation/transition declarations, and focus/hover/active/target/link/user-validity
selectors. This prevents the runner's interaction order from substituting for Boolean
input logic. The fixed HTML still supplies keyboard focus styles. The limit is 32 KiB per submission,
60 seconds per evaluation, and 1,000 attempts per workspace. Browser CSS parsing and
cascade determine behavior. Nonempty CSS with no parsed declarations is invalid;
otherwise browser error recovery applies, so this is not a comprehensive syntax linter.
The fixed 800×600 visibility test is not a pixel comparison or general accessibility audit.

The runner uses an independent temporary profile and inspector pipes, not a local
web server or personal session. Page resource requests are blocked. Inspector code
observes the page but is not added to its HTML. No runtime JS is shipped on the site.

`attempts/` keeps numbered CSS snapshots and JSON results with input states, expected
outputs and observed failures. `report` separates the first and latest attempts.
Records and checks are public/editable, not tamper-proof. An interrupted process may
leave `.check.lock`, pending files or a temporary profile. Never remove a lock just
to retry: first establish the recorded process has ended and inspect incomplete files;
use a new workspace if recovery is unclear. No automatic stale-lock recovery exists.

Validation:

```sh
node --test tests/agent-css/*.test.mjs
AGENT_CSS_BROWSER_TESTS=1 node --test tests/agent-css/*.test.mjs
node scripts/verify.mjs
```

The default suite tests contracts and failure handling; actual browser regression
is explicitly enabled by the second command. No model calls are part of these tests.

## Current playable collection

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

## Social sharing

The deployed homepage supplies English Open Graph and Twitter summary metadata,
a canonical URL and a 1200 × 630 PNG at `/css-arcade-og.png`. The image uses the
same paper, ink and vermilion palette as the website. The verifier checks metadata
consistency and image dimensions in both source and production output.

## Publishing

The existing GitHub Pages workflow builds the static website after a push to `main`.
Local workspaces and `.waymark` records are excluded from publication. The public
example report is a prescribed-CSS demonstration, not a model experiment.
