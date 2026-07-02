# Northbank Atlas

A mobile-first CSS-only fictional city atlas for GitHub Pages.

No backend. No JavaScript. No framework runtime.

Northbank Atlas is a static urban-planning poster that uses CSS scroll-driven
animation to move between transit, green loop, water edge, and delivery layers.

## Shape

- `index.html`: one atlas cover, fixed animated district map, five planning plates, and one final plate.
- `styles/`: CSS modules for the atlas shell, city field, scroll layers, panels, and responsive constraints.
- `assets/`: static favicon plus SVG/PNG sharing preview assets.
- `404.html` and `.nojekyll`: GitHub Pages deployment support files.
- `dist/`: generated deploy folder from `npm run build`.

## Commands

```sh
npm run verify
npm run build
```

`index.html` can also be opened directly for local viewing. The build command
copies `index.html`, `404.html`, `.nojekyll`, `styles/`, and `assets/` into `dist/` for GitHub Pages-style hosting.
