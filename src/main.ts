import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

type GamePhase = 'playing' | 'dead' | 'escaped';
type InteractableType = 'key' | 'door';

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

interface GameState {
  phase: GamePhase;
  fear: number;
  hasKey: boolean;
}

type InteractableMesh = THREE.Mesh & {
  userData: THREE.Mesh['userData'] & {
    type: InteractableType;
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
const fearEl = getRequiredElement<HTMLDivElement>('#fear');
const messageEl = getRequiredElement<HTMLDivElement>('#message');
const crosshairEl = getRequiredElement<HTMLDivElement>('#crosshair');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101317);
scene.fog = new THREE.FogExp2(0x101317, 0.055);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.05,
  90
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));

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
  fear: 0,
  hasKey: false,
};

const walls: THREE.Mesh[] = [];
const interactables: InteractableMesh[] = [];

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2d2c,
  roughness: 1,
  metalness: 0,
});

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x171918,
  roughness: 1,
  metalness: 0,
});

const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b2118,
  roughness: 1,
});

const keyMaterial = new THREE.MeshBasicMaterial({
  color: 0xb8ad76,
});

const entityMaterial = new THREE.MeshBasicMaterial({
  color: 0x030303,
});

const map = [
  '############',
  '#S.........#',
  '#.####.###.#',
  '#.#....#...#',
  '#.#.####.#.#',
  '#.#......#K#',
  '#.######.#.#',
  '#........#.#',
  '####.#####.#',
  '#..........#',
  '#....D.....#',
  '############',
];

const cellSize = 3;

let messageTimer = 0;

function showMessage(text: string, ms = 2400): void {
  messageEl.textContent = text;

  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    messageEl.textContent = '';
  }, ms);
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

function gridToWorld(col: number, row: number): THREE.Vector3 {
  return new THREE.Vector3(col * cellSize, 0, row * cellSize);
}

function createWorld(): void {
  for (let row = 0; row < map.length; row++) {
    const mapRow = map[row];
    if (!mapRow) continue;

    for (let col = 0; col < mapRow.length; col++) {
      const tile = mapRow[col];
      if (!tile) continue;

      const position = gridToWorld(col, row);

      createBox(
        position.x,
        -0.05,
        position.z,
        cellSize,
        0.1,
        cellSize,
        floorMaterial
      );

      if (tile === '#') {
        const wall = createBox(
          position.x,
          1.55,
          position.z,
          cellSize,
          3.1,
          cellSize,
          wallMaterial
        );
        walls.push(wall);
      }

      if (tile === 'S') {
        camera.position.set(position.x, 1.55, position.z);
      }

      if (tile === 'K') {
        const key = createBox(
          position.x,
          0.65,
          position.z,
          0.38,
          0.38,
          0.38,
          keyMaterial
        ) as InteractableMesh;

        key.userData.type = 'key';
        interactables.push(key);
      }

      if (tile === 'D') {
        const door = createBox(
          position.x,
          1.35,
          position.z,
          2.4,
          2.7,
          0.36,
          doorMaterial
        ) as InteractableMesh;

        door.userData.type = 'door';
        interactables.push(door);
        walls.push(door);
      }
    }
  }
}

createWorld();

const ambientLight = new THREE.AmbientLight(0x8a8f94, 0.55);
scene.add(ambientLight);

const playerLight = new THREE.PointLight(0xffe0a3, 2.2, 13, 1.6);
scene.add(playerLight);

const redLight = new THREE.PointLight(0xb23a32, 1.1, 10, 1.8);
redLight.position.set(27, 1.3, 27);
scene.add(redLight);

const entity = new THREE.Group();

const entityBody = createBox(0, 0.9, 0, 0.45, 1.8, 0.25, entityMaterial);
const entityHead = createBox(0, 1.95, 0, 0.58, 0.58, 0.32, entityMaterial);

entity.add(entityBody);
entity.add(entityHead);
scene.add(entity);

entity.position.set(27, 0, 3);
entity.visible = false;

