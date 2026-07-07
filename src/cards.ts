import "./style.css";
import * as THREE from "three";
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

const ICON_CELLS: Partial<Record<CardKind, { column: number; row: number }>> = {
  villager: { column: 0, row: 0 },
  berryBush: { column: 1, row: 0 },
  tree: { column: 2, row: 0 },
  stone: { column: 3, row: 0 },
  berry: { column: 0, row: 1 },
  wood: { column: 1, row: 1 },
  campfire: { column: 2, row: 1 },
  cookedBerry: { column: 3, row: 1 }
};

const PX_PER_UNIT = 100;
const CARD_FACE_SIZE = 256;
const CARD_FACE_RATIO = 1.28;
const CARD_Y = 0.08;
const DRAG_Y = 0.16;

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
const messageElement = message;
const dayElement = dayLabel;
const foodElement = foodLabel;
const timerElement = timerLabel;
const goalElement = goalLabel;

cardLayer.hidden = true;
workLayer.hidden = true;

const state = createInitialState();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_Y);
const cardMeshes = new Map<string, CardView>();
const workMeshes = new Map<string, THREE.Group>();
const cardTextureCache = new Map<CardKind, THREE.CanvasTexture>();
const iconImage = new Image();
const tableTexture = new THREE.TextureLoader().load("/assets/card-camp/tabletop.jpg");
const cardMaterialBase = new THREE.MeshStandardMaterial({ color: 0xe8cd96, roughness: 0.82, metalness: 0.02 });
const warningMaterial = new THREE.MeshStandardMaterial({ color: 0xb65a4e, roughness: 0.7 });
const routineMaterial = new THREE.MeshStandardMaterial({ color: 0x73c48d, roughness: 0.65 });

type CardView = {
  group: THREE.Group;
  body: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  routine: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
};

let active:
  | {
      card: CampCard;
      pointerId: number;
      offsetX: number;
      offsetZ: number;
      moved: boolean;
    }
  | undefined;
let activeDropTargetId: string | undefined;
let selectedCardId: string | undefined;
let lastTime = performance.now();
let didFitInitialLayout = false;
let boardWidth = 1;
let boardHeight = 1;

renderer.domElement.className = "card-canvas";
renderer.domElement.setAttribute("aria-label", "3D Card Camp tabletop");
tableElement.append(renderer.domElement);

tableTexture.colorSpace = THREE.SRGBColorSpace;
tableTexture.wrapS = THREE.RepeatWrapping;
tableTexture.wrapT = THREE.RepeatWrapping;
tableTexture.repeat.set(1.5, 1.2);

const tableSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshStandardMaterial({
    map: tableTexture,
    color: 0x8a6239,
    roughness: 0.88
  })
);
tableSurface.rotation.x = -Math.PI / 2;
tableSurface.position.y = -0.035;
scene.add(tableSurface);

const tableRim = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.12, 1),
  new THREE.MeshStandardMaterial({ color: 0x4f321f, roughness: 0.9 })
);
tableRim.position.y = -0.1;
scene.add(tableRim);

scene.add(new THREE.HemisphereLight(0xfff4cf, 0x302214, 2.2));
const keyLight = new THREE.DirectionalLight(0xffdc8f, 2.8);
keyLight.position.set(-3, 6, 4);
scene.add(keyLight);

iconImage.src = "/assets/card-camp/generated/card-camp-icons.png";
iconImage.addEventListener("load", () => {
  cardTextureCache.clear();
  for (const card of state.cards) {
    const view = cardMeshes.get(card.id);
    if (view) {
      view.face.material.map = cardTexture(card.kind);
      view.face.material.needsUpdate = true;
    }
  }
});

renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointercancel", onPointerUp);
window.addEventListener("resize", () => {
  resizeRenderer();
  fitCardsInsideTable();
});

resizeRenderer();
renderHud();
requestAnimationFrame(loop);

function loop(now: number): void {
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!didFitInitialLayout) {
    layoutInitialCards();
    didFitInitialLayout = true;
  }
  tickCamp(state, delta);
  fitCardsInsideTable();
  renderHud();
  syncScene();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function renderHud(): void {
  messageElement.textContent = state.eventMessage ? `${state.message} ${state.eventMessage}` : state.message;
  dayElement.textContent = `Day ${state.day}`;
  foodElement.textContent = `Food ${foodScore()}`;
  timerElement.textContent = `Dusk ${Math.ceil(state.dayRemaining)}s`;
  goalElement.textContent = state.goalMet ? "Goal Campfire lit" : "Goal Light campfire";
  goalElement.classList.toggle("is-met", state.goalMet);
}

