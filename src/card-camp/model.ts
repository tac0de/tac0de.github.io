export type CardKind = "villager" | "berryBush" | "tree" | "stone" | "berry" | "wood" | "campfire";

export type CardState = "idle" | "working" | "hungry" | "warning";

export type CampCard = {
  id: string;
  kind: CardKind;
  x: number;
  y: number;
  stackId?: string;
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
  message: string;
};

export const CARD_DEFS: Record<CardKind, { label: string; type: string }> = {
  villager: { label: "Villager", type: "worker" },
  berryBush: { label: "Berry Bush", type: "source" },
  tree: { label: "Tree", type: "source" },
  stone: { label: "Stone", type: "resource" },
  berry: { label: "Berry", type: "food" },
  wood: { label: "Wood", type: "resource" },
  campfire: { label: "Campfire", type: "craft" }
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
    message: "Drag Villager onto Berry Bush to produce food."
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
}

export function startRecipe(state: CampState, recipe: Recipe, cards: CampCard[]): void {
  const x = cards.reduce((sum, card) => sum + card.x, 0) / cards.length;
  const y = cards.reduce((sum, card) => sum + card.y, 0) / cards.length;
  const orderId = `work-${nextId++}`;

  for (const card of cards) {
    card.state = "working";
    card.stackId = orderId;
    card.x = x;
    card.y = y;
  }

  state.workOrders.push({
    id: orderId,
    recipe,
    cardIds: cards.map((card) => card.id),
    x,
    y,
    remaining: recipe.seconds,
    total: recipe.seconds
  });
  state.message = `${recipeLabel(recipe)} started.`;
}

export function cancelInvalidStack(state: CampState, card: CampCard): void {
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
      card.x += card.kind === "villager" ? -54 : 54;
      card.y += 16;
    }
  }

  state.cards.push(createCard(order.recipe.result, order.x + 128, order.y + 22));
  state.message = `${CARD_DEFS[order.recipe.result].label} produced.`;
}

function resolveDay(state: CampState): void {
  state.day += 1;
  state.dayRemaining = state.dayLength;

  const berry = state.cards.find((card) => card.kind === "berry");
  if (berry) {
    state.cards = state.cards.filter((card) => card.id !== berry.id);
    state.message = "Villager ate one Berry.";
    for (const card of state.cards) {
      if (card.kind === "villager") card.state = "idle";
    }
    return;
  }

  state.warnings += 1;
  state.message = "No food. Villager is hungry.";
  for (const card of state.cards) {
    if (card.kind === "villager") card.state = "hungry";
  }
}

function recipeLabel(recipe: Recipe): string {
  return recipe.inputs.map((kind) => CARD_DEFS[kind].label).join(" + ");
}
