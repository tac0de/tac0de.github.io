import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

type GamePhase = 'playing' | 'ending' | 'dead';

type InteractableType =
  | 'front-desk'
  | 'room-204-key'
  | 'door-204'
  | 'blood'
  | 'guestbook'
  | 'tv'
  | 'bathroom';

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
  hasRoom204Key: boolean;
  entered204: boolean;
  cluesFound: number;
  hallwayShifted: boolean;
  frontChanged: boolean;
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
const crosshairEl = getRequiredElement<HTMLDivElement>('#crosshair');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20242a);
scene.fog = new THREE.FogExp2(0x20242a, 0.018);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.05,
  120
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
  anomaly: 0,
  hasRoom204Key: false,
  entered204: false,
  cluesFound: 0,
  hallwayShifted: false,
  frontChanged: false,
};

const walls: THREE.Mesh[] = [];
const interactables: InteractableMesh[] = [];

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a665f,
  roughness: 1,
  metalness: 0,
});

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a4842,
  roughness: 1,
  metalness: 0,
});

const carpetMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a2d35,
  roughness: 1,
  metalness: 0,
});

const deskMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b432b,
  roughness: 1,
  metalness: 0,
});

const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x7a4a2f,
  roughness: 1,
  metalness: 0,
});

const roomMaterial = new THREE.MeshStandardMaterial({
  color: 0x5c626b,
  roughness: 1,
  metalness: 0,
});

const bloodMaterial = new THREE.MeshBasicMaterial({
  color: 0x5b0505,
});

const keyMaterial = new THREE.MeshBasicMaterial({
  color: 0xd8c072,
});

const paperMaterial = new THREE.MeshBasicMaterial({
  color: 0xd8cfaa,
});

const tvMaterial = new THREE.MeshBasicMaterial({
  color: 0x9fb6c8,
});

const entityMaterial = new THREE.MeshBasicMaterial({
  color: 0x040404,
});

let messageTimer = 0;

