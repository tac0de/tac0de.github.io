import type { GameDefinition } from "../engine/types";

export const fogCorridorGame: GameDefinition = {
  id: "fog-corridor",
  title: "Fog Corridor",
  description: "안개 낀 복도에서 붉은 문을 찾아 나가는 로우파이 공포 프로토타입.",
  preset: "horror",
  spawn: [0, 1.6, 7],

  setup(ctx) {
    ctx.ui.setObjective("복도 끝의 붉은 문을 찾아라.");

    ctx.world.addFloor({
      id: "main_floor",
      position: [0, -0.1, -8],
      size: [10, 0.2, 36],
      color: "#25262b",
    });

    ctx.world.addWall({
      id: "left_wall",
      position: [-5, 1.4, -8],
      size: [0.4, 2.8, 36],
      color: "#30323a",
    });

    ctx.world.addWall({
      id: "right_wall",
      position: [5, 1.4, -8],
      size: [0.4, 2.8, 36],
      color: "#30323a",
    });

    ctx.world.addWall({
      id: "back_wall",
      position: [0, 1.4, 9.5],
      size: [10, 2.8, 0.4],
      color: "#2e3038",
    });

    ctx.world.addBox({
      id: "crate_1",
      position: [-2.2, 0.45, 0],
      size: [1.2, 0.9, 1.2],
      color: "#4b423b",
      label: "낡은 상자",
    });

    ctx.world.addBox({
      id: "crate_2",
      position: [2.3, 0.6, -5],
      size: [1.4, 1.2, 1],
      color: "#3e3b40",
    });

    ctx.world.addBox({
      id: "pillar_1",
      position: [0, 1, -9],
      size: [1, 2, 1],
      color: "#383943",
    });

    ctx.world.addLight({
      id: "light_spawn",
      position: [0, 2.4, 5],
      color: "#b8c7ff",
      intensity: 1.3,
    });

    ctx.world.addLight({
      id: "light_mid",
      position: [-2.5, 2.4, -4],
      color: "#ffd9a0",
      intensity: 1.5,
    });

    ctx.world.addLight({
      id: "light_red",
      position: [0, 2.6, -18],
      color: "#ff4b4b",
      emissive: "#ff2020",
      intensity: 2.2,
    });

    ctx.world.addDoor({
      id: "red_door",
      position: [0, 1.1, -23],
      size: [3, 2.2, 0.35],
      color: "#5b1e1e",
      label: "붉은 문",
    });

    ctx.world.addTrigger({
      id: "whisper_trigger",
      position: [0, 1, -3],
      size: [5, 2, 3],
      label: "뒤에서 발소리가 들린 것 같다.",
    });

    ctx.world.addTrigger({
      id: "cold_trigger",
      position: [0, 1, -12],
      size: [5, 2, 3],
      label: "공기가 갑자기 차가워졌다.",
    });

    ctx.world.addInteraction({
      id: "inspect_crate",
      position: [-2.2, 1, 0],
      radius: 1.6,
      label: "상자 조사",
      once: true,
      onInteract(ctx) {
        ctx.ui.message("상자 안에는 오래된 열쇠 조각이 있다.");
        ctx.ui.setObjective("붉은 문으로 이동하라.");
      },
    });

    ctx.world.addInteraction({
      id: "open_red_door",
      position: [0, 1, -22],
      radius: 2,
      label: "붉은 문 열기",
      once: true,
      onInteract(ctx) {
        const door = ctx.world.getEntity("red_door");

        if (door) {
          door.visible = false;
          door.solid = false;
        }

        ctx.ui.message("문이 소리 없이 열렸다.");
        ctx.ui.setObjective("문 너머로 들어가라.");
      },
    });
  },

  update(ctx) {
    const t = ctx.time.elapsed;

    const light = ctx.world.getEntity("light_mid");

    if (light) {
      light.intensity = 1.1 + Math.sin(t * 8) * 0.35 + Math.random() * 0.08;
    }

    if (ctx.player.position.z < -25) {
      ctx.scene.end("탈출", "하지만 복도는 아직 끝나지 않았다.");
    }
  },
};