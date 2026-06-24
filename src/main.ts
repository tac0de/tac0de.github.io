import * as THREE from "three";
import "./style.css";

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

type Zone =
  | "desk"
  | "cctv"
  | "key"
  | "storage"
  | "room203"
  | "exit"
  | null;

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
const taskPanel = document.createElement("div");
const cctvPanel = document.createElement("div");

taskPanel.id = "task-panel";
cctvPanel.id = "cctv-panel";
document.querySelector("#app")?.append(taskPanel, cctvPanel);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.08,
  70,
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const keys = new Set<string>();
const look: TouchLook = { active: false, pointerId: -1, x: 0, y: 0 };
const moveTouch: TouchMove = {
  active: false,
  pointerId: -1,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0,
};

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const startedAt = performance.now();
const dynamicObjects: THREE.Object3D[] = [];

let yaw = 0;
let pitch = -0.04;
let stage = 0;
let cctvOpen = false;
let ending = false;
let lastFootstepAt = 0;

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let humGain: GainNode | null = null;

const mats = {
  floor: mat(0x443326),
  carpet: mat(0x5a201e),
  wall: mat(0x80674f),
  wallDark: mat(0x514235),
  trim: mat(0x2a211a),
  desk: mat(0x65402c),
  wood: mat(0x4a281a),
  metal: mat(0x343431),
  paper: mat(0xc9b896),
  dirtyWhite: mat(0xb7aa8e),
  green: mat(0x59614c),
  black: mat(0x030303),
  red: mat(0x651513),
};

function mat(color: number, roughness = 0.95) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function clearScene() {
  for (const child of [...scene.children]) scene.remove(child);
  dynamicObjects.length = 0;
}

function box(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function textPlane(
  text: string,
  width: number,
  height: number,
  fg = "#111",
  bg = "#d8c79f",
) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const ctx = labelCanvas.getContext("2d");
  if (!ctx) throw new Error("Missing canvas context");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  ctx.fillStyle = fg;
  ctx.font = "bold 108px monospace";
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

function addLabel(
  text: string,
  position: [number, number, number],
  rotationY = 0,
  width = 0.42,
  height = 0.18,
) {
  const label = textPlane(text, width, height);
  label.position.set(...position);
  label.rotation.y = rotationY;
  scene.add(label);
  return label;
}

function buildWorld() {
  clearScene();
  scene.background = new THREE.Color(stage >= 4 ? 0x211311 : 0x2e251f);
  scene.fog = new THREE.Fog(stage >= 4 ? 0x211311 : 0x2e251f, 6.4, stage >= 3 ? 16 : 21);

  scene.add(new THREE.HemisphereLight(0xe3c99a, 0x443327, stage >= 4 ? 1.0 : 1.32));

  addLight(0xf1c77a, 3.2, [0, 2.65, 2.15], 6.4);
  addLight(0xd7a866, stage >= 2 ? 2.35 : 2.8, [0, 2.55, -2.0], 7.2);
  addLight(stage >= 4 ? 0xaa1714 : 0xe6c684, 2.25, [0, 2.45, -7.2], 6.8);
  addLight(0x709077, stage >= 1 ? 1.45 : 0.75, [-3.2, 2.1, 1.2], 4.5);

  addMotelShell();
  addLobby();
  addHall();
  addRoom203Interior();
  addAnomalies();
  updateTask();
}

function addLight(color: number, intensity: number, position: [number, number, number], distance: number) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(...position);
  scene.add(light);
}

function addMotelShell() {
  box([7.6, 0.12, 15.8], [0, -0.06, -3.4], mats.floor);
  box([7.6, 0.12, 15.8], [0, 2.75, -3.4], mats.wallDark);
  box([0.12, 2.85, 15.8], [-3.8, 1.35, -3.4], mats.wall);
  box([0.12, 2.85, 15.8], [3.8, 1.35, -3.4], mats.wall);
  box([7.6, 2.85, 0.12], [0, 1.35, 4.5], mats.wall);
  box([7.6, 2.85, 0.12], [0, 1.35, -11.3], mats.wallDark);

  box([7.2, 0.045, 0.16], [0, 0.035, 0.62], mats.trim);
  box([2.18, 0.05, 8.9], [0, 0.02, -5.85], mats.carpet);

  for (let z = 2.6; z > -10.5; z -= 2.2) {
    box([0.16, 0.035, 1.16], [0, 2.57, z], mats.green).material = new THREE.MeshBasicMaterial({
      color: stage >= 4 && z < -6 ? 0x4a1010 : 0xe2c47d,
    });
  }
}

function addLobby() {
  box([4.9, 0.76, 0.72], [0, 0.38, 1.42], mats.desk);
  box([5.15, 0.14, 0.86], [0, 0.82, 1.42], mats.wood);
  box([0.68, 0.08, 0.5], [-1.2, 0.93, 1.18], mats.paper);
  box([0.18, 0.05, 0.4], [stage >= 3 ? 2.75 : 0.35, 0.95, 1.12], mats.metal);

  const logText = stage >= 2 ? "203" : "LOG";
  const log = textPlane(logText, 0.45, 0.2, "#1a110c", "#d4bd91");
  log.position.set(-1.2, 0.98, 1.18);
  log.rotation.x = -Math.PI / 2;
  scene.add(log);

  const monitor = box([0.72, 0.48, 0.08], [1.15, 1.13, 1.08], mats.black);
  monitor.rotation.x = -0.12;
  const monitorGlow = box(
    [0.58, 0.34, 0.035],
    [1.15, 1.13, 1.02],
    new THREE.MeshBasicMaterial({ color: stage >= 4 ? 0x441111 : 0x20322f }),
  );
  monitorGlow.rotation.x = -0.12;

  addKeyRack();

  box([1.9, 1.18, 0.08], [-3.72, 1.55, 2.0], mats.black);
  box([1.75, 1.02, 0.035], [-3.66, 1.55, 2.0], new THREE.MeshBasicMaterial({ color: 0x101613 }));
  if (stage >= 1) {
    const cctvFigure = box([0.16, 0.52, 0.04], [-3.64, 1.27, 2.0], mats.black);
    cctvFigure.scale.setScalar(stage >= 3 ? 1.55 : 1);
  }

  box([0.7, 1.4, 0.4], [3.1, 0.7, 2.42], mats.red);
  addLabel("ICE", [3.1, 1.42, 2.18], 0, 0.36, 0.16);
}

function addKeyRack() {
  box([1.24, 0.7, 0.08], [0.12, 1.55, 0.96], mats.wood);

  const labels = stage >= 3 ? ["203", "203", "203"] : ["201", "202", "203"];
  for (let i = 0; i < labels.length; i++) {
    const x = -0.28 + i * 0.4;
    addLabel(labels[i], [x, 1.65, 0.9], 0, 0.28, 0.12);
    if (stage < 3 || i !== 2) box([0.05, 0.18, 0.05], [x, 1.35, 0.89], mats.metal);
  }
}

function addHall() {
  const hallLen = stage >= 3 ? 11.2 : 8.7;
  box([2.42, 2.72, 0.12], [0, 1.34, 0.05], mats.wallDark);
  box([0.12, 2.72, hallLen], [-1.21, 1.34, -4.55], mats.wallDark);
  box([0.12, 2.72, hallLen], [1.21, 1.34, -4.55], mats.wallDark);

  addDoor(-1.16, -2.15, stage >= 2 ? "203" : "201", Math.PI / 2, false);
  addDoor(1.16, -3.35, stage >= 2 ? "203" : "202", -Math.PI / 2, false);
  addDoor(1.16, -5.6, stage >= 4 ? "" : "UTIL", -Math.PI / 2, stage >= 3);
  addDoor(-1.16, stage >= 3 ? -8.85 : -7.15, "203", Math.PI / 2, stage >= 4);

  if (stage >= 3) {
    addLabel("203", [0, 1.8, -6.8], 0, 0.56, 0.2);
    addLabel("203", [0, 1.28, -9.3], 0, 0.7, 0.24);
  }
}

function addDoor(x: number, z: number, labelText: string, rotationY: number, open: boolean) {
  if (open) {
    const voidPanel = box([0.055, 1.8, 0.8], [x, 0.9, z], mats.black);
    voidPanel.rotation.y = rotationY;
  } else {
    const door = box([0.08, 1.8, 0.86], [x, 0.9, z], mats.wood);
    door.rotation.y = rotationY;
  }

  if (labelText) {
    addLabel(labelText, [x + (x < 0 ? 0.052 : -0.052), 1.62, z], rotationY, 0.34, 0.14);
  }
}

function addRoom203Interior() {
  const roomZ = stage >= 3 ? -10.2 : -8.4;
  box([3.7, 0.12, 3.1], [-2.95, -0.055, roomZ], mats.floor);
  box([0.12, 2.68, 3.1], [-1.1, 1.32, roomZ], mats.wallDark);
  box([0.12, 2.68, 3.1], [-4.8, 1.32, roomZ], mats.wallDark);
  box([3.7, 2.68, 0.12], [-2.95, 1.32, roomZ - 1.55], mats.wall);

  box([1.35, 0.4, 0.82], [-3.58, 0.21, roomZ - 0.78], mats.wood);
  box([1.26, 0.12, 0.76], [-3.58, 0.52, roomZ - 0.78], mats.dirtyWhite);
  box([0.66, 0.58, 0.06], [-2.15, 1.34, roomZ - 1.48], mats.black);
  box([0.46, 0.52, 0.38], [-2.02, 0.26, roomZ - 0.5], mats.wood);
  if (stage >= 2) box([0.18, 0.78, 0.04], [-1.2, 1.2, roomZ - 0.12], mats.black);
  if (stage >= 4) box([0.32, 1.5, 0.22], [-3.0, 0.74, roomZ - 1.2], mats.black);
}

function addAnomalies() {
  if (stage >= 1) {
    const figure = box([0.32, 1.42, 0.24], [-3.3 + stage * 0.18, 0.7, 3.42], mats.black);
    figure.visible = false;
    dynamicObjects.push(figure);
  }

  if (stage >= 2) {
    box([0.42, 0.06, 0.34], [0.35, 0.94, 1.12], mats.black);
  }

  if (stage >= 4) {
    box([0.24, 1.74, 0.2], [0, 0.84, -2.6], mats.black);
  }
}

function nearestZone(): Zone {
  const { x, z } = camera.position;
  if (ending) return "exit";
  if (z > 0.7 && Math.abs(x + 1.2) < 0.8) return "desk";
  if (z > 0.6 && Math.abs(x - 1.15) < 0.8) return "cctv";
  if (z > 0.45 && Math.abs(x - 0.18) < 0.75) return "key";
  if (x > 0.7 && z < -4.75 && z > -6.4) return "storage";
  const roomZ = stage >= 3 ? -8.85 : -7.15;
  if (x < -0.65 && Math.abs(z - roomZ) < 1.1) return "room203";
  return null;
}

function currentActionZone(): Zone {
  const zone = nearestZone();
  if (ending) return "exit";
  if (stage === 0 && zone === "desk") return zone;
  if (stage === 1 && zone === "cctv") return zone;
  if (stage === 2 && zone === "key") return zone;
  if (stage === 3 && zone === "storage") return zone;
  if (stage >= 4 && zone === "room203") return zone;
  if (cctvOpen && zone === "cctv") return zone;
  return null;
}

function interact() {
  ensureAudio();
  const zone = currentActionZone();

  if (ending) {
    startGame();
    return;
  }

  if (zone === "desk" && stage === 0) {
    stage = 1;
    playNoiseBurst(0.08, 0.16);
    rebuild();
    return;
  }

  if (zone === "cctv") {
    if (stage === 1) {
      stage = 2;
      scheduleSting(0.35);
      rebuild();
      showCctv(true);
      return;
    }
    showCctv(!cctvOpen);
    return;
  }

  if (zone === "key" && stage === 2) {
    stage = 3;
    playClick();
    rebuild();
    return;
  }

  if (zone === "storage" && stage === 3) {
    stage = 4;
    playBreaker();
    rebuild();
    return;
  }

  if (zone === "room203" && stage >= 4) {
    stage = 5;
    buildEnding();
    playSting();
  }
}

function rebuild() {
  buildWorld();
  updateAudioMood();
}

function startGame() {
  stage = 0;
  cctvOpen = false;
  ending = false;
  resetCamera(-1.2, 1.5, 3.38, 0, -0.04);
  rebuild();
}

function buildEnding() {
  clearScene();
  ending = true;
  cctvOpen = false;
  cctvPanel.classList.remove("visible");
  scene.background = new THREE.Color(0x050404);
  scene.fog = new THREE.Fog(0x050404, 2.2, 7.5);
  scene.add(new THREE.HemisphereLight(0x5d5042, 0x020202, 0.75));
  addLight(0x6b1111, 1.6, [0, 1.9, -1.4], 5);
  box([2.8, 0.12, 5.6], [0, -0.06, 0], mats.floor);
  box([0.12, 2.7, 5.6], [-1.4, 1.32, 0], mats.wallDark);
  box([0.12, 2.7, 5.6], [1.4, 1.32, 0], mats.wallDark);
  box([2.8, 2.7, 0.12], [0, 1.32, -2.4], mats.wallDark);
  addLabel("203", [0, 1.45, -2.32], 0, 0.76, 0.3);
  resetCamera(0, 1.5, 1.75, 0, -0.04);
  taskPanel.textContent = "YOU WERE GIVEN ROOM 203";
  hint.textContent = "E";
}

function resetCamera(x: number, y: number, z: number, nextYaw = 0, nextPitch = -0.04) {
  camera.position.set(x, y, z);
  yaw = nextYaw;
  pitch = nextPitch;
}

function showCctv(open: boolean) {
  cctvOpen = open;
  if (cctvOpen) {
    const distance = stage <= 1 ? "FAR" : stage === 2 ? "NEAR" : stage === 3 ? "AT DOOR" : "INSIDE";
    cctvPanel.innerHTML = `<div>CAM 03 / PARKING LOT</div><div class="cctv-figure stage-${stage}"></div><span>${distance}</span>`;
    cctvPanel.classList.add("visible");
    playNoiseBurst(0.18, 0.08);
  } else {
    cctvPanel.classList.remove("visible");
  }
}

