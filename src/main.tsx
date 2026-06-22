import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ExternalLink } from "lucide-react";
import * as THREE from "three";
import "./styles.css";

type Locale = "en" | "ko";
type HotspotId = "kkomo" | "plotnodes" | "divine" | "locked";

type Hotspot = {
  id: HotspotId;
  title: string;
  url?: string;
  meshName: string;
  label: Record<Locale, string>;
  body: Record<Locale, string>;
  hint: Record<Locale, string>;
};

const hotspots: Hotspot[] = [
  {
    id: "kkomo",
    title: "Kkomo",
    url: "https://pf.kakao.com/_xgryqX",
    meshName: "hotspot-kkomo",
    label: { en: "Study terminal", ko: "학습 단말기" },
    body: {
      en: "A KakaoTalk study bot. The machine keeps asking questions even after the room is empty.",
      ko: "카카오톡 학습 챗봇. 빈 방에서도 단말기는 계속 문제를 낸다.",
    },
    hint: { en: "Open Kakao channel", ko: "카카오 채널 열기" },
  },
  {
    id: "plotnodes",
    title: "PlotNodes",
    url: "https://plotnodes.com",
    meshName: "hotspot-plotnodes",
    label: { en: "Messenger room", ko: "메신저 방" },
    body: {
      en: "A relationship-driven character AI chat app. The last message is typing by itself.",
      ko: "관계 중심 캐릭터 AI 채팅 앱. 마지막 메시지가 혼자 입력되고 있다.",
    },
    hint: { en: "Open PlotNodes", ko: "PlotNodes 열기" },
  },
  {
    id: "divine",
    title: "The Divine Paradox",
    url: "https://thedivineparadox.com",
    meshName: "hotspot-divine",
    label: { en: "Seed window", ko: "시드 창문" },
    body: {
      en: "A seeded 3D observation world. The number on the glass keeps changing when you look away.",
      ko: "시드 기반 3D 관찰 세계. 고개를 돌리면 유리창의 숫자가 바뀐다.",
    },
    hint: { en: "Open world", ko: "세계 열기" },
  },
  {
    id: "locked",
    title: "Locked door",
    meshName: "hotspot-locked",
    label: { en: "Do not enter", ko: "출입 금지" },
    body: {
      en: "This is where the horror game starts. It is not ready, but something behind it is already awake.",
      ko: "공포게임은 여기서 시작된다. 아직 준비되지 않았지만, 문 뒤의 무언가는 이미 깨어 있다.",
    },
    hint: { en: "Stay in the room", ko: "방에 남기" },
  },
];

