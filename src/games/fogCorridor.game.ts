import * as THREE from "three";
import type { Entity, GameDefinition, Vec3 } from "../engine/types";

type RunState = {
  hasFuse: boolean;
  breakerOn: boolean;
  redDoorOpen: boolean;
  chaseActive: boolean;
  chaseStartedAt: number;
  monsterPosition: THREE.Vector3;
  lastBreathAt: number;
};

const state: RunState = {
  hasFuse: false,
  breakerOn: false,
  redDoorOpen: false,
  chaseActive: false,
  chaseStartedAt: 0,
  monsterPosition: new THREE.Vector3(0, 1.1, 13),
  lastBreathAt: 0,
};

function resetState() {
  state.hasFuse = false;
  state.breakerOn = false;
  state.redDoorOpen = false;
  state.chaseActive = false;
  state.chaseStartedAt = 0;
  state.monsterPosition.set(0, 1.1, 13);
  state.lastBreathAt = 0;
}

function addBloodStain(ctx: any, id: string, position: Vec3, size: Vec3) {
  ctx.world.addBox({
    id,
    position,
    size,
    color: "#3b0909",
    solid: false,
  });
}

function addCeilingLight(ctx: any, id: string, z: number, color = "#ffe0a0") {
  ctx.world.addBox({
    id: `${id}_fixture`,
    position: [0, 2.72, z],
    size: [1.4, 0.08, 0.35],
    color: "#2a2a2e",
    solid: false,
  });

  ctx.world.addLight({
    id,
    position: [0, 2.45, z],
    color,
    emissive: color,
    intensity: 1.3,
  });
}

function addSideDoor(ctx: any, id: string, x: number, z: number, color = "#332b2b") {
  ctx.world.addDoor({
    id,
    position: [x, 1.05, z],
    size: [0.28, 2.1, 1.7],
    color,
    solid: true,
  });
}

function addPipe(ctx: any, id: string, x: number, z: number, length: number) {
  ctx.world.addBox({
    id,
    position: [x, 2.35, z],
    size: [0.12, 0.12, length],
    color: "#1a1b1f",
    solid: false,
  });
}

function addMonsterPart(
  ctx: any,
  id: string,
  offset: Vec3,
  size: Vec3,
  color = "#070708"
) {
  ctx.world.addBox({
    id,
    position: [0, -100, 0],
    size,
    color,
    solid: false,
    visible: false,
    userData: { monsterOffset: offset },
  });
}

function setMonsterVisible(ctx: any, visible: boolean) {
  for (const entity of ctx.world.entities as Entity[]) {
    if (entity.userData?.monsterOffset) {
      entity.visible = visible;
    }
  }
}

