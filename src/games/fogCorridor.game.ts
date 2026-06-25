import * as THREE from "three";
import type { Entity, GameContext, GameDefinition, Vec3 } from "../engine/types";

type Phase =
  | "start"
  | "fuseTaken"
  | "breakerOn"
  | "doorOpen"
  | "chase"
  | "escaped"
  | "caught";

type RunState = {
  phase: Phase;
  hasFuse: boolean;
  breakerOn: boolean;
  doorOpen: boolean;
  monsterPosition: THREE.Vector3;
  monsterVisible: boolean;
  chaseStartedAt: number;
  lastScareAt: number;
};

const state: RunState = {
  phase: "start",
  hasFuse: false,
  breakerOn: false,
  doorOpen: false,
  monsterPosition: new THREE.Vector3(0, 1.1, 12),
  monsterVisible: false,
  chaseStartedAt: 0,
  lastScareAt: 0,
};

function resetState() {
  state.phase = "start";
  state.hasFuse = false;
  state.breakerOn = false;
  state.doorOpen = false;
  state.monsterPosition.set(0, 1.1, 12);
  state.monsterVisible = false;
  state.chaseStartedAt = 0;
  state.lastScareAt = 0;
}

function addBloodStain(ctx: GameContext, id: string, position: Vec3, size: Vec3) {
  ctx.world.addBox({
    id,
    position,
    size,
    color: "#300606",
    opacity: 0.72,
    solid: false,
  });
}

function addCeilingLight(
  ctx: GameContext,
  id: string,
  z: number,
  color = "#ffe0a0",
  intensity = 1.25
) {
  ctx.world.addBox({
    id: `${id}_fixture`,
    position: [0, 2.72, z],
    size: [1.35, 0.08, 0.34],
    color: "#23242a",
    solid: false,
  });

  ctx.world.addLight({
    id,
    position: [0, 2.42, z],
    size: [0.22, 0.22, 0.22],
    color,
    emissive: color,
    intensity,
    solid: false,
  });
}

function addSideDoor(
  ctx: GameContext,
  id: string,
  x: number,
  z: number,
  color = "#2b2729"
) {
  ctx.world.addDoor({
    id,
    position: [x, 1.05, z],
    size: [0.28, 2.1, 1.7],
    color,
    solid: true,
  });

  ctx.world.addBox({
    id: `${id}_gap`,
    position: [x * 0.998, 1.08, z + 0.52],
    size: [0.05, 1.72, 0.22],
    color: "#000000",
    opacity: 0.9,
    solid: false,
  });
}

function addPipe(ctx: GameContext, id: string, x: number, z: number, length: number) {
  ctx.world.addBox({
    id,
    position: [x, 2.35, z],
    size: [0.12, 0.12, length],
    color: "#16171b",
    solid: false,
  });

  ctx.world.addBox({
    id: `${id}_joint_a`,
    position: [x, 2.35, z - length / 2],
    size: [0.22, 0.22, 0.18],
    color: "#0e0f12",
    solid: false,
  });

  ctx.world.addBox({
    id: `${id}_joint_b`,
    position: [x, 2.35, z + length / 2],
    size: [0.22, 0.22, 0.18],
    color: "#0e0f12",
    solid: false,
  });
}

function addMonsterPart(
  ctx: GameContext,
  id: string,
  offset: Vec3,
  size: Vec3,
  color = "#030304"
) {
  ctx.world.addBox({
    id,
    position: [0, -100, 0],
    size,
    color,
    opacity: 0,
    solid: false,
    visible: true,
    userData: { monsterOffset: offset },
  });
}

function setMonsterOpacity(ctx: GameContext, opacity: number) {
  for (const entity of ctx.world.entities as Entity[]) {
    if (entity.userData?.monsterOffset) {
      entity.opacity = opacity;
    }
  }
}

function syncMonster(ctx: GameContext, base: THREE.Vector3) {
  for (const entity of ctx.world.entities as Entity[]) {
    const offset = entity.userData?.monsterOffset as Vec3 | undefined;
    if (!offset) continue;

    entity.position = [
      base.x + offset[0],
      base.y + offset[1],
      base.z + offset[2],
    ];
  }
}

