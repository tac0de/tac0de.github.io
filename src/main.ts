import "./style.css";

type ResourceKey = "food" | "wood" | "scrap" | "morale";
type TileKind = "soil" | "forest" | "ruin" | "field" | "shelter" | "stockpile" | "kitchen";
type JobKind = "gather" | "build" | "cook" | "rest";
type NeedKey = "hunger" | "fatigue" | "mood";

type Tile = {
  x: number;
  y: number;
  kind: TileKind;
  job: JobKind | null;
  progress: number;
};

type Colonist = {
  id: string;
  name: string;
  trait: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  job: JobKind;
  skill: Record<JobKind, number>;
  needs: Record<NeedKey, number>;
  relation: Record<string, number>;
  thought: string;
};

type LogEntry = {
  day: number;
  time: string;
  text: string;
  tone: "work" | "event" | "risk" | "quiet";
};

type WorldState = {
  version: 1;
  day: number;
  minute: number;
  speed: 0 | 1 | 2 | 4;
  resources: Record<ResourceKey, number>;
  tiles: Tile[];
  colonists: Colonist[];
  logs: LogEntry[];
  selectedId: string;
  lastEventDay: number;
  seed: number;
};

const canvas = must<HTMLCanvasElement>("#map");
const ctx = mustCanvasContext(canvas);
const dayLabel = must<HTMLSpanElement>("#day-label");
const timeLabel = must<HTMLSpanElement>("#time-label");
const speedLabel = must<HTMLSpanElement>("#speed-label");
const resourcePanel = must<HTMLDivElement>("#resources");
const colonistPanel = must<HTMLDivElement>("#colonists");
const taskPanel = must<HTMLDivElement>("#task-panel");
const logPanel = must<HTMLDivElement>("#log-panel");
const pauseButton = must<HTMLButtonElement>("#pause");
const speedButton = must<HTMLButtonElement>("#speed");
const saveButton = must<HTMLButtonElement>("#save");
const resetButton = must<HTMLButtonElement>("#reset");

const SAVE_KEY = "outpost-miniature.save.v1";
const MAP_W = 16;
const MAP_H = 16;
const DAY_MINUTES = 24 * 60;
const START_MINUTE = 7 * 60;
const TILE_COLORS: Record<TileKind, string> = {
  soil: "#2d3426",
  forest: "#244431",
  ruin: "#44413b",
  field: "#58652f",
  shelter: "#6b5c48",
  stockpile: "#5d5547",
  kitchen: "#665143"
};
const JOB_LABEL: Record<JobKind, string> = {
  gather: "Gather",
  build: "Build",
  cook: "Cook",
  rest: "Rest"
};
const RESOURCE_LABEL: Record<ResourceKey, string> = {
  food: "Food",
  wood: "Wood",
  scrap: "Scrap",
  morale: "Morale"
};

let world = loadWorld();
let lastFrame = performance.now();
let accumulator = 0;
let cameraX = 0;
let cameraY = 0;
let tileSize = 42;
let selectedTile: Tile | null = null;

pauseButton.addEventListener("click", () => {
  world.speed = world.speed === 0 ? 1 : 0;
  renderUi();
});
speedButton.addEventListener("click", () => {
  world.speed = world.speed === 1 ? 2 : world.speed === 2 ? 4 : 1;
  renderUi();
});
saveButton.addEventListener("click", () => {
  saveWorld();
  addLog("Manual save written to this browser.", "quiet");
});
resetButton.addEventListener("click", () => {
  world = createWorld();
  selectedTile = null;
  saveWorld();
  renderUi();
});
canvas.addEventListener("pointerdown", onMapPointer);
window.addEventListener("resize", resize);

resize();
renderUi();
requestAnimationFrame(loop);

