import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";

type Wall = {
  x: number;
  z: number;
  w: number;
  d: number;
};

type Fuse = {
  id: string;
  pos: [number, number, number];
  label: string;
};

type Note = {
  id: string;
  pos: [number, number, number];
  text: string;
};

type GameState = {
  started: boolean;
  won: boolean;
  dead: boolean;
  nerve: number;
  fusesCollected: number;
  collectedFuses: string[];
  prompt: string;
  message: string;
};

type TouchMove = {
  x: number;
  y: number;
};

declare global {
  interface Window {
    __HORROR_TOUCH_MOVE__?: TouchMove;
    __HORROR_INTERACT__?: () => void;
  }
}

const WALLS: Wall[] = [
  { x: 0, z: -12, w: 28, d: 1 },
  { x: 0, z: 12, w: 28, d: 1 },
  { x: -14, z: 0, w: 1, d: 25 },
  { x: 14, z: 0, w: 1, d: 25 },

  { x: -7, z: -6, w: 1, d: 9 },
  { x: -3, z: -1, w: 9, d: 1 },
  { x: 5, z: -7, w: 1, d: 7 },
  { x: 8.5, z: -2.5, w: 7, d: 1 },
  { x: 7, z: 5, w: 1, d: 8 },
  { x: -4, z: 5, w: 11, d: 1 },
  { x: -10, z: 5, w: 1, d: 8 },
  { x: -5, z: 9, w: 11, d: 1 },
];

const FUSES: Fuse[] = [
  { id: "fuse-a", pos: [-10.8, 0.6, -8.2], label: "퓨즈 A" },
  { id: "fuse-b", pos: [10.5, 0.6, -8.8], label: "퓨즈 B" },
  { id: "fuse-c", pos: [-11.2, 0.6, 8.8], label: "퓨즈 C" },
];

const NOTES: Note[] = [
  {
    id: "note-1",
    pos: [-2.2, 0.7, -8.5],
    text: "벽에 적힌 문장: 전등이 꺼질 때, 그것은 가까워진다.",
  },
  {
    id: "note-2",
    pos: [9.8, 0.7, 2.5],
    text: "낡은 쪽지: 출구는 열쇠가 아니라 전기로 열린다.",
  },
];

const EXIT_POS: [number, number, number] = [12.9, 1.1, 8.5];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist2D(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function collidesWithWalls(x: number, z: number, radius = 0.35): boolean {
  for (const wall of WALLS) {
    const minX = wall.x - wall.w / 2 - radius;
    const maxX = wall.x + wall.w / 2 + radius;
    const minZ = wall.z - wall.d / 2 - radius;
    const maxZ = wall.z + wall.d / 2 + radius;

    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      return true;
    }
  }

  return false;
}

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };

    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}

type GameProps = {
  game: GameState;
  setGame: React.Dispatch<React.SetStateAction<GameState>>;
};

function Game({ game, setGame }: GameProps) {
  const playerRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.65, 9));
  const enemyRef = useRef<THREE.Vector3>(new THREE.Vector3(-11, 1, -10));
  const threatRef = useRef<number>(0);

  return (
    <>
      <GameStyles />
      <Canvas
        shadows
        gl={{ antialias: false }}
        dpr={[0.75, 1.25]}
        camera={{ fov: 72, position: [0, 1.65, 9] }}
      >
        <color attach="background" args={["#07080a"]} />
        <fog attach="fog" args={["#07080a", 4, 24]} />

        <SceneLighting game={game} threatRef={threatRef} />
        <Level game={game} />
        <PropsScene />
        <FuseItems game={game} setGame={setGame} playerRef={playerRef} />
        <NotesScene game={game} setGame={setGame} playerRef={playerRef} />
        <ExitDoor game={game} setGame={setGame} playerRef={playerRef} />
        <Enemy
          game={game}
          setGame={setGame}
          playerRef={playerRef}
          enemyRef={enemyRef}
          threatRef={threatRef}
        />
        <PlayerController game={game} setGame={setGame} playerRef={playerRef} />
        <Atmosphere />
      </Canvas>

      <HUD game={game} setGame={setGame} />
      <MobileControls />
    </>
  );
}

type SceneLightingProps = {
  game: GameState;
  threatRef: React.MutableRefObject<number>;
};

