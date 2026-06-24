# VERIFY

## Commands

```sh
npm run build
```

There is currently no separate lint script.

## Build Criteria

- TypeScript passes.
- Vite production build completes.
- GitHub Pages workflow succeeds after push.

## Runtime Criteria

- WebGL canvas renders on desktop.
- First screen is the minimal white 3D portal.
- WASD moves the portal camera.
- Mouse look works after pointer lock.
- The tiny overlay explains WASD, mouse, E, and ESC.
- Approaching the `NO VACANCY` door and pressing E starts the game.
- Task list appears after game start.
- No console exceptions during start.
- Mobile viewport does not have major UI overlap.

## Readability Checklist

- Can a new player identify the front desk in 5 seconds?
- Can a new player find the hallway without instructions?
- Can a new player tell where Room 203 is?
- Can a new player identify the CCTV monitor, guest book, key, phone, and breaker?
- Is the game visible without relying on the flashlight?

## Gameplay Checklist

- Is the current task always visible?
- Does each task point to a specific object or space?
- Does interaction feedback explain what happened?
- Does CCTV contradiction have a visible before/after?
- Do records change before reality follows?
- Can the player finish a shift and start the next audit loop?

## Design Checklist

- Does the scene look intentionally lo-fi rather than unfinished?
- Are silhouettes readable?
- Are colors and lights distinct by area?
- Are scanlines/pixel effects subtle enough not to hide gameplay?