function showMessage(text: string, ms = 2800): void {
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

function addWall(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  material = wallMaterial
): THREE.Mesh {
  const wall = createBox(x, y, z, sx, sy, sz, material);
  walls.push(wall);
  return wall;
}

function createSignTextLikeBlocks(
  x: number,
  y: number,
  z: number,
  textLength: number,
  material: THREE.Material
): void {
  for (let i = 0; i < textLength; i++) {
    createBox(
      x + i * 0.22,
      y,
      z,
      0.12 + Math.random() * 0.08,
      0.18,
      0.04,
      material
    );
  }
}

function createDoorPlate(x: number, y: number, z: number): void {
  createBox(x, y, z, 0.55, 0.25, 0.04, paperMaterial);
  createSignTextLikeBlocks(x - 0.18, y + 0.02, z - 0.03, 3, bloodMaterial);
}

function createLamp(x: number, y: number, z: number): void {
  createBox(x, y, z, 0.22, 0.8, 0.22, deskMaterial);
  createBox(x, y + 0.55, z, 0.8, 0.35, 0.8, paperMaterial);

  const lampLight = new THREE.PointLight(0xffd18a, 0.75, 6, 1.8);
  lampLight.position.set(x, y + 0.75, z);
  scene.add(lampLight);
}

function createTrash(x: number, z: number): void {
  createBox(x, 0.22, z, 0.45, 0.44, 0.45, wallMaterial);
  createBox(x + 0.32, 0.08, z - 0.18, 0.42, 0.08, 0.24, paperMaterial);
  createBox(x - 0.25, 0.07, z + 0.22, 0.32, 0.07, 0.2, paperMaterial);
}

function createBed(x: number, z: number): void {
  createBox(x, 0.45, z, 3.2, 0.9, 1.8, deskMaterial);
  createBox(x - 0.8, 1.0, z - 0.45, 1.0, 0.22, 0.7, paperMaterial);
  createBox(x + 0.35, 1.02, z + 0.1, 1.8, 0.16, 1.2, carpetMaterial);
}

function createNeonMotelSign(): void {
  createBox(0, 3.4, -5.85, 5.2, 1.1, 0.12, tvMaterial);
  createSignTextLikeBlocks(-1.6, 3.48, -5.94, 16, keyMaterial);
}

function createMotel(): void {
  // Floor zones
  createBox(0, -0.05, 0, 18, 0.1, 12, floorMaterial); // front desk
  createBox(0, -0.04, 12, 7, 0.1, 28, carpetMaterial); // hallway
  createBox(7, -0.05, 24, 10, 0.1, 10, roomMaterial); // room 204

  // Motel sign
  createNeonMotelSign();

  // Lobby props
  createLamp(-3.4, 0.75, -3.5);
  createLamp(3.4, 0.75, -3.5);
  createTrash(-7.4, 3.8);
  createTrash(7.3, 4.2);

  // Wall frames / cheap motel posters
  createBox(-8.75, 1.7, -2.2, 0.08, 1.0, 1.4, paperMaterial);
  createBox(8.75, 1.7, -1.2, 0.08, 1.0, 1.4, paperMaterial);
  createBox(-4.8, 1.8, -5.75, 1.5, 0.8, 0.08, tvMaterial);
  createBox(4.8, 1.8, -5.75, 1.5, 0.8, 0.08, tvMaterial);

  // Hallway ceiling lights
  for (let i = 0; i < 6; i++) {
    const z = 8 + i * 4;
    createBox(0, 2.92, z, 1.1, 0.08, 0.5, paperMaterial);

    const hallLight = new THREE.PointLight(0xffd9a0, 0.45, 7, 1.6);
    hallLight.position.set(0, 2.6, z);
    scene.add(hallLight);
  }

  // Door plates for fake rooms
  for (let i = 0; i < 4; i++) {
    const z = 10 + i * 4.4;
    createDoorPlate(-3.42, 1.85, z);
    createDoorPlate(3.42, 1.85, z + 2);
  }

  // Room 204 more visible props
  createBed(7.5, 21.1);
  createLamp(4.3, 0.7, 22.2);
  createTrash(11.0, 22.2);
  createBox(6.2, 0.75, 26.2, 1.2, 1.5, 0.6, doorMaterial); // dresser
  createBox(8.9, 1.2, 28.75, 1.4, 1.0, 0.1, tvMaterial); // bright TV

  // Front desk room boundaries
  addWall(0, 1.5, -6, 18, 3, 0.4);
  addWall(-9, 1.5, 0, 0.4, 3, 12);
  addWall(9, 1.5, 0, 0.4, 3, 12);
  addWall(-5.5, 1.5, 6, 7, 3, 0.4);
  addWall(5.5, 1.5, 6, 7, 3, 0.4);

  // Hallway boundaries
  addWall(-3.7, 1.5, 18, 0.4, 3, 24);
  addWall(3.7, 1.5, 18, 0.4, 3, 24);

  // Back wall near room 204
  addWall(0, 1.5, 32, 7.4, 3, 0.4);

  // Room 204 boundaries
  addWall(7, 1.5, 19, 10, 3, 0.4);
  addWall(7, 1.5, 29, 10, 3, 0.4);
  addWall(12, 1.5, 24, 0.4, 3, 10);
  addWall(2, 1.5, 21.5, 0.4, 3, 5);
  addWall(2, 1.5, 27.5, 0.4, 3, 3);

  // Front desk furniture
  createBox(0, 0.55, -2.2, 5.5, 1.1, 1.2, deskMaterial);
  createBox(-2.1, 1.3, -2.2, 0.8, 0.35, 0.25, paperMaterial);

  createInteractable(
    'front-desk',
    '프런트 숙박부를 확인한다',
    -2.1,
    1.58,
    -2.2,
    0.7,
    0.12,
    0.35,
    paperMaterial
  );

  createInteractable(
    'room-204-key',
    '204호 키를 집는다',
    1.6,
    1.25,
    -2.25,
    0.42,
    0.08,
    0.18,
    keyMaterial
  );

  // Fake room doors in hallway
  for (let i = 0; i < 4; i++) {
    const z = 10 + i * 4.4;
    createBox(-3.48, 1.2, z, 0.12, 2.2, 1.9, doorMaterial);
    createBox(3.48, 1.2, z + 2, 0.12, 2.2, 1.9, doorMaterial);
  }

  // Room 204 actual door
  createInteractable(
    'door-204',
    '204호 문을 연다',
    2.08,
    1.25,
    24.5,
    0.14,
    2.35,
    1.8,
    doorMaterial
  );
  createBox(10.5, 0.55, 26.7, 1.5, 1.1, 2.0, floorMaterial); // bathtub
  createBox(5.4, 1.4, 28.75, 1.9, 1.1, 0.12, tvMaterial); // TV

  createInteractable(
    'blood',
    '침대 아래 얼룩을 조사한다',
    7.2,
    0.05,
    22.35,
    1.7,
    0.05,
    0.8,
    bloodMaterial
  );

  createInteractable(
    'bathroom',
    '욕조 안을 확인한다',
    10.5,
    1.18,
    26.7,
    1.15,
    0.12,
    1.5,
    bloodMaterial
  );

  createInteractable(
    'tv',
    '꺼진 TV를 본다',
    5.4,
    1.4,
    28.6,
    1.8,
    0.9,
    0.1,
    tvMaterial
  );

  createInteractable(
    'guestbook',
    '찢어진 숙박부 조각을 읽는다',
    8.3,
    0.95,
    21.1,
    0.65,
    0.08,
    0.42,
    paperMaterial
  );

  camera.position.set(0, 1.55, 1.5);
  camera.lookAt(0, 1.4, 8);
}

createMotel();

const ambientLight = new THREE.AmbientLight(0xc8c8c8, 0.95);
scene.add(ambientLight);

const playerLight = new THREE.PointLight(0xffe2b0, 1.4, 18, 1.4);
scene.add(playerLight);

const motelSignLight = new THREE.PointLight(0xff3355, 2.4, 24, 1.5);
motelSignLight.position.set(0, 3.2, -5.2);
scene.add(motelSignLight);

const room204Light = new THREE.PointLight(0x9fd1ff, 1.7, 18, 1.5);
room204Light.position.set(7, 2.4, 24);
scene.add(room204Light);

const entity = new THREE.Group();
const entityBody = createBox(0, 0.9, 0, 0.42, 1.8, 0.22, entityMaterial);
const entityHead = createBox(0, 1.95, 0, 0.55, 0.55, 0.28, entityMaterial);
entity.add(entityBody);
entity.add(entityHead);
scene.add(entity);
entity.position.set(0, 0, 30);
entity.visible = false;

function canMoveTo(nextPosition: THREE.Vector3): boolean {
  const radius = 0.45;
  const playerPoint = new THREE.Vector3(nextPosition.x, 1.2, nextPosition.z);

  for (const wall of walls) {
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

  const speed = input.sprint ? 5.0 : 3.0;

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

function isNearRoom204Entrance(): boolean {
  return camera.position.z > 22 && camera.position.z < 27 && camera.position.x > 1;
}

function shiftHallway(): void {
  if (state.hallwayShifted) return;

  state.hallwayShifted = true;
  state.anomaly += 1;

  addWall(0, 1.5, 11.5, 4.4, 3, 0.35, wallMaterial);

  const falseDoor = createBox(0, 1.2, 11.32, 1.7, 2.2, 0.12, doorMaterial);
  falseDoor.rotation.y = 0;

  showMessage('방금 지나온 복도에 없던 문이 생겼다.', 4200);
}

function changeFrontDesk(): void {
  if (state.frontChanged) return;

  state.frontChanged = true;
  state.anomaly += 1;

  createBox(0, 1.3, -2.85, 3.0, 0.18, 0.14, bloodMaterial);
  createBox(2.5, 1.48, -2.2, 0.65, 0.08, 0.42, paperMaterial);

  showMessage('프런트의 숙박부가 젖어 있다. 마지막 서명은 당신 이름이다.', 4800);
}

function addClue(mesh: InteractableMesh, text: string): void {
  if (mesh.userData.used) {
    showMessage('이미 확인했다.');
    return;
  }

  mesh.userData.used = true;
  state.cluesFound += 1;
  state.anomaly += 1;

  showMessage(text, 4200);

  if (state.cluesFound === 1) {
    shiftHallway();
  }

  if (state.cluesFound === 2) {
    entity.visible = true;
    entity.position.set(0, 0, 17.5);
    showMessage(`${text}\n복도 끝에 사람이 서 있다.`, 5200);
  }

  if (state.cluesFound >= 3) {
    changeFrontDesk();
  }
}

function enterRoom204(): void {
  if (!state.hasRoom204Key) {
    showMessage('204호는 잠겨 있다. 프런트에 키가 있을 것이다.');
    return;
  }

  if (!state.entered204) {
    state.entered204 = true;
    state.anomaly += 1;
    showMessage('204호. 방 안은 정리되어 있다. 그래서 더 이상하다.', 4200);
    return;
  }

  showMessage('204호는 방금보다 좁아진 것 같다.');
}

function interact(): void {
  if (state.phase !== 'playing') return;

  const focused = getFocusedInteractable();
  if (!focused) return;

  switch (focused.userData.type) {
    case 'front-desk': {
      if (!state.hasRoom204Key) {
        showMessage('숙박부에는 204호만 비어 있다. 키가 카운터 위에 놓여 있다.');
      } else if (state.cluesFound >= 3) {
        state.phase = 'ending';
        document.body.classList.add('ending');
        showMessage('숙박부 마지막 줄: “204호 손님은 이미 체크아웃했다.”', 999999);
      } else {
        showMessage('프런트에는 아무도 없다. 오래된 벨만 놓여 있다.');
      }
      break;
    }

    case 'room-204-key': {
      if (focused.userData.used) {
        showMessage('이미 204호 키를 가지고 있다.');
        return;
      }

      focused.userData.used = true;
      focused.visible = false;
      state.hasRoom204Key = true;
      state.anomaly += 1;
      showMessage('204호 키를 얻었다. 뒤쪽 복도 조명이 켜졌다.', 3800);
      break;
    }

    case 'door-204': {
      enterRoom204();
      break;
    }

    case 'blood': {
      addClue(
        focused,
        '침대 아래 얼룩은 오래된 피가 아니다. 아직 따뜻하다.'
      );
      break;
    }

    case 'bathroom': {
      addClue(
        focused,
        '욕조 물속에 객실 카드가 가라앉아 있다. 카드 번호는 204가 아니다.'
      );
      break;
    }

    case 'tv': {
      addClue(
        focused,
        'TV 화면에는 프런트가 비친다. 화면 속 당신은 움직이지 않는다.'
      );
      break;
    }

    case 'guestbook': {
      addClue(
        focused,
        '찢어진 숙박부 조각에는 같은 이름이 여러 번 반복되어 있다.'
      );
      break;
    }
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
  if (!hit || hit.distance > 2.6) {
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

function updateEntity(delta: number): void {
  if (state.phase !== 'playing') return;
  if (!entity.visible) return;

  entity.lookAt(camera.position.x, 1.2, camera.position.z);

  const distance = entity.position.distanceTo(camera.position);

  if (distance < 2.1) {
    state.phase = 'dead';
    document.body.classList.add('dead');
    showMessage('문을 닫았어야 했다.', 999999);
    return;
  }

  if (state.cluesFound >= 2) {
    const direction = camera.position.clone().sub(entity.position);
    direction.y = 0;
    direction.normalize();

    const speed = 0.28 + state.anomaly * 0.08;
    entity.position.addScaledVector(direction, speed * delta);
  }
}

let pulse = 0;

function updateAtmosphere(delta: number): void {
  pulse += delta * (2.1 + state.anomaly * 0.35);

  playerLight.position.copy(camera.position);
  playerLight.intensity =
    1.9 + Math.sin(pulse) * 0.16 + state.anomaly * 0.08;

  room204Light.intensity =
    1.0 + Math.sin(pulse * 0.7) * 0.18 + state.anomaly * 0.04;

  motelSignLight.intensity = 1.0 + Math.sin(pulse * 1.4) * 0.28;

  scene.fog = new THREE.FogExp2(0x101317, 0.045 + state.anomaly * 0.006);

  camera.fov = 68 + Math.sin(pulse * 0.6) * Math.min(state.anomaly, 4) * 0.35;
  camera.updateProjectionMatrix();

  statusEl.textContent = `ANOMALY ${state.anomaly}`;

  if (isNearRoom204Entrance() && state.hasRoom204Key && !state.entered204) {
    showMessage('문 아래에서 물이 새고 있다.', 1800);
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
  '야간 근무 첫날. 프런트에는 아무도 없다. 204호 키만 남아 있다.',
  5200
);

console.log('MOTEL 204 BUILD 001');