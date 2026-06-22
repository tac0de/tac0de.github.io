import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import "./styles.css";

type Locale = "en" | "ko";
type HotspotId = "breaker" | "phone" | "tape" | "door";

type Hotspot = {
  id: HotspotId;
  title: Record<Locale, string>;
  meshName: string;
  label: Record<Locale, string>;
  body: Record<Locale, string>;
};

const hotspots: Hotspot[] = [
  {
    id: "breaker",
    meshName: "hotspot-breaker",
    title: { en: "Breaker box", ko: "차단기" },
    label: { en: "BREAKER", ko: "차단기" },
    body: {
      en: "The switch is taped down. Someone wrote: do not restore hallway power after 03:17.",
      ko: "스위치가 테이프로 고정돼 있다. 누군가 적었다: 03:17 이후 복도 전원을 올리지 말 것.",
    },
  },
  {
    id: "phone",
    meshName: "hotspot-phone",
    title: { en: "Wall phone", ko: "벽 전화기" },
    label: { en: "DO NOT ANSWER", ko: "받지 마" },
    body: {
      en: "The handset is warm. The first ring came from the line. The second one came from inside the wall.",
      ko: "수화기가 따뜻하다. 첫 번째 벨은 선에서 울렸다. 두 번째 벨은 벽 안에서 울렸다.",
    },
  },
  {
    id: "tape",
    meshName: "hotspot-tape",
    title: { en: "VHS tape", ko: "비디오테이프" },
    label: { en: "PLAY ME", ko: "재생해" },
    body: {
      en: "A label reads: SHIFT 12. The tape is already rewound to the moment you entered the room.",
      ko: "라벨에는 SHIFT 12라고 적혀 있다. 테이프는 이미 당신이 방에 들어온 순간으로 되감겨 있다.",
    },
  },
  {
    id: "door",
    meshName: "hotspot-door",
    title: { en: "Exit door", ko: "출구 문" },
    label: { en: "EXIT", ko: "출구" },
    body: {
      en: "The exit is locked from your side. The gap under the door is breathing.",
      ko: "출구는 안쪽에서 잠겨 있다. 문 아래 틈이 숨을 쉬고 있다.",
    },
  },
];

const copy = {
  en: {
    enter: "Start shift",
    subtitle: "03:17 AM. You are alone in the monitoring room.",
    controls: "WASD move / mouse look / E or click inspect / Esc release",
    mobileControls: "Drag to look / hold lower screen to move / tap to inspect",
    close: "Back away",
    language: "Language",
    objective: "Restore the room log. Do not answer the second call.",
    proximity: "The air is moving near you.",
  },
  ko: {
    enter: "근무 시작",
    subtitle: "오전 3시 17분. 감시실에는 당신 혼자뿐입니다.",
    controls: "WASD 이동 / 마우스 시점 / E 또는 클릭 조사 / Esc 해제",
    mobileControls: "드래그로 보기 / 화면 아래 길게 눌러 이동 / 탭으로 조사",
    close: "물러서기",
    language: "언어",
    objective: "근무 기록을 복구하세요. 두 번째 전화는 받지 마세요.",
    proximity: "근처의 공기가 움직이고 있습니다.",
  },
};

function getBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function createLabelTexture(text: string, accent = "#9affe7") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#050707";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.72;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.font = "800 38px ui-monospace, Menlo, monospace";
  ctx.fillText(text, 34, 76);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function GameScene({
  locale,
  entered,
  onEnter,
  onInspect,
  onNear,
}: {
  locale: Locale;
  entered: boolean;
  onEnter: () => void;
  onInspect: (id: HotspotId) => void;
  onNear: (isNear: boolean) => void;
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
    scene.fog = new THREE.Fog(0x020303, 3.8, 15);

    const camera = new THREE.PerspectiveCamera(73, mount.clientWidth / mount.clientHeight, 0.1, 45);
    camera.position.set(0, 1.52, 5.5);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(0.52);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.className = "game-canvas";
    mount.appendChild(renderer.domElement);

    const interactables: THREE.Object3D[] = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const velocity = new THREE.Vector3();
    const keys = new Set<string>();
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let yaw = 0;
    let pitch = 0;
    let frameId = 0;
    let scarePulse = 0;
    let lastNear = false;
    let touchLooking = false;
    let touchMoving = false;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const wall = new THREE.MeshStandardMaterial({ color: 0x101514, roughness: 0.96, metalness: 0.04 });
    const floor = new THREE.MeshStandardMaterial({ color: 0x171312, roughness: 1, metalness: 0.02 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x070909, roughness: 0.76, metalness: 0.42 });
    const green = new THREE.MeshBasicMaterial({ color: 0x80ffd8 });
    const red = new THREE.MeshBasicMaterial({ color: 0xff455c });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffcf89 });

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

    addBox("floor", [10.5, 0.18, 12.5], [0, -0.1, 0], floor);
    addBox("ceiling", [10.5, 0.16, 12.5], [0, 3.05, 0], wall);
    addBox("back-wall", [10.5, 3.3, 0.18], [0, 1.52, -6.25], wall);
    addBox("front-wall-left", [3.1, 3.3, 0.18], [-3.8, 1.52, 6.25], wall);
    addBox("front-wall-right", [3.1, 3.3, 0.18], [3.8, 1.52, 6.25], wall);
    addBox("left-wall", [0.18, 3.3, 12.5], [-5.25, 1.52, 0], wall);
    addBox("right-wall", [0.18, 3.3, 12.5], [5.25, 1.52, 0], wall);

    for (let i = 0; i < 9; i += 1) {
      addBox(`floor-seam-${i}`, [0.035, 0.012, 12.1], [-4.8 + i * 1.2, 0.01, 0], metal);
    }

    addBox("desk", [3.2, 0.2, 1.1], [-2.7, 0.8, -3.55], metal, 0.08);
    addBox("monitor-body", [0.9, 0.56, 0.2], [-2.7, 1.22, -4.0], metal, 0.08);
    addBox("monitor-screen", [0.72, 0.38, 0.05], [-2.7, 1.24, -4.12], green, 0.08);

    const tape = addBox("hotspot-tape", [0.55, 0.11, 0.34], [-1.58, 0.98, -3.48], amber, -0.15);
    tape.userData.hotspot = "tape";
    interactables.push(tape);

    const breaker = addBox("hotspot-breaker", [0.85, 1.15, 0.13], [-5.14, 1.55, -2.1], metal, Math.PI / 2);
    breaker.userData.hotspot = "breaker";
    interactables.push(breaker);
    addBox("breaker-red", [0.08, 0.22, 0.08], [-5.06, 1.7, -1.86], red, Math.PI / 2);

    const phone = addBox("hotspot-phone", [0.52, 0.72, 0.12], [3.15, 1.42, -6.12], red, 0);
    phone.userData.hotspot = "phone";
    interactables.push(phone);
    addBox("phone-cord", [0.04, 0.78, 0.04], [3.15, 0.88, -6.04], metal);

    const door = addBox("hotspot-door", [1.45, 2.2, 0.12], [0, 1.05, 6.18], metal, 0);
    door.userData.hotspot = "door";
    interactables.push(door);
    addBox("door-gap", [1.36, 0.045, 0.05], [0, 0.08, 6.08], red);

    const mirror = addBox("mirror", [1.2, 1.7, 0.08], [5.14, 1.65, 1.2], green, Math.PI / 2);
    mirror.scale.x = 0.9;

    hotspots.forEach((spot, index) => {
      const target = interactables.find((item) => item.name === spot.meshName);
      if (!target) return;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.62, 0.4),
        new THREE.MeshBasicMaterial({
          map: createLabelTexture(spot.label[locale], index === 1 || index === 3 ? "#ff6b88" : "#9affe7"),
          transparent: true,
        }),
      );
      label.position.copy(target.position);
      label.position.y += 0.72;
      label.userData.followCamera = true;
      scene.add(label);
    });

    const ambient = new THREE.AmbientLight(0x1d2927, 0.58);
    scene.add(ambient);
    const bulb = new THREE.PointLight(0x9affe7, 20, 8);
    bulb.position.set(-2.8, 2.35, 0.7);
    scene.add(bulb);
    const exitLight = new THREE.PointLight(0xff3448, 11, 5);
    exitLight.position.set(0, 1.5, 5.35);
    scene.add(exitLight);
    const sweepLight = new THREE.SpotLight(0xcffff3, 18, 13, Math.PI / 6, 0.65, 1.2);
    sweepLight.position.set(2.1, 2.8, 2.6);
    sweepLight.target.position.set(0, 0.8, -2.4);
    scene.add(sweepLight, sweepLight.target);

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    const lockPointer = () => {
      renderer.domElement.requestPointerLock?.();
    };

    const enterAndLock = () => {
      enteredRef.current = true;
      onEnter();
      lockPointer();
    };

    const look = (movementX: number, movementY: number, scale = 0.0022) => {
      yaw -= movementX * scale;
      pitch -= movementY * scale;
      pitch = Math.max(-1.05, Math.min(1.0, pitch));
    };

    const rayAt = (x: number, y: number) => {
      pointer.set(x, y);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactables, false)[0];
      if (hit?.object.userData.hotspot && hit.distance < 3.1) {
        onInspect(hit.object.userData.hotspot);
        scarePulse = 1;
        return true;
      }
      return false;
    };

    const inspectCenter = () => rayAt(0, 0);

    const inspectScreen = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      return rayAt(x, y);
    };

    const click = (event: MouseEvent) => {
      if (!enteredRef.current) {
        enterAndLock();
        return;
      }
      if (document.pointerLockElement === renderer.domElement) {
        if (!inspectCenter()) scarePulse = 0.2;
      } else if (!inspectScreen(event.clientX, event.clientY)) {
        lockPointer();
      }
    };

    const mouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) look(event.movementX, event.movementY);
    };

    const keyDown = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if (event.key.toLowerCase() === "e" && enteredRef.current) inspectCenter();
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());

    const touchStart = (event: TouchEvent) => {
      if (!enteredRef.current) onEnter();
      const touch = event.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      touchLooking = true;
      touchMoving = touch.clientY > window.innerHeight * 0.58;
      if (!touchMoving) inspectScreen(touch.clientX, touch.clientY);
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const dx = touch.clientX - lastTouchX;
      const dy = touch.clientY - lastTouchY;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      if (touchLooking) look(dx, dy, 0.0048);
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
      const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
      const elapsed = (now - startedAt) / 1000;
      lastFrameAt = now;

      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      velocity.set(0, 0, 0);
      if (enteredRef.current) {
        if (keys.has("w") || keys.has("arrowup") || touchMoving) velocity.add(forward);
        if (keys.has("s") || keys.has("arrowdown")) velocity.sub(forward);
        if (keys.has("a") || keys.has("arrowleft")) velocity.sub(right);
        if (keys.has("d") || keys.has("arrowright")) velocity.add(right);
      }
      if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(delta * 2.35);
        camera.position.add(velocity);
      }
      camera.position.x = Math.max(-4.65, Math.min(4.65, camera.position.x));
      camera.position.z = Math.max(-5.55, Math.min(5.55, camera.position.z));
      camera.position.y = 1.52 + Math.sin(elapsed * 8) * (velocity.lengthSq() > 0 ? 0.018 : 0.006);

      const near = interactables.some((item) => item.position.distanceTo(camera.position) < 2.25);
      if (near !== lastNear) {
        lastNear = near;
        onNear(near);
      }

      bulb.intensity = 13 + Math.sin(elapsed * 7.7) * 4 + (Math.random() > 0.975 ? 18 : 0);
      exitLight.intensity = 7 + Math.sin(elapsed * 2.4) * 3 + scarePulse * 14;
      sweepLight.target.position.x = Math.sin(elapsed * 0.7) * 2.8;
      scarePulse *= 0.9;

      scene.traverse((item) => {
        if (item.userData.followCamera) item.lookAt(camera.position);
        if (item.name.startsWith("hotspot")) item.rotation.z = Math.sin(elapsed * 2 + item.position.x) * 0.02;
      });

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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [locale, onEnter, onInspect, onNear]);

  return <div className="scene" ref={mountRef} />;
}