function SceneLighting({ game, threatRef }: SceneLightingProps) {
  const mainLight = useRef<THREE.PointLight | null>(null);
  const redLight = useRef<THREE.PointLight | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    const flicker =
      Math.sin(t * 9.1) * 0.08 +
      Math.sin(t * 21.7) * 0.06 +
      (Math.random() > 0.985 ? -0.7 : 0);

    const threat = threatRef.current;

    if (mainLight.current) {
      mainLight.current.intensity = clamp(1.05 + flicker - threat * 0.35, 0.25, 1.25);
    }

    if (redLight.current) {
      redLight.current.intensity = 0.1 + threat * 1.6;
    }
  });

  return (
    <>
      <ambientLight intensity={0.14} />

      <directionalLight
        castShadow
        position={[3, 8, 4]}
        intensity={0.15}
        shadow-mapSize={[1024, 1024]}
      />

      <pointLight
        ref={mainLight}
        position={[0, 3, 2]}
        color="#b9d5ff"
        intensity={1}
        distance={16}
      />

      <pointLight
        ref={redLight}
        position={[0, 2.5, -8]}
        color="#ff1a1a"
        intensity={0.1}
        distance={20}
      />

      {game.fusesCollected >= 3 && (
        <pointLight position={EXIT_POS} color="#77ffbb" intensity={1.7} distance={9} />
      )}
    </>
  );
}

function Level({ game }: { game: GameState }) {
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[34, 30, 1, 1]} />
        <meshStandardMaterial color="#171719" roughness={0.95} metalness={0.05} />
      </mesh>

      <mesh receiveShadow position={[0, 3.05, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[34, 30]} />
        <meshStandardMaterial color="#08090b" roughness={1} />
      </mesh>

      {WALLS.map((wall, i) => (
        <mesh key={i} castShadow receiveShadow position={[wall.x, 1.5, wall.z]}>
          <boxGeometry args={[wall.w, 3, wall.d]} />
          <meshStandardMaterial color={i < 4 ? "#202024" : "#25252a"} roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, 0.025, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.6, 2.8, 64]} />
        <meshStandardMaterial color="#2c1717" roughness={1} />
      </mesh>

      <Text
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color="#5a2a2a"
        anchorX="center"
        anchorY="middle"
      >
        DO NOT RUN
      </Text>

      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 1.1, 6]} />
        <meshStandardMaterial color="#19191d" roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.15, 0]}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial
          color={game.fusesCollected >= 3 ? "#77ffbb" : "#441717"}
          emissive={game.fusesCollected >= 3 ? "#33aa77" : "#220606"}
          emissiveIntensity={game.fusesCollected >= 3 ? 1.2 : 0.35}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

function PropsScene() {
  const debris = useMemo(() => {
    const positions: Array<[number, number]> = [
      [-9, -3],
      [-12, 0],
      [3, -8],
      [11, -4],
      [9, 7],
      [-6, 7],
      [-2, 2.5],
      [4, 3],
      [-12, -10],
      [12, 10],
    ];

    return positions.map(([x, z], i) => ({
      x,
      z,
      r: (i * 0.71) % Math.PI,
      h: 0.25 + ((i * 13) % 5) * 0.07,
    }));
  }, []);

  return (
    <group>
      {debris.map((d, i) => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[d.x, d.h / 2, d.z]}
          rotation={[0, d.r, 0]}
        >
          <boxGeometry args={[0.7, d.h, 1.1]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#2b2420" : "#1d1d20"} roughness={0.95} />
        </mesh>
      ))}

      {[
        [-12.8, 2.2, -7],
        [-7, 2.2, 8],
        [4, 2.2, -11.4],
        [12.8, 2.2, 1],
        [6, 2.2, 11.4],
      ].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.5, 0.2, 0.18]} />
            <meshStandardMaterial color="#34302b" emissive="#332211" emissiveIntensity={0.2} />
          </mesh>
          <pointLight color="#d8c28a" intensity={0.45} distance={4.2} />
        </group>
      ))}
    </group>
  );
}

type PlayerRefProps = {
  playerRef: React.MutableRefObject<THREE.Vector3>;
};

