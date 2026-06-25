import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";

import type { EngineState, Entity, GameDefinition } from "./types";
import {
  createEngine,
  keyState,
  mobileState,
  pointerState,
} from "./createEngine";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function CameraController({ engine }: { engine: EngineState }) {
  const { camera } = useThree();

  useFrame((_, dt) => {
    engine.update(Math.min(dt, 0.05));

    const { player } = engine;

    camera.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );

    const lookDirection = new THREE.Vector3(
      Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      Math.cos(player.yaw) * Math.cos(player.pitch)
    );

    camera.lookAt(player.position.clone().add(lookDirection));
  });

  return null;
}

function EntityMesh({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        entity.position[0],
        entity.position[1],
        entity.position[2]
      );
      groupRef.current.visible = entity.visible !== false;
    }

    if (meshRef.current) {
      meshRef.current.position.set(
        entity.position[0],
        entity.position[1],
        entity.position[2]
      );

      const rotation = entity.rotation ?? [0, 0, 0];
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      meshRef.current.visible = entity.visible !== false;
    }

    if (lightRef.current) {
      lightRef.current.intensity = entity.intensity ?? 1.5;
      lightRef.current.color.set(entity.color ?? "#ffe6b0");
      lightRef.current.visible = entity.visible !== false;
    }
  });

  if (entity.kind === "trigger") {
    return null;
  }

  const position = entity.position;
  const rotation = entity.rotation ?? [0, 0, 0];

  if (entity.kind === "light") {
    return (
      <group ref={groupRef} position={position}>
        <pointLight
          ref={lightRef}
          color={entity.color ?? "#ffe6b0"}
          intensity={entity.intensity ?? 1.5}
          distance={9}
          decay={1.6}
        />

        <mesh>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial
            color={entity.color ?? "#ffe6b0"}
            emissive={entity.emissive ?? entity.color ?? "#ffe6b0"}
            emissiveIntensity={1.8}
          />
        </mesh>
      </group>
    );
  }

  if (entity.visible === false) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      receiveShadow
      castShadow
    >
      <boxGeometry args={entity.size} />
      <meshStandardMaterial
        color={entity.color ?? "#555"}
        roughness={0.95}
        metalness={0.02}
      />

      {entity.label && entity.kind !== "floor" && (
        <Text
          position={[0, entity.size[1] / 2 + 0.18, 0]}
          fontSize={0.18}
          color="#d8d8d8"
          anchorX="center"
          anchorY="middle"
        >
          {entity.label}
        </Text>
      )}
    </mesh>
  );
}

function WorldRenderer({ engine }: { engine: EngineState }) {
  return (
    <>
      {engine.world.entities.map((entity) => (
        <EntityMesh key={entity.id} entity={entity} />
      ))}
    </>
  );
}

function InputBindings({ engine }: { engine: EngineState }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyW" || e.code === "ArrowUp") keyState.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") keyState.back = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keyState.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") keyState.right = true;

      if (e.code === "KeyE" || e.code === "Space") {
        engine.interact();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "KeyW" || e.code === "ArrowUp") keyState.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") keyState.back = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keyState.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") keyState.right = false;
    }

    function onMouseDown(e: MouseEvent) {
      pointerState.dragging = true;
      pointerState.lastX = e.clientX;
      pointerState.lastY = e.clientY;
    }

    function onMouseMove(e: MouseEvent) {
      if (!pointerState.dragging) return;

      const dx = e.clientX - pointerState.lastX;
      const dy = e.clientY - pointerState.lastY;

      engine.player.yaw -= dx * 0.003;
      engine.player.pitch -= dy * 0.002;
      engine.player.pitch = clamp(engine.player.pitch, -0.9, 0.9);

      pointerState.lastX = e.clientX;
      pointerState.lastY = e.clientY;
    }

    function onMouseUp() {
      pointerState.dragging = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [engine]);

  return null;
}

function HUD({ engine }: { engine: EngineState }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((v) => v + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  const nearby = engine.getNearbyInteraction();

  return (
    <div className="hud">
      <div className="topPanel">
        <div className="gameTitle">{engine.game.title}</div>
        {engine.objective && <div className="objective">{engine.objective}</div>}
      </div>

      <div className="crosshair" />

      {nearby && (
        <button className="interactPrompt" onClick={() => engine.interact()}>
          E / Tap · {nearby.label}
        </button>
      )}

      {engine.message && <div className="messageBox">{engine.message}</div>}

      <MobileControls />

      {engine.ended && (
        <div className="ending">
          <div className="endingCard">
            <h1>{engine.endTitle}</h1>
            {engine.endSubtitle && <p>{engine.endSubtitle}</p>}
            <button onClick={() => engine.scene.restart()}>다시 시작</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileControls() {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  function resetStick() {
    mobileState.moveX = 0;
    mobileState.moveY = 0;

    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
  }

  function updateStick(clientX: number, clientY: number) {
    const stick = stickRef.current;
    if (!stick) return;

    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const max = 42;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const scale = Math.min(1, max / len);

    const x = dx * scale;
    const y = dy * scale;

    mobileState.moveX = clamp(x / max, -1, 1);
    mobileState.moveY = clamp(-y / max, -1, 1);

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  return (
    <>
      <div
        ref={stickRef}
        className="mobileStick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons) updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
      >
        <div ref={knobRef} className="mobileKnob" />
      </div>

      <div
        className="lookArea"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointerState.dragging = true;
          pointerState.lastX = e.clientX;
          pointerState.lastY = e.clientY;
        }}
        onPointerMove={(e) => {
          if (!pointerState.dragging) return;

          const dx = e.clientX - pointerState.lastX;
          const dy = e.clientY - pointerState.lastY;

          mobileState.lookX += dx;
          mobileState.lookY += dy;

          pointerState.lastX = e.clientX;
          pointerState.lastY = e.clientY;
        }}
        onPointerUp={() => {
          pointerState.dragging = false;
        }}
        onPointerCancel={() => {
          pointerState.dragging = false;
        }}
      />
    </>
  );
}

export function LoFiEngine({ game }: { game: GameDefinition }) {
  const [, forceRender] = useState(0);

  const engine = useMemo(() => {
    return createEngine(game, () => forceRender((v) => v + 1));
  }, [game]);

  return (
    <div className="gameRoot">
      <InputBindings engine={engine} />

      <Canvas
        shadows
        camera={{
          fov: 72,
          near: 0.05,
          far: 80,
          position: [0, 1.6, 6],
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#07080a"]} />
        <fog attach="fog" args={["#08090c", 4, 30]} />

        <ambientLight intensity={0.22} />
        <directionalLight
          position={[4, 8, 4]}
          intensity={0.45}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <CameraController engine={engine} />
        <WorldRenderer engine={engine} />

        <Html fullscreen>
          <HUD engine={engine} />
        </Html>
      </Canvas>
    </div>
  );
}