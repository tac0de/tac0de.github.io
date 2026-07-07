import "./style.css";
import {
  CARD_DEFS,
  CampCard,
  CardKind,
  createInitialState,
  findRecipe,
  startRecipe,
  tickCamp,
  cancelInvalidStack
} from "./card-camp/model";

document.documentElement.dataset.page = "cards";

const CARD_SYMBOLS: Record<CardKind, string> = {
  villager: "person",
  berryBush: "bush",
  tree: "tree",
  stone: "stone",
  berry: "berry",
  wood: "wood",
  campfire: "fire",
  cookedBerry: "snack",
  rain: "rain",
  coldNight: "cold",
  trader: "trade"
};

const table = document.querySelector<HTMLDivElement>("#card-table");
const cardLayer = document.querySelector<HTMLDivElement>("#card-layer");
const workLayer = document.querySelector<HTMLDivElement>("#work-layer");
const message = document.querySelector<HTMLParagraphElement>("#camp-message");
const dayLabel = document.querySelector<HTMLSpanElement>("#camp-day");
const foodLabel = document.querySelector<HTMLSpanElement>("#camp-food");
const timerLabel = document.querySelector<HTMLSpanElement>("#camp-timer");
const goalLabel = document.querySelector<HTMLSpanElement>("#camp-goal");

if (!table || !cardLayer || !workLayer || !message || !dayLabel || !foodLabel || !timerLabel || !goalLabel) {
  throw new Error("Card camp shell is missing required DOM nodes.");
}

const tableElement = table;
const cardLayerElement = cardLayer;
const workLayerElement = workLayer;
const messageElement = message;
const dayElement = dayLabel;
const foodElement = foodLabel;
const timerElement = timerLabel;
const goalElement = goalLabel;

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
let activeDropTargetId: string | undefined;
let selectedCardId: string | undefined;
let lastTime = performance.now();
let didFitInitialLayout = false;
let suppressClickUntil = 0;

render();
requestAnimationFrame(loop);
window.addEventListener("resize", () => {
  fitCardsInsideTable();
  render();
});

function loop(now: number): void {
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  tickCamp(state, delta);
  render();
  requestAnimationFrame(loop);
}