function FuseItems({ game, setGame, playerRef }: GameProps & PlayerRefProps) {
  const refs = useRef<Record<string, THREE.Mesh | null>>({});

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    FUSES.forEach((fuse) => {
      const mesh = refs.current[fuse.id];
      if (!mesh) return;

      mesh.rotation.y = t * 1.4;
      mesh.position.y = fuse.pos[1] + Math.sin(t * 2.2 + fuse.pos[0]) * 0.08;
    });
  });

  useEffect(() => {
    const tryCollect = () => {
      const player = playerRef.current;

      for (const fuse of FUSES) {
        if (game.collectedFuses.includes(fuse.id)) continue;

        const fusePosition = new THREE.Vector3(...fuse.pos);

        if (dist2D(player, fusePosition) < 1.45) {
          setGame((current) => ({
            ...current,
            collectedFuses: [...current.collectedFuses, fuse.id],
            fusesCollected: current.fusesCollected + 1,
            message:
              current.fusesCollected + 1 >= 3
                ? "전력이 돌아왔다. 출구 쪽에서 금속이 열리는 소리가 난다."
                : `${fuse.label}를 회수했다. 남은 퓨즈 ${
                    3 - (current.fusesCollected + 1)
                  }개.`,
          }));

          return;
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        tryCollect();
      }
    };

    window.addEventListener("keydown", onKey);
    window.__HORROR_INTERACT__ = tryCollect;

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [game.collectedFuses, playerRef, setGame]);

  return (
    <group>
      {FUSES.map((fuse) => {
        const collected = game.collectedFuses.includes(fuse.id);

        if (collected) return null;

        return (
          <group key={fuse.id} position={fuse.pos}>
            <mesh ref={(el) => (refs.current[fuse.id] = el)} castShadow>
              <boxGeometry args={[0.35, 0.35, 0.9]} />
              <meshStandardMaterial
                color="#8ce6ff"
                emissive="#1c8faa"
                emissiveIntensity={1.5}
                roughness={0.35}
              />
            </mesh>

            <pointLight color="#8ce6ff" intensity={0.8} distance={3.5} />

            <Html distanceFactor={9} position={[0, 0.8, 0]} center>
              <div className="world-label">E: 퓨즈 회수</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function NotesScene({ setGame, playerRef }: GameProps & PlayerRefProps) {
  useEffect(() => {
    const tryRead = () => {
      const player = playerRef.current;

      for (const note of NOTES) {
        const notePosition = new THREE.Vector3(...note.pos);

        if (dist2D(player, notePosition) < 1.3) {
          setGame((current) => ({
            ...current,
            message: note.text,
          }));

          return true;
        }
      }

      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        tryRead();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [playerRef, setGame]);

  return (
    <group>
      {NOTES.map((note) => (
        <group key={note.id} position={note.pos}>
          <mesh castShadow rotation={[0.1, 0.4, 0]}>
            <boxGeometry args={[0.65, 0.42, 0.04]} />
            <meshStandardMaterial color="#b7a88e" roughness={0.8} />
          </mesh>

          <Html distanceFactor={9} position={[0, 0.55, 0]} center>
            <div className="world-label">E: 읽기</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function ExitDoor({ game, setGame, playerRef }: GameProps & PlayerRefProps) {
  useEffect(() => {
    const tryExit = () => {
      const player = playerRef.current;
      const exit = new THREE.Vector3(...EXIT_POS);

      if (dist2D(player, exit) < 1.8) {
        if (game.fusesCollected >= 3) {
          setGame((current) => ({
            ...current,
            won: true,
            message: "문이 열렸다. 하지만 바깥 공기가 더 차갑다.",
          }));
        } else {
          setGame((current) => ({
            ...current,
            message: `전력이 부족하다. 퓨즈 ${3 - current.fusesCollected}개가 더 필요하다.`,
          }));
        }

        return true;
      }

      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        tryExit();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [game.fusesCollected, playerRef, setGame]);

  const opened = game.fusesCollected >= 3;

  return (
    <group position={EXIT_POS}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.35, 2.2, 2.2]} />
        <meshStandardMaterial
          color={opened ? "#10351f" : "#231919"}
          emissive={opened ? "#0b6a38" : "#170404"}
          emissiveIntensity={opened ? 1.3 : 0.25}
          roughness={0.8}
        />
      </mesh>

      <Text
        position={[-0.25, 1.65, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.22}
        color={opened ? "#99ffcc" : "#ff8080"}
        anchorX="center"
      >
        {opened ? "EXIT OPEN" : "NO POWER"}
      </Text>

      <Html distanceFactor={9} position={[-0.5, 1.4, 0]} center>
        <div className="world-label">E: 출구 확인</div>
      </Html>
    </group>
  );
}

type EnemyProps = GameProps &
  PlayerRefProps & {
    enemyRef: React.MutableRefObject<THREE.Vector3>;
    threatRef: React.MutableRefObject<number>;
  };

function Enemy({ game, setGame, playerRef, enemyRef, threatRef }: EnemyProps) {
  const group = useRef<THREE.Group | null>(null);
  const hurtCooldown = useRef<number>(0);

  useFrame((state, delta) => {
    if (game.won || game.dead || !game.started) return;

    const player = playerRef.current;
    const enemy = enemyRef.current;
    const distance = dist2D(player, enemy);
    const awake = game.fusesCollected > 0 || distance < 9;

    let speed = 0.45 + game.fusesCollected * 0.18;

    if (distance < 5.5) {
      speed += 0.55;
    }

    if (awake) {
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;

      const nextX = enemy.x + (dx / len) * speed * delta;
      const nextZ = enemy.z + (dz / len) * speed * delta;

      if (!collidesWithWalls(nextX, enemy.z, 0.45)) {
        enemy.x = nextX;
      }

      if (!collidesWithWalls(enemy.x, nextZ, 0.45)) {
        enemy.z = nextZ;
      }
    } else {
      enemy.x += Math.sin(state.clock.elapsedTime * 0.6) * delta * 0.2;
      enemy.z += Math.cos(state.clock.elapsedTime * 0.4) * delta * 0.2;
    }

    if (group.current) {
      group.current.position.set(enemy.x, enemy.y, enemy.z);
      group.current.lookAt(player.x, 1, player.z);
    }

    const threat = clamp(1 - distance / 8, 0, 1);
    threatRef.current = threat;

    hurtCooldown.current -= delta;

    if (distance < 1.05 && hurtCooldown.current <= 0) {
      hurtCooldown.current = 0.8;

      setGame((current) => {
        const nextNerve = Math.max(0, current.nerve - 18);

        return {
          ...current,
          nerve: nextNerve,
          dead: nextNerve <= 0,
          message:
            nextNerve <= 0
              ? "너무 가까이 왔다."
              : "무언가 바로 뒤에서 숨을 쉰다.",
        };
      });
    }
  });

  return (
    <group ref={group} position={enemyRef.current.toArray()}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.28, 1.15, 5, 8]} />
        <meshStandardMaterial color="#080808" roughness={1} />
      </mesh>

      <mesh position={[0, 1.9, 0.05]}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#050505" roughness={1} />
      </mesh>

      <mesh position={[-0.12, 1.95, 0.31]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff0000" emissiveIntensity={3} />
      </mesh>

      <mesh position={[0.12, 1.95, 0.31]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff0000" emissiveIntensity={3} />
      </mesh>

      <pointLight color="#ff0000" intensity={0.55} distance={2.8} />
    </group>
  );
}

function PlayerController({ game, setGame, playerRef }: GameProps & PlayerRefProps) {
  const { camera, gl } = useThree();
  const keys = useKeyboard();

  const yaw = useRef<number>(0);
  const pitch = useRef<number>(0);
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3());
  const lookTouchId = useRef<number | null>(null);
  const lastLook = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    camera.position.copy(playerRef.current);
  }, [camera, playerRef]);

  useEffect(() => {
    const element = gl.domElement;

    const click = () => {
      if (document.pointerLockElement !== element) {
        element.requestPointerLock?.();
      }
    };

    const mouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== element) return;

      yaw.current -= e.movementX * 0.0024;
      pitch.current -= e.movementY * 0.002;
      pitch.current = clamp(pitch.current, -1.1, 1.1);
    };

    element.addEventListener("click", click);
    window.addEventListener("mousemove", mouseMove);

    return () => {
      element.removeEventListener("click", click);
      window.removeEventListener("mousemove", mouseMove);
    };
  }, [gl]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.clientX > window.innerWidth * 0.45 && lookTouchId.current === null) {
          lookTouchId.current = touch.identifier;
          lastLook.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === lookTouchId.current && lastLook.current) {
          const dx = touch.clientX - lastLook.current.x;
          const dy = touch.clientY - lastLook.current.y;

          yaw.current -= dx * 0.004;
          pitch.current -= dy * 0.0035;
          pitch.current = clamp(pitch.current, -1.1, 1.1);

          lastLook.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === lookTouchId.current) {
          lookTouchId.current = null;
          lastLook.current = null;
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useFrame((state, delta) => {
    if (game.won || game.dead || !game.started) return;

    const mobile = window.__HORROR_TOUCH_MOVE__ ?? { x: 0, y: 0 };

    const forwardPressed = keys.current.KeyW || keys.current.ArrowUp || mobile.y < -0.12;
    const backPressed = keys.current.KeyS || keys.current.ArrowDown || mobile.y > 0.12;
    const leftPressed = keys.current.KeyA || keys.current.ArrowLeft || mobile.x < -0.12;
    const rightPressed = keys.current.KeyD || keys.current.ArrowRight || mobile.x > 0.12;
    const sprint = keys.current.ShiftLeft || keys.current.ShiftRight;

    const speed = sprint ? 4.5 : 3.0;
    const input = new THREE.Vector3();

    if (forwardPressed) input.z -= 1;
    if (backPressed) input.z += 1;
    if (leftPressed) input.x -= 1;
    if (rightPressed) input.x += 1;

    if (input.lengthSq() > 0) {
      input.normalize();
    }

    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    velocity.current.set(0, 0, 0);
    velocity.current.addScaledVector(forward, -input.z * speed);
    velocity.current.addScaledVector(right, input.x * speed);

    const player = playerRef.current;
    const nextX = player.x + velocity.current.x * delta;
    const nextZ = player.z + velocity.current.z * delta;

    if (!collidesWithWalls(nextX, player.z)) {
      player.x = nextX;
    }

    if (!collidesWithWalls(player.x, nextZ)) {
      player.z = nextZ;
    }

    player.x = clamp(player.x, -13.2, 13.2);
    player.z = clamp(player.z, -11.2, 11.2);

    const bob = input.lengthSq() > 0 ? Math.sin(state.clock.elapsedTime * 9) * 0.045 : 0;

    camera.position.set(player.x, 1.65 + bob, player.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    const playerPos = playerRef.current;
    const nearFuse = FUSES.find((fuse) => {
      if (game.collectedFuses.includes(fuse.id)) return false;
      return dist2D(playerPos, new THREE.Vector3(...fuse.pos)) < 1.4;
    });

    const nearExit = dist2D(playerPos, new THREE.Vector3(...EXIT_POS)) < 1.8;
    const nearNote = NOTES.find((note) => {
      return dist2D(playerPos, new THREE.Vector3(...note.pos)) < 1.3;
    });

    let nextPrompt = "";

    if (nearFuse) {
      nextPrompt = "E / 버튼: 퓨즈 회수";
    } else if (nearExit) {
      nextPrompt = "E / 버튼: 출구 확인";
    } else if (nearNote) {
      nextPrompt = "E / 버튼: 쪽지 읽기";
    }

    if (game.prompt !== nextPrompt) {
      setGame((current) => ({
        ...current,
        prompt: nextPrompt,
      }));
    }
  });

  return null;
}

function Atmosphere() {
  const particles = useMemo(() => {
    return Array.from({ length: 90 }, () => ({
      x: -13 + Math.random() * 26,
      y: 0.4 + Math.random() * 2.4,
      z: -11 + Math.random() * 22,
      s: 0.015 + Math.random() * 0.025,
    }));
  }, []);

  return (
    <group>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.s, 5, 5]} />
          <meshBasicMaterial color="#6f7782" transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}

function HUD({ game, setGame }: GameProps) {
  const danger = Math.max(0, 100 - game.nerve);

  return (
    <div className="hud">
      <div className="top">
        <div className="title">LOW SIGNAL</div>
        <div className="objective">
          목표: 퓨즈 {game.fusesCollected}/3 회수 후 출구로 이동
        </div>
      </div>

      <div className="bars">
        <div className="bar">
          <span>정신력</span>
          <div className="barTrack">
            <div className="barFill" style={{ width: `${game.nerve}%` }} />
          </div>
        </div>

        <div className="bar">
          <span>위험</span>
          <div className="barTrack">
            <div className="dangerFill" style={{ width: `${danger}%` }} />
          </div>
        </div>
      </div>

      <div className="centerPrompt">{game.prompt}</div>

      {game.message && <div className="message">{game.message}</div>}

      {!game.started && (
        <div className="modal">
          <div className="modalBox">
            <h1>LOW SIGNAL</h1>
            <p>
              버려진 시설 안에서 퓨즈 3개를 회수하고 출구 전력을 복구해야 한다.
              전등이 흔들릴수록, 무언가가 가까워진다.
            </p>
            <button
              onClick={() =>
                setGame((current) => ({
                  ...current,
                  started: true,
                  message: "WASD 이동 / 마우스 시점 / E 상호작용",
                }))
              }
            >
              시작
            </button>
          </div>
        </div>
      )}

      {game.dead && (
        <div className="modal dead">
          <div className="modalBox">
            <h1>NO SIGNAL</h1>
            <p>그것이 너무 가까이 왔다.</p>
            <button onClick={() => window.location.reload()}>다시 시작</button>
          </div>
        </div>
      )}

      {game.won && (
        <div className="modal win">
          <div className="modalBox">
            <h1>EXIT OPENED</h1>
            <p>출구는 열렸다. 하지만 이 건물이 끝난 것은 아니다.</p>
            <button onClick={() => window.location.reload()}>다시 플레이</button>
          </div>
        </div>
      )}

      <div
        className="damageOverlay"
        style={{
          opacity: game.dead ? 0.7 : Math.max(0, (100 - game.nerve) / 130),
        }}
      />

      <div className="vignette" />
      <div className="scanline" />
    </div>
  );
}

function MobileControls() {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const active = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    window.__HORROR_TOUCH_MOVE__ = { x: 0, y: 0 };

    const onStart = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.clientX < window.innerWidth * 0.45 && active.current === null) {
          active.current = touch.identifier;
          origin.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === active.current) {
          const dx = clamp((touch.clientX - origin.current.x) / 55, -1, 1);
          const dy = clamp((touch.clientY - origin.current.y) / 55, -1, 1);

          window.__HORROR_TOUCH_MOVE__ = { x: dx, y: dy };

          if (knobRef.current) {
            knobRef.current.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
          }
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === active.current) {
          active.current = null;
          window.__HORROR_TOUCH_MOVE__ = { x: 0, y: 0 };

          if (knobRef.current) {
            knobRef.current.style.transform = "translate(0px, 0px)";
          }
        }
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  return (
    <>
      <div className="joystick">
        <div className="knob" ref={knobRef} />
      </div>

      <button
        className="interactButton"
        onClick={() => {
          window.__HORROR_INTERACT__?.();
          window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
        }}
      >
        조사
      </button>

      <div className="mobileHint">왼쪽 이동 / 오른쪽 화면 드래그</div>
    </>
  );
}

function GameStyles() {
  return (
    <style>{`
      html, body, #root {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #050507;
        touch-action: none;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      canvas {
        width: 100vw !important;
        height: 100vh !important;
        image-rendering: pixelated;
      }

      .hud {
        position: fixed;
        inset: 0;
        color: #d8e6ef;
        pointer-events: none;
        user-select: none;
      }

      .top {
        position: absolute;
        left: 18px;
        top: 16px;
        text-shadow: 0 0 10px rgba(140, 230, 255, 0.35);
      }

      .title {
        font-size: 17px;
        letter-spacing: 0.18em;
        color: #b9e8ff;
      }

      .objective {
        margin-top: 6px;
        font-size: 12px;
        color: rgba(220, 235, 240, 0.82);
      }

      .bars {
        position: absolute;
        left: 18px;
        bottom: 22px;
        width: 230px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .bar {
        display: grid;
        grid-template-columns: 52px 1fr;
        gap: 8px;
        align-items: center;
        font-size: 11px;
        color: rgba(230, 240, 244, 0.78);
      }

      .barTrack {
        height: 7px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
      }

      .barFill {
        height: 100%;
        background: rgba(140, 230, 255, 0.75);
        box-shadow: 0 0 10px rgba(140, 230, 255, 0.25);
      }

      .dangerFill {
        height: 100%;
        background: rgba(255, 45, 45, 0.72);
        box-shadow: 0 0 10px rgba(255, 45, 45, 0.25);
      }

      .centerPrompt {
        position: absolute;
        left: 50%;
        top: 57%;
        transform: translate(-50%, -50%);
        font-size: 13px;
        color: rgba(230, 245, 255, 0.9);
        text-shadow: 0 0 12px rgba(120, 200, 255, 0.7);
      }

      .message {
        position: absolute;
        left: 50%;
        bottom: 80px;
        transform: translateX(-50%);
        max-width: min(560px, calc(100vw - 36px));
        padding: 12px 14px;
        background: rgba(5, 8, 12, 0.72);
        border: 1px solid rgba(180, 220, 255, 0.16);
        color: rgba(235, 245, 250, 0.88);
        font-size: 13px;
        line-height: 1.55;
        text-align: center;
        backdrop-filter: blur(8px);
      }

      .world-label {
        white-space: nowrap;
        padding: 4px 7px;
        background: rgba(0, 0, 0, 0.58);
        border: 1px solid rgba(180, 220, 255, 0.22);
        color: rgba(230, 245, 255, 0.9);
        font-size: 10px;
        border-radius: 3px;
      }

      .modal {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(0,0,0,0.54);
        pointer-events: auto;
      }

      .modalBox {
        width: min(460px, calc(100vw - 36px));
        padding: 24px;
        background: rgba(8, 10, 14, 0.88);
        border: 1px solid rgba(200, 230, 255, 0.18);
        box-shadow: 0 20px 80px rgba(0,0,0,0.55);
        backdrop-filter: blur(10px);
      }

      .modalBox h1 {
        margin: 0 0 12px;
        font-size: 25px;
        letter-spacing: 0.16em;
        color: #d9f3ff;
      }

      .modalBox p {
        margin: 0 0 18px;
        color: rgba(230,240,244,0.78);
        line-height: 1.6;
        font-size: 14px;
      }

      .modalBox button {
        pointer-events: auto;
        border: 1px solid rgba(180, 230, 255, 0.25);
        background: rgba(120, 210, 255, 0.12);
        color: #e6f7ff;
        padding: 11px 15px;
        font-family: inherit;
        cursor: pointer;
      }

      .dead .modalBox {
        border-color: rgba(255, 60, 60, 0.28);
      }

      .win .modalBox {
        border-color: rgba(100, 255, 180, 0.28);
      }

      .damageOverlay {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle, rgba(255,0,0,0) 42%, rgba(120,0,0,0.5) 100%),
          rgba(255,0,0,0.08);
        pointer-events: none;
        mix-blend-mode: screen;
      }

      .vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle, rgba(0,0,0,0) 36%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.88) 100%);
      }

      .scanline {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0.12;
        background: repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,0.06) 0px,
          rgba(255,255,255,0.06) 1px,
          rgba(0,0,0,0) 2px,
          rgba(0,0,0,0) 4px
        );
      }

      .joystick {
        position: fixed;
        left: 24px;
        bottom: 82px;
        width: 96px;
        height: 96px;
        border-radius: 50%;
        border: 1px solid rgba(220,240,255,0.2);
        background: rgba(10, 14, 20, 0.32);
        pointer-events: none;
        display: none;
        place-items: center;
      }

      .knob {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(220, 240, 255, 0.34);
        border: 1px solid rgba(220,240,255,0.25);
      }

      .interactButton {
        position: fixed;
        right: 26px;
        bottom: 86px;
        width: 76px;
        height: 76px;
        border-radius: 50%;
        border: 1px solid rgba(220,240,255,0.28);
        background: rgba(10, 14, 20, 0.46);
        color: rgba(235, 245, 255, 0.9);
        font-family: inherit;
        pointer-events: auto;
        display: none;
      }

      .mobileHint {
        position: fixed;
        right: 20px;
        bottom: 28px;
        color: rgba(235,245,255,0.45);
        font-size: 11px;
        display: none;
      }

      @media (pointer: coarse) {
        .joystick,
        .interactButton,
        .mobileHint {
          display: grid;
        }

        .bars {
          bottom: 18px;
          left: 16px;
          width: 190px;
        }

        .message {
          bottom: 176px;
          font-size: 12px;
        }

        .top {
          left: 14px;
          top: 12px;
        }
      }
    `}</style>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>({
    started: false,
    won: false,
    dead: false,
    nerve: 100,
    fusesCollected: 0,
    collectedFuses: [],
    prompt: "",
    message: "",
  });

  return <Game game={game} setGame={setGame} />;
}