import * as THREE from "three";
import "./style.css";

type Mode = "room";

type TouchLook = {
  active: boolean;
  pointerId: number;
  x: number;
  y: number;
};

type TouchMove = {
  active: boolean;
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
};

function qs<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing DOM element: ${selector}`);
  return element;
}

const canvas = qs<HTMLCanvasElement>("#scene");
const hint = qs<HTMLDivElement>("#hint");
const touchMove = qs<HTMLDivElement>("#touch-move");
const touchStick = qs<HTMLDivElement>("#touch-stick");
const touchInteract = qs<HTMLButtonElement>("#touch-interact");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.08,
  52,
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const keys = new Set<string>();
const look: TouchLook = {
  active: false,
  pointerId: -1,
  x: 0,
  y: 0,
};
const moveTouch: TouchMove = {
  active: false,
  pointerId: -1,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0,
};

const reusableForward = new THREE.Vector3();
const reusableRight = new THREE.Vector3();
const reusableMove = new THREE.Vector3();
const startedAt = performance.now();

let mode: Mode = "room";
let yaw = 0;
let pitch = -0.03;
let stage = 0;
let doorOpen = false;
let activeDoor: THREE.Mesh | null = null;

const mats = {
  white: mat(0xe9e6dc, 0.96),
  whiteDark: mat(0xd7d2c8, 0.98),
  trim: mat(0xb9b0a2, 0.96),
  black: mat(0x050505, 0.9),
  floor: mat(0x30271f, 0.98),
  wall: mat(0x6a5848, 0.98),
  wallDark: mat(0x493b32, 0.99),
  wood: mat(0x3b241a, 0.94),
  red: mat(0x5e1917, 0.96),
  sheet: mat(0xc6b894, 0.98),
  sickGreen: mat(0x6b715d, 0.95),
};

function mat(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
  });
}

function box(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function textPlane(
  text: string,
  width: number,
  height: number,
  fg = "#e8e2d2",
  bg = "#080808",
): THREE.Mesh {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 256;

  const ctx = labelCanvas.getContext("2d");
  if (!ctx) throw new Error("Missing label canvas context");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  ctx.fillStyle = fg;
  ctx.font = "bold 112px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, labelCanvas.width / 2, labelCanvas.height / 2 + 6);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
}

function clearScene() {
  for (const child of [...scene.children]) scene.remove(child);
  activeDoor = null;
}

function resetCamera(x: number, y: number, z: number, nextYaw = 0, nextPitch = -0.03) {
  camera.position.set(x, y, z);
  yaw = nextYaw;
  pitch = nextPitch;
}

function buildRoom203() {
  clearScene();
  mode = "room";
  scene.background = new THREE.Color(0x1e1915);
  scene.fog = new THREE.Fog(0x1e1915, stage >= 3 ? 4.2 : 5.5, stage >= 3 ? 10.5 : 13.5);

  scene.add(new THREE.HemisphereLight(0xcfc3aa, 0x46382f, 1.16));
  const hallLight = new THREE.PointLight(0xf0c982, 2.7, 6.2);
  hallLight.position.set(0, 2.45, 1.2);
  scene.add(hallLight);
  const roomLight = new THREE.PointLight(stage >= 4 ? 0x8d1414 : 0xe0b877, 1.9, 5.4);
  roomLight.position.set(-0.7, 2.0, -5.55);
  scene.add(roomLight);

  const hallDepth = stage >= 3 ? 11.0 : 7.4;
  const doorZ = stage >= 3 ? -5.48 : -3.7;
  const roomZ = doorZ - 1.95;

  box([2.7, 0.12, hallDepth], [0, -0.06, 0.35 - (hallDepth - 7.4) / 2], mats.floor);
  box([2.7, 0.12, hallDepth], [0, 2.62, 0.35 - (hallDepth - 7.4) / 2], mats.wallDark);
  box([0.12, 2.7, hallDepth], [-1.35, 1.31, 0.35 - (hallDepth - 7.4) / 2], mats.wall);
  box([0.12, 2.7, hallDepth], [1.35, 1.31, 0.35 - (hallDepth - 7.4) / 2], mats.wall);

  for (let i = 0; i < (stage >= 3 ? 5 : 3); i++) {
    const z = 1.75 - i * 1.85;
    box([0.18, 0.04, 1.1], [0, 2.5, z], mats.sickGreen);
    const glow = box([0.12, 0.02, 0.9], [0, 2.46, z], mats.white);
    glow.material = new THREE.MeshBasicMaterial({
      color: i === 3 && stage >= 3 ? 0x4a1717 : 0xe7d5a7,
    });
  }

  for (let i = 0; i < 12; i++) {
    box([1.28, 0.012, 0.36], [0, 0.012, 2.5 - i * 0.58], i % 2 ? mats.floor : mats.wallDark);
  }

  addSideDoor(-1.285, -0.9, stage >= 2 ? "203" : "201", Math.PI / 2);
  addSideDoor(1.285, -1.92, stage >= 2 ? "203" : "202", -Math.PI / 2);
  if (stage >= 4) addOpenSideDoor(1.285, -3.35);

  box([0.74, 2.7, 0.12], [-0.98, 1.31, doorZ], mats.wallDark);
  box([0.74, 2.7, 0.12], [0.98, 1.31, doorZ], mats.wallDark);
  box([1.1, 0.54, 0.12], [0, 2.42, doorZ], mats.wallDark);
  activeDoor = box([1.05, 1.95, 0.16], [doorOpen ? 0.62 : 0, 0.96, doorZ + 0.08], mats.wood);

  const number = textPlane("203", 0.55, 0.23, "#0b0b0b", "#d6c6a0");
  number.position.set(0, 1.98, doorZ + 0.18);
  scene.add(number);

  addRoomInterior(roomZ, stage);

  if (stage >= 4) {
    const figure = box([0.34, 1.58, 0.18], [0, 0.76, doorZ + 1.05], mats.black);
    figure.name = "hall-figure";
  }
}

function addSideDoor(x: number, z: number, labelText: string, rotationY: number) {
  const door = box([0.08, 1.72, 0.82], [x, 0.88, z], mats.wood);
  door.rotation.y = rotationY;
  const label = textPlane(labelText, 0.35, 0.16, "#1a120d", "#d8c7a4");
  label.position.set(x + (x < 0 ? 0.048 : -0.048), 1.58, z);
  label.rotation.y = rotationY;
  scene.add(label);
}

function addOpenSideDoor(x: number, z: number) {
  const voidPanel = box([0.05, 1.74, 0.74], [x, 0.88, z], mats.black);
  voidPanel.rotation.y = -Math.PI / 2;
}

function addRoomInterior(roomZ: number, currentStage: number) {
  box([4.2, 0.12, 3.6], [0, -0.055, roomZ], mats.floor);
  box([4.2, 0.12, 3.6], [0, 2.62, roomZ], mats.wallDark);
  box([0.12, 2.7, 3.6], [-2.1, 1.31, roomZ], mats.wallDark);
  box([0.12, 2.7, 3.6], [2.1, 1.31, roomZ], mats.wallDark);
  box([4.2, 2.7, 0.12], [0, 1.31, roomZ - 1.8], mats.wall);

  box([1.56, 0.44, 0.94], [1.06, 0.23, roomZ - 0.82], mats.wood);
  box([1.46, 0.12, 0.86], [1.06, 0.55, roomZ - 0.82], mats.sheet);
  box([0.44, 0.18, 0.74], [1.57, 0.73, roomZ - 0.82], mats.sickGreen);

  box([0.54, 0.58, 0.42], [-0.78, 0.29, roomZ - 0.92], mats.wood);
  if (currentStage < 2) box([0.22, 0.1, 0.18], [-0.78, 0.66, roomZ - 0.92], mats.black);

  const mirror = box([0.72, 0.82, 0.035], [-2.03, 1.42, roomZ - 0.2], mats.black);
  mirror.rotation.y = Math.PI / 2;
  if (currentStage >= 2) box([0.16, 0.8, 0.04], [-1.98, 1.24, roomZ - 0.2], mats.black);

  box([0.98, 0.64, 0.08], [0, 1.42, roomZ - 1.72], mats.black);
  const screen = box([0.82, 0.48, 0.04], [0, 1.42, roomZ - 1.66], new THREE.MeshBasicMaterial({ color: 0x101d1a }));
  if (currentStage >= 3) screen.material = new THREE.MeshBasicMaterial({ color: 0x350909 });

  const bookText = currentStage >= 2 ? "203" : "LOG";
  const book = textPlane(bookText, 0.4, 0.18, "#17110c", "#b9a27e");
  book.position.set(-0.8, 0.73, roomZ - 0.54);
  book.rotation.x = -Math.PI / 2;
  scene.add(book);

  if (currentStage >= 1) {
    box([0.28, 1.38, 0.2], [currentStage >= 4 ? 0 : -1.25, 0.68, roomZ - 1.46], mats.black);
  }
}

function tryInteract() {
  const doorZ = stage >= 3 ? -5.48 : -3.7;
  if (!doorOpen && camera.position.z < doorZ + 1.22) {
    doorOpen = true;
    if (activeDoor) activeDoor.position.x = 0.62;
    hint.textContent = "";
    return;
  }

  if (doorOpen && camera.position.z < doorZ - 1.65) {
    stage += 1;
    doorOpen = false;
    if (stage >= 5) {
      buildEnding();
      return;
    }
    buildRoom203();
    resetCamera(0, 1.5, 2.95);
    hint.textContent = "WASD / DRAG / E";
  }
}

function startRoom() {
  stage = 0;
  doorOpen = false;
  buildRoom203();
  resetCamera(0, 1.5, 2.95);
  hint.textContent = "WASD / DRAG / E";
}

function buildEnding() {
  clearScene();
  mode = "room";
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2.5, 8);
  scene.add(new THREE.HemisphereLight(0x6f6455, 0x050505, 0.9));
  box([2.7, 0.12, 5.4], [0, -0.06, 0.2], mats.floor);
  box([0.12, 2.7, 5.4], [-1.35, 1.31, 0.2], mats.wallDark);
  box([0.12, 2.7, 5.4], [1.35, 1.31, 0.2], mats.wallDark);
  box([2.7, 2.7, 0.12], [0, 1.31, -2.3], mats.wallDark);
  const label = textPlane("203", 0.72, 0.32, "#050505", "#d8c7a4");
  label.position.set(0, 1.5, -2.18);
  scene.add(label);
  resetCamera(0, 1.5, 1.65);
  hint.textContent = "";
}

function isMoveTouch(event: PointerEvent) {
  return event.pointerType === "touch" && event.clientX < window.innerWidth * 0.46;
}

canvas.addEventListener("pointerdown", (event) => {
  if (isMoveTouch(event)) {
    moveTouch.active = true;
    moveTouch.pointerId = event.pointerId;
    moveTouch.originX = event.clientX;
    moveTouch.originY = event.clientY;
    moveTouch.x = 0;
    moveTouch.y = 0;
    touchMove.classList.add("active");
    touchMove.style.left = `${event.clientX}px`;
    touchMove.style.top = `${event.clientY}px`;
    canvas.setPointerCapture(event.pointerId);
    return;
  }

  look.active = true;
  look.pointerId = event.pointerId;
  look.x = event.clientX;
  look.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (moveTouch.active && event.pointerId === moveTouch.pointerId) {
    moveTouch.x = THREE.MathUtils.clamp((event.clientX - moveTouch.originX) / 54, -1, 1);
    moveTouch.y = THREE.MathUtils.clamp((event.clientY - moveTouch.originY) / 54, -1, 1);
    touchStick.style.transform = `translate(${moveTouch.x * 22}px, ${moveTouch.y * 22}px)`;
    return;
  }

  if (!look.active || event.pointerId !== look.pointerId) return;

  const dx = event.clientX - look.x;
  const dy = event.clientY - look.y;
  look.x = event.clientX;
  look.y = event.clientY;

  yaw -= dx * 0.0032;
  pitch -= dy * 0.0027;
  pitch = THREE.MathUtils.clamp(pitch, -0.52, 0.34);
});

canvas.addEventListener("pointerup", (event) => {
  if (moveTouch.active && event.pointerId === moveTouch.pointerId) {
    moveTouch.active = false;
    moveTouch.pointerId = -1;
    moveTouch.x = 0;
    moveTouch.y = 0;
    touchMove.classList.remove("active");
    touchStick.style.transform = "";
    return;
  }

  if (look.active && event.pointerId === look.pointerId) {
    look.active = false;
    look.pointerId = -1;
  }
});

touchInteract.addEventListener("click", tryInteract);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyE" || event.code === "Enter") tryInteract();
  if (event.code === "Escape") startRoom();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateMovement() {
  reusableForward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  reusableRight.set(-reusableForward.z, 0, reusableForward.x).normalize();
  reusableMove.set(0, 0, 0);

  if (keys.has("KeyW")) reusableMove.add(reusableForward);
  if (keys.has("KeyS")) reusableMove.sub(reusableForward);
  if (keys.has("KeyD")) reusableMove.add(reusableRight);
  if (keys.has("KeyA")) reusableMove.sub(reusableRight);

  if (moveTouch.active) {
    reusableMove.addScaledVector(reusableForward, -moveTouch.y);
    reusableMove.addScaledVector(reusableRight, moveTouch.x);
  }

  if (reusableMove.lengthSq() === 0) return;

  reusableMove.normalize().multiplyScalar(0.043);
  camera.position.add(reusableMove);

  const doorZ = stage >= 3 ? -5.48 : -3.7;
  const minZ = doorOpen ? doorZ - 3.02 : doorZ + 0.62;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -1.06, 1.06);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, 3.12);
}

function updateHint() {
  const doorZ = stage >= 3 ? -5.48 : -3.7;
  if (!doorOpen && camera.position.z < doorZ + 1.22) {
    hint.textContent = "E";
  } else if (doorOpen && camera.position.z < doorZ - 1.65) {
    hint.textContent = "E";
  } else {
    hint.textContent = "WASD / DRAG / E";
  }
}

function animate() {
  const elapsed = (performance.now() - startedAt) / 1000;

  updateMovement();
  updateHint();

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw + Math.sin(elapsed * 0.31) * 0.006;
  camera.rotation.x = pitch + Math.sin(elapsed * 0.68) * 0.004;
  camera.position.y = 1.5 + Math.sin(elapsed * 1.6) * 0.006;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

startRoom();
animate();
