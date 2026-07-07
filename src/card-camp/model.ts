export type CardKind =
  | "villager"
  | "berryBush"
  | "tree"
  | "stone"
  | "berry"
  | "wood"
  | "campfire"
  | "cookedBerry"
  | "rain"
  | "coldNight"
  | "trader";

export type CardState = "idle" | "working" | "hungry" | "warning";
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
  eventCount: number;
  eventMessage?: string;
  message: string;
  goalMet: boolean;
  status: CampStatus;
};

const EVENT_KINDS = new Set<CardKind>(["rain", "coldNight", "trader"]);

export const CARD_DEFS: Record<CardKind, { label: string; type: string }> = {
  villager: { label: "Villager", type: "worker" },
  berryBush: { label: "Berry Bush", type: "source" },
  tree: { label: "Tree", type: "source" },
  stone: { label: "Stone", type: "resource" },
  berry: { label: "Berry", type: "food" },
  wood: { label: "Wood", type: "resource" },
  campfire: { label: "Campfire", type: "craft" },
  cookedBerry: { label: "Cooked Berry", type: "food" },
  rain: { label: "Rain", type: "event" },
  coldNight: { label: "Cold Night", type: "event" },
  trader: { label: "Trader", type: "event" }
};

export const RECIPES: Recipe[] = [
  {
    id: "forage-berry",
    inputs: ["villager", "berryBush"],
    result: "berry",
    seconds: 3,
    reusable: ["villager", "berryBush"]
  },
  {
    id: "chop-wood",
    inputs: ["villager", "tree"],
    result: "wood",
    seconds: 4,
    reusable: ["villager", "tree"]
  },
  {
    id: "build-campfire",
    inputs: ["wood", "stone"],
    result: "campfire",
    seconds: 5,
    reusable: []
  },
  {
    id: "cook-berry",
    inputs: ["campfire", "berry"],
    result: "cookedBerry",
    seconds: 4,
    reusable: ["campfire"]
  }
];

let nextId = 1;

export function createInitialState(): CampState {
  nextId = 1;
  return {
    cards: [
      createCard("villager", 88, 96),
      createCard("berryBush", 306, 88),
      createCard("tree", 536, 110),
      createCard("stone", 736, 132)
    ],
    workOrders: [],
    dayRemaining: 42,
    dayLength: 42,
    day: 1,
    warnings: 0,
    eventCount: 0,
    message: "Place Villager near a source to start a routine.",
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
  state.goalMet = state.goalMet || state.cards.some((card) => card.kind === "campfire");
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
    if (card.kind === "villager") {
      const target = cards.find((candidate) => candidate.id !== card.id && recipe.reusable.includes(candidate.kind));
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
  state.message = "Those cards do not make anything yet.";
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
      const isRoutineWorker = card.kind === "villager" && card.routineTargetId;
      card.x = order.x + (isRoutineWorker ? -54 : card.kind === "villager" ? -128 : 112);
      card.y = order.y + 18;
    }
  }

  state.cards.push(createCard(order.recipe.result, order.x + 128, order.y + 22));
  state.message = `${CARD_DEFS[order.recipe.result].label} produced.`;
  state.goalMet = state.goalMet || order.recipe.result === "campfire";
}

