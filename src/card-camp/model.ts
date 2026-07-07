export type CardKind =
  | "survivor"
  | "berryBush"
  | "tree"
  | "stone"
  | "berry"
  | "wood"
  | "campfire"
  | "cookedBerry"
  | "spear"
  | "armedSurvivor"
  | "wolf"
  | "alphaWolf"
  | "meat"
  | "hide"
  | "rain"
  | "coldNight"
  | "trader";

export type CardState = "idle" | "working" | "hungry" | "warning" | "wounded";
export type CampStatus = "playing" | "won" | "lost";

export type CampCard = {
  id: string;
  kind: CardKind;
  x: number;
  y: number;
  stackId?: string;
  routineTargetId?: string;
  state: CardState;
};

export type Recipe = {
  id: string;
  inputs: CardKind[];
  result: CardKind;
  seconds: number;
  reusable: CardKind[];
  bonusResults?: CardKind[];
  threatDelta?: number;
  winOnComplete?: boolean;
};

export type WorkOrder = {
  id: string;
  recipe: Recipe;
  cardIds: string[];
  x: number;
  y: number;
  remaining: number;
  total: number;
};

export type CampState = {
  cards: CampCard[];
  workOrders: WorkOrder[];
  dayRemaining: number;
  dayLength: number;
  day: number;
  warnings: number;
  threat: number;
  eventCount: number;
  eventMessage?: string;
  message: string;
  goalMet: boolean;
  status: CampStatus;
};

const EVENT_KINDS = new Set<CardKind>(["rain", "coldNight", "trader"]);
const ENEMY_KINDS = new Set<CardKind>(["wolf", "alphaWolf"]);
const SOURCE_KINDS = new Set<CardKind>(["berryBush", "tree"]);

export const CARD_DEFS: Record<CardKind, { label: string; type: string }> = {
  survivor: { label: "Survivor", type: "worker" },
  berryBush: { label: "Berry Bush", type: "source" },
  tree: { label: "Tree", type: "source" },
  stone: { label: "Stone", type: "resource" },
  berry: { label: "Berry", type: "food" },
  wood: { label: "Wood", type: "resource" },
  campfire: { label: "Campfire", type: "craft" },
  cookedBerry: { label: "Cooked Berry", type: "food" },
  spear: { label: "Spear", type: "gear" },
  armedSurvivor: { label: "Armed Survivor", type: "fighter" },
  wolf: { label: "Wolf", type: "enemy" },
  alphaWolf: { label: "Alpha Wolf", type: "enemy" },
  meat: { label: "Meat", type: "food" },
  hide: { label: "Hide", type: "resource" },
  rain: { label: "Rain", type: "event" },
  coldNight: { label: "Cold Night", type: "event" },
  trader: { label: "Trader", type: "event" }
};

export const RECIPES: Recipe[] = [
  {
    id: "forage-berry",
    inputs: ["survivor", "berryBush"],
    result: "berry",
    seconds: 3,
    reusable: ["survivor", "berryBush"]
  },
  {
    id: "chop-wood",
    inputs: ["survivor", "tree"],
    result: "wood",
    seconds: 4,
    reusable: ["survivor", "tree"]
  },
  {
    id: "build-campfire",
    inputs: ["wood", "stone"],
    result: "campfire",
    seconds: 5,
    reusable: []
  },
  {
    id: "carve-spear",
    inputs: ["survivor", "wood"],
    result: "spear",
    seconds: 4,
    reusable: ["survivor"]
  },
  {
    id: "cook-berry",
    inputs: ["campfire", "berry"],
    result: "cookedBerry",
    seconds: 4,
    reusable: ["campfire"]
  },
  {
    id: "arm-survivor",
    inputs: ["survivor", "spear"],
    result: "armedSurvivor",
    seconds: 3,
    reusable: []
  },
  {
    id: "hunt-wolf",
    inputs: ["armedSurvivor", "wolf"],
    result: "meat",
    seconds: 5,
    reusable: ["armedSurvivor"],
    bonusResults: ["hide"],
    threatDelta: -2
  },
  {
    id: "break-alpha",
    inputs: ["armedSurvivor", "alphaWolf"],
    result: "hide",
    seconds: 7,
    reusable: ["armedSurvivor"],
    bonusResults: ["meat"],
    threatDelta: -5,
    winOnComplete: true
  }
];

