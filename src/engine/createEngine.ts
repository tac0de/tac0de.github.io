import * as THREE from "three";
import type {
  EngineState,
  Entity,
  GameContext,
  GameDefinition,
  Interaction,
  PlayerState,
  SceneAPI,
  TimeState,
  UIAPI,
  Vec3,
  WorldAPI,
} from "./types";

export const keyState = {
  forward: false,
  back: false,
  left: false,
  right: false,
};

export const pointerState = {
  dragging: false,
  lastX: 0,
  lastY: 0,
};

export const mobileState = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
};

function uid(prefix = "entity") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function vec3(v?: Vec3) {
  return new THREE.Vector3(v?.[0] ?? 0, v?.[1] ?? 0, v?.[2] ?? 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function createEngine(
  game: GameDefinition,
  onChange: () => void
): EngineState {
  let messageTimer: number | undefined;

  const entities: Entity[] = [];
  const interactions: Interaction[] = [];

  const player: PlayerState = {
    position: vec3(game.spawn ?? [0, 1.6, 6]),
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: 0,
    speed: 4.1,
    height: 1.6,
  };

  const time: TimeState = {
    elapsed: 0,
  };

  let engine!: EngineState;

  const world: WorldAPI = {
    entities,
    interactions,

    addFloor(options = {}) {
      const entity: Entity = {
        id: options.id ?? uid("floor"),
        kind: "floor",
        position: options.position ?? [0, 0, 0],
        size: options.size ?? [30, 0.2, 30],
        color: options.color ?? "#2b2b2f",
        solid: false,
        visible: options.visible ?? true,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addWall(options) {
      const entity: Entity = {
        id: options.id ?? uid("wall"),
        kind: "wall",
        position: options.position ?? [0, 1, 0],
        size: options.size ?? [1, 2, 1],
        color: options.color ?? "#343640",
        solid: options.solid ?? true,
        visible: options.visible ?? true,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addBox(options) {
      const entity: Entity = {
        id: options.id ?? uid("box"),
        kind: "box",
        position: options.position ?? [0, 0.5, 0],
        size: options.size ?? [1, 1, 1],
        color: options.color ?? "#555",
        solid: options.solid ?? true,
        visible: options.visible ?? true,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addDoor(options) {
      const entity: Entity = {
        id: options.id ?? uid("door"),
        kind: "door",
        position: options.position ?? [0, 1, 0],
        size: options.size ?? [1.5, 2.2, 0.25],
        color: options.color ?? "#5a3028",
        solid: options.solid ?? true,
        visible: options.visible ?? true,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addLight(options) {
      const entity: Entity = {
        id: options.id ?? uid("light"),
        kind: "light",
        position: options.position ?? [0, 3, 0],
        size: options.size ?? [0.25, 0.25, 0.25],
        color: options.color ?? "#ffe6b0",
        emissive: options.emissive ?? options.color ?? "#ffe6b0",
        intensity: options.intensity ?? 1.5,
        solid: false,
        visible: options.visible ?? true,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addTrigger(options) {
      const entity: Entity = {
        id: options.id ?? uid("trigger"),
        kind: "trigger",
        position: options.position ?? [0, 1, 0],
        size: options.size ?? [2, 2, 2],
        visible: false,
        solid: false,
        ...options,
      };

      entities.push(entity);
      return entity;
    },

    addInteraction(interaction) {
      interactions.push(interaction);
      return interaction;
    },

    removeEntity(id) {
      const index = entities.findIndex((e) => e.id === id);

      if (index >= 0) {
        entities.splice(index, 1);
        engine.bump();
      }
    },

    getEntity(id) {
      return entities.find((e) => e.id === id);
    },
  };

  const ui: UIAPI = {
    message(text, durationMs = 2400) {
      engine.message = text;
      engine.bump();

      if (messageTimer) {
        window.clearTimeout(messageTimer);
      }

      messageTimer = window.setTimeout(() => {
        engine.message = "";
        engine.bump();
      }, durationMs);
    },

    setObjective(text) {
      engine.objective = text;
      engine.bump();
    },
  };

  const scene: SceneAPI = {
    end(title, subtitle = "") {
      engine.ended = true;
      engine.endTitle = title;
      engine.endSubtitle = subtitle;
      engine.bump();
    },

    restart() {
      window.location.reload();
    },
  };

  const ctx: GameContext = {
    world,
    player,
    ui,
    scene,
    time,
  };

  engine = {
    game,
    world,
    player,
    time,
    ui,
    scene,
    ctx,

    message: "",
    objective: "",

    ended: false,
    endTitle: "",
    endSubtitle: "",

    version: 0,

    bump() {
      engine.version += 1;
      onChange();
    },

    update(dt) {
      if (engine.ended) return;

      time.elapsed += dt;

      updatePlayer(engine, dt);
      checkPassiveTriggers(engine);

      game.update?.(ctx, dt);
    },

    interact() {
      const interaction = engine.getNearbyInteraction();
      if (!interaction) return;
      if (interaction.once && interaction.done) return;

      interaction.done = true;
      interaction.onInteract(ctx);
      engine.bump();
    },

    getNearbyInteraction() {
      let best: Interaction | null = null;
      let bestDistance = Infinity;

      for (const interaction of interactions) {
        if (interaction.once && interaction.done) continue;

        const position = vec3(interaction.position);
        const distance = position.distanceTo(player.position);

        if (distance <= interaction.radius && distance < bestDistance) {
          best = interaction;
          bestDistance = distance;
        }
      }

      return best;
    },
  };

  game.setup(ctx);
  engine.bump();

  return engine;
}

function updatePlayer(engine: EngineState, dt: number) {
  const { player } = engine;

  player.yaw -= mobileState.lookX * 0.0025;
  player.pitch -= mobileState.lookY * 0.002;
  player.pitch = clamp(player.pitch, -0.9, 0.9);

  mobileState.lookX = 0;
  mobileState.lookY = 0;

  const forwardInput =
    (keyState.forward ? 1 : 0) +
    (keyState.back ? -1 : 0) +
    mobileState.moveY;

  const rightInput =
    (keyState.right ? 1 : 0) +
    (keyState.left ? -1 : 0) +
    mobileState.moveX;

  /**
   * Three.js 기준:
   * - 카메라 기본 전방은 -Z
   * - 현재 엔진에서는 yaw = Math.PI 일 때 -Z를 보도록 설계
   * - 따라서 yaw 기준 전방 벡터는 아래와 같음
   */
  const forward = new THREE.Vector3(
    Math.sin(player.yaw),
    0,
    Math.cos(player.yaw)
  );

  /**
   * 중요:
   * 기존 코드의 yaw + PI/2는 좌우가 반대로 느껴질 수 있음.
   * yaw = PI, 즉 -Z를 볼 때 오른쪽은 +X여야 하므로 yaw - PI/2가 맞음.
   */
  const right = new THREE.Vector3(
    Math.sin(player.yaw - Math.PI / 2),
    0,
    Math.cos(player.yaw - Math.PI / 2)
  );

  const move = new THREE.Vector3();
  move.addScaledVector(forward, forwardInput);
  move.addScaledVector(right, rightInput);

  if (move.lengthSq() > 1) {
    move.normalize();
  }

  const oldPosition = player.position.clone();

  player.velocity.copy(move.multiplyScalar(player.speed));
  player.position.addScaledVector(player.velocity, dt);

  if (collidesWithSolid(engine, player.position)) {
    player.position.copy(oldPosition);
  }

  player.position.y = player.height;
}

function collidesWithSolid(engine: EngineState, position: THREE.Vector3) {
  const radius = 0.35;

  for (const entity of engine.world.entities) {
    if (!entity.solid || entity.visible === false) continue;

    const [ex, ey, ez] = entity.position;
    const [sx, sy, sz] = entity.size;

    const minX = ex - sx / 2 - radius;
    const maxX = ex + sx / 2 + radius;
    const minZ = ez - sz / 2 - radius;
    const maxZ = ez + sz / 2 + radius;
    const minY = ey - sy / 2;
    const maxY = ey + sy / 2;

    const insideXZ =
      position.x >= minX &&
      position.x <= maxX &&
      position.z >= minZ &&
      position.z <= maxZ;

    const insideY = position.y >= minY && position.y <= maxY + 2;

    if (insideXZ && insideY) {
      return true;
    }
  }

  return false;
}

function checkPassiveTriggers(engine: EngineState) {
  const { player } = engine;

  for (const entity of engine.world.entities) {
    if (entity.kind !== "trigger") continue;
    if (entity.userData?.done) continue;

    const position = vec3(entity.position);
    const distance = position.distanceTo(player.position);
    const triggerRadius = Math.max(entity.size[0], entity.size[2]) * 0.5;

    if (distance < triggerRadius) {
      entity.userData = {
        ...(entity.userData ?? {}),
        done: true,
      };

      engine.ui.message(entity.label ?? "무언가 지나갔다.");
    }
  }
}