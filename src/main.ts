import * as THREE from "three";
import "./style.css";

type PortalData = {
  id: string;
  title: string;
  desc: string;
  url: string;
  position: THREE.Vector3;
  color: number;
};

function qs<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing DOM element: ${selector}`);
  return element;
}

const canvas = qs<HTMLCanvasElement>("#scene");
const card = qs<HTMLDivElement>("#card");
const cardTitle = qs<HTMLDivElement>("#card-title");
const cardDesc = qs<HTMLDivElement>("#card-desc");
const playButton = qs<HTMLButtonElement>("#play-button");
const hint = qs<HTMLDivElement>("#hint");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050607);
scene.fog = new THREE.FogExp2(0x050607, 0.045);

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  80,
);
camera.position.set(0, 1.55, 6.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const portals: PortalData[] = [
  {
    id: "room-203",
    title: "ROOM 203",
    desc: "A short lo-fi motel horror game. Check the guest book. Do not wake the room.",
    url: "/games/room-203/",
    position: new THREE.Vector3(-2.6, 1.35, 0),
    color: 0xd6b574,
  },
  {
    id: "night-shift",
    title: "NIGHT SHIFT",
    desc: "A quiet clerk simulator that becomes wrong after 2AM.",
    url: "/games/night-shift/",
    position: new THREE.Vector3(0, 1.35, -0.65),
    color: 0x89a7b1,
  },
  {
    id: "static-door",
    title: "STATIC DOOR",
    desc: "A CCTV-only horror experiment. Some things exist only on the monitor.",
    url: "/games/static-door/",
    position: new THREE.Vector3(2.6, 1.35, 0),
    color: 0xc06b5c,
  },
];

const portalMeshes: THREE.Mesh[] = [];
let hoveredPortal: PortalData | null = null;
let selectedPortal: PortalData | null = null;

function makeMaterial(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
  });
}

function addRoom() {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.18, 12),
    makeMaterial(0x171819),
  );
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(11, 4.2, 0.18),
    makeMaterial(0x202123),
  );
  backWall.position.set(0, 2, -3.3);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 4.2, 12),
    makeMaterial(0x141517),
  );
  leftWall.position.set(-5.5, 2, 1.2);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 4.2, 12),
    makeMaterial(0x141517),
  );
  rightWall.position.set(5.5, 2, 1.2);
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.16, 12),
    makeMaterial(0x101113),
  );
  ceiling.position.set(0, 4.08, 1.2);
  scene.add(ceiling);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 0.85),
    new THREE.MeshBasicMaterial({
      color: 0x7d765f,
      transparent: true,
      opacity: 0.18,
    }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 3.25);
  scene.add(path);
}

function addLights() {
  const ambient = new THREE.AmbientLight(0x8b95a1, 0.42);
  scene.add(ambient);

  const frontLight = new THREE.PointLight(0xffe2aa, 1.8, 8);
  frontLight.position.set(0, 3.1, 3.2);
  scene.add(frontLight);

  const backLight = new THREE.PointLight(0x8ea8b8, 1.2, 7);
  backLight.position.set(0, 2.6, -2.2);
  scene.add(backLight);

  const redExit = new THREE.PointLight(0xb54a3a, 1.1, 4);
  redExit.position.set(4.8, 2.1, -1.8);
  scene.add(redExit);
}

function addPortalLabel(text: string, parent: THREE.Object3D) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0a0b0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(232,226,210,0.5)";
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  ctx.fillStyle = "#e8e2d2";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  ctx.fillStyle = "rgba(232,226,210,0.55)";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("ENTER", canvas.width / 2, canvas.height / 2 + 58);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 0.82),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    }),
  );

  label.position.set(0, 0, 0.055);
  parent.add(label);
}

function addPortals() {
  for (const portal of portals) {
    const group = new THREE.Group();
    group.position.copy(portal.position);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 2.45, 0.16),
      makeMaterial(0x0d0e10),
    );
    group.add(frame);

    const surface = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 2.18, 0.12),
      new THREE.MeshStandardMaterial({
        color: portal.color,
        roughness: 0.88,
        metalness: 0.02,
        emissive: portal.color,
        emissiveIntensity: 0.08,
      }),
    );
    surface.position.z = 0.08;
    surface.userData.portalId = portal.id;
    group.add(surface);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.18, 2.68),
      new THREE.MeshBasicMaterial({
        color: portal.color,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      }),
    );
    glow.position.z = 0.02;
    group.add(glow);

    addPortalLabel(portal.title, group);

    scene.add(group);
    portalMeshes.push(surface);
  }
}

function addDecor() {
  const pillarMaterial = makeMaterial(0x222326);

  for (const x of [-4.4, 4.4]) {
    for (const z of [-2.4, 2.4]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 3.7, 0.42),
        pillarMaterial,
      );
      pillar.position.set(x, 1.75, z);
      scene.add(pillar);
    }
  }

  for (let i = 0; i < 24; i++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.01, 7.8),
      new THREE.MeshBasicMaterial({
        color: 0xe8e2d2,
        transparent: true,
        opacity: i % 2 === 0 ? 0.04 : 0.025,
      }),
    );

    strip.position.set(-4.2 + i * 0.365, 0.012, 0.8);
    scene.add(strip);
  }
}

function getPortalById(id: string): PortalData | null {
  return portals.find((portal) => portal.id === id) ?? null;
}

function updateCard(portal: PortalData | null) {
  selectedPortal = portal;

  if (!portal) {
    card.classList.add("hidden");
    hint.textContent = "Drag to look · Tap a portal";
    return;
  }

  cardTitle.textContent = portal.title;
  cardDesc.textContent = portal.desc;
  card.classList.remove("hidden");
  hint.textContent = "Tap ENTER to open";
}

function setPointerFromEvent(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function pickPortal(event: PointerEvent) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(portalMeshes, false);
  if (!hits.length) {
    hoveredPortal = null;
    updateCard(null);
    return;
  }

  const mesh = hits[0].object as THREE.Mesh;
  const id = mesh.userData.portalId as string | undefined;

  if (!id) return;

  const portal = getPortalById(id);
  hoveredPortal = portal;
  updateCard(portal);
}

let isDragging = false;
let lastX = 0;
let lastY = 0;
let yaw = 0;
let pitch = -0.06;

canvas.addEventListener("pointerdown", (event) => {
  isDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!isDragging) return;

  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;

  lastX = event.clientX;
  lastY = event.clientY;

  yaw -= dx * 0.003;
  pitch -= dy * 0.0025;
  pitch = THREE.MathUtils.clamp(pitch, -0.45, 0.28);
});

canvas.addEventListener("pointerup", (event) => {
  isDragging = false;
  pickPortal(event);
});

playButton.addEventListener("click", () => {
  if (!selectedPortal) return;
  window.location.href = selectedPortal.url;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

addRoom();
addLights();
addPortals();
addDecor();

function animate() {
  const elapsed = clock.getElapsedTime();

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw + Math.sin(elapsed * 0.28) * 0.015;
  camera.rotation.x = pitch + Math.sin(elapsed * 0.7) * 0.006;

  camera.position.x = Math.sin(yaw) * 0.35;
  camera.position.z = 6.8 + Math.cos(elapsed * 0.24) * 0.05;
  camera.position.y = 1.55 + Math.sin(elapsed * 0.9) * 0.012;

  for (const mesh of portalMeshes) {
    const id = mesh.userData.portalId as string;
    const portal = getPortalById(id);
    if (!portal) continue;

    const material = mesh.material as THREE.MeshStandardMaterial;
    const isActive = hoveredPortal?.id === id || selectedPortal?.id === id;

    material.emissiveIntensity = isActive
      ? 0.24 + Math.sin(elapsed * 5) * 0.04
      : 0.08 + Math.sin(elapsed * 2 + mesh.position.x) * 0.02;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
