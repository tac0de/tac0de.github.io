import "./style.css";
import { games } from "./games";

document.documentElement.dataset.page = "arcade";

const grid = document.querySelector<HTMLElement>("#game-grid");

if (!grid) {
  throw new Error("Game grid is missing.");
}

grid.replaceChildren(...games.map(renderGameTile));

function renderGameTile(game: (typeof games)[number]): HTMLElement {
  const tile = game.playable ? document.createElement("a") : document.createElement("article");
  tile.className = `game-tile ${game.tileClass}`;

  if (game.playable) {
    tile.setAttribute("href", game.route);
  } else {
    tile.setAttribute("aria-label", `${game.title} coming soon`);
  }

  tile.innerHTML = `
    <span class="tile-status">${game.status}</span>
    <span class="tile-title">${game.title}</span>
    <span class="tile-copy">${game.description}</span>
    <span class="tile-tags">${game.tags.join(" · ")}</span>
    <span class="tile-demonstrates">${game.demonstrates}</span>
  `;

  return tile;
}