const copy = {
  en: {
    enter: "Click to enter",
    subtitle: "This is not a portfolio. You have to walk through it.",
    controls: "WASD move / mouse look / click objects / Esc release",
    mobileControls: "Drag to look / touch the lower screen to move / tap objects",
    inspect: "Inspect",
    close: "Stay here",
    language: "Language",
    objective: "Find the three exits disguised as projects.",
    proximity: "Something nearby is broadcasting.",
  },
  ko: {
    enter: "클릭해서 들어가기",
    subtitle: "이건 포트폴리오가 아닙니다. 안으로 걸어 들어가야 합니다.",
    controls: "WASD 이동 / 마우스 시점 / 오브젝트 클릭 / Esc 해제",
    mobileControls: "드래그로 보기 / 화면 아래 터치로 이동 / 오브젝트 탭",
    inspect: "조사",
    close: "여기에 남기",
    language: "언어",
    objective: "프로젝트로 위장한 세 개의 출구를 찾으세요.",
    proximity: "근처에서 신호가 송출되고 있습니다.",
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
  ctx.globalAlpha = 0.75;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.font = "700 38px ui-monospace, Menlo, monospace";
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
  const localeRef = useRef(locale);

  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030404);
    scene.fog = new THREE.Fog(0x030404, 4, 18);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 55);
    camera.position.set(0, 1.55, 5.7);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(0.55);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.className = "game-canvas";
    mount.appendChild(renderer.domElement);

    const interactables: THREE.Object3D[] = [];
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    const keys = new Set<string>();
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const velocity = new THREE.Vector3();
    let yaw = 0;
    let pitch = 0;
    let lookDragging = false;
    let moveTouch = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let scarePulse = 0;
    let frameId = 0;
    let lastNear = false;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x111615, roughness: 0.92, metalness: 0.05 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x191513, roughness: 0.98, metalness: 0.02 });
    const glowGreen = new THREE.MeshBasicMaterial({ color: 0x7cffd8 });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff4a5f });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.7, metalness: 0.35 });

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

    addBox("floor", [11, 0.18, 13], [0, -0.1, 0], floorMaterial);
    addBox("ceiling", [11, 0.16, 13], [0, 3.2, 0], wallMaterial);
    addBox("back-wall", [11, 3.4, 0.18], [0, 1.58, -6.5], wallMaterial);
    addBox("front-wall-left", [3.2, 3.4, 0.18], [-3.9, 1.58, 6.5], wallMaterial);
    addBox("front-wall-right", [3.2, 3.4, 0.18], [3.9, 1.58, 6.5], wallMaterial);
    addBox("left-wall", [0.18, 3.4, 13], [-5.5, 1.58, 0], wallMaterial);
    addBox("right-wall", [0.18, 3.4, 13], [5.5, 1.58, 0], wallMaterial);

    for (let i = 0; i < 8; i += 1) {
      addBox(`floor-tile-${i}`, [0.04, 0.012, 12.5], [-5 + i * 1.4, 0.01, 0], darkMetal);
    }
    for (let i = 0; i < 7; i += 1) {
      addBox(`wall-mark-${i}`, [0.05, 0.012, 1.2], [-5.4, 0.75 + i * 0.32, -4 + (i % 3) * 2.2], glowGreen, Math.PI / 2);
    }

    const desk = addBox("desk", [3.6, 0.22, 1.2], [-2.8, 0.82, -3.5], darkMetal, 0.1);
    addBox("desk-leg-a", [0.16, 0.9, 0.16], [-4.25, 0.35, -3.92], darkMetal);
    addBox("desk-leg-b", [0.16, 0.9, 0.16], [-1.45, 0.35, -3.1], darkMetal);
    desk.userData.silent = true;

    const kkomo = addBox("hotspot-kkomo", [0.92, 0.62, 0.14], [-2.85, 1.24, -3.97], glowGreen, 0.12);
    kkomo.userData.hotspot = "kkomo";
    interactables.push(kkomo);

    const plot = addBox("hotspot-plotnodes", [1.15, 0.72, 0.16], [3.0, 1.38, -5.98], redGlow, 0);
    plot.userData.hotspot = "plotnodes";
    interactables.push(plot);

    const divine = addBox("hotspot-divine", [1.45, 1.45, 0.08], [5.39, 1.75, -1.65], glowGreen, Math.PI / 2);
    divine.userData.hotspot = "divine";
    interactables.push(divine);

    const door = addBox("hotspot-locked", [1.5, 2.25, 0.12], [0, 1.1, 6.42], darkMetal, 0);
    door.userData.hotspot = "locked";
    interactables.push(door);
    addBox("door-light", [0.28, 0.08, 0.08], [0.54, 1.88, 6.32], redGlow, 0);

    hotspots.forEach((spot, index) => {
      const target = interactables.find((item) => item.name === spot.meshName);
      if (!target) return;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.42),
        new THREE.MeshBasicMaterial({
          map: createLabelTexture(spot.label[localeRef.current], index === 1 ? "#ff6b88" : "#9affe7"),
          transparent: true,
        }),
      );
      plane.name = `${spot.meshName}-label`;
      plane.position.copy(target.position);
      plane.position.y += 0.75;
      plane.userData.followCamera = true;
      scene.add(plane);
    });

    const ambient = new THREE.AmbientLight(0x243331, 0.72);
    scene.add(ambient);
    const mainLight = new THREE.PointLight(0x8fffe3, 18, 9);
    mainLight.position.set(-2.4, 2.4, 1.8);
    scene.add(mainLight);
    const redLight = new THREE.PointLight(0xff3048, 11, 5);
    redLight.position.set(0, 1.6, 5.4);
    scene.add(redLight);
    const flickerLight = new THREE.SpotLight(0xc7fff0, 26, 14, Math.PI / 5, 0.6, 1.4);
    flickerLight.position.set(1.3, 3.0, 2.3);
    flickerLight.target.position.set(0, 0.8, -2.2);
    scene.add(flickerLight, flickerLight.target);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    const requestLock = () => {
      if (!enteredRef.current) {
        onEnter();
        return;
      }
      renderer.domElement.requestPointerLock?.();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yaw -= event.movementX * 0.0022;
      pitch -= event.movementY * 0.0022;
      pitch = Math.max(-1.1, Math.min(1.05, pitch));
    };

    const cast = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactables, false)[0];
      if (hit?.object.userData.hotspot) {
        onInspect(hit.object.userData.hotspot);
        scarePulse = 1;
        return true;
      }
      return false;
    };

    const onClick = (event: MouseEvent) => {
      if (!enteredRef.current) {
        onEnter();
        requestLock();
        return;
      }
      if (!cast(event.clientX, event.clientY)) requestLock();
    };

    const onKeyDown = (event: KeyboardEvent) => keys.add(event.key.toLowerCase());
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());

    const onTouchStart = (event: TouchEvent) => {
      if (!enteredRef.current) onEnter();
      const touch = event.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      lookDragging = true;
      moveTouch = touch.clientY > window.innerHeight * 0.55;
      if (event.touches.length === 1) cast(touch.clientX, touch.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const dx = touch.clientX - lastTouchX;
      const dy = touch.clientY - lastTouchY;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      if (lookDragging) {
        yaw -= dx * 0.005;
        pitch -= dy * 0.004;
        pitch = Math.max(-1.1, Math.min(1.05, pitch));
      }
    };

    const onTouchEnd = () => {
      lookDragging = false;
      moveTouch = false;
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

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
        if (keys.has("w") || keys.has("arrowup") || moveTouch) velocity.add(forward);
        if (keys.has("s") || keys.has("arrowdown")) velocity.sub(forward);
        if (keys.has("a") || keys.has("arrowleft")) velocity.sub(right);
        if (keys.has("d") || keys.has("arrowright")) velocity.add(right);
      }
      if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(delta * 2.55);
        camera.position.add(velocity);
      }
      camera.position.x = Math.max(-4.85, Math.min(4.85, camera.position.x));
      camera.position.z = Math.max(-5.85, Math.min(5.85, camera.position.z));
      camera.position.y = 1.52 + Math.sin(elapsed * 8) * (velocity.lengthSq() > 0 ? 0.018 : 0.006);

      const distanceToAny = interactables.some((item) => item.position.distanceTo(camera.position) < 2.25);
      if (distanceToAny !== lastNear) {
        lastNear = distanceToAny;
        onNear(distanceToAny);
      }

      flickerLight.intensity = 16 + Math.sin(elapsed * 11) * 4 + (Math.random() > 0.965 ? 18 : 0);
      redLight.intensity = 7 + Math.sin(elapsed * 2.8) * 3 + scarePulse * 14;
      scarePulse *= 0.9;

      scene.traverse((item) => {
        if (item.userData.followCamera) item.lookAt(camera.position);
        if (item.name.startsWith("hotspot")) {
          item.rotation.z = Math.sin(elapsed * 2 + item.position.x) * 0.025;
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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
  const text = copy[locale];
  const selected = selectedId ? hotspots.find((spot) => spot.id === selectedId) : undefined;
  const handleEnter = useCallback(() => setEntered(true), []);
  const handleInspect = useCallback((id: HotspotId) => setSelectedId(id), []);
  const handleNear = useCallback((isNear: boolean) => setNear(isNear), []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "ko" ? "tac0de - 걸어 들어가는 공포 포트폴리오" : "tac0de - A haunted playable portfolio";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        locale === "ko"
          ? "tac0de의 플레이 가능한 3D 로우파이 공포 포트폴리오. 방 안 오브젝트를 조사해 프로젝트 출구를 찾으세요."
          : "A playable 3D lofi horror portfolio by tac0de. Walk through the room, inspect objects, and find project exits.",
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
        <strong>tac0de / CAM-04</strong>
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
          <h1>{selected.title}</h1>
          <span>{selected.body[locale]}</span>
          <div className="inspect-actions">
            {selected.url && (
              <a href={selected.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                {selected.hint[locale]}
              </a>
            )}
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