function resolveDay(state: CampState): void {
  const completedDay = state.day;
  state.day += 1;
  state.dayRemaining = state.dayLength;

  const foodNeeded = state.cards.some((card) => card.kind === "coldNight") ? 2 : 1;
  const consumedFood = selectFoodForNeed(state.cards, foodNeeded);
  const hasEnoughFood = consumedFood.reduce((sum, card) => sum + foodValue(card), 0) >= foodNeeded;
  if (hasEnoughFood) {
    const consumedIds = new Set(consumedFood.map((card) => card.id));
    state.cards = state.cards.filter((card) => !consumedIds.has(card.id));
    state.message = foodNeeded > 1 ? "Cold night. Villager ate enough food." : `Villager ate one ${CARD_DEFS[consumedFood[0].kind].label}.`;
    clearResolvedEvents(state);
    if (completedDay >= 5 && (state.goalMet || state.cards.some((card) => card.kind === "campfire"))) {
      winCamp(state);
      return;
    }
    addNightEvent(state);
    for (const card of state.cards) {
      if (card.kind === "villager") card.state = "idle";
    }
    return;
  }

  if (consumedFood.length > 0) {
    const consumedIds = new Set(consumedFood.map((card) => card.id));
    state.cards = state.cards.filter((card) => !consumedIds.has(card.id));
    state.message = "Not enough food. Villager is still hungry.";
    state.warnings += 1;
    clearResolvedEvents(state);
    if (state.warnings >= 2) {
      loseCamp(state);
      return;
    }
    addNightEvent(state);
    for (const card of state.cards) {
      if (card.kind === "villager") card.state = "hungry";
    }
    return;
  }

  state.warnings += 1;
  state.message = "No food. Villager is hungry.";
  clearResolvedEvents(state);
  if (state.warnings >= 2) {
    loseCamp(state);
    return;
  }
  addNightEvent(state);
  for (const card of state.cards) {
    if (card.kind === "villager") card.state = "hungry";
  }
}

function recipeLabel(recipe: Recipe): string {
  return recipe.inputs.map((kind) => CARD_DEFS[kind].label).join(" + ");
}

function startRoutineWork(state: CampState): void {
  if (state.status !== "playing") return;

  const activeCardIds = new Set(state.workOrders.flatMap((order) => order.cardIds));
  for (const villager of state.cards) {
    if (villager.kind !== "villager" || villager.state !== "idle" || activeCardIds.has(villager.id)) continue;
    if (!villager.routineTargetId) continue;

    const target = state.cards.find((card) => card.id === villager.routineTargetId && card.state === "idle");
    if (!target || distance(villager, target) > 112) {
      villager.routineTargetId = undefined;
      continue;
    }

    const recipe = findRecipe([villager.kind, target.kind]);
    if (recipe) {
      startRecipe(state, recipe, [villager, target]);
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
      state.message = "Berry warms by the fire.";
      return;
    }
  }

  const trader = state.cards.find((card) => card.kind === "trader");
  if (!trader) return;
  const wood = state.cards.find((card) => card.kind === "wood" && distance(card, trader) <= 108);
  if (!wood) return;
  state.cards = state.cards.filter((card) => card.id !== trader.id && card.id !== wood.id);
  state.cards.push(createCard("berry", trader.x + 32, trader.y + 8));
  state.cards.push(createCard("stone", trader.x - 32, trader.y + 14));
  state.message = "Trader swapped wood for supplies.";
}

function addNightEvent(state: CampState): void {
  if (state.status !== "playing") return;

  const events: CardKind[] = ["rain", "coldNight", "trader"];
  const kind = events[state.eventCount % events.length];
  state.eventCount += 1;
  state.cards.push(createCard(kind, 24 + (state.eventCount % 3) * 72, 188));
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
  const cooked = cards.filter((card) => card.kind === "cookedBerry");
  if (need <= 1) {
    return berries[0] ? [berries[0]] : cooked.slice(0, 1);
  }
  if (cooked[0]) return [cooked[0]];
  return berries.slice(0, need);
}

function foodValue(card: CampCard): number {
  if (card.kind === "cookedBerry") return 2;
  if (card.kind === "berry") return 1;
  return 0;
}

function winCamp(state: CampState): void {
  state.status = "won";
  state.eventMessage = undefined;
  state.workOrders = [];
  state.message = "Camp stabilized through Day 5.";
}

function loseCamp(state: CampState): void {
  state.status = "lost";
  state.eventMessage = undefined;
  state.workOrders = [];
  state.message = "The camp failed after too many hungry nights.";
  for (const card of state.cards) {
    if (card.kind === "villager") card.state = "hungry";
  }
}