function syncScene(): void {
  for (const card of state.cards) {
    const view = cardMeshes.get(card.id) ?? createCardView(card);
    const size = cardSize();
    const position = cardToWorld(card);
    view.group.position.set(position.x, active?.card.id === card.id ? DRAG_Y : CARD_Y, position.z);
    view.group.rotation.set(-0.04, 0, active?.card.id === card.id ? 0.07 : 0);
    view.group.scale.set(size.width / 118, 1, size.height / 154);

    const isTarget = activeDropTargetId === card.id;
    const isSelected = selectedCardId === card.id;
    view.ring.visible = isTarget || isSelected;
    view.ring.material.color.set(isTarget ? 0x9debd9 : 0xf7df8a);
    view.routine.visible = Boolean(card.routineTargetId);
    view.body.material = card.state === "warning" || card.state === "hungry" ? warningMaterial : cardMaterialBase;
  }

  for (const [id, view] of cardMeshes) {
    if (!state.cards.some((card) => card.id === id)) {
      view.group.removeFromParent();
      cardMeshes.delete(id);
    }
  }

  for (const order of state.workOrders) {
    const group = workMeshes.get(order.id) ?? createWorkView(order.id);
    const x = order.x / PX_PER_UNIT - boardWidth / 2;
    const z = boardHeight / 2 - order.y / PX_PER_UNIT;
    group.position.set(x, 0.19, z + 0.48);
    const fill = group.children[1];
    fill.scale.x = Math.max(0.03, 1 - order.remaining / order.total);
    fill.position.x = -0.43 + fill.scale.x * 0.43;
  }

  for (const [id, group] of workMeshes) {
    if (!state.workOrders.some((order) => order.id === id)) {
      group.removeFromParent();
      workMeshes.delete(id);
    }
  }
}

function createCardView(card: CampCard): CardView {
  const size = cardSize();
  const width = size.width / PX_PER_UNIT;
  const height = size.height / PX_PER_UNIT;
  const group = new THREE.Group();
  group.userData.cardId = card.id;

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, height), cardMaterialBase);
  body.userData.cardId = card.id;
  group.add(body);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.88, height * 0.88),
    new THREE.MeshBasicMaterial({ map: cardTexture(card.kind), transparent: true })
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.031;
  face.userData.cardId = card.id;
  group.add(face);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.min(width, height) * 0.48, Math.min(width, height) * 0.54, 48),
    new THREE.MeshBasicMaterial({ color: 0x9debd9, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.038;
  ring.visible = false;
  group.add(ring);

  const routine = new THREE.Mesh(new THREE.BoxGeometry(width * 0.54, 0.024, 0.035), routineMaterial);
  routine.position.set(0, 0.05, height * 0.4);
  routine.visible = false;
  group.add(routine);

  scene.add(group);
  const view = { group, body, face, ring, routine };
  cardMeshes.set(card.id, view);
  return view;
}

function createWorkView(id: string): THREE.Group {
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.035, 0.08), new THREE.MeshStandardMaterial({ color: 0x19130d, roughness: 0.8 }));
  const fill = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.042, 0.045), new THREE.MeshStandardMaterial({ color: 0x9debd9, emissive: 0x24534a, roughness: 0.45 }));
  group.add(back, fill);
  scene.add(group);
  workMeshes.set(id, group);
  return group;
}

