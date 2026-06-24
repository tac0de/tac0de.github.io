import { AudioSystem } from "./audio/AudioSystem";
import { Game } from "./Game";
import { InputSystem } from "./input/InputSystem";
import { Renderer } from "./rendering/Renderer";
import { SaveSystem } from "./save/SaveSystem";
import { UI } from "./ui/UI";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

const save = new SaveSystem();

renderPortal(root, save);

function renderPortal(root: HTMLElement, save: SaveSystem): void {
  const loop = save.getLoop();
  root.innerHTML = `
    <main class="portal" aria-label="TAC0DE ARCADE">
      <section class="portal-hero">
        <p class="portal-kicker">THREE.JS WEB GAMES</p>
        <h1>TAC0DE ARCADE</h1>
        <p class="portal-copy">Small browser games built for quick, strange sessions.</p>
      </section>

      <section class="game-shelf" aria-label="Game shelf">
        <article class="game-card featured">
          <div class="game-preview" aria-hidden="true">
            <span class="sign">NO VACANCY</span>
            <span class="room">203</span>
            <span class="scan"></span>
          </div>
          <div class="game-info">
            <p class="game-status">Featured / First playable</p>
            <h2>NO VACANCY</h2>
            <p>
              A lo-fi motel night shift where the guest book, CCTV, and Room 203
              begin correcting reality.
            </p>
            <div class="game-meta">
              <span>Horror</span>
              <span>5-10 min</span>
              <span>Loop ${loop}</span>
            </div>
            <div class="portal-actions">
              <button class="primary" type="button" data-play>Play</button>
              <button class="secondary" type="button" data-reset>Reset local progress</button>
            </div>
          </div>
        </article>

        <article class="game-card locked">
          <div>
            <p class="game-status">Coming soon</p>
            <h2>CAM 02</h2>
            <p>CCTV-only motel horror prototype.</p>
          </div>
        </article>

        <article class="game-card locked">
          <div>
            <p class="game-status">Coming soon</p>
            <h2>UNTITLED DRIVE</h2>
            <p>Low-poly road game experiment.</p>
          </div>
        </article>
      </section>
    </main>
  `;

  root.querySelector("[data-play]")?.addEventListener("click", () => startNoVacancy(root, save));
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    save.reset();
    renderPortal(root, save);
  });
}

function startNoVacancy(root: HTMLElement, save: SaveSystem): void {
  root.innerHTML = "";
  const ui = new UI(root);
  const input = new InputSystem(root, ui);
  const audio = new AudioSystem();
  const renderer = new Renderer(root);
  const game = new Game({ renderer, input, ui, audio, save });
  game.start();
  ui.start();
}
