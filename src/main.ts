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

const ui = new UI(root);
const input = new InputSystem(root, ui);
const audio = new AudioSystem();
const save = new SaveSystem();
const renderer = new Renderer(root);
const game = new Game({ renderer, input, ui, audio, save });

game.start();