function canMoveTo(nextPosition: THREE.Vector3): boolean {
  const radius = 0.45;
  const playerPoint = new THREE.Vector3(nextPosition.x, 1.2, nextPosition.z);

  for (const wall of walls) {
    if (wall.userData.type === 'door' && state.hasKey) continue;

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

  const speed = input.sprint ? 5.1 : 3.1;

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

function isLookingAt(target: THREE.Vector3, threshold = 0.82): boolean {
  camera.getWorldDirection(forward);

  const toTarget = target.clone().sub(camera.position).normalize();
  return forward.dot(toTarget) > threshold;
}

function updateEntity(delta: number): void {
  if (state.phase !== 'playing') return;

  const distance = entity.position.distanceTo(camera.position);
  const lookingAtEntity = entity.visible && isLookingAt(entity.position, 0.82);

  if (state.fear > 28 || distance < 10) {
    entity.visible = true;
  }

  if (entity.visible && !lookingAtEntity && distance > 2.0) {
    const direction = camera.position.clone().sub(entity.position);
    direction.y = 0;
    direction.normalize();

    const speed = 0.42 + state.fear / 75;
    entity.position.addScaledVector(direction, speed * delta);
  }

  if (entity.visible && lookingAtEntity) {
    state.fear += delta * 12;
  } else {
    state.fear += delta * 1.1;
  }

  if (distance < 1.45) {
    state.phase = 'dead';
    document.body.classList.add('dead');
    showMessage('너는 그것을 너무 오래 인식했다.', 999999);
  }

  if (!entity.visible && Math.random() < delta * 0.18) {
    const spawnPoints = [
      new THREE.Vector3(27, 0, 3),
      new THREE.Vector3(6, 0, 21),
      new THREE.Vector3(30, 0, 27),
      new THREE.Vector3(12, 0, 30),
    ];

    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    if (!spawn) return;

    entity.position.copy(spawn);
    entity.visible = true;

    window.setTimeout(() => {
      if (!isLookingAt(entity.position, 0.72)) {
        entity.visible = false;
      }
    }, 1200);
  }

  entity.lookAt(camera.position.x, 1.15, camera.position.z);
}

function getFocusedInteractable(): InteractableMesh | null {
  raycaster.setFromCamera(screenCenter, camera);

  const hits = raycaster.intersectObjects(interactables, false);
  if (!hits.length) return null;

  const hit = hits[0];

  if (hit.distance > 2.4) return null;

  return hit.object as InteractableMesh;
}

function updateInteractionPrompt(): void {
  if (state.phase !== 'playing') return;

  const focused = getFocusedInteractable();

  crosshairEl.classList.toggle('active', Boolean(focused));

  if (!focused) return;

  if (focused.userData.type === 'key') {
    messageEl.textContent = 'E: 녹슨 열쇠를 집는다';
  }

  if (focused.userData.type === 'door') {
    messageEl.textContent = state.hasKey ? 'E: 문을 연다' : '문은 잠겨 있다';
  }
}

function interact(): void {
  if (state.phase !== 'playing') return;

  const focused = getFocusedInteractable();
  if (!focused) return;

  if (focused.userData.type === 'key') {
    state.hasKey = true;
    state.fear += 24;

    scene.remove(focused);
    interactables.splice(interactables.indexOf(focused), 1);

    entity.visible = true;
    entity.position.set(camera.position.x - 3, 0, camera.position.z - 4);

    showMessage('열쇠를 얻었다. 뒤에서 무언가 움직였다.');
    return;
  }

  if (focused.userData.type === 'door') {
    if (!state.hasKey) {
      state.fear += 8;
      showMessage('잠겨 있다.');
      return;
    }

    focused.visible = false;
    const wallIndex = walls.indexOf(focused);
    if (wallIndex >= 0) {
      walls.splice(wallIndex, 1);
    }

    state.phase = 'escaped';
    document.body.classList.add('escaped');

    showMessage('밖이다. 그런데 복도는 계속된다.', 999999);
  }
}

let pulse = 0;

function updateAtmosphere(delta: number): void {
  pulse += delta * (2.2 + state.fear / 22);

  state.fear = THREE.MathUtils.clamp(state.fear, 0, 100);

  playerLight.position.copy(camera.position);
  playerLight.intensity = 1.0 + Math.sin(pulse) * 0.17 + state.fear / 145;

  camera.fov = 68 + Math.sin(pulse * 0.7) * Math.min(state.fear / 20, 4);
  camera.updateProjectionMatrix();

  fearEl.textContent = `FEAR ${Math.floor(state.fear)}`;
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

showMessage('클릭해서 들어가라. 열쇠를 찾고 문을 열어라.', 4000);