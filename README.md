# Outpost Miniature

Static browser colony simulation inspired by small emergent settlement games.

## Product Shape

- The root page is the playable game.
- The map is rendered with Canvas 2D.
- Interface panels are plain DOM.
- Three colonists act on a small 16x16 tile map.
- The player assigns work priorities: gather, build, cook, rest.
- Food, wood, scrap, and morale drive the settlement loop.
- A day/night clock creates daily accounting and night incidents.
- Save data is stored in `localStorage`.

## Technical Stack

- Vite
- TypeScript
- Canvas 2D
- Plain DOM UI
- Plain CSS
- `localStorage`
- GitHub Pages-compatible static build

## Architecture

```text
src/
  main.ts      # simulation, canvas renderer, UI binding, save/load
  style.css    # dense game UI styling
```

The first version keeps the engine compact in one TypeScript file so the core loop is easy to reshape. Once the loop proves useful, split it into `game/`, `render/`, and `ui/` modules.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
node scripts/verify.mjs
```