function App() {
  const [locale, setLocale] = useState<Locale>(() => getBrowserLocale());
  const [entered, setEntered] = useState(() => window.location.hash === "#play");
  const [selectedId, setSelectedId] = useState<HotspotId | null>(null);
  const [near, setNear] = useState(false);
  const selected = selectedId ? hotspots.find((spot) => spot.id === selectedId) : undefined;
  const text = copy[locale];

  const handleEnter = useCallback(() => setEntered(true), []);
  const handleInspect = useCallback((id: HotspotId) => setSelectedId(id), []);
  const handleNear = useCallback((isNear: boolean) => setNear(isNear), []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "ko" ? "Night Shift 03:17" : "Night Shift 03:17";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        locale === "ko"
          ? "브라우저에서 플레이하는 로우파이 3D 공포게임 초안. 야간 감시실에서 두 번째 전화를 피하세요."
          : "A playable lofi 3D browser horror prototype. Survive the monitoring room and do not answer the second call.",
      );
  }, [locale]);

  return (
    <main className={entered ? "entered" : ""}>
      <GameScene locale={locale} entered={entered} onEnter={handleEnter} onInspect={handleInspect} onNear={handleNear} />
      <div className="noise" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <div className="language-toggle" aria-label={text.language}>
        <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
          EN
        </button>
        <button type="button" aria-pressed={locale === "ko"} onClick={() => setLocale("ko")}>
          KO
        </button>
      </div>

      {!entered && (
        <button className="enter-screen" type="button" onClick={() => setEntered(true)}>
          <span>{text.enter}</span>
          <small>{text.subtitle}</small>
        </button>
      )}

      <div className="hud top-left">
        <strong>Night Shift / 03:17</strong>
        <span>{text.objective}</span>
      </div>
      <div className="hud bottom-left">
        <span>{navigator.maxTouchPoints > 0 ? text.mobileControls : text.controls}</span>
        {near && <strong className="signal">{text.proximity}</strong>}
      </div>
      <div className="reticle" aria-hidden="true" />

      {selected && (
        <section className="inspect-panel" aria-live="polite">
          <p>{selected.label[locale]}</p>
          <h1>{selected.title[locale]}</h1>
          <span>{selected.body[locale]}</span>
          <div className="inspect-actions">
            <button type="button" onClick={() => setSelectedId(null)}>
              {text.close}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
