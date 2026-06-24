# PROJECT

## Identity

This site is becoming a small Three.js browser game portal: short, strange,
static-site-friendly games that can be played immediately on desktop and mobile.

## Current Release

The first game is `NO VACANCY`, a lo-fi motel horror game. The immediate project
priority is not adding more games; it is making the first game feel playable and
readable enough to justify the portal.

## Platform Rules

- Static site only.
- No backend.
- No login.
- No AI API.
- No database.
- Use `localStorage` only for small local progress.
- Keep games lightweight enough for mid-range phones.
- Prefer generated textures and primitive geometry before adding assets.

## Stack

- Vite
- TypeScript
- Three.js
- Web Audio API
- DOM/CSS HUD
- GitHub Pages

## Architecture Direction

Short term: keep the current plain TypeScript + Three.js structure and make the
first game work.

Medium term: split the app into:

```txt
src/
  arcade/
    portal and game registry
  engine/
    renderer, input, audio, loop helpers
  games/
    no-vacancy/
      world, director, interactions, generated textures
  ui/
    shared DOM UI
```

Do not build a large reusable engine before the first game proves the gameplay.

## Deployment

GitHub Pages deploys from `main` through `.github/workflows/deploy.yml`.
Validation before deploy should include `npm run build`.