function cardTexture(kind: CardKind): THREE.CanvasTexture {
  const cached = cardTextureCache.get(kind);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_FACE_SIZE;
  canvas.height = CARD_FACE_SIZE * CARD_FACE_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas texture context is unavailable.");

  drawRoundedRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 22, "#f4dfaa");
  drawRoundedRect(ctx, 20, 20, canvas.width - 40, canvas.height - 40, 16, "#f9efce");
  ctx.fillStyle = "rgba(78, 55, 31, 0.08)";
  ctx.fillRect(42, canvas.height - 34, canvas.width - 84, 9);

  const icon = ICON_CELLS[kind];
  if (icon && iconImage.complete && iconImage.naturalWidth > 0) {
    const cellWidth = iconImage.naturalWidth / 4;
    const cellHeight = iconImage.naturalHeight / 2;
    ctx.drawImage(
      iconImage,
      icon.column * cellWidth,
      icon.row * cellHeight,
      cellWidth,
      cellHeight,
      44,
      58,
      canvas.width - 88,
      canvas.width - 88
    );
  } else {
    drawEventIcon(ctx, kind, canvas.width / 2, canvas.height / 2 - 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cardTextureCache.set(kind, texture);
  return texture;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawEventIcon(ctx: CanvasRenderingContext2D, kind: CardKind, x: number, y: number): void {
  if (kind === "rain") {
    ctx.fillStyle = "#9bb7c7";
    ctx.beginPath();
    ctx.roundRect(x - 56, y - 36, 112, 58, 28);
    ctx.fill();
    ctx.fillStyle = "#6fb8d5";
    for (const offset of [-34, 0, 34]) {
      ctx.beginPath();
      ctx.roundRect(x + offset - 6, y + 35, 12, 46, 6);
      ctx.fill();
    }
    return;
  }

  if (kind === "coldNight") {
    ctx.fillStyle = "#dfeef4";
    ctx.beginPath();
    ctx.arc(x - 8, y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8fb1c1";
    ctx.beginPath();
    ctx.arc(x + 12, y + 2, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2d46b";
    ctx.beginPath();
    ctx.arc(x + 50, y - 48, 19, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#b77743";
  ctx.beginPath();
  ctx.roundRect(x - 56, y - 38, 112, 76, 16);
  ctx.fill();
  ctx.strokeStyle = "#6fae61";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0.2, Math.PI * 1.7);
  ctx.stroke();
}

function onPointerDown(event: PointerEvent): void {
  const hit = pickCard(event);
  if (!hit || hit.state === "working") return;
  const point = pointerToTable(event);
  if (!point) return;

  active = {
    card: hit,
    pointerId: event.pointerId,
    offsetX: point.x - cardToWorld(hit).x,
    offsetZ: point.z - cardToWorld(hit).z,
    moved: false
  };
  renderer.domElement.setPointerCapture(event.pointerId);
  activeDropTargetId = undefined;
}

function onPointerMove(event: PointerEvent): void {
  if (!active || active.pointerId !== event.pointerId) return;
  const point = pointerToTable(event);
  if (!point) return;

  const size = cardSize();
  const next = worldToCard(point.x - active.offsetX, point.z - active.offsetZ);
  active.card.x = clamp(next.x, 0, Math.max(0, tableElement.clientWidth - size.width));
  active.card.y = clamp(next.y, 0, Math.max(0, tableElement.clientHeight - size.height));
  activeDropTargetId = findDropTarget(active.card, true)?.id;
  active.moved = true;
}

function onPointerUp(event: PointerEvent): void {
  if (!active || active.pointerId !== event.pointerId) return;
  const dropped = active.card;
  const moved = active.moved;
  active = undefined;
  activeDropTargetId = undefined;

  if (!moved) {
    handleCardTap(dropped);
    return;
  }

  const target = findDropTarget(dropped, false);
  if (!target) {
    setNearbyRoutine(dropped);
    return;
  }

  const recipe = findRecipe([dropped.kind, target.kind]);
  if (!recipe) {
    cancelInvalidStack(state, dropped);
    nudgeAwayFrom(dropped, target);
    window.setTimeout(() => {
      dropped.state = "idle";
    }, 320);
    return;
  }

  alignForCraft(dropped, target);
  startRecipe(state, recipe, [dropped, target]);
}

function handleCardTap(card: CampCard): void {
  if (card.state === "working") return;

  if (!selectedCardId) {
    selectedCardId = card.id;
    state.message = `${CARD_DEFS[card.kind].label} selected. Choose a target.`;
    return;
  }

  if (selectedCardId === card.id) {
    selectedCardId = undefined;
    state.message = "Selection cleared.";
    return;
  }

  const selected = state.cards.find((candidate) => candidate.id === selectedCardId);
  selectedCardId = undefined;
  if (!selected || selected.state === "working") return;

  const recipe = findRecipe([selected.kind, card.kind]);
  if (!recipe) {
    cancelInvalidStack(state, selected);
    window.setTimeout(() => {
      selected.state = "idle";
    }, 320);
    return;
  }

  alignForCraft(selected, card);
  startRecipe(state, recipe, [selected, card]);
}

function pickCard(event: PointerEvent): CampCard | undefined {
  setPointer(event);
  const meshes = [...cardMeshes.values()].flatMap((view) => [view.body, view.face]);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  const id = hit?.object.userData.cardId;
  return state.cards.find((card) => card.id === id);
}

function pointerToTable(event: PointerEvent): THREE.Vector3 | undefined {
  setPointer(event);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(dragPlane, point) ?? undefined;
}

function setPointer(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
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

function resizeRenderer(): void {
  const width = tableElement.clientWidth;
  const height = tableElement.clientHeight;
  boardWidth = width / PX_PER_UNIT;
  boardHeight = height / PX_PER_UNIT;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.position.set(0, Math.max(5.8, boardHeight * 1.05), Math.max(5.4, boardHeight * 0.9));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  tableSurface.scale.set(boardWidth, boardHeight, 1);
  tableRim.scale.set(boardWidth + 0.18, 1, boardHeight + 0.18);
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

function cardToWorld(card: CampCard): { x: number; z: number } {
  const size = cardSize();
  return {
    x: (card.x + size.width / 2) / PX_PER_UNIT - boardWidth / 2,
    z: boardHeight / 2 - (card.y + size.height / 2) / PX_PER_UNIT
  };
}

function worldToCard(x: number, z: number): { x: number; y: number } {
  const size = cardSize();
  return {
    x: (x + boardWidth / 2) * PX_PER_UNIT - size.width / 2,
    y: (boardHeight / 2 - z) * PX_PER_UNIT - size.height / 2
  };
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