let nextId = 1;

export function createInitialState(): CampState {
  nextId = 1;
  return {
    cards: [
      createCard("survivor", 88, 96),
      createCard("berryBush", 306, 88),
      createCard("tree", 536, 110),
      createCard("stone", 736, 132)
    ],
    workOrders: [],
    dayRemaining: 42,
    dayLength: 42,
    day: 1,
    warnings: 0,
    threat: 1,
    eventCount: 0,
    message: "Keep the survivor fed, armed, and ready for threats.",
    goalMet: false,
    status: "playing"
  };
}

export function createCard(kind: CardKind, x: number, y: number): CampCard {
  return {
    id: `card-${nextId++}`,
    kind,
    x,
    y,
    state: "idle"
  };
}

export function findRecipe(kinds: CardKind[]): Recipe | undefined {
  const normalized = [...kinds].sort().join("+");
  return RECIPES.find((recipe) => [...recipe.inputs].sort().join("+") === normalized);
}

export function tickCamp(state: CampState, delta: number): void {
  if (state.status !== "playing") return;

  state.dayRemaining -= delta;

  if (state.dayRemaining <= 0) {
    resolveDay(state);
    if (state.status !== "playing") return;
  }

  for (const order of state.workOrders) {
    order.remaining -= delta;
  }

  const done = state.workOrders.filter((order) => order.remaining <= 0);
  state.workOrders = state.workOrders.filter((order) => order.remaining > 0);

  for (const order of done) {
    completeWorkOrder(state, order);
  }

  startRoutineWork(state);
  resolveNearbyWorldRules(state);
  state.goalMet = state.goalMet || state.cards.some((card) => card.kind === "alphaWolf");
}

export function startRecipe(state: CampState, recipe: Recipe, cards: CampCard[]): void {
  if (state.status !== "playing") return;

  const x = cards.reduce((sum, card) => sum + card.x, 0) / cards.length;
  const y = cards.reduce((sum, card) => sum + card.y, 0) / cards.length;
  const orderId = `work-${nextId++}`;
  const duration = adjustedRecipeSeconds(state, recipe);

  cards.forEach((card, index) => {
    card.state = "working";
    card.stackId = orderId;
    if (card.kind === "survivor") {
      const target = cards.find((candidate) => candidate.id !== card.id && SOURCE_KINDS.has(candidate.kind));
      card.routineTargetId = target?.id;
    }
    card.x = x + (index - (cards.length - 1) / 2) * 18;
    card.y = y + index * 10;
  });

  state.workOrders.push({
    id: orderId,
    recipe,
    cardIds: cards.map((card) => card.id),
    x,
    y,
    remaining: duration,
    total: duration
  });
  state.message = state.cards.some((card) => card.kind === "rain") && isFireRecipe(recipe)
    ? `${recipeLabel(recipe)} slowed by rain.`
    : `${recipeLabel(recipe)} started.`;
}

export function cancelInvalidStack(state: CampState, card: CampCard): void {
  if (state.status !== "playing") return;

  card.state = "warning";
  state.message = "That stack does not solve the camp's next problem.";
}

function completeWorkOrder(state: CampState, order: WorkOrder): void {
  const used = new Set(order.cardIds);
  const consumed = order.recipe.inputs.filter((kind) => !order.recipe.reusable.includes(kind));

  state.cards = state.cards.filter((card) => {
    if (!used.has(card.id)) return true;
    const consumeIndex = consumed.indexOf(card.kind);
    if (consumeIndex === -1) return true;
    consumed.splice(consumeIndex, 1);
    return false;
  });

  for (const card of state.cards) {
    if (used.has(card.id)) {
      card.state = "idle";
      card.stackId = undefined;
      const isRoutineWorker = card.kind === "survivor" && card.routineTargetId;
      card.x = order.x + (isRoutineWorker ? -54 : card.kind === "survivor" || card.kind === "armedSurvivor" ? -128 : 112);
      card.y = order.y + 18;
    }
  }

  const results = [order.recipe.result, ...(order.recipe.bonusResults ?? [])];
  results.forEach((kind, index) => {
    state.cards.push(createCard(kind, order.x + 124 + index * 42, order.y + 22 + index * 12));
  });

  if (order.recipe.threatDelta) {
    state.threat = Math.max(0, state.threat + order.recipe.threatDelta);
  }

  if (order.recipe.winOnComplete) {
    winCamp(state);
    return;
  }

  state.message = results.length > 1
    ? `${results.map((kind) => CARD_DEFS[kind].label).join(" + ")} recovered.`
    : `${CARD_DEFS[order.recipe.result].label} produced.`;
}

