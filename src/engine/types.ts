import * as THREE from "three";

export type Vec3 = [number, number, number];

export type EntityKind =
  | "floor"
  | "wall"
  | "box"
  | "door"
  | "light"
  | "trigger"
  | "model"
  | "custom";

export type Entity = {
  id: string;
  kind: EntityKind;
  modelUrl?: string;
  position: Vec3;
  size: Vec3;
  scale?: Vec3;
  rotation?: Vec3;
  color?: string;
  opacity?: number;
  solid?: boolean;
  visible?: boolean;
  label?: string;
  emissive?: string;
  intensity?: number;
  userData?: Record<string, unknown>;
};

export type Interaction = {
  id: string;
  position: Vec3;
  radius: number;
  label: string;
  once?: boolean;
  done?: boolean;
  onInteract: (ctx: GameContext) => void;
};

export type PlayerState = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  speed: number;
  height: number;
};

export type TimeState = {
  elapsed: number;
};

export type WorldAPI = {
  entities: Entity[];
  interactions: Interaction[];

  addFloor: (options?: Partial<Entity>) => Entity;
  addWall: (options: Partial<Entity>) => Entity;
  addBox: (options: Partial<Entity>) => Entity;
  addDoor: (options: Partial<Entity>) => Entity;
  addLight: (options: Partial<Entity>) => Entity;
  addTrigger: (options: Partial<Entity>) => Entity;
  addModel: (options: Partial<Entity> & { modelUrl: string }) => Entity;

  addInteraction: (interaction: Interaction) => Interaction;
  removeEntity: (id: string) => void;
  getEntity: (id: string) => Entity | undefined;
};

export type UIAPI = {
  message: (text: string, durationMs?: number) => void;
  setObjective: (text: string) => void;
};

export type SceneAPI = {
  end: (title: string, subtitle?: string) => void;
  restart: () => void;
};

export type GameContext = {
  world: WorldAPI;
  player: PlayerState;
  ui: UIAPI;
  scene: SceneAPI;
  time: TimeState;
};

export type GameDefinition = {
  id: string;
  title: string;
  description?: string;
  preset?: "horror" | "arena" | "dream";
  spawn?: Vec3;
  setup: (ctx: GameContext) => void;
  update?: (ctx: GameContext, dt: number) => void;
};

export type EngineState = {
  game: GameDefinition;
  world: WorldAPI;
  player: PlayerState;
  time: TimeState;
  ui: UIAPI;
  scene: SceneAPI;
  ctx: GameContext;

  message: string;
  objective: string;

  ended: boolean;
  endTitle: string;
  endSubtitle: string;

  version: number;

  update: (dt: number) => void;
  interact: () => void;
  getNearbyInteraction: () => Interaction | null;
  bump: () => void;
};