# gh-portfolio

Three.js art portfolio for GitHub Pages.

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The production output is `dist/`. `vite.config.ts` uses `base: "./"` so the same build can work on either a user site such as `tac0de.github.io` or a project page such as `tac0de.github.io/gh-portfolio`.

## Deploy Options

- User page: push this repo as `tac0de.github.io`, build with GitHub Pages, and publish `dist`.
- Project page: push as `gh-portfolio`, enable GitHub Pages, and publish the built `dist` folder through a Pages workflow.

## Content

- Kkomo: KakaoTalk study chatbot project.
- PlotNodes: relationship-driven character AI chat app.
- The Divine Paradox: seeded 3D observation world.
- Future work: 3D lofi horror game and long-form fantasy novel.