function updateTask() {
  const tasks = [
    "READ THE GUEST LOG",
    "CHECK CAM 03",
    "TAKE KEY 203",
    "RESET UTILITY BREAKER",
    "OPEN ROOM 203",
    "DO NOT LOOK BACK",
  ];
  taskPanel.textContent = tasks[Math.min(stage, tasks.length - 1)];
}

function updateHint() {
  if (cctvOpen) {
    hint.textContent = "E";
    return;
  }

  const zone = currentActionZone();
  if (zone) {
    hint.textContent = "E";
    return;
  }

  hint.textContent = "WASD / DRAG / E";
}

function isMoveTouch(event: PointerEvent) {
  return event.pointerType === "touch" && event.clientX < window.innerWidth * 0.46;
}

canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
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
  pitch = THREE.MathUtils.clamp(pitch, -0.54, 0.34);
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

touchInteract.addEventListener("click", interact);

window.addEventListener("keydown", (event) => {
  ensureAudio();
  keys.add(event.code);
  if (event.code === "KeyE" || event.code === "Enter") interact();
  if (event.code === "Escape") startGame();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateMovement(elapsed: number) {
  if (cctvOpen || ending) return;

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  right.set(-forward.z, 0, forward.x).normalize();
  move.set(0, 0, 0);

  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyD")) move.add(right);
  if (keys.has("KeyA")) move.sub(right);
  if (moveTouch.active) {
    move.addScaledVector(forward, -moveTouch.y);
    move.addScaledVector(right, moveTouch.x);
  }

  if (move.lengthSq() === 0) return;

  move.normalize().multiplyScalar(stage >= 4 ? 0.038 : 0.046);
  const nextX = camera.position.x + move.x;
  const nextZ = camera.position.z + move.z;

  camera.position.x = THREE.MathUtils.clamp(nextX, -3.28, 3.28);
  camera.position.z = THREE.MathUtils.clamp(nextZ, stage >= 3 ? -10.55 : -8.45, 3.65);

  if (camera.position.z < 0.35) {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -1.02, 1.02);
  }

  if (elapsed - lastFootstepAt > 0.42) {
    lastFootstepAt = elapsed;
    playFootstep();
  }
}

function animate() {
  const elapsed = (performance.now() - startedAt) / 1000;
  updateMovement(elapsed);
  updateHint();

  for (const object of dynamicObjects) {
    object.visible = cctvOpen;
  }

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw + Math.sin(elapsed * 0.22) * 0.004;
  camera.rotation.x = pitch + Math.sin(elapsed * 0.64) * 0.004;
  camera.position.y = 1.5 + Math.sin(elapsed * 1.6) * 0.006;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return;
  }

  const Context = window.AudioContext || window.webkitAudioContext;
  audioCtx = new Context();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.32;
  masterGain.connect(audioCtx.destination);

  humGain = audioCtx.createGain();
  humGain.gain.value = 0.035;
  humGain.connect(masterGain);

  const hum = audioCtx.createOscillator();
  hum.type = "sawtooth";
  hum.frequency.value = 49;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 240;
  hum.connect(filter).connect(humGain);
  hum.start();

  const thin = audioCtx.createOscillator();
  thin.type = "triangle";
  thin.frequency.value = 96;
  const thinGain = audioCtx.createGain();
  thinGain.gain.value = 0.012;
  thin.connect(thinGain).connect(masterGain);
  thin.start();
}

function updateAudioMood() {
  if (!audioCtx || !humGain) return;
  const t = audioCtx.currentTime;
  humGain.gain.cancelScheduledValues(t);
  humGain.gain.linearRampToValueAtTime(0.035 + stage * 0.012, t + 0.8);
}

function playFootstep() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(82 + Math.random() * 18, t);
  filter.type = "lowpass";
  filter.frequency.value = 140;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(filter).connect(gain).connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playClick() {
  playTone(420, 0.04, 0.08, "square");
}

function playBreaker() {
  playTone(48, 0.18, 0.35, "sawtooth");
  scheduleSting(0.22);
}

function playSting() {
  playTone(34, 0.42, 0.7, "sawtooth");
  playNoiseBurst(0.22, 0.18);
}

function scheduleSting(delay: number) {
  window.setTimeout(playSting, delay * 1000);
}

function playTone(
  frequency: number,
  peak: number,
  duration: number,
  type: OscillatorType,
) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(12, frequency * 0.62), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function playNoiseBurst(peak: number, duration: number) {
  if (!audioCtx || !masterGain) return;
  const sampleCount = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 720;
  gain.gain.setValueAtTime(peak, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(masterGain);
  source.start();
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

startGame();
animate();