function syncMonster(ctx: any, base: THREE.Vector3) {
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

function distanceToPlayer(ctx: any, target: THREE.Vector3) {
  return target.distanceTo(ctx.player.position);
}

export const fogCorridorGame: GameDefinition = {
  id: "fog-corridor",
  title: "Fog Corridor",
  description: "전기가 나간 복도에서 퓨즈를 찾아 탈출하는 로우파이 공포 게임.",
  preset: "horror",
  spawn: [0, 1.6, 8],

  setup(ctx) {
    resetState();

    ctx.world.addFloor({
      id: "main_floor",
      position: [0, -0.1, -13],
      size: [9.2, 0.2, 48],
      color: "#202126",
    });

    ctx.world.addBox({
      id: "ceiling",
      position: [0, 2.82, -13],
      size: [9.2, 0.16, 48],
      color: "#15161a",
      solid: false,
    });

    ctx.world.addWall({
      id: "left_wall",
      position: [-4.6, 1.35, -13],
      size: [0.45, 2.7, 48],
      color: "#2c2d34",
    });

    ctx.world.addWall({
      id: "right_wall",
      position: [4.6, 1.35, -13],
      size: [0.45, 2.7, 48],
      color: "#2a2b32",
    });

    ctx.world.addWall({
      id: "back_wall",
      position: [0, 1.35, 10.9],
      size: [9.2, 2.7, 0.45],
      color: "#25262c",
    });

    ctx.world.addWall({
      id: "end_wall",
      position: [0, 1.35, -37.2],
      size: [9.2, 2.7, 0.45],
      color: "#17181d",
    });

    for (const z of [4, -3, -10, -17, -24, -31]) {
      ctx.world.addBox({
        id: `left_pillar_${z}`,
        position: [-4.15, 1.2, z],
        size: [0.55, 2.4, 0.55],
        color: "#202127",
      });

      ctx.world.addBox({
        id: `right_pillar_${z}`,
        position: [4.15, 1.2, z - 2],
        size: [0.55, 2.4, 0.55],
        color: "#202127",
      });
    }

    addCeilingLight(ctx, "light_spawn", 6, "#c8d4ff");
    addCeilingLight(ctx, "light_1", 0, "#ffe0a0");
    addCeilingLight(ctx, "light_2", -8, "#ffd0a0");
    addCeilingLight(ctx, "light_3", -17, "#ffe0a0");
    addCeilingLight(ctx, "light_red", -32, "#ff3838");

    addPipe(ctx, "pipe_left_long", -3.95, -8, 30);
    addPipe(ctx, "pipe_right_long", 3.95, -15, 25);

    addSideDoor(ctx, "side_door_a", -4.35, 1.5);
    addSideDoor(ctx, "side_door_b", 4.35, -6.5, "#2a2628");
    addSideDoor(ctx, "side_door_c", -4.35, -15.5, "#322525");
    addSideDoor(ctx, "side_door_d", 4.35, -23.5, "#1f2024");

    ctx.world.addBox({
      id: "crate_1",
      position: [-2.2, 0.45, 2],
      size: [1.4, 0.9, 1.2],
      color: "#4a4038",
      label: "낡은 상자",
    });

    ctx.world.addBox({
      id: "fallen_cabinet",
      position: [2.15, 0.45, -4.2],
      size: [1.8, 0.9, 0.8],
      color: "#353137",
    });

    ctx.world.addBox({
      id: "wet_barrier",
      position: [-1.2, 0.5, -11.5],
      size: [2.4, 1, 0.55],
      color: "#2b2b30",
      label: "넘어진 캐비닛",
    });

    ctx.world.addBox({
      id: "chair_1",
      position: [2.1, 0.35, -16.5],
      size: [0.8, 0.7, 0.8],
      color: "#3d322d",
    });

    ctx.world.addBox({
      id: "chair_back_1",
      position: [2.1, 0.95, -16.85],
      size: [0.85, 0.8, 0.12],
      color: "#3d322d",
      solid: false,
    });

    addBloodStain(ctx, "stain_1", [0.6, 0.02, -5.5], [1.4, 0.03, 0.65]);
    addBloodStain(ctx, "stain_2", [-1.1, 0.02, -19.5], [1.9, 0.03, 0.75]);
    addBloodStain(ctx, "stain_3", [1.5, 0.02, -29.5], [2.4, 0.03, 0.55]);

    ctx.world.addBox({
      id: "breaker_panel",
      position: [4.25, 1.2, -18.7],
      size: [0.28, 1.2, 0.85],
      color: "#24272b",
      label: "배전함",
      solid: false,
    });

    ctx.world.addBox({
      id: "breaker_handle",
      position: [4.05, 1.2, -18.7],
      size: [0.16, 0.45, 0.12],
      color: "#6b1f1f",
      solid: false,
    });

    ctx.world.addBox({
      id: "fuse",
      position: [-2.2, 1.05, 2],
      size: [0.35, 0.18, 0.18],
      color: "#c8b26a",
      label: "퓨즈",
      solid: false,
    });

    ctx.world.addBox({
      id: "note_1",
      position: [-4.31, 1.25, -7.8],
      size: [0.04, 0.7, 0.5],
      color: "#d8d0b8",
      label: "메모",
      solid: false,
    });

    ctx.world.addBox({
      id: "note_2",
      position: [4.31, 1.15, -25.8],
      size: [0.04, 0.6, 0.45],
      color: "#c9c0aa",
      label: "찢어진 메모",
      solid: false,
    });

    ctx.world.addDoor({
      id: "red_door",
      position: [0, 1.15, -34.8],
      size: [3.1, 2.3, 0.35],
      color: "#511717",
      label: "비상문",
    });

    ctx.world.addBox({
      id: "red_door_frame_top",
      position: [0, 2.4, -34.72],
      size: [3.5, 0.22, 0.5],
      color: "#151518",
      solid: false,
    });

    ctx.world.addBox({
      id: "exit_sign",
      position: [0, 2.65, -34.4],
      size: [1.2, 0.28, 0.12],
      color: "#2f1010",
      label: "EXIT",
      solid: false,
    });

    addMonsterPart(ctx, "monster_body", [0, 0.35, 0], [0.75, 1.45, 0.42]);
    addMonsterPart(ctx, "monster_head", [0, 1.25, -0.02], [0.48, 0.42, 0.42]);
    addMonsterPart(ctx, "monster_arm_l", [-0.58, 0.35, 0], [0.22, 1.25, 0.22]);
    addMonsterPart(ctx, "monster_arm_r", [0.58, 0.35, 0], [0.22, 1.25, 0.22]);
    addMonsterPart(ctx, "monster_leg_l", [-0.22, -0.65, 0], [0.25, 0.9, 0.25]);
    addMonsterPart(ctx, "monster_leg_r", [0.22, -0.65, 0], [0.25, 0.9, 0.25]);

    ctx.world.addTrigger({
      id: "trigger_first_whisper",
      position: [0, 1, 0],
      size: [7, 2, 3],
      label: "천장 너머에서 무언가 기어가는 소리가 난다.",
    });

    ctx.world.addTrigger({
      id: "trigger_cold",
      position: [0, 1, -10],
      size: [7, 2, 3],
      label: "공기가 갑자기 낮아졌다. 숨이 하얗게 번지는 것 같다.",
    });

    ctx.world.addTrigger({
      id: "trigger_seen",
      position: [0, 1, -21],
      size: [7, 2, 3],
      label: "방금 오른쪽 문틈에서 누군가 널 보고 있었다.",
    });

    ctx.world.addInteraction({
      id: "take_fuse",
      position: [-2.2, 1.05, 2],
      radius: 1.4,
      label: "퓨즈 줍기",
      once: true,
      onInteract(ctx) {
        state.hasFuse = true;

        const fuse = ctx.world.getEntity("fuse");
        if (fuse) {
          fuse.visible = false;
          fuse.solid = false;
        }

        ctx.ui.message("퓨즈를 얻었다. 배전함에 끼울 수 있을 것 같다.", 2800);
        ctx.ui.setObjective("복도 중간의 배전함을 찾아라.");
      },
    });

    ctx.world.addInteraction({
      id: "read_note_1",
      position: [-4.25, 1.25, -7.8],
      radius: 1.3,
      label: "메모 읽기",
      once: true,
      onInteract(ctx) {
        ctx.ui.message(
          "메모: 불이 꺼지면 절대 뒤돌아보지 마. 걔는 네가 본 걸 알아.",
          4200
        );
      },
    });

    ctx.world.addInteraction({
      id: "read_note_2",
      position: [4.25, 1.15, -25.8],
      radius: 1.3,
      label: "찢어진 메모 읽기",
      once: true,
      onInteract(ctx) {
        ctx.ui.message(
          "찢어진 메모: 비상문은 전기가 들어와야 열린다. 소리가 나면 뛰어.",
          4200
        );
      },
    });

    ctx.world.addInteraction({
      id: "use_breaker",
      position: [4.15, 1.2, -18.7],
      radius: 1.5,
      label: "배전함 조작",
      once: false,
      onInteract(ctx) {
        if (!state.hasFuse) {
          ctx.ui.message("퓨즈가 빠져 있다. 먼저 퓨즈를 찾아야 한다.", 2600);
          return;
        }

        if (state.breakerOn) {
          ctx.ui.message("이미 전기가 들어왔다. 비상문으로 가야 한다.", 2200);
          return;
        }

        state.breakerOn = true;

        const handle = ctx.world.getEntity("breaker_handle");
        if (handle) {
          handle.color = "#315d2c";
          handle.rotation = [0, 0, 0.7];
        }

        ctx.ui.message("전기가 들어왔다. 멀리서 문 잠금이 풀리는 소리가 났다.", 3300);
        ctx.ui.setObjective("비상문으로 이동하라.");
      },
    });

    ctx.world.addInteraction({
      id: "open_red_door",
      position: [0, 1, -34.1],
      radius: 1.8,
      label: "비상문 열기",
      once: false,
      onInteract(ctx) {
        if (!state.breakerOn) {
          ctx.ui.message("문이 잠겨 있다. 전기가 들어와야 열릴 것 같다.", 2600);
          return;
        }

        if (state.redDoorOpen) {
          ctx.ui.message("문 너머로 뛰어야 한다.", 1600);
          return;
        }

        state.redDoorOpen = true;
        state.chaseActive = true;
        state.chaseStartedAt = ctx.time.elapsed;
        state.monsterPosition.set(0, 1.1, -25);

        const door = ctx.world.getEntity("red_door");
        if (door) {
          door.visible = false;
          door.solid = false;
        }

        setMonsterVisible(ctx, true);
        syncMonster(ctx, state.monsterPosition);

        ctx.ui.message("문이 열렸다. 동시에 복도 뒤쪽에서 무언가 달려오기 시작했다.", 3600);
        ctx.ui.setObjective("뛰어. 뒤돌아보지 마.");
      },
    });

    ctx.ui.setObjective("낡은 상자 근처에서 쓸 만한 것을 찾아라.");
  },

  update(ctx, dt) {
    const t = ctx.time.elapsed;

    const light1 = ctx.world.getEntity("light_1");
    const light2 = ctx.world.getEntity("light_2");
    const light3 = ctx.world.getEntity("light_3");
    const redLight = ctx.world.getEntity("light_red");
    const spawnLight = ctx.world.getEntity("light_spawn");

    if (light1) {
      light1.intensity = 1.0 + Math.sin(t * 8) * 0.22 + Math.random() * 0.12;
    }

    if (light2) {
      light2.intensity = 0.8 + Math.sin(t * 11) * 0.35 + Math.random() * 0.18;
    }

    if (light3) {
      light3.intensity = state.breakerOn
        ? 1.7 + Math.sin(t * 13) * 0.25 + Math.random() * 0.15
        : 0.45 + Math.random() * 0.1;
    }

    if (spawnLight) {
      spawnLight.intensity = state.chaseActive ? 0.25 + Math.random() * 0.2 : 1.2;
    }

    if (redLight) {
      redLight.intensity = state.breakerOn
        ? 2.8 + Math.sin(t * 18) * 0.7 + Math.random() * 0.3
        : 1.2 + Math.sin(t * 5) * 0.25;
    }

    // 배전함을 켠 뒤 복도 끝으로 가는 동안 뒤쪽에서 압박 메시지
    if (state.breakerOn && !state.redDoorOpen) {
      const nearExit = ctx.player.position.z < -27;

      if (nearExit && t - state.lastBreathAt > 5) {
        state.lastBreathAt = t;
        ctx.ui.message("등 뒤에서 젖은 숨소리가 들린다.", 2100);
      }
    }

    // 추격전
    if (state.chaseActive) {
      const player = ctx.player.position;

      const target = new THREE.Vector3(
        player.x * 0.65,
        1.1,
        player.z + 1.2
      );

      const chaseDuration = t - state.chaseStartedAt;
      const speed = Math.min(6.8, 2.6 + chaseDuration * 0.42);

      state.monsterPosition.lerp(target, Math.min(1, dt * speed * 0.22));

      const jitter = Math.sin(t * 22) * 0.08;
      state.monsterPosition.x += jitter * dt * 4;

      syncMonster(ctx, state.monsterPosition);

      if (distanceToPlayer(ctx, state.monsterPosition) < 1.25) {
        ctx.scene.end("잡혔다", "마지막으로 본 것은 복도 끝이 아니라 네 뒤에 있던 얼굴이었다.");
      }
    }

    // 문 너머로 충분히 들어가면 클리어
    if (state.redDoorOpen && ctx.player.position.z < -36.2) {
      ctx.scene.end("탈출", "문은 닫혔다. 그런데 복도 소리는 아직 네 뒤에 있다.");
    }
  },
};