function resolveDay(state: CampState): void {
  state.day += 1;
  state.dayRemaining = state.dayLength;
  state.threat = Math.min(6, state.threat + 1);

  const foodNeeded = state.cards.some((card) => card.kind === "coldNight") ? 2 : 1;
  const consumedFood = selectFoodForNeed(state.cards, foodNeeded);
  const hasEnoughFood = consumedFood.reduce((sum, card) => sum + foodValue(card), 0) >= foodNeeded;

  if (hasEnoughFood) {
    const consumedIds = new Set(consumedFood.map((card) => card.id));
    state.cards = state.cards.filter((card) => !consumedIds.has(card.id));
    state.message = foodNeeded > 1 ? "Cold night. Enough food was consumed." : `${CARD_DEFS[consumedFood[0].kind].label} consumed.`;
    clearResolvedEvents(state);
    addNightPressure(state);
    for (const card of state.cards) {
      if (card.kind === "survivor" || card.kind === "armedSurvivor") card.state = "idle";
    }
    return;
  }

  if (consumedFood.length > 0) {
    const consumedIds = new Set(consumedFood.map((card) => card.id));
    state.cards = state.cards.filter((card) => !consumedIds.has(card.id));
    state.message = "Food ran short. The survivor is exposed.";
    state.warnings += 1;
    clearResolvedEvents(state);
    if (state.warnings >= 2) {
      loseCamp(state);
      return;
    }
    addNightPressure(state);
    markSurvivorsHungry(state);
    return;
  }

  state.warnings += 1;
  state.message = "No food. The camp takes a warning.";
  clearResolvedEvents(state);
  if (state.warnings >= 2) {
    loseCamp(state);
    return;
  }
  addNightPressure(state);
  markSurvivorsHungry(state);
}

function recipeLabel(recipe: Recipe): string {
  return recipe.inputs.map((kind) => CARD_DEFS[kind].label).join(" + ");
}

function startRoutineWork(state: CampState): void {
  if (state.status !== "playing") return;

  const activeCardIds = new Set(state.workOrders.flatMap((order) => order.cardIds));
  for (const survivor of state.cards) {
    if (survivor.kind !== "survivor" || survivor.state !== "idle" || activeCardIds.has(survivor.id)) continue;
    if (!survivor.routineTargetId) continue;

    const target = state.cards.find((card) => card.id === survivor.routineTargetId && card.state === "idle" && SOURCE_KINDS.has(card.kind));
    if (!target || distance(survivor, target) > 112) {
      survivor.routineTargetId = undefined;
      continue;
    }

    const recipe = findRecipe([survivor.kind, target.kind]);
    if (recipe) {
      startRecipe(state, recipe, [survivor, target]);
      state.message = `${CARD_DEFS[target.kind].label} routine continues.`;
      return;
    }
  }
}

