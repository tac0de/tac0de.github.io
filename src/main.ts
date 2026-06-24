import { ArcadePortal } from "./arcade/ArcadePortal";
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

let portal: ArcadePortal | undefined;

portal = new ArcadePortal(root, save, () => startNoVacancy(root, save));
portal.start();

function startNoVacancy(root: HTMLElement, save: SaveSystem): void {
  portal?.dispose();
  portal = undefined;
  root.innerHTML = "";
  const ui = new UI(root);
  const input = new InputSystem(root, ui);
  const audio = new AudioSystem();
  const renderer = new Renderer(root);
  const game = new Game({ renderer, input, ui, audio, save });
  game.start();
}