function setOpacity(ctx: GameContext, id: string, opacity: number) {
  const entity = ctx.world.getEntity(id);
  if (entity) entity.opacity = opacity;
}

function setLight(ctx: GameContext, id: string, intensity: number, color?: string) {
  const entity = ctx.world.getEntity(id);
  if (!entity) return;

  entity.intensity = intensity;

  if (color) {
    entity.color = color;
    entity.emissive = color;
  }
}

function flashEntity(ctx: GameContext, id: string, duration = 320) {
  const entity = ctx.world.getEntity(id);
  if (!entity) return;

  entity.opacity = 0.82;

  window.setTimeout(() => {
    entity.opacity = 0;
  }, duration);
}

function playerDistance(ctx: GameContext, target: THREE.Vector3) {
  return target.distanceTo(ctx.player.position);
}

function addSilentInteraction(
  ctx: GameContext,
  id: string,
  position: Vec3,
  radius: number,
  onInteract: (ctx: GameContext) => void,
  once = true
) {
  ctx.world.addInteraction({
    id,
    position,
    radius,
    label: "",
    once,
    onInteract,
  });
}

export const fogCorridorGame: GameDefinition = {
  id: "fog-corridor",
  title: "Fog Corridor",
  description: "No-text lo-fi horror corridor.",
  preset: "horror",
  spawn: [0, 1.6, 8.2],

  setup(ctx) {
    resetState();

    ctx.world.addFloor({
      id: "main_floor",
      position: [0, -0.1, -13],
      size: [9.2, 0.2, 48],
      color: "#1e1f25",
    });

    ctx.world.addBox({
      id: "ceiling",
      position: [0, 2.82, -13],
      size: [9.2, 0.16, 48],
      color: "#111217",
      solid: false,
    });

    ctx.world.addWall({
      id: "left_wall",
      position: [-4.6, 1.35, -13],
      size: [0.45, 2.7, 48],
      color: "#2a2b33",
    });

    ctx.world.addWall({
      id: "right_wall",
      position: [4.6, 1.35, -13],
      size: [0.45, 2.7, 48],
      color: "#272830",
    });

    ctx.world.addWall({
      id: "back_wall",
      position: [0, 1.35, 10.9],
      size: [9.2, 2.7, 0.45],
      color: "#24252b",
    });

    ctx.world.addWall({
      id: "end_wall",
      position: [0, 1.35, -37.2],
      size: [9.2, 2.7, 0.45],
      color: "#121318",
    });

    for (const z of [4, -3, -10, -17, -24, -31]) {
      ctx.world.addBox({
        id: `left_pillar_${z}`,
        position: [-4.15, 1.2, z],
        size: [0.55, 2.4, 0.55],
        color: "#1d1e24",
      });

      ctx.world.addBox({
        id: `right_pillar_${z}`,
        position: [4.15, 1.2, z - 2],
        size: [0.55, 2.4, 0.55],
        color: "#1b1c22",
      });
    }

    addCeilingLight(ctx, "light_spawn", 6, "#b9c9ff", 1.4);
    addCeilingLight(ctx, "light_1", 0, "#ffe0a0", 1.05);
    addCeilingLight(ctx, "light_2", -8, "#ffd0a0", 0.85);
    addCeilingLight(ctx, "light_3", -17, "#ffe0a0", 0.42);
    addCeilingLight(ctx, "light_red", -32, "#ff2525", 1.35);

    addPipe(ctx, "pipe_left_long", -3.95, -8, 30);
    addPipe(ctx, "pipe_right_long", 3.95, -15, 25);

    addSideDoor(ctx, "side_door_a", -4.35, 1.5);
    addSideDoor(ctx, "side_door_b", 4.35, -6.5, "#252328");
    addSideDoor(ctx, "side_door_c", -4.35, -15.5, "#2e2021");
    addSideDoor(ctx, "side_door_d", 4.35, -23.5, "#1c1d22");

    ctx.world.addBox({
      id: "crate_1",
      position: [-2.2, 0.45, 2],
      size: [1.4, 0.9, 1.2],
      color: "#473d35",
    });

    ctx.world.addBox({
      id: "fallen_cabinet",
      position: [2.15, 0.45, -4.2],
      size: [1.8, 0.9, 0.8],
      color: "#343138",
    });

    ctx.world.addBox({
      id: "wet_barrier",
      position: [-1.2, 0.5, -11.5],
      size: [2.4, 1, 0.55],
      color: "#28292f",
    });

    ctx.world.addBox({
      id: "chair_1",
      position: [2.1, 0.35, -16.5],
      size: [0.8, 0.7, 0.8],
      color: "#3a302c",
    });

    ctx.world.addBox({
      id: "chair_back_1",
      position: [2.1, 0.95, -16.85],
      size: [0.85, 0.8, 0.12],
      color: "#3a302c",
      solid: false,
    });

    addBloodStain(ctx, "stain_1", [0.6, 0.02, -5.5], [1.4, 0.03, 0.65]);
    addBloodStain(ctx, "stain_2", [-1.1, 0.02, -19.5], [1.9, 0.03, 0.75]);
    addBloodStain(ctx, "stain_3", [1.5, 0.02, -29.5], [2.4, 0.03, 0.55]);

    ctx.world.addBox({
      id: "breaker_panel",
      position: [4.25, 1.2, -18.7],
      size: [0.28, 1.2, 0.85],
      color: "#202328",
      solid: false,
    });

    ctx.world.addBox({
      id: "breaker_slot",
      position: [4.04, 1.18, -18.7],
      size: [0.08, 0.42, 0.22],
      color: "#09090a",
      solid: false,
    });

    ctx.world.addLight({
      id: "breaker_hint_light",
      position: [3.75, 1.45, -18.7],
      size: [0.16, 0.16, 0.16],
      color: "#ffd65a",
      emissive: "#ffd65a",
      intensity: 0,
      solid: false,
    });

    ctx.world.addBox({
      id: "fuse",
      position: [-2.2, 1.05, 2],
      size: [0.35, 0.18, 0.18],
      color: "#d5bd5f",
      solid: false,
    });

    ctx.world.addLight({
      id: "fuse_glow",
      position: [-2.2, 1.15, 2],
      size: [0.12, 0.12, 0.12],
      color: "#ffd85d",
      emissive: "#ffd85d",
      intensity: 1.6,
      solid: false,
    });

    ctx.world.addDoor({
      id: "red_door",
      position: [0, 1.15, -34.8],
      size: [3.1, 2.3, 0.35],
      color: "#4e1414",
      solid: true,
    });

    ctx.world.addBox({
      id: "red_door_frame_top",
      position: [0, 2.4, -34.72],
      size: [3.5, 0.22, 0.5],
      color: "#111116",
      solid: false,
    });

    ctx.world.addBox({
      id: "exit_glow_panel",
      position: [0, 2.62, -34.4],
      size: [1.25, 0.24, 0.12],
      color: "#390b0b",
      solid: false,
    });

    ctx.world.addLight({
      id: "exit_hint_light",
      position: [0, 2.35, -33.9],
      size: [0.2, 0.2, 0.2],
      color: "#ff2020",
      emissive: "#ff2020",
      intensity: 1.4,
      solid: false,
    });

    ctx.world.addBox({
      id: "exit_white_gap",
      position: [0, 1.35, -35.25],
      size: [2.2, 2.2, 0.06],
      color: "#ffffff",
      opacity: 0,
      solid: false,
    });

    ctx.world.addBox({
      id: "door_shadow_1",
      position: [4.08, 1.15, -6.15],
      size: [0.22, 1.9, 0.46],
      color: "#000000",
      opacity: 0,
      solid: false,
    });

    ctx.world.addBox({
      id: "ceiling_shadow_1",
      position: [-1.3, 2.35, -13.5],
      size: [1.8, 0.18, 0.55],
      color: "#000000",
      opacity: 0,
      solid: false,
    });

    ctx.world.addBox({
      id: "far_silhouette",
      position: [0, 1.2, -27],
      size: [0.65, 1.75, 0.38],
      color: "#000000",
      opacity: 0,
      solid: false,
    });

    addMonsterPart(ctx, "monster_body", [0, 0.35, 0], [0.75, 1.45, 0.42]);
    addMonsterPart(ctx, "monster_head", [0, 1.25, -0.02], [0.48, 0.42, 0.42]);
    addMonsterPart(ctx, "monster_arm_l", [-0.58, 0.35, 0], [0.22, 1.25, 0.22]);
    addMonsterPart(ctx, "monster_arm_r", [0.58, 0.35, 0], [0.22, 1.25, 0.22]);
    addMonsterPart(ctx, "monster_leg_l", [-0.22, -0.65, 0], [0.25, 0.9, 0.25]);
    addMonsterPart(ctx, "monster_leg_r", [0.22, -0.65, 0], [0.25, 0.9, 0.25]);

    ctx.world.addTrigger({
      id: "trigger_shadow_door",
      position: [0, 1, -5.6],
      size: [7, 2, 2.4],
      label: "",
    });

    ctx.world.addTrigger({
      id: "trigger_shadow_ceiling",
      position: [0, 1, -13.5],
      size: [7, 2, 2.6],
      label: "",
    });

    ctx.world.addTrigger({
      id: "trigger_far_silhouette",
      position: [0, 1, -22],
      size: [7, 2, 2.8],
      label: "",
    });

    addSilentInteraction(ctx, "take_fuse", [-2.2, 1.05, 2], 1.35, (ctx) => {
      state.hasFuse = true;
      state.phase = "fuseTaken";

      const fuse = ctx.world.getEntity("fuse");
      if (fuse) {
        fuse.opacity = 0;
        fuse.solid = false;
      }

      setLight(ctx, "fuse_glow", 0);
      setLight(ctx, "breaker_hint_light", 2.2, "#ffd65a");
      setLight(ctx, "light_spawn", 0.78, "#b9c9ff");
      setLight(ctx, "light_1", 0.55, "#ffd9a0");
    });

    addSilentInteraction(
      ctx,
      "use_breaker",
      [4.12, 1.2, -18.7],
      1.45,
      (ctx) => {
        if (!state.hasFuse || state.breakerOn) return;

        state.breakerOn = true;
        state.phase = "breakerOn";

        const slot = ctx.world.getEntity("breaker_slot");
        if (slot) {
          slot.color = "#d5bd5f";
          slot.opacity = 1;
        }

        setLight(ctx, "breaker_hint_light", 0);
        setLight(ctx, "light_1", 1.4, "#ffe0a0");
        setLight(ctx, "light_2", 1.35, "#ffd0a0");
        setLight(ctx, "light_3", 1.7, "#ffe0a0");
        setLight(ctx, "exit_hint_light", 3.2, "#ff2020");

        const exitPanel = ctx.world.getEntity("exit_glow_panel");
        if (exitPanel) {
          exitPanel.color = "#7a1010";
        }

        flashEntity(ctx, "far_silhouette", 500);
      },
      false
    );

    addSilentInteraction(
      ctx,
      "open_red_door",
      [0, 1, -34.1],
      1.75,
      (ctx) => {
        if (!state.breakerOn || state.doorOpen) return;

        state.doorOpen = true;
        state.phase = "chase";
        state.chaseStartedAt = ctx.time.elapsed;
        state.monsterVisible = true;
        state.monsterPosition.set(0, 1.1, -25.2);

        const door = ctx.world.getEntity("red_door");
        if (door) {
          door.opacity = 0;
          door.solid = false;
        }

        setOpacity(ctx, "exit_white_gap", 0.9);
        setLight(ctx, "exit_hint_light", 5.2, "#ffffff");
        setMonsterOpacity(ctx, 0.95);
        syncMonster(ctx, state.monsterPosition);
      },
      false
    );
  },

  update(ctx, dt) {
    const t = ctx.time.elapsed;

    const triggerDoor = ctx.world.getEntity("trigger_shadow_door");
    const triggerCeiling = ctx.world.getEntity("trigger_shadow_ceiling");
    const triggerFar = ctx.world.getEntity("trigger_far_silhouette");

    if (triggerDoor?.userData?.done && !triggerDoor.userData.played) {
      triggerDoor.userData.played = true;
      flashEntity(ctx, "door_shadow_1", 280);
      setLight(ctx, "light_2", 0.25);
    }

    if (triggerCeiling?.userData?.done && !triggerCeiling.userData.played) {
      triggerCeiling.userData.played = true;
      flashEntity(ctx, "ceiling_shadow_1", 420);
      setLight(ctx, "light_1", 0.18);
    }

    if (triggerFar?.userData?.done && !triggerFar.userData.played) {
      triggerFar.userData.played = true;
      flashEntity(ctx, "far_silhouette", 460);
      setLight(ctx, "light_3", 0.2);
    }

    const light1 = ctx.world.getEntity("light_1");
    const light2 = ctx.world.getEntity("light_2");
    const light3 = ctx.world.getEntity("light_3");
    const redLight = ctx.world.getEntity("light_red");
    const exitLight = ctx.world.getEntity("exit_hint_light");
    const spawnLight = ctx.world.getEntity("light_spawn");
    const fuseGlow = ctx.world.getEntity("fuse_glow");

    if (fuseGlow && !state.hasFuse) {
      fuseGlow.intensity = 1.3 + Math.sin(t * 7) * 0.35;
    }

    if (light1) {
      light1.intensity =
        (state.breakerOn ? 1.15 : 0.72) +
        Math.sin(t * 8) * 0.18 +
        Math.random() * 0.08;
    }

    if (light2) {
      light2.intensity =
        (state.breakerOn ? 1.05 : 0.58) +
        Math.sin(t * 11) * 0.28 +
        Math.random() * 0.12;
    }

    if (light3) {
      light3.intensity =
        (state.breakerOn ? 1.25 : 0.28) +
        Math.sin(t * 13) * 0.25 +
        Math.random() * 0.14;
    }

    if (redLight) {
      redLight.intensity =
        (state.breakerOn ? 2.6 : 1.1) +
        Math.sin(t * 16) * 0.55 +
        Math.random() * 0.22;
    }

    if (exitLight) {
      exitLight.intensity =
        state.doorOpen
          ? 4.2 + Math.sin(t * 9) * 0.6
          : state.breakerOn
            ? 2.6 + Math.sin(t * 6) * 0.4
            : 1.2 + Math.sin(t * 5) * 0.22;
    }

    if (spawnLight && state.phase === "chase") {
      spawnLight.intensity = 0.1 + Math.random() * 0.18;
    }

    if (state.breakerOn && !state.doorOpen) {
      const nearExit = ctx.player.position.z < -27;

      if (nearExit && t - state.lastScareAt > 4.5) {
        state.lastScareAt = t;
        flashEntity(ctx, "far_silhouette", 360);
        setLight(ctx, "light_3", 0.05);
      }
    }

    if (state.phase === "chase") {
      const chaseDuration = t - state.chaseStartedAt;
      const player = ctx.player.position;

      const target = new THREE.Vector3(player.x * 0.7, 1.1, player.z + 1.05);
      const speed = Math.min(7.6, 2.9 + chaseDuration * 0.55);

      state.monsterPosition.lerp(target, Math.min(1, dt * speed * 0.22));
      state.monsterPosition.x += Math.sin(t * 24) * 0.03;

      syncMonster(ctx, state.monsterPosition);

      const danger = playerDistance(ctx, state.monsterPosition);

      if (danger < 4.5) {
        setLight(ctx, "light_1", 0.04);
        setLight(ctx, "light_2", 0.04);
        setLight(ctx, "light_3", 0.04);
      }

      if (danger < 1.18) {
        state.phase = "caught";
        ctx.scene.end("caught");
      }
    }

    if (state.doorOpen && ctx.player.position.z < -36.2) {
      state.phase = "escaped";
      ctx.scene.end("escaped");
    }
  },
};