function resolveNearbyWorldRules(state: CampState): void {
  if (state.status !== "playing") return;

  const activeCardIds = new Set(state.workOrders.flatMap((order) => order.cardIds));
  if (state.cards.some((card) => card.kind === "rain")) {
    for (const campfire of state.cards) {
      if (campfire.kind === "campfire") campfire.state = "warning";
    }
  }

  for (const campfire of state.cards) {
    if (campfire.kind !== "campfire" || activeCardIds.has(campfire.id)) continue;
    const berry = state.cards.find((card) => card.kind === "berry" && card.state === "idle" && !activeCardIds.has(card.id) && distance(card, campfire) <= 104);
    if (!berry) continue;
    const recipe = findRecipe(["campfire", "berry"]);
    if (recipe) {
      startRecipe(state, recipe, [campfire, berry]);
      state.message = "Berry cooks over the fire.";
      return;
    }
  }

  const trader = state.cards.find((card) => card.kind === "trader");
  if (!trader) return;
  const tradeGood = state.cards.find((card) => (card.kind === "wood" || card.kind === "hide") && distance(card, trader) <= 108);
  if (!tradeGood) return;
  state.cards = state.cards.filter((card) => card.id !== trader.id && card.id !== tradeGood.id);
  state.cards.push(createCard("berry", trader.x + 32, trader.y + 8));
  state.cards.push(createCard("stone", trader.x - 32, trader.y + 14));
  state.message = `Trader swapped ${CARD_DEFS[tradeGood.kind].label} for supplies.`;
}

function addNightPressure(state: CampState): void {
  if (state.status !== "playing") return;

  if (state.threat >= 5 && !state.cards.some((card) => card.kind === "alphaWolf")) {
    state.cards.push(createCard("alphaWolf", 28, 204));
    state.goalMet = true;
    state.eventMessage = "Alpha Wolf is hunting the camp.";
    return;
  }

  if (state.threat >= 3 && !state.cards.some((card) => ENEMY_KINDS.has(card.kind))) {
    state.cards.push(createCard("wolf", 28, 204));
    state.eventMessage = "Wolf pressure reached the camp.";
    return;
  }

  const events: CardKind[] = ["rain", "coldNight", "trader"];
  const kind = events[state.eventCount % events.length];
  state.eventCount += 1;
  state.cards.push(createCard(kind, 24 + (state.eventCount % 3) * 72, 204));
  state.eventMessage = `${CARD_DEFS[kind].label} arrived at dusk.`;
}

function clearResolvedEvents(state: CampState): void {
  state.cards = state.cards.filter((card) => !EVENT_KINDS.has(card.kind));
  for (const card of state.cards) {
    if (card.kind === "campfire" && card.state === "warning") {
      card.state = "idle";
    }
  }
}

function adjustedRecipeSeconds(state: CampState, recipe: Recipe): number {
  if (state.cards.some((card) => card.kind === "rain") && isFireRecipe(recipe)) {
    return recipe.seconds * 1.75;
  }
  return recipe.seconds;
}

function isFireRecipe(recipe: Recipe): boolean {
  return recipe.result === "campfire" || recipe.inputs.includes("campfire");
}

function distance(a: CampCard, b: CampCard): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function selectFoodForNeed(cards: CampCard[], need: number): CampCard[] {
  const berries = cards.filter((card) => card.kind === "berry");
  const richFood = cards.filter((card) => card.kind === "cookedBerry" || card.kind === "meat");
  if (need <= 1) {
    return berries[0] ? [berries[0]] : richFood.slice(0, 1);
  }
  if (richFood[0]) return [richFood[0]];
  return berries.slice(0, need);
}

function foodValue(card: CampCard): number {
  if (card.kind === "cookedBerry" || card.kind === "meat") return 2;
  if (card.kind === "berry") return 1;
  return 0;
}

function markSurvivorsHungry(state: CampState): void {
  for (const card of state.cards) {
    if (card.kind === "survivor" || card.kind === "armedSurvivor") card.state = "hungry";
  }
}

function winCamp(state: CampState): void {
  state.status = "won";
  state.goalMet = true;
  state.eventMessage = undefined;
  state.workOrders = [];
  state.cards = state.cards.filter((card) => card.kind !== "alphaWolf");
  state.message = "Alpha Wolf defeated. The camp can push deeper.";
}

function loseCamp(state: CampState): void {
  state.status = "lost";
  state.eventMessage = undefined;
  state.workOrders = [];
  state.message = "The camp collapsed under hunger and threat.";
  for (const card of state.cards) {
    if (card.kind === "survivor" || card.kind === "armedSurvivor") card.state = "wounded";
  }
}