function render(): void {
  if (!didFitInitialLayout) {
    layoutInitialCards();
    didFitInitialLayout = true;
  }
  fitCardsInsideTable();

  messageElement.textContent = state.eventMessage ? `${state.message} ${state.eventMessage}` : state.message;
  dayElement.textContent = `Day ${state.day}`;
  foodElement.textContent = `Food ${foodScore()}`;
  timerElement.textContent = `Dusk ${Math.ceil(state.dayRemaining)}s`;
  goalElement.textContent = state.goalMet ? "Goal Campfire lit" : "Goal Light campfire";
  goalElement.classList.toggle("is-met", state.goalMet);

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
    const isTarget = activeDropTargetId === card.id;
    const isDragging = active?.card.id === card.id;
    node.className = `camp-card camp-card-${card.kind} is-${card.state}${card.routineTargetId ? " has-routine" : ""}${selectedCardId === card.id ? " is-selected" : ""}${isTarget ? " is-drop-target" : ""}${isDragging ? " is-dragging" : ""}`;
    node.style.transform = `translate(${card.x}px, ${card.y}px)`;
    node.setAttribute("aria-label", `${def.label}, ${def.type}`);
    node.disabled = card.state === "working";
    node.innerHTML = `
      <span class="camp-card-symbol" data-symbol="${CARD_SYMBOLS[card.kind]}"></span>
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
    bar.style.transform = `translate(${order.x - 12}px, ${order.y - 26}px)`;
    bar.innerHTML = `
      <strong>${CARD_DEFS[order.recipe.result].label}</strong>
      <span style="width: ${100 - (order.remaining / order.total) * 100}%"></span>
    `;
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
  card.x = event.clientX - tableRect.left - active.offsetX;
  card.y = event.clientY - tableRect.top - active.offsetY;
  activeDropTargetId = undefined;
  render();

  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent): void {
  if (!active || active.pointerId !== event.pointerId) return;

  const tableRect = tableElement.getBoundingClientRect();
  const size = cardSize();
  active.card.x = clamp(event.clientX - tableRect.left - active.offsetX, 0, tableRect.width - size.width);
  active.card.y = clamp(event.clientY - tableRect.top - active.offsetY, 0, tableRect.height - size.height);
  activeDropTargetId = findDropTarget(active.card, true)?.id;
  active.moved = true;
  render();
}

function onPointerUp(event: PointerEvent): void {
  const node = event.currentTarget as HTMLButtonElement;
  node.removeEventListener("pointermove", onPointerMove);
  node.removeEventListener("pointerup", onPointerUp);
  node.removeEventListener("pointercancel", onPointerUp);

  if (!active || active.pointerId !== event.pointerId) return;

  const dropped = active.card;
  const moved = active.moved;
  active = undefined;
  activeDropTargetId = undefined;

  if (!moved) {
    render();
    return;
  }
  suppressClickUntil = performance.now() + 350;
  const target = findDropTarget(dropped, false);

  if (!target) {
    if (setNearbyRoutine(dropped)) {
      render();
      return;
    }
    render();
    return;
  }

  const recipe = findRecipe([dropped.kind, target.kind]);
  if (!recipe) {
    cancelInvalidStack(state, dropped);
    nudgeAwayFrom(dropped, target);
    window.setTimeout(() => {
      dropped.state = "idle";
      render();
    }, 320);
    render();
    return;
  }

  alignForCraft(dropped, target);
  startRecipe(state, recipe, [dropped, target]);
  render();
}

function onCardClick(event: MouseEvent): void {
  if (performance.now() < suppressClickUntil) {
    event.preventDefault();
    return;
  }

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

  alignForCraft(selected, card);
  startRecipe(state, recipe, [selected, card]);
  render();
}

function findDropTarget(card: CampCard, validOnly: boolean): CampCard | undefined {
  let best: { card: CampCard; score: number } | undefined;
  for (const candidate of state.cards) {
    if (candidate.id === card.id || candidate.state === "working") continue;
    const isRecipe = Boolean(findRecipe([card.kind, candidate.kind]));
    if (validOnly && !isRecipe) continue;

    const overlap = overlapRatio(card, candidate);
    const distanceScore = centerDistanceScore(card, candidate);
    const score = Math.max(overlap, distanceScore);
    const threshold = isRecipe ? 0.2 : 0.34;
    if (score >= threshold && (!best || score > best.score)) {
      best = { card: candidate, score };
    }
  }
  return best?.card;
}

function setNearbyRoutine(card: CampCard): boolean {
  if (card.kind !== "villager") return false;
  const target = findRoutineTarget(card);
  if (!target) return false;
  card.routineTargetId = target.id;
  state.message = `${CARD_DEFS[target.kind].label} routine set.`;
  return true;
}

function findRoutineTarget(card: CampCard): CampCard | undefined {
  let best: { card: CampCard; distance: number } | undefined;
  for (const candidate of state.cards) {
    if (candidate.id === card.id || candidate.state === "working") continue;
    if (!findRecipe([card.kind, candidate.kind])) continue;
    const distance = centerDistance(card, candidate);
    if (distance <= cardSize().height * 1.08 && (!best || distance < best.distance)) {
      best = { card: candidate, distance };
    }
  }
  return best?.card;
}

function layoutInitialCards(): void {
  const size = cardSize();
  const tableRect = tableElement.getBoundingClientRect();
  const columns = tableRect.width < 620 ? 2 : 4;
  const gap = tableRect.width < 620 ? 14 : 26;
  const startX = Math.max(10, (tableRect.width - columns * size.width - (columns - 1) * gap) / 2);
  const startY = tableRect.width < 620 ? 18 : 56;

  state.cards.forEach((card, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    card.x = startX + column * (size.width + gap);
    card.y = startY + row * (size.height + 20);
  });
}

function fitCardsInsideTable(): void {
  const size = cardSize();
  const tableRect = tableElement.getBoundingClientRect();
  for (const card of state.cards) {
    card.x = clamp(card.x, 0, Math.max(0, tableRect.width - size.width));
    card.y = clamp(card.y, 0, Math.max(0, tableRect.height - size.height));
  }
}

function cardSize(): { width: number; height: number } {
  const tableRect = tableElement.getBoundingClientRect();
  if (tableRect.width <= 380) return { width: 88, height: 118 };
  if (tableRect.width <= 620) return { width: 96, height: 128 };
  return { width: 118, height: 154 };
}

function overlapRatio(a: CampCard, b: CampCard): number {
  const size = cardSize();
  const xOverlap = Math.max(0, Math.min(a.x + size.width, b.x + size.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + size.height, b.y + size.height) - Math.max(a.y, b.y));
  return (xOverlap * yOverlap) / (size.width * size.height);
}

function centerDistanceScore(a: CampCard, b: CampCard): number {
  const size = cardSize();
  const distance = centerDistance(a, b);
  const reach = Math.max(size.width, size.height) * 0.58;
  return clamp(1 - distance / reach, 0, 1);
}

function centerDistance(a: CampCard, b: CampCard): number {
  const size = cardSize();
  const aX = a.x + size.width / 2;
  const aY = a.y + size.height / 2;
  const bX = b.x + size.width / 2;
  const bY = b.y + size.height / 2;
  return Math.hypot(aX - bX, aY - bY);
}

function alignForCraft(a: CampCard, b: CampCard): void {
  const size = cardSize();
  const tableRect = tableElement.getBoundingClientRect();
  const centerX = clamp((a.x + b.x) / 2, 0, Math.max(0, tableRect.width - size.width));
  const centerY = clamp((a.y + b.y) / 2, 32, Math.max(32, tableRect.height - size.height - 24));
  a.x = clamp(centerX - 12, 0, Math.max(0, tableRect.width - size.width));
  a.y = clamp(centerY + 8, 0, Math.max(0, tableRect.height - size.height));
  b.x = clamp(centerX + 12, 0, Math.max(0, tableRect.width - size.width));
  b.y = clamp(centerY - 8, 0, Math.max(0, tableRect.height - size.height));
}

function nudgeAwayFrom(card: CampCard, target: CampCard): void {
  const size = cardSize();
  const tableRect = tableElement.getBoundingClientRect();
  const direction = card.x + size.width / 2 < target.x + size.width / 2 ? -1 : 1;
  card.x = clamp(card.x + direction * Math.round(size.width * 0.42), 0, Math.max(0, tableRect.width - size.width));
  card.y = clamp(card.y + 10, 0, Math.max(0, tableRect.height - size.height));
}

function foodScore(): number {
  return state.cards.reduce((score, card) => {
    if (card.kind === "cookedBerry") return score + 2;
    if (card.kind === "berry") return score + 1;
    return score;
  }, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