function loop(now: number): void {
  const delta = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (world.speed > 0) {
    accumulator += delta * world.speed;
    while (accumulator >= 0.12) {
      tick(0.12);
      accumulator -= 0.12;
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function tick(delta: number): void {
  const beforeDay = world.day;
  world.minute += delta * 18;
  if (world.minute >= DAY_MINUTES) {
    world.minute -= DAY_MINUTES;
    world.day += 1;
    runDawnAccounting();
  }

  for (const colonist of world.colonists) {
    updateColonist(colonist, delta);
  }

  if (world.day !== beforeDay || Math.floor(world.minute) % 45 === 0) {
    maybeNightEvent();
    renderUi();
  }
}

function updateColonist(colonist: Colonist, delta: number): void {
  const tile = chooseWorkTile(colonist);
  if (tile) {
    colonist.targetX = tile.x;
    colonist.targetY = tile.y;
  }

  moveColonist(colonist, delta);

  const atTarget = Math.abs(colonist.x - colonist.targetX) < 0.04 && Math.abs(colonist.y - colonist.targetY) < 0.04;
  if (!atTarget) return;

  colonist.needs.hunger = clamp(colonist.needs.hunger - delta * 0.12, 0, 100);
  colonist.needs.fatigue = clamp(colonist.needs.fatigue - delta * 0.16, 0, 100);
  colonist.needs.mood = clamp(colonist.needs.mood - delta * 0.025, 0, 100);

  if (colonist.job === "rest") {
    colonist.needs.fatigue = clamp(colonist.needs.fatigue + delta * 4.8, 0, 100);
    colonist.needs.mood = clamp(colonist.needs.mood + delta * 1.1, 0, 100);
    colonist.thought = "Counting ceiling seams.";
    return;
  }

  if (!tile) return;
  tile.progress += delta * colonist.skill[colonist.job] * 0.32;
  if (tile.progress < 1) {
    colonist.thought = workThought(colonist.job);
    return;
  }

  tile.progress = 0;
  completeTileWork(colonist, tile);
}

function moveColonist(colonist: Colonist, delta: number): void {
  const dx = colonist.targetX - colonist.x;
  const dy = colonist.targetY - colonist.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.04) {
    colonist.x = colonist.targetX;
    colonist.y = colonist.targetY;
    return;
  }
  const step = Math.min(distance, delta * 1.7);
  colonist.x += (dx / distance) * step;
  colonist.y += (dy / distance) * step;
}

function chooseWorkTile(colonist: Colonist): Tile | null {
  if (colonist.needs.fatigue < 18 || colonist.needs.hunger < 16) {
    colonist.job = "rest";
  }

  const candidates = world.tiles.filter((tile) => {
    if (colonist.job === "gather") return tile.kind === "forest" || tile.kind === "field" || tile.kind === "ruin";
    if (colonist.job === "build") return tile.job === "build";
    if (colonist.job === "cook") return tile.kind === "kitchen" || tile.kind === "field";
    if (colonist.job === "rest") return tile.kind === "shelter";
    return false;
  });

  if (candidates.length === 0) return nearestTile(colonist, "stockpile");
  return candidates.sort((a, b) => dist(colonist, a) - dist(colonist, b))[0] ?? null;
}

function completeTileWork(colonist: Colonist, tile: Tile): void {
  if (colonist.job === "gather") {
    if (tile.kind === "forest") {
      world.resources.wood += 2;
      world.resources.food += chance(0.3) ? 1 : 0;
      addLog(`${colonist.name} hauled branches from the treeline.`, "work");
    }
    if (tile.kind === "ruin") {
      world.resources.scrap += 2;
      world.resources.morale = clamp(world.resources.morale - 1, 0, 100);
      addLog(`${colonist.name} pried scrap out of the old wall.`, "work");
    }
    if (tile.kind === "field") {
      world.resources.food += 2;
      addLog(`${colonist.name} brought in a small crop basket.`, "work");
    }
  }

  if (colonist.job === "build" && tile.job === "build") {
    if (world.resources.wood >= 4 && world.resources.scrap >= 2) {
      world.resources.wood -= 4;
      world.resources.scrap -= 2;
      tile.kind = "shelter";
      tile.job = null;
      addLog(`${colonist.name} finished a quiet sleeping room.`, "work");
    } else {
      addLog("Build order stalled: not enough wood or scrap.", "risk");
    }
  }

  if (colonist.job === "cook") {
    if (world.resources.food > 0) {
      world.resources.food -= 1;
      world.resources.morale = clamp(world.resources.morale + 3, 0, 100);
      for (const friend of world.colonists) {
        friend.needs.hunger = clamp(friend.needs.hunger + 8, 0, 100);
      }
      addLog(`${colonist.name} stretched dinner into something warm.`, "work");
    }
  }
}

function runDawnAccounting(): void {
  world.resources.food -= world.colonists.length;
  if (world.resources.food < 0) {
    for (const colonist of world.colonists) {
      colonist.needs.hunger = clamp(colonist.needs.hunger + world.resources.food * 4, 0, 100);
      colonist.needs.mood = clamp(colonist.needs.mood - 8, 0, 100);
    }
    world.resources.food = 0;
    addLog("Breakfast failed. Everyone noticed.", "risk");
  } else {
    for (const colonist of world.colonists) {
      colonist.needs.hunger = clamp(colonist.needs.hunger + 14, 0, 100);
    }
    addLog(`Day ${world.day} opened with a ration count.`, "quiet");
  }
  saveWorld();
}

function maybeNightEvent(): void {
  const hour = Math.floor(world.minute / 60);
  if (hour !== 21 || world.lastEventDay === world.day) return;
  world.lastEventDay = world.day;

  const roll = seeded(world.seed + world.day * 97 + world.logs.length);
  if (roll < 0.25) {
    world.resources.food = Math.max(0, world.resources.food - 3);
    addLog("Night event: something opened the food crate from inside.", "event");
    return;
  }
  if (roll < 0.5) {
    world.resources.scrap += 4;
    world.resources.morale = clamp(world.resources.morale - 5, 0, 100);
    addLog("Night event: a metallic rain left useful fragments and bad sleep.", "event");
    return;
  }
  if (roll < 0.72) {
    const a = world.colonists[0];
    const b = world.colonists[1];
    a.relation[b.id] = clamp((a.relation[b.id] ?? 0) + 6, -100, 100);
    b.relation[a.id] = clamp((b.relation[a.id] ?? 0) + 6, -100, 100);
    world.resources.morale = clamp(world.resources.morale + 4, 0, 100);
    addLog(`Night event: ${a.name} and ${b.name} repaired a door and a little trust.`, "event");
    return;
  }
  world.resources.morale = clamp(world.resources.morale - 7, 0, 100);
  addLog("Night event: nobody saw anything, but every footprint faced inward.", "event");
}

function onMapPointer(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left - cameraX) / tileSize);
  const y = Math.floor((event.clientY - rect.top - cameraY) / tileSize);
  const tile = getTile(x, y);
  if (!tile) return;
  selectedTile = tile;
  if (tile.kind === "soil" && world.resources.wood >= 4 && world.resources.scrap >= 2) {
    tile.job = tile.job === "build" ? null : "build";
  }
  renderUi();
}

