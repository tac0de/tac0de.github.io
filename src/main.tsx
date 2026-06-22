import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import "./styles.css";

type HotspotId = "phone" | "breaker" | "tape" | "door";

function setMeshGlow(mesh: THREE.Mesh, intensity: number) {
  const material = mesh.material as THREE.MeshBasicMaterial;
  material.opacity = Math.max(0, Math.min(1, intensity));
  material.needsUpdate = true;
}

function GameScene({
  entered,
  onEnter,
  onFocus,
  onBlackout,
}: {
  entered: boolean;
  onEnter: () => void;
  onFocus: (focused: boolean) => void;
  onBlackout: (active: boolean) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const enteredRef = useRef(entered);

  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020303);
    scene.fog = new THREE.Fog(0x020303, 5.6, 17.5);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 45);
    camera.position.set(0.7, 1.52, 5.05);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1) * 0.62);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.className = "game-canvas";
    mount.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(0, 0);
    const interactables: THREE.Object3D[] = [];
    const velocity = new THREE.Vector3();
    const keys = new Set<string>();
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let frameId = 0;
    let yaw = 0;
    let pitch = 0;
    let phase = 0;
    let phaseStarted = 0;
    let scarePulse = 0;
    let lastFocused = false;
    let touchLooking = false;
    let touchMoving = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let finalTriggered = false;

    const mats = {
      wall: new THREE.MeshStandardMaterial({ color: 0x101514, roughness: 0.98, metalness: 0.02 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x171312, roughness: 1, metalness: 0.02 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: 0x060807, roughness: 0.8, metalness: 0.42 }),
      redBody: new THREE.MeshStandardMaterial({ color: 0x421119, roughness: 0.72, metalness: 0.12 }),
      bone: new THREE.MeshStandardMaterial({ color: 0xbeb6a4, roughness: 0.82, metalness: 0.03 }),
      glass: new THREE.MeshBasicMaterial({ color: 0x233f3a, transparent: true, opacity: 0.62 }),
      cyan: new THREE.MeshBasicMaterial({ color: 0x8affdf, transparent: true, opacity: 0.78 }),
      red: new THREE.MeshBasicMaterial({ color: 0xff3651, transparent: true, opacity: 0.0 }),
      amber: new THREE.MeshBasicMaterial({ color: 0xffc268, transparent: true, opacity: 0.0 }),
      blackGhost: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 }),
    };

    const addBox = (
      name: string,
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material,
      rotationY = 0,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.name = name;
      mesh.position.set(...position);
      mesh.rotation.y = rotationY;
      scene.add(mesh);
      return mesh;
    };

    const addGlowPlane = (
      name: string,
      size: [number, number],
      position: [number, number, number],
      material: THREE.MeshBasicMaterial,
      rotation: [number, number, number] = [0, 0, 0],
    ) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
      mesh.name = name;
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      scene.add(mesh);
      return mesh;
    };

    addBox("floor", [10.6, 0.18, 12.6], [0, -0.1, 0], mats.floor);
    addBox("ceiling", [10.6, 0.16, 12.6], [0, 3.05, 0], mats.wall);
    addBox("monitor-wall", [10.6, 3.3, 0.18], [0, 1.52, -6.25], mats.wall);
    addBox("door-wall-left", [3.15, 3.3, 0.18], [-3.75, 1.52, 6.25], mats.wall);
    addBox("door-wall-right", [3.15, 3.3, 0.18], [3.75, 1.52, 6.25], mats.wall);
    addBox("left-wall", [0.18, 3.3, 12.6], [-5.25, 1.52, 0], mats.wall);
    addBox("right-wall", [0.18, 3.3, 12.6], [5.25, 1.52, 0], mats.wall);

    for (let i = 0; i < 8; i += 1) {
      addBox(`floor-stripe-${i}`, [0.028, 0.015, 12.0], [-4.2 + i * 1.2, 0.02, 0], mats.darkMetal);
    }
    for (let i = 0; i < 5; i += 1) {
      addBox(`ceiling-rib-${i}`, [10.2, 0.06, 0.08], [0, 2.91, -4.8 + i * 2.2], mats.darkMetal);
    }

    addBox("desk-top", [3.3, 0.22, 1.12], [-2.55, 0.82, -3.72], mats.darkMetal, 0.08);
    addBox("desk-leg-a", [0.16, 0.82, 0.16], [-3.86, 0.34, -3.25], mats.darkMetal);
    addBox("desk-leg-b", [0.16, 0.82, 0.16], [-1.28, 0.34, -4.1], mats.darkMetal);
    addBox("cable-a", [0.07, 0.035, 5.3], [-3.08, 0.03, -1.2], mats.darkMetal, -0.18);
    addBox("cable-b", [0.055, 0.035, 4.2], [-0.8, 0.032, 1.85], mats.darkMetal, 0.34);

    const monitorBody = addBox("monitor-body", [1.06, 0.66, 0.26], [-2.62, 1.26, -4.2], mats.darkMetal, 0.08);
    const monitorScreen = addBox("monitor-screen", [0.78, 0.44, 0.045], [-2.62, 1.28, -4.35], mats.cyan, 0.08);
    addBox("monitor-neck", [0.16, 0.26, 0.18], [-2.62, 0.94, -4.03], mats.darkMetal, 0.08);
    addBox("monitor-base", [0.72, 0.08, 0.42], [-2.62, 0.83, -3.95], mats.darkMetal, 0.08);

    const futurePhone = addGlowPlane("future-phone", [0.14, 0.27], [-2.42, 1.28, -4.38], mats.red, [0, 0.08, 0]);
    const futureDoor = addGlowPlane("future-door", [0.26, 0.34], [-2.68, 1.28, -4.38], mats.red, [0, 0.08, 0]);
    const futureBreaker = addGlowPlane("future-breaker", [0.2, 0.24], [-2.82, 1.28, -4.38], mats.amber, [0, 0.08, 0]);
    const futureBehind = addGlowPlane("future-behind", [0.34, 0.44], [-2.62, 1.29, -4.39], mats.blackGhost, [0, 0.08, 0]);

    const tape = addBox("tape", [0.58, 0.11, 0.34], [-1.48, 0.98, -3.56], mats.bone, -0.2);
    tape.userData.hotspot = "tape" satisfies HotspotId;
    interactables.push(tape);

    const breaker = addBox("breaker", [0.86, 1.18, 0.13], [-5.14, 1.55, -2.05], mats.darkMetal, Math.PI / 2);
    breaker.userData.hotspot = "breaker" satisfies HotspotId;
    interactables.push(breaker);
    const breakerGlow = addGlowPlane("breaker-glow", [0.68, 0.9], [-5.04, 1.55, -2.05], mats.amber, [0, Math.PI / 2, 0]);

    const phone = addBox("phone", [0.58, 0.78, 0.13], [3.12, 1.42, -6.13], mats.redBody);
    phone.userData.hotspot = "phone" satisfies HotspotId;
    interactables.push(phone);
    addBox("phone-cord", [0.04, 0.78, 0.04], [3.12, 0.88, -6.04], mats.darkMetal);
    const phoneGlow = addGlowPlane("phone-glow", [0.74, 0.95], [3.12, 1.42, -6.04], mats.red, [0, 0, 0]);

    const door = addBox("door", [1.46, 2.22, 0.14], [0, 1.06, 6.16], mats.darkMetal);
    door.userData.hotspot = "door" satisfies HotspotId;
    interactables.push(door);
    const doorGap = addGlowPlane("door-gap", [1.5, 0.12], [0, 0.12, 6.06], mats.red, [-Math.PI / 2, 0, 0]);
    const doorEye = addGlowPlane("door-eye", [0.18, 0.18], [0.28, 1.48, 6.06], mats.red);

    addBox("mirror-frame", [1.34, 1.84, 0.12], [5.14, 1.62, 0.96], mats.darkMetal, Math.PI / 2);
    addGlowPlane("mirror-glass", [1.05, 1.5], [5.05, 1.62, 0.96], mats.glass, [0, -Math.PI / 2, 0]);
    const mirrorShape = addGlowPlane("mirror-shape", [0.58, 1.16], [5.045, 1.44, 0.96], mats.blackGhost, [0, -Math.PI / 2, 0]);

    const behindShape = addGlowPlane("behind-shape", [0.68, 1.65], [0.7, 1.28, 5.08], mats.blackGhost);
    const ceilingFlash = new THREE.PointLight(0xff3556, 0, 7);
    ceilingFlash.position.set(0, 2.6, 4.8);
    scene.add(ceilingFlash);

    const ambient = new THREE.AmbientLight(0x192b26, 0.62);
    const monitorLight = new THREE.PointLight(0x82ffe2, 24, 8.5);
    monitorLight.position.copy(monitorBody.position).add(new THREE.Vector3(0, 0.15, 0.5));
    const doorLight = new THREE.PointLight(0xff344f, 0, 5.2);
    doorLight.position.set(0, 0.6, 5.55);
    const phoneLight = new THREE.PointLight(0xff3552, 0, 4.3);
    phoneLight.position.set(3.05, 1.55, -5.7);
    const sweepLight = new THREE.SpotLight(0xcffff3, 12, 13, Math.PI / 7, 0.7, 1.2);
    sweepLight.position.set(2.3, 2.9, 2.4);
    sweepLight.target.position.set(-1.2, 0.8, -3.2);
    scene.add(ambient, monitorLight, doorLight, phoneLight, sweepLight, sweepLight.target);

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    const begin = () => {
      enteredRef.current = true;
      onEnter();
      window.history.replaceState(null, "", "#play");
      renderer.domElement.requestPointerLock?.();
    };

    const look = (movementX: number, movementY: number, scale = 0.002) => {
      yaw -= movementX * scale;
      pitch -= movementY * scale;
      pitch = Math.max(-1.05, Math.min(0.92, pitch));
    };

    const centerHit = () => {
      pointer.set(0, 0);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactables, false)[0];
      if (hit?.object.userData.hotspot && hit.distance < 3.05) return hit.object.userData.hotspot as HotspotId;
      return null;
    };

    const screenHit = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactables, false)[0];
      if (hit?.object.userData.hotspot && hit.distance < 3.05) return hit.object.userData.hotspot as HotspotId;
      return null;
    };

    const advance = (hotspot: HotspotId | null) => {
      if (!hotspot) {
        scarePulse = Math.max(scarePulse, 0.14);
        return;
      }
      const elapsed = (performance.now() - startedAt) / 1000;
      const phaseAge = elapsed - phaseStarted;
      const expected: HotspotId[] = ["phone", "breaker", "tape", "door"];
      if (expected[phase] === hotspot && phaseAge > 2.35) {
        phase += 1;
        phaseStarted = elapsed;
        scarePulse = 1.05;
      } else {
        scarePulse = Math.max(scarePulse, 0.34);
      }
    };

    const click = (event: MouseEvent) => {
      if (!enteredRef.current) {
        begin();
        return;
      }
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        advance(screenHit(event.clientX, event.clientY));
        return;
      }
      advance(centerHit());
    };

    const mouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) look(event.movementX, event.movementY);
    };

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keys.add(key);
      if ((key === "e" || key === " ") && enteredRef.current) advance(centerHit());
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());

    const touchStart = (event: TouchEvent) => {
      if (!enteredRef.current) begin();
      const touch = event.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      touchLooking = true;
      touchMoving = touch.clientY > window.innerHeight * 0.58;
      if (!touchMoving) advance(screenHit(touch.clientX, touch.clientY));
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const dx = touch.clientX - lastTouchX;
      const dy = touch.clientY - lastTouchY;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      if (touchLooking) look(dx, dy, 0.0046);
    };
    const touchEnd = () => {
      touchLooking = false;
      touchMoving = false;
    };

    renderer.domElement.addEventListener("click", click);
    renderer.domElement.addEventListener("touchstart", touchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", touchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", touchEnd);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("resize", resize);

    const animate = () => {
      const now = performance.now();
      const delta = Math.min((now - lastFrameAt) / 1000, 0.045);
      const elapsed = (now - startedAt) / 1000;
      const phaseAge = elapsed - phaseStarted;
      lastFrameAt = now;

      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      velocity.set(0, 0, 0);
      if (enteredRef.current) {
        if (keys.has("w") || keys.has("arrowup") || touchMoving) velocity.add(forward);
        if (keys.has("s") || keys.has("arrowdown")) velocity.sub(forward);
        if (keys.has("a") || keys.has("arrowleft")) velocity.sub(right);
        if (keys.has("d") || keys.has("arrowright")) velocity.add(right);
      }
      const moving = velocity.lengthSq() > 0;
      if (moving) {
        velocity.normalize().multiplyScalar(delta * 2.15);
        camera.position.add(velocity);
      }
      camera.position.x = Math.max(-4.7, Math.min(4.7, camera.position.x));
      camera.position.z = Math.max(-5.55, Math.min(5.5, camera.position.z));
      camera.position.y = 1.52 + Math.sin(elapsed * 8.8) * (moving ? 0.02 : 0.006);

      const focused = Boolean(centerHit());
      if (focused !== lastFocused) {
        lastFocused = focused;
        onFocus(focused);
      }

      const breath = (Math.sin(elapsed * 4.2) + 1) / 2;
      const hardBlink = Math.random() > 0.985 ? 1 : 0;
      scarePulse *= 0.9;

      const phoneFuture = phase === 0 ? 0.28 + breath * 0.7 : 0;
      const breakerFuture = phase === 1 ? 0.28 + breath * 0.7 : 0;
      const tapeFuture = phase === 2 ? 0.18 + breath * 0.55 : 0;
      const behindFuture = phase >= 3 ? 0.16 + breath * 0.55 : 0;
      setMeshGlow(futurePhone, phoneFuture);
      setMeshGlow(futureBreaker, breakerFuture);
      setMeshGlow(futureDoor, phase === 3 ? 0.3 + breath * 0.7 : 0);
      setMeshGlow(futureBehind, behindFuture);

      const phoneActual = phase === 0 && phaseAge > 3 ? 0.24 + breath * 0.75 + hardBlink * 0.6 : 0;
      const breakerActual = phase === 1 && phaseAge > 3 ? 0.18 + breath * 0.64 : 0;
      const tapeActual = phase === 2 && phaseAge > 3 ? 0.12 + breath * 0.45 : 0;
      const doorActual = phase === 3 && phaseAge > 3 ? 0.32 + breath * 0.7 + hardBlink * 0.5 : phase >= 4 ? 0.85 : 0;
      setMeshGlow(phoneGlow, phoneActual);
      setMeshGlow(breakerGlow, breakerActual);
      setMeshGlow(doorGap, doorActual);
      setMeshGlow(doorEye, phase >= 4 ? 0.9 : Math.max(0, doorActual - 0.2));
      setMeshGlow(mirrorShape, tapeActual + (phase >= 3 ? 0.25 + breath * 0.28 : 0));
      setMeshGlow(behindShape, phase >= 4 ? 0.56 + breath * 0.24 : 0);

      monitorScreen.scale.x = 1 + Math.sin(elapsed * 22) * 0.015;
      monitorLight.intensity = 16 + breath * 14 + scarePulse * 18 + hardBlink * 16;
      phoneLight.intensity = phoneActual * 24;
      doorLight.intensity = doorActual * 22 + scarePulse * 7;
      ceilingFlash.intensity = scarePulse * 26 + (phase >= 4 ? 10 + hardBlink * 24 : 0);
      sweepLight.target.position.x = Math.sin(elapsed * 0.72) * 2.7;
      door.position.x = phase >= 4 ? Math.sin(elapsed * 13) * 0.025 : 0;
      phone.rotation.z = phoneActual > 0 ? Math.sin(elapsed * 40) * 0.035 : 0;
      tape.rotation.y = -0.2 + (tapeActual > 0 ? Math.sin(elapsed * 18) * 0.08 : 0);
      breaker.rotation.z = breakerActual > 0 ? Math.sin(elapsed * 19) * 0.02 : 0;

      if (phase >= 4 && !finalTriggered && phaseAge > 3.4) {
        finalTriggered = true;
        onBlackout(true);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener("touchstart", touchStart);
      renderer.domElement.removeEventListener("touchmove", touchMove);
      renderer.domElement.removeEventListener("touchend", touchEnd);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("resize", resize);
      onFocus(false);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onBlackout, onEnter, onFocus]);

  return <div className="scene" ref={mountRef} />;
}

function App() {
  const [entered, setEntered] = useState(() => window.location.hash === "#play");
  const [focused, setFocused] = useState(false);
  const [blackout, setBlackout] = useState(false);

  const handleEnter = useCallback(() => setEntered(true), []);
  const handleFocus = useCallback((active: boolean) => setFocused(active), []);
  const handleBlackout = useCallback((active: boolean) => setBlackout(active), []);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.title = "Night Shift 03:17";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "A silent lofi 3D browser horror game.");
  }, []);

  return (
    <main className={entered ? "entered" : ""}>
      <GameScene entered={entered} onEnter={handleEnter} onFocus={handleFocus} onBlackout={handleBlackout} />
      <div className="noise" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className={focused ? "reticle focused" : "reticle"} aria-hidden="true" />
      <div className="start-veil" aria-hidden="true" />
      <div className={blackout ? "blackout active" : "blackout"} aria-hidden="true" />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
