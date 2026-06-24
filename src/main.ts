import './style.css';
import { Game } from './game/Game';

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Required DOM element is missing: ${selector}`);
  }

  return element;
}

const canvas = getRequiredElement<HTMLCanvasElement>('#game');
const statusEl = getRequiredElement<HTMLDivElement>('#status');
const messageEl = getRequiredElement<HTMLDivElement>('#message');
const objectiveEl = getRequiredElement<HTMLDivElement>('#objective');
const crosshairEl = getRequiredElement<HTMLDivElement>('#crosshair');

const game = new Game(canvas, statusEl, messageEl, objectiveEl, crosshairEl);
game.start();

console.log('MOTEL 204 COMPONENT BUILD 001');