function draw(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(cameraX, cameraY);

  for (const tile of world.tiles) {
    const px = tile.x * tileSize;
    const py = tile.y * tileSize;
    ctx.fillStyle = TILE_COLORS[tile.kind];
    ctx.fillRect(px, py, tileSize, tileSize);
    ctx.strokeStyle = "rgba(232, 220, 174, 0.12)";
    ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
    drawTileDetail(tile, px, py);
  }

  if (selectedTile) {
    ctx.strokeStyle = "#f7df8a";
    ctx.lineWidth = 3;
    ctx.strokeRect(selectedTile.x * tileSize + 2, selectedTile.y * tileSize + 2, tileSize - 4, tileSize - 4);
  }

  for (const colonist of world.colonists) {
    drawColonist(colonist);
  }

  ctx.restore();
}

function drawTileDetail(tile: Tile, px: number, py: number): void {
  ctx.save();
  ctx.translate(px + tileSize / 2, py + tileSize / 2);
  ctx.fillStyle = "rgba(255, 247, 211, 0.72)";
  ctx.strokeStyle = "rgba(8, 8, 6, 0.52)";
  ctx.lineWidth = 2;

  if (tile.kind === "forest") {
    ctx.beginPath();
    ctx.moveTo(0, -tileSize * 0.28);
    ctx.lineTo(tileSize * 0.22, tileSize * 0.18);
    ctx.lineTo(-tileSize * 0.22, tileSize * 0.18);
    ctx.closePath();
    ctx.fill();
  } else if (tile.kind === "ruin") {
    ctx.strokeRect(-tileSize * 0.2, -tileSize * 0.2, tileSize * 0.4, tileSize * 0.4);
    ctx.beginPath();
    ctx.moveTo(-tileSize * 0.25, tileSize * 0.2);
    ctx.lineTo(tileSize * 0.22, -tileSize * 0.16);
    ctx.stroke();
  } else if (tile.kind === "field") {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 8, -12);
      ctx.lineTo(i * 8, 12);
      ctx.stroke();
    }
  } else if (tile.kind === "shelter") {
    ctx.fillRect(-tileSize * 0.22, -tileSize * 0.12, tileSize * 0.44, tileSize * 0.3);
    ctx.beginPath();
    ctx.moveTo(-tileSize * 0.28, -tileSize * 0.12);
    ctx.lineTo(0, -tileSize * 0.34);
    ctx.lineTo(tileSize * 0.28, -tileSize * 0.12);
    ctx.closePath();
    ctx.fill();
  } else if (tile.kind === "stockpile") {
    ctx.strokeRect(-tileSize * 0.24, -tileSize * 0.18, tileSize * 0.48, tileSize * 0.36);
    ctx.fillRect(-tileSize * 0.1, -tileSize * 0.06, tileSize * 0.2, tileSize * 0.12);
  } else if (tile.kind === "kitchen") {
    ctx.beginPath();
    ctx.arc(0, 0, tileSize * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(-tileSize * 0.16, tileSize * 0.12, tileSize * 0.32, tileSize * 0.05);
  }

  if (tile.job === "build") {
    ctx.fillStyle = "#7ed6c4";
    ctx.fillRect(-tileSize * 0.26, -tileSize * 0.26, tileSize * 0.52 * tile.progress, 4);
    ctx.strokeStyle = "#7ed6c4";
    ctx.strokeRect(-tileSize * 0.26, -tileSize * 0.26, tileSize * 0.52, 4);
  }
  ctx.restore();
}

function drawColonist(colonist: Colonist): void {
  const px = (colonist.x + 0.5) * tileSize;
  const py = (colonist.y + 0.5) * tileSize;
  const selected = colonist.id === world.selectedId;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = selected ? "#f7df8a" : "#d8ece4";
  ctx.strokeStyle = "rgba(5, 5, 4, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, tileSize * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#141108";
  ctx.font = `700 ${Math.max(10, tileSize * 0.24)}px ui-sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(colonist.name.slice(0, 1), 0, 1);
  ctx.restore();
}

function renderUi(): void {
  const hour = Math.floor(world.minute / 60);
  const minute = Math.floor(world.minute % 60);
  dayLabel.textContent = `Day ${world.day}`;
  timeLabel.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  speedLabel.textContent = world.speed === 0 ? "Paused" : `${world.speed}x`;
  pauseButton.textContent = world.speed === 0 ? "Resume" : "Pause";

  resourcePanel.innerHTML = Object.entries(world.resources)
    .map(([key, value]) => `<span><b>${RESOURCE_LABEL[key as ResourceKey]}</b>${Math.floor(value)}</span>`)
    .join("");

  colonistPanel.innerHTML = world.colonists
    .map(
      (colonist) => `
        <button class="colonist ${colonist.id === world.selectedId ? "selected" : ""}" data-id="${colonist.id}">
          <span>
            <b>${colonist.name}</b>
            <small>${colonist.trait} / ${JOB_LABEL[colonist.job]}</small>
          </span>
          <i>H ${Math.floor(colonist.needs.hunger)} · F ${Math.floor(colonist.needs.fatigue)} · M ${Math.floor(colonist.needs.mood)}</i>
          <em>${colonist.thought}</em>
        </button>
      `
    )
    .join("");

  for (const button of colonistPanel.querySelectorAll<HTMLButtonElement>(".colonist")) {
    button.addEventListener("click", () => {
      world.selectedId = button.dataset.id ?? world.selectedId;
      renderUi();
    });
  }

  const selected = world.colonists.find((colonist) => colonist.id === world.selectedId) ?? world.colonists[0];
  taskPanel.innerHTML = (["gather", "build", "cook", "rest"] as JobKind[])
    .map((job) => `<button class="${selected.job === job ? "active" : ""}" data-job="${job}">${JOB_LABEL[job]}</button>`)
    .join("");
  for (const button of taskPanel.querySelectorAll<HTMLButtonElement>("button")) {
    button.addEventListener("click", () => {
      selected.job = button.dataset.job as JobKind;
      selected.thought = `Assigned to ${JOB_LABEL[selected.job].toLowerCase()}.`;
      renderUi();
    });
  }

  logPanel.innerHTML = world.logs
    .slice(-12)
    .reverse()
    .map((log) => `<p class="${log.tone}"><span>${log.time}</span>${log.text}</p>`)
    .join("");
}

function createWorld(): WorldState {
  const seed = Math.floor(Math.random() * 100000);
  const tiles: Tile[] = [];
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const roll = seeded(seed + x * 17 + y * 31);
      let kind: TileKind = "soil";
      if (roll > 0.78) kind = "forest";
      if (roll > 0.9) kind = "ruin";
      if ((x === 7 || x === 8) && (y === 7 || y === 8)) kind = "stockpile";
      if (x === 6 && y === 7) kind = "shelter";
      if (x === 9 && y === 7) kind = "kitchen";
      if (x >= 5 && x <= 10 && y === 10) kind = "field";
      tiles.push({ x, y, kind, job: null, progress: 0 });
    }
  }

  const colonists: Colonist[] = [
    makeColonist("mira", "Mira", "Careful grower", 7, 7, "gather", { gather: 1.1, build: 0.8, cook: 1.0, rest: 1 }),
    makeColonist("sol", "Sol", "Fast builder", 8, 7, "build", { gather: 0.8, build: 1.25, cook: 0.8, rest: 1 }),
    makeColonist("ive", "Ive", "Calm cook", 7, 8, "cook", { gather: 0.9, build: 0.8, cook: 1.25, rest: 1.1 })
  ];

  const state: WorldState = {
    version: 1,
    day: 1,
    minute: START_MINUTE,
    speed: 1,
    resources: { food: 18, wood: 12, scrap: 8, morale: 58 },
    tiles,
    colonists,
    logs: [],
    selectedId: "mira",
    lastEventDay: 0,
    seed
  };
  state.logs.push({ day: 1, time: "Day 1 07:00", text: "Three survivors marked a square of ground and called it an outpost.", tone: "quiet" });
  return state;
}

function makeColonist(
  id: string,
  name: string,
  trait: string,
  x: number,
  y: number,
  job: JobKind,
  skill: Record<JobKind, number>
): Colonist {
  return {
    id,
    name,
    trait,
    x,
    y,
    targetX: x,
    targetY: y,
    job,
    skill,
    needs: { hunger: 78, fatigue: 82, mood: 62 },
    relation: {},
    thought: "Waiting for the first useful order."
  };
}

function loadWorld(): WorldState {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createWorld();
    const parsed = JSON.parse(raw) as WorldState;
    if (parsed.version !== 1 || !Array.isArray(parsed.tiles) || !Array.isArray(parsed.colonists)) {
      return createWorld();
    }
    return parsed;
  } catch {
    return createWorld();
  }
}

function saveWorld(): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(world));
}

function addLog(text: string, tone: LogEntry["tone"]): void {
  const hour = Math.floor(world.minute / 60);
  const minute = Math.floor(world.minute % 60);
  const entry = {
    day: world.day,
    time: `Day ${world.day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    text,
    tone
  };
  const last = world.logs[world.logs.length - 1];
  if (last?.text === text && last.day === world.day) return;
  world.logs.push(entry);
  world.logs = world.logs.slice(-80);
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tileSize = Math.max(28, Math.min(48, Math.floor(Math.min(rect.width / MAP_W, rect.height / MAP_H))));
  cameraX = Math.floor((rect.width - tileSize * MAP_W) / 2);
  cameraY = Math.floor((rect.height - tileSize * MAP_H) / 2);
}

function getTile(x: number, y: number): Tile | null {
  return world.tiles.find((tile) => tile.x === x && tile.y === y) ?? null;
}

function nearestTile(colonist: Colonist, kind: TileKind): Tile | null {
  return world.tiles.filter((tile) => tile.kind === kind).sort((a, b) => dist(colonist, a) - dist(colonist, b))[0] ?? null;
}

function dist(colonist: Colonist, tile: Tile): number {
  return Math.hypot(colonist.x - tile.x, colonist.y - tile.y);
}

function workThought(job: JobKind): string {
  if (job === "gather") return "Looking for anything that can be carried.";
  if (job === "build") return "Measuring twice because wood is expensive.";
  if (job === "cook") return "Making the ration smell less like storage.";
  return "Trying to become a person again.";
}

function chance(rate: number): boolean {
  return Math.random() < rate;
}

function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing required node: ${selector}`);
  return node;
}

function mustCanvasContext(node: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = node.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available.");
  return context;
}
