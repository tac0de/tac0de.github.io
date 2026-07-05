import "./style.css";
import {
  CARD_DEFS,
  CampCard,
  createInitialState,
  findRecipe,
  startRecipe,
  tickCamp,
  cancelInvalidStack
} from "./card-camp/model";

document.documentElement.dataset.page = "cards";

const table = document.querySelector<HTMLDivElement>("#card-table");
const cardLayer = document.querySelector<HTMLDivElement>("#card-layer");
const workLayer = document.querySelector<HTMLDivElement>("#work-layer");
const message = document.querySelector<HTMLParagraphElement>("#camp-message");
const dayLabel = document.querySelector<HTMLSpanElement>("#camp-day");
const foodLabel = document.querySelector<HTMLSpanElement>("#camp-food");
const timerLabel = document.querySelector<HTMLSpanElement>("#camp-timer");

if (!table || !cardLayer || !workLayer || !message || !dayLabel || !foodLabel || !timerLabel) {
  throw new Error("Card camp shell is missing required DOM nodes.");
}

const tableElement = table;
const cardLayerElement = cardLayer;
const workLayerElement = workLayer;
const messageElement = message;
const dayElement = dayLabel;
const foodElement = foodLabel;
const timerElement = timerLabel;

const state = createInitialState();
const cardNodes = new Map<string, HTMLButtonElement>();
let active:
  | {
      card: CampCard;
      pointerId: number;
      offsetX: number;
      offsetY: number;
      moved: boolean;
    }
  | undefined;
let selectedCardId: string | undefined;
let lastTime = performance.now();

render();
requestAnimationFrame(loop);

function loop(now: number): void {
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  tickCamp(state, delta);
  render();
  requestAnimationFrame(loop);
}

function render(): void {
  messageElement.textContent = state.message;
  dayElement.textContent = `Day ${state.day}`;
  foodElement.textContent = `Food ${state.cards.filter((card) => card.kind === "berry").length}`;
  timerElement.textContent = `Dusk ${Math.ceil(state.dayRemaining)}s`;

  for (const card of state.cards) {
    let node = cardNodes.get(card.id);
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "camp-card";
      node.dataset.cardId = card.id;
      node.addEventListener("pointerdown", onPointerDown);
      node.addEventListener("click", onCardClick);
      cardLayerElement.append(node);
      cardNodes.set(card.id, node);
    }

    const def = CARD_DEFS[card.kind];
    node.className = `camp-card camp-card-${card.kind} is-${card.state}${selectedCardId === card.id ? " is-selected" : ""}`;
    node.style.transform = `translate(${card.x}px, ${card.y}px)`;
    node.disabled = card.state === "working";
    node.innerHTML = `
      <span class="camp-card-type">${def.type}</span>
      <span class="camp-card-name">${def.label}</span>
    `;
  }

  for (const [id, node] of cardNodes) {
    if (!state.cards.some((card) => card.id === id)) {
      node.remove();
      cardNodes.delete(id);
    }
  }

  workLayerElement.replaceChildren(...state.workOrders.map((order) => {
    const bar = document.createElement("div");
    bar.className = "work-order";
    bar.style.transform = `translate(${order.x}px, ${order.y - 20}px)`;
    bar.innerHTML = `<span style="width: ${100 - (order.remaining / order.total) * 100}%"></span>`;
    return bar;
  }));
}

function onPointerDown(event: PointerEvent): void {
  const node = event.currentTarget as HTMLButtonElement;
  const card = state.cards.find((candidate) => candidate.id === node.dataset.cardId);
  if (!card || card.state === "working") return;

  const tableRect = tableElement.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  active = {
    card,
    pointerId: event.pointerId,
    offsetX: event.clientX - nodeRect.left,
    offsetY: event.clientY - nodeRect.top,
    moved: false
  };

  node.setPointerCapture(event.pointerId);
  node.classList.add("is-dragging");
  card.x = event.clientX - tableRect.left - active.offsetX;
  card.y = event.clientY - tableRect.top - active.offsetY;
  render();

  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent): void {
  if (!active || active.pointerId !== event.pointerId) return;

  const tableRect = tableElement.getBoundingClientRect();
  active.card.x = clamp(event.clientX - tableRect.left - active.offsetX, 0, tableRect.width - 132);
  active.card.y = clamp(event.clientY - tableRect.top - active.offsetY, 0, tableRect.height - 172);
  active.moved = true;
  render();
}

function onPointerUp(event: PointerEvent): void {
  const node = event.currentTarget as HTMLButtonElement;
  node.removeEventListener("pointermove", onPointerMove);
  node.removeEventListener("pointerup", onPointerUp);
  node.removeEventListener("pointercancel", onPointerUp);
  node.classList.remove("is-dragging");

  if (!active || active.pointerId !== event.pointerId) return;

  const dropped = active.card;
  const moved = active.moved;
  active = undefined;

  if (!moved) {
    render();
    return;
  }
  const target = findDropTarget(dropped);

  if (!target) {
    dropped.state = "idle";
    render();
    return;
  }

  const recipe = findRecipe([dropped.kind, target.kind]);
  if (!recipe) {
    cancelInvalidStack(state, dropped);
    dropped.x = target.x + 42;
    dropped.y = target.y + 26;
    window.setTimeout(() => {
      dropped.state = "idle";
      render();
    }, 320);
    render();
    return;
  }

  startRecipe(state, recipe, [dropped, target]);
  render();
}

function onCardClick(event: MouseEvent): void {
  const node = event.currentTarget as HTMLButtonElement;
  const card = state.cards.find((candidate) => candidate.id === node.dataset.cardId);
  if (!card || card.state === "working") return;

  if (!selectedCardId) {
    selectedCardId = card.id;
    state.message = `${CARD_DEFS[card.kind].label} selected. Choose a target.`;
    render();
    return;
  }

  if (selectedCardId === card.id) {
    selectedCardId = undefined;
    state.message = "Selection cleared.";
    render();
    return;
  }

  const selected = state.cards.find((candidate) => candidate.id === selectedCardId);
  selectedCardId = undefined;

  if (!selected || selected.state === "working") {
    render();
    return;
  }

  const recipe = findRecipe([selected.kind, card.kind]);
  if (!recipe) {
    cancelInvalidStack(state, selected);
    window.setTimeout(() => {
      selected.state = "idle";
      render();
    }, 320);
    render();
    return;
  }

  startRecipe(state, recipe, [selected, card]);
  render();
}

function findDropTarget(card: CampCard): CampCard | undefined {
  return state.cards.find((candidate) => {
    if (candidate.id === card.id || candidate.state === "working") return false;
    return Math.hypot(candidate.x - card.x, candidate.y - card.y) < 168;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
