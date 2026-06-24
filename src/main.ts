import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

type GamePhase = 'playing' | 'ending' | 'dead';

type InteractableType =
  | 'bell'
  | 'guestbook'
  | 'room-204-key'
  | 'door-204'
  | 'vending'
  | 'cctv'
  | 'tv'
  | 'phone'
  | 'bed'
  | 'bath'
  | 'mirror'
  | 'laundry-door'
  | 'washer'
  | 'front-exit';

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

interface GameState {
  phase: GamePhase;
  anomaly: number;
  hasKey204: boolean;
  visited204: boolean;
  bellPressed: boolean;
  cctvSeen: boolean;
  tvOn: boolean;
  phoneAnswered: boolean;
  bedChecked: boolean;
  bathChecked: boolean;
  mirrorChecked: boolean;
  laundryUnlocked: boolean;
  washerChecked: boolean;
  hallwayShifted: boolean;
  endingReady: boolean;
  elapsed: number;
}

type InteractableMesh = THREE.Mesh & {
  userData: THREE.Mesh['userData'] & {
    type: InteractableType;
    label: string;
    used?: boolean;
  };
};

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required DOM element is missing: ${selector}`);
  }
  return element;
}

const canvas = getRequiredElement<HTMLCanvasElement>('#game');
const statusEl = getRequiredElement<HTMLDivElement>('#status');
const messageEl = getRequiredElement<HTMLDivElement>('#message');
const objectiveEl = getRequiredElement<HTMLDivElement>('#objective');
const crosshairEl = getRequiredElement<HTMLDivElement>('#crosshair');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x25232a);
scene.fog = new THREE.FogExp2(0x25232a, 0.012);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  150
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));

const controls = new PointerLockControls(camera, document.body);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

const input: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const state: GameState = {
  phase: 'playing',
  anomaly: 0,
  hasKey204: false,
  visited204: false,
  bellPressed: false,
  cctvSeen: false,
  tvOn: false,
  phoneAnswered: false,
  bedChecked: false,
  bathChecked: false,
  mirrorChecked: false,
  laundryUnlocked: false,
  washerChecked: false,
  hallwayShifted: false,
  endingReady: false,
  elapsed: 0,
};

const walls: THREE.Mesh[] = [];
const interactables: InteractableMesh[] = [];
const dynamicObjects: THREE.Object3D[] = [];

const mat = {
  wall: new THREE.MeshStandardMaterial({
    color: 0x7b7467,
    roughness: 1,
    metalness: 0,
  }),
  darkWall: new THREE.MeshStandardMaterial({
    color: 0x514a44,
    roughness: 1,
    metalness: 0,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: 0x5b574d,
    roughness: 1,
    metalness: 0,
  }),
  carpet: new THREE.MeshStandardMaterial({
    color: 0x82343c,
    roughness: 1,
    metalness: 0,
  }),
  door: new THREE.MeshStandardMaterial({
    color: 0x7c4c32,
    roughness: 1,
    metalness: 0,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x6b452f,
    roughness: 1,
    metalness: 0,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0x77756d,
    roughness: 0.9,
    metalness: 0.15,
  }),
  paper: new THREE.MeshBasicMaterial({
    color: 0xded0a5,
  }),
  key: new THREE.MeshBasicMaterial({
    color: 0xf2ce65,
  }),
  neonPink: new THREE.MeshBasicMaterial({
    color: 0xff3d75,
  }),
  neonBlue: new THREE.MeshBasicMaterial({
    color: 0x75c8ff,
  }),
  screen: new THREE.MeshBasicMaterial({
    color: 0x8fc6cf,
  }),
  blood: new THREE.MeshBasicMaterial({
    color: 0x6f0808,
  }),
  black: new THREE.MeshBasicMaterial({
    color: 0x050505,
  }),
};

let messageTimer = 0;
let oneShotHintTimer = 0;

function showMessage(text: string, ms = 3200): void {
  messageEl.textContent = text;

  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    messageEl.textContent = '';
  }, ms);
}

function setObjective(text: string): void {
  objectiveEl.textContent = `목표: ${text}`;
}

function createBox(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  material: THREE.Material
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function addWall(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  material: THREE.Material = mat.wall
): THREE.Mesh {
  const wall = createBox(x, y, z, sx, sy, sz, material);
  walls.push(wall);
  return wall;
}

function createInteractable(
  type: InteractableType,
  label: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  material: THREE.Material
): InteractableMesh {
  const mesh = createBox(x, y, z, sx, sy, sz, material) as InteractableMesh;
  mesh.userData.type = type;
  mesh.userData.label = label;
  mesh.userData.used = false;
  interactables.push(mesh);
  return mesh;
}

function addDynamic(object: THREE.Object3D): void {
  dynamicObjects.push(object);
}

function createLight(
  color: number,
  intensity: number,
  distance: number,
  x: number,
  y: number,
  z: number
): THREE.PointLight {
  const light = new THREE.PointLight(color, intensity, distance, 1.55);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

function createTextBars(
  x: number,
  y: number,
  z: number,
  count: number,
  material: THREE.Material,
  axis: 'x' | 'z' = 'x'
): void {
  for (let i = 0; i < count; i++) {
    const width = 0.08 + (i % 3) * 0.035;
    if (axis === 'x') {
      createBox(x + i * 0.18, y, z, width, 0.12, 0.035, material);
    } else {
      createBox(x, y, z + i * 0.18, 0.035, 0.12, width, material);
    }
  }
}

function createDoorPlate(x: number, y: number, z: number, side: 'left' | 'right'): void {
  const plate = createBox(x, y, z, 0.08, 0.35, 0.8, mat.paper);
  addDynamic(plate);
  createTextBars(x + (side === 'left' ? 0.055 : -0.055), y + 0.03, z - 0.24, 3, mat.black, 'z');
}

function createLamp(x: number, y: number, z: number): void {
  createBox(x, y, z, 0.2, 0.75, 0.2, mat.wood);
  createBox(x, y + 0.48, z, 0.85, 0.34, 0.85, mat.paper);
  createLight(0xffd194, 0.85, 7, x, y + 0.7, z);
}

function createTrash(x: number, z: number): void {
  createBox(x, 0.28, z, 0.52, 0.56, 0.52, mat.metal);
  createBox(x + 0.36, 0.08, z - 0.16, 0.5, 0.08, 0.26, mat.paper);
  createBox(x - 0.32, 0.07, z + 0.2, 0.38, 0.07, 0.22, mat.paper);
}

function createVendingMachine(x: number, z: number): void {
  createBox(x, 1.2, z, 1.05, 2.4, 0.7, mat.neonBlue);
  createBox(x, 1.75, z - 0.37, 0.75, 0.8, 0.05, mat.screen);
  createBox(x + 0.38, 0.95, z - 0.38, 0.18, 0.5, 0.05, mat.black);
  createLight(0x75c8ff, 0.8, 7, x, 1.8, z);
  createInteractable('vending', '자판기를 확인한다', x, 1.3, z - 0.45, 0.9, 1.8, 0.08, mat.screen);
}

function createBed(x: number, z: number): void {
  createBox(x, 0.45, z, 3.25, 0.9, 1.9, mat.wood);
  createBox(x - 0.95, 1.02, z - 0.45, 0.9, 0.22, 0.72, mat.paper);
  createBox(x + 0.4, 1.02, z + 0.12, 1.9, 0.17, 1.24, mat.carpet);
}

function createBathroom(x: number, z: number): void {
  createBox(x, 0.58, z, 1.7, 1.16, 2.25, mat.metal);
  createBox(x, 1.22, z, 1.25, 0.1, 1.65, mat.blood);
  createBox(x + 1.25, 1.45, z - 1.1, 0.1, 1.35, 1.0, mat.screen);
}

function createCar(x: number, z: number): void {
  createBox(x, 0.42, z, 3.2, 0.84, 1.65, mat.darkWall);
  createBox(x - 0.15, 0.95, z, 1.65, 0.7, 1.35, mat.screen);
  createBox(x - 1.25, 0.12, z - 0.68, 0.55, 0.24, 0.24, mat.black);
  createBox(x + 1.25, 0.12, z - 0.68, 0.55, 0.24, 0.24, mat.black);
  createBox(x - 1.25, 0.12, z + 0.68, 0.55, 0.24, 0.24, mat.black);
  createBox(x + 1.25, 0.12, z + 0.68, 0.55, 0.24, 0.24, mat.black);
}

function createCeilingLight(x: number, z: number, intensity = 0.7): void {
  createBox(x, 2.95, z, 1.1, 0.08, 0.48, mat.paper);
  createLight(0xffd99a, intensity, 8.5, x, 2.65, z);
}

function createMotelSign(): void {
  createBox(0, 3.2, -9.15, 6.5, 1.15, 0.12, mat.neonPink);
  createTextBars(-2.35, 3.35, -9.25, 22, mat.key, 'x');
  createLight(0xff3d75, 2.7, 24, 0, 3.4, -8.9);
}

function createFrontDesk(): void {
  createBox(0, 0.55, -2.8, 6.5, 1.1, 1.35, mat.wood);
  createBox(-2.4, 1.25, -2.85, 0.8, 0.09, 0.42, mat.paper);
  createBox(0.1, 1.2, -3.5, 0.28, 0.14, 0.28, mat.metal);
  createBox(1.6, 1.22, -2.9, 0.65, 0.08, 0.25, mat.key);

  createInteractable('guestbook', '숙박부를 읽는다', -2.4, 1.42, -2.88, 0.82, 0.12, 0.46, mat.paper);
  createInteractable('bell', '벨을 누른다', 0.1, 1.38, -3.5, 0.32, 0.18, 0.32, mat.metal);
  createInteractable('room-204-key', '204호 키를 집는다', 1.6, 1.38, -2.9, 0.7, 0.12, 0.3, mat.key);

  createBox(-4.9, 1.9, -5.85, 1.7, 1.05, 0.08, mat.screen);
  createInteractable('cctv', 'CCTV 모니터를 본다', -4.9, 1.9, -5.92, 1.8, 1.15, 0.08, mat.screen);

  createLamp(-3.9, 0.72, -4.2);
  createLamp(4.0, 0.72, -4.2);

  createBox(4.9, 1.8, -5.85, 1.6, 0.9, 0.08, mat.paper);
  createTextBars(4.25, 1.88, -5.93, 8, mat.black, 'x');

  createTrash(-7.2, 3.5);
  createTrash(7.0, 3.8);
}

function createHallway(): void {
  createBox(0, -0.04, 12.5, 7.4, 0.1, 31, mat.carpet);

  addWall(-3.9, 1.5, 12.5, 0.4, 3, 31, mat.wall);
  addWall(3.9, 1.5, 12.5, 0.4, 3, 31, mat.wall);

  for (let i = 0; i < 6; i++) {
    createCeilingLight(0, 0.5 + i * 5.2, 0.6);
  }

  const leftDoorZ = [4, 9, 14, 19];
  const rightDoorZ = [6.5, 11.5, 16.5, 21.5];

  for (const z of leftDoorZ) {
    createBox(-3.67, 1.16, z, 0.14, 2.3, 1.8, mat.door);
    createDoorPlate(-3.55, 1.88, z - 0.45, 'left');
  }

  for (const z of rightDoorZ) {
    createBox(3.67, 1.16, z, 0.14, 2.3, 1.8, mat.door);
    createDoorPlate(3.55, 1.88, z - 0.45, 'right');
  }

  createVendingMachine(2.95, 1.8);
  createTrash(-2.9, 7.6);

  createBox(-2.2, 0.8, 18.7, 0.7, 1.6, 0.45, mat.metal);
  createBox(-1.55, 0.7, 18.7, 0.55, 1.4, 0.4, mat.metal);
  createBox(-2.2, 1.62, 18.7, 1.3, 0.08, 0.65, mat.paper);

  createBox(0, 2.97, 25.5, 2.0, 0.08, 0.45, mat.neonBlue);
  createLight(0x75c8ff, 0.9, 9, 0, 2.55, 25.5);
}

function createRoom204(): void {
  createBox(8.4, -0.05, 28, 12, 0.1, 12, mat.floor);

  addWall(8.4, 1.5, 22, 12, 3, 0.4, mat.wall);
  addWall(8.4, 1.5, 34, 12, 3, 0.4, mat.wall);
  addWall(14.4, 1.5, 28, 0.4, 3, 12, mat.wall);
  addWall(2.4, 1.5, 25.2, 0.4, 3, 6, mat.wall);
  addWall(2.4, 1.5, 31.6, 0.4, 3, 4.8, mat.wall);

  const door204 = createInteractable(
    'door-204',
    '204호 문을 연다',
    2.42,
    1.2,
    28,
    0.14,
    2.35,
    1.9,
    mat.door
  );
  walls.push(door204);

  createDoorPlate(2.31, 1.9, 27.42, 'right');

  createBed(8.1, 24.6);
  createBox(5.4, 0.64, 24.4, 0.85, 1.28, 0.65, mat.wood);
  createBox(5.4, 1.4, 24.35, 0.48, 0.16, 0.48, mat.metal);
  createLight(0xffc979, 0.6, 6, 5.4, 1.7, 24.4);

  createBox(11.8, 0.72, 29.5, 1.55, 1.44, 0.65, mat.wood);
  createBox(11.8, 1.75, 29.16, 1.25, 0.78, 0.08, mat.screen);
  createInteractable('tv', 'TV를 켠다', 11.8, 1.75, 29.08, 1.3, 0.85, 0.1, mat.screen);

  createBox(5.9, 1.1, 26.15, 0.42, 0.22, 0.36, mat.black);
  createInteractable('phone', '전화기를 받는다', 5.9, 1.28, 26.15, 0.5, 0.28, 0.42, mat.black);

  createInteractable('bed', '침대 밑을 확인한다', 8.1, 0.16, 25.75, 2.2, 0.12, 0.55, mat.blood);

  createBathroom(12.1, 32.1);
  createInteractable('bath', '욕조 안을 확인한다', 12.1, 1.32, 32.1, 1.35, 0.15, 1.6, mat.blood);

  createBox(5.0, 1.65, 33.75, 1.2, 1.35, 0.08, mat.screen);
  createInteractable('mirror', '거울을 본다', 5.0, 1.65, 33.68, 1.25, 1.4, 0.1, mat.screen);

  createTrash(13.1, 24.1);
  createCeilingLight(8.2, 28.2, 0.7);
  createLight(0x93cfff, 1.1, 12, 11.8, 2.0, 29.1);
}

function createLaundryRoom(): void {
  createBox(-8, -0.05, 14, 8, 0.1, 8, mat.floor);

  addWall(-8, 1.5, 10, 8, 3, 0.4, mat.darkWall);
  addWall(-8, 1.5, 18, 8, 3, 0.4, mat.darkWall);
  addWall(-12, 1.5, 14, 0.4, 3, 8, mat.darkWall);
  addWall(-4, 1.5, 12.3, 0.4, 3, 4.6, mat.darkWall);
  addWall(-4, 1.5, 17.2, 0.4, 3, 1.6, mat.darkWall);

  const door = createInteractable(
    'laundry-door',
    '직원용 세탁실 문을 연다',
    -3.95,
    1.15,
    15.0,
    0.14,
    2.3,
    1.8,
    mat.door
  );
  walls.push(door);

  createBox(-9.5, 0.75, 12.2, 1.25, 1.5, 1.1, mat.metal);
  createBox(-7.8, 0.75, 12.2, 1.25, 1.5, 1.1, mat.metal);
  createBox(-6.1, 0.75, 12.2, 1.25, 1.5, 1.1, mat.metal);
  createBox(-7.9, 1.3, 12.75, 3.8, 0.12, 0.22, mat.screen);

  createInteractable('washer', '열린 세탁기를 확인한다', -7.8, 1.2, 11.62, 1.15, 1.1, 0.12, mat.blood);

  createBox(-10.9, 1.75, 17.75, 1.2, 0.7, 0.08, mat.paper);
  createTextBars(-11.35, 1.8, 17.66, 8, mat.black, 'x');

  createCeilingLight(-8, 14, 0.65);
}

function createParkingLot(): void {
  createBox(0, -0.08, -14, 24, 0.1, 12, mat.darkWall);
  createCar(-5.8, -15.2);
  createCar(5.2, -13.2);

  addWall(-12, 1.1, -14, 0.4, 2.2, 12, mat.darkWall);
  addWall(12, 1.1, -14, 0.4, 2.2, 12, mat.darkWall);

  createMotelSign();

  createInteractable(
    'front-exit',
    '밖으로 나간다',
    0,
    1.1,
    -8.0,
    3.2,
    2.2,
    0.18,
    mat.neonPink
  );
}

function createWorld(): void {
  createBox(0, -0.05, -1, 18, 0.1, 14, mat.floor);

  addWall(0, 1.5, -8, 18, 3, 0.4, mat.wall);
  addWall(-9, 1.5, -1, 0.4, 3, 14, mat.wall);
  addWall(9, 1.5, -1, 0.4, 3, 14, mat.wall);

  addWall(-5.8, 1.5, 6, 6.4, 3, 0.4, mat.wall);
  addWall(5.8, 1.5, 6, 6.4, 3, 0.4, mat.wall);

  createParkingLot();
  createFrontDesk();
  createHallway();
  createRoom204();
  createLaundryRoom();

  camera.position.set(0, 1.55, -4.4);
  camera.lookAt(0, 1.4, -2);
}

createWorld();

const ambientLight = new THREE.AmbientLight(0xd6d0c2, 1.0);
scene.add(ambientLight);

const playerLight = new THREE.PointLight(0xffdfac, 1.15, 18, 1.45);
scene.add(playerLight);

const lobbyLight = createLight(0xffd7a0, 1.0, 13, 0, 2.6, -2.8);
const signLight = createLight(0xff3d75, 2.5, 24, 0, 3.2, -8.7);
const hallwayMoodLight = createLight(0xffd49a, 0.8, 15, 0, 2.5, 14);
const roomMoodLight = createLight(0x93cfff, 0.9, 12, 9, 2.3, 28);

const entity = new THREE.Group();
const entityBody = createBox(0, 0.9, 0, 0.42, 1.8, 0.22, mat.black);
const entityHead = createBox(0, 1.95, 0, 0.55, 0.55, 0.28, mat.black);
entity.add(entityBody);
entity.add(entityHead);
scene.add(entity);
entity.position.set(0, 0, 24);
entity.visible = false;

function canMoveTo(nextPosition: THREE.Vector3): boolean {
  const radius = 0.45;
  const playerPoint = new THREE.Vector3(nextPosition.x, 1.2, nextPosition.z);

  for (const wall of walls) {
    if (!wall.visible) continue;

    const box = new THREE.Box3().setFromObject(wall);
    const closestPoint = box.clampPoint(playerPoint, new THREE.Vector3());

    if (closestPoint.distanceTo(playerPoint) < radius) {
      return false;
    }
  }

  return true;
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const movement = new THREE.Vector3();

function updatePlayer(delta: number): void {
  if (state.phase !== 'playing') return;

  const speed = input.sprint ? 5.2 : 3.15;

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  right.crossVectors(forward, camera.up).normalize();

  let moveForward = 0;
  let moveRight = 0;

  if (input.forward) moveForward += 1;
  if (input.backward) moveForward -= 1;
  if (input.right) moveRight += 1;
  if (input.left) moveRight -= 1;

  const length = Math.hypot(moveForward, moveRight);
  if (length <= 0) return;

  moveForward /= length;
  moveRight /= length;

  movement.set(0, 0, 0);
  movement.addScaledVector(forward, moveForward * speed * delta);
  movement.addScaledVector(right, moveRight * speed * delta);

  const nextX = camera.position.clone();
  nextX.x += movement.x;

  if (canMoveTo(nextX)) {
    camera.position.x = nextX.x;
  }

  const nextZ = camera.position.clone();
  nextZ.z += movement.z;

  if (canMoveTo(nextZ)) {
    camera.position.z = nextZ.z;
  }
}

function getFocusedInteractable(): InteractableMesh | null {
  raycaster.setFromCamera(screenCenter, camera);

  const hits = raycaster.intersectObjects(interactables, false);
  if (!hits.length) {
    crosshairEl.classList.remove('active');
    return null;
  }

  const hit = hits[0];
  if (!hit || hit.distance > 2.7 || !hit.object.visible) {
    crosshairEl.classList.remove('active');
    return null;
  }

  crosshairEl.classList.add('active');
  return hit.object as InteractableMesh;
}

function updateInteractionPrompt(): void {
  if (state.phase !== 'playing') return;

  const focused = getFocusedInteractable();

  if (!focused) return;

  messageEl.textContent = `E: ${focused.userData.label}`;
}

function raiseAnomaly(amount = 1): void {
  state.anomaly += amount;
  state.anomaly = Math.min(state.anomaly, 9);
}

function hideInteractable(mesh: InteractableMesh): void {
  mesh.visible = false;
  mesh.userData.used = true;
}

function unlockDoorMesh(type: InteractableType): void {
  const door = interactables.find((item) => item.userData.type === type);
  if (!door) return;

  const wallIndex = walls.indexOf(door);
  if (wallIndex >= 0) {
    walls.splice(wallIndex, 1);
  }

  door.visible = false;
}

function shiftHallway(): void {
  if (state.hallwayShifted) return;

  state.hallwayShifted = true;
  raiseAnomaly();

  createBox(0, 1.5, 8.7, 2.1, 3, 0.22, mat.darkWall);
  createBox(0, 1.2, 8.55, 1.25, 2.2, 0.12, mat.door);
  createTextBars(-0.34, 1.82, 8.43, 5, mat.blood, 'x');

  createLight(0xff3355, 0.8, 10, 0, 2.2, 8.6);

  showMessage('복도에 없던 문이 생겼다.\n문패에는 방 번호가 적혀 있지 않다.', 4200);
}

function makeFrontWrong(): void {
  if (state.endingReady) return;

  state.endingReady = true;
  raiseAnomaly();

  createBox(0, 1.35, -2.05, 3.0, 0.13, 0.12, mat.blood);
  createBox(2.8, 1.38, -2.85, 0.9, 0.12, 0.48, mat.paper);
  createTextBars(2.45, 1.47, -2.88, 8, mat.blood, 'x');

  setObjective('프런트로 돌아가 숙박부를 다시 확인하라.');
  showMessage('프런트 카운터 위의 숙박부가 바뀌었다.', 4200);
}

function interact(): void {
  if (state.phase !== 'playing') return;

  const focused = getFocusedInteractable();
  if (!focused) return;

  switch (focused.userData.type) {
    case 'bell': {
      if (state.bellPressed) {
        showMessage('벨은 더 이상 울리지 않는다.');
        return;
      }

      state.bellPressed = true;
      raiseAnomaly();

      showMessage('벨을 눌렀다.\n복도 조명이 하나씩 켜진다.', 3600);
      setObjective('숙박부를 읽고 204호 키를 집어라.');
      hallwayMoodLight.intensity = 1.2;
      break;
    }

    case 'guestbook': {
      if (state.endingReady) {
        state.phase = 'ending';
        document.body.classList.add('ending');
        showMessage(
          '숙박부 마지막 줄:\n“204호 손님은 이미 체크아웃했다.”\n\n그 아래에는 당신의 서명이 있다.',
          999999
        );
        setObjective('엔딩.');
        return;
      }

      showMessage('숙박부에는 오늘 투숙객이 한 명뿐이다.\n204호. 이름은 번져서 읽을 수 없다.', 4200);
      setObjective('204호 키를 집어라.');
      break;
    }

    case 'room-204-key': {
      if (state.hasKey204) {
        showMessage('이미 204호 키를 가지고 있다.');
        return;
      }

      state.hasKey204 = true;
      hideInteractable(focused);
      raiseAnomaly();

      showMessage('204호 키를 얻었다.\n키태그 뒷면에 “돌아오지 마”라고 적혀 있다.', 4200);
      setObjective('복도를 지나 204호로 가라.');
      break;
    }

    case 'cctv': {
      state.cctvSeen = true;
      raiseAnomaly();

      showMessage('CCTV 화면에는 복도 끝 204호가 보인다.\n화면 속 복도에는 당신이 이미 서 있다.', 4600);
      break;
    }

    case 'vending': {
      showMessage('자판기 안쪽에서 덜컹거리는 소리가 난다.\n상품 칸에는 객실 키들이 들어 있다.', 3600);
      break;
    }

    case 'door-204': {
      if (!state.hasKey204) {
        showMessage('204호는 잠겨 있다.\n프런트에 키가 있을 것이다.');
        return;
      }

      if (!state.visited204) {
        state.visited204 = true;
        unlockDoorMesh('door-204');
        raiseAnomaly();

        showMessage('204호 문이 열렸다.\n방 안은 너무 평범해서 오히려 이상하다.', 4600);
        setObjective('204호 안의 TV, 침대, 욕실, 전화기를 조사하라.');
        return;
      }

      showMessage('204호 문틀이 조금씩 좁아지는 것 같다.');
      break;
    }

    case 'tv': {
      if (state.tvOn) {
        showMessage('TV는 프런트 화면만 반복해서 보여준다.');
        return;
      }

      state.tvOn = true;
      raiseAnomaly();

      showMessage('TV를 켰다.\n화면에는 프런트 카운터가 보인다.\n벨 옆에 피 묻은 손이 놓여 있다.', 5200);
      shiftHallway();
      break;
    }

    case 'phone': {
      if (state.phoneAnswered) {
        showMessage('수화기에서는 물 흐르는 소리만 난다.');
        return;
      }

      state.phoneAnswered = true;
      raiseAnomaly();

      showMessage('전화를 받았다.\n“프런트로 돌아오지 마.”\n목소리는 당신 목소리다.', 5200);
      break;
    }

    case 'bed': {
      if (state.bedChecked) {
        showMessage('침대 밑은 비어 있다. 방금 전까지는 아니었다.');
        return;
      }

      state.bedChecked = true;
      raiseAnomaly();

      showMessage('침대 아래에 젖은 신발 자국이 있다.\n자국은 욕실이 아니라 프런트 방향으로 이어진다.', 5000);
      break;
    }

    case 'bath': {
      if (state.bathChecked) {
        showMessage('욕조 물은 빠져 있다. 배수구 안에서 벨소리가 난다.');
        return;
      }

      state.bathChecked = true;
      state.laundryUnlocked = true;
      unlockDoorMesh('laundry-door');
      raiseAnomaly();

      showMessage('욕조 안에서 직원용 키카드를 찾았다.\n세탁실 문이 열릴 것 같다.', 5000);
      setObjective('복도 왼쪽의 직원용 세탁실을 확인하라.');
      break;
    }

    case 'mirror': {
      if (state.mirrorChecked) {
        showMessage('거울 속 방에는 침대가 없다.');
        return;
      }

      state.mirrorChecked = true;
      raiseAnomaly();

      showMessage('거울에는 당신 뒤에 서 있는 사람이 비친다.\n뒤돌아보면 아무도 없다.', 5000);
      entity.visible = true;
      entity.position.set(0, 0, 24);
      break;
    }

    case 'laundry-door': {
      if (!state.laundryUnlocked) {
        showMessage('직원용 세탁실은 잠겨 있다.');
        return;
      }

      unlockDoorMesh('laundry-door');
      showMessage('세탁실 문이 열렸다.\n안쪽에서 건조기가 돌아가는 소리가 난다.', 3600);
      setObjective('세탁실 안의 열린 세탁기를 확인하라.');
      break;
    }

    case 'washer': {
      if (state.washerChecked) {
        showMessage('세탁기 안은 비어 있다. 물만 계속 차오른다.');
        return;
      }

      state.washerChecked = true;
      raiseAnomaly();

      showMessage('세탁기 안에는 피 묻은 시트와 숙박부 한 장이 있다.\n숙박부의 이름은 당신 이름이다.', 5600);
      makeFrontWrong();
      break;
    }

    case 'front-exit': {
      if (!state.endingReady) {
        showMessage('밖은 비가 너무 세다.\n지금은 프런트를 떠날 수 없다.');
        return;
      }

      showMessage('문은 열리지 않는다.\n유리창에는 “204”가 거꾸로 적혀 있다.', 4200);
      break;
    }
  }
}

function updateEntity(delta: number): void {
  if (state.phase !== 'playing') return;
  if (!entity.visible) return;

  entity.lookAt(camera.position.x, 1.15, camera.position.z);

  const distance = entity.position.distanceTo(camera.position);

  if (distance < 1.65) {
    state.phase = 'dead';
    document.body.classList.add('dead');
    showMessage('벨을 누르지 말았어야 했다.', 999999);
    setObjective('사망.');
    return;
  }

  if (state.anomaly >= 4) {
    const direction = camera.position.clone().sub(entity.position);
    direction.y = 0;
    direction.normalize();

    const speed = 0.18 + state.anomaly * 0.035;
    entity.position.addScaledVector(direction, speed * delta);
  }
}

let pulse = 0;

function updateAtmosphere(delta: number): void {
  state.elapsed += delta;
  pulse += delta * (1.6 + state.anomaly * 0.18);

  playerLight.position.copy(camera.position);
  playerLight.intensity = 1.05 + Math.sin(pulse) * 0.08 + state.anomaly * 0.025;

  lobbyLight.intensity = 0.95 + Math.sin(pulse * 0.5) * 0.08;
  signLight.intensity = 2.3 + Math.sin(pulse * 2.1) * 0.38;
  roomMoodLight.intensity = 0.85 + Math.sin(pulse * 0.9) * 0.18;

  const fogDensity = 0.012 + state.anomaly * 0.0018;
  scene.fog = new THREE.FogExp2(0x25232a, fogDensity);

  camera.fov = 70 + Math.sin(pulse * 0.45) * Math.min(state.anomaly, 6) * 0.18;
  camera.updateProjectionMatrix();

  const minutes = Math.floor(state.elapsed / 60).toString().padStart(2, '0');
  const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
  statusEl.textContent = `CASE ${minutes}:${seconds} · ANOMALY ${state.anomaly}`;

  if (
    state.hasKey204 &&
    !state.visited204 &&
    camera.position.z > 20 &&
    camera.position.x > 0
  ) {
    window.clearTimeout(oneShotHintTimer);
    oneShotHintTimer = window.setTimeout(() => {
      if (!state.visited204) {
        showMessage('204호 문 아래에서 푸른 TV 빛이 새어 나온다.', 2200);
      }
    }, 500);
  }
}

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);

  updatePlayer(delta);
  updateEntity(delta);
  updateInteractionPrompt();
  updateAtmosphere(delta);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('click', () => {
  if (!controls.isLocked && state.phase === 'playing') {
    controls.lock();
  }
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.code === 'KeyW') input.forward = true;
  if (event.code === 'KeyS') input.backward = true;
  if (event.code === 'KeyA') input.left = true;
  if (event.code === 'KeyD') input.right = true;
  if (event.code === 'ShiftLeft') input.sprint = true;
  if (event.code === 'KeyE') interact();
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
  if (event.code === 'KeyW') input.forward = false;
  if (event.code === 'KeyS') input.backward = false;
  if (event.code === 'KeyA') input.left = false;
  if (event.code === 'KeyD') input.right = false;
  if (event.code === 'ShiftLeft') input.sprint = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

showMessage(
  '야간 근무 첫날.\n프런트에는 아무도 없고, 벨과 숙박부와 204호 키만 놓여 있다.',
  5600
);

console.log('MOTEL 204 BUILD 002');