import "./style.css";
import * as THREE from "three";

document.documentElement.dataset.page = "rpg";

const canvasNode = document.querySelector<HTMLCanvasElement>("#rpg-game");
const hpLabelNode = document.querySelector<HTMLSpanElement>("#rpg-hp");
const shardsLabelNode = document.querySelector<HTMLSpanElement>("#rpg-shards");
const waveLabelNode = document.querySelector<HTMLSpanElement>("#rpg-wave");
const statusLabelNode = document.querySelector<HTMLParagraphElement>("#rpg-status");
const slashButtonNode = document.querySelector<HTMLButtonElement>("#skill-slash");
const novaButtonNode = document.querySelector<HTMLButtonElement>("#skill-nova");

if (!canvasNode || !hpLabelNode || !shardsLabelNode || !waveLabelNode || !statusLabelNode || !slashButtonNode || !novaButtonNode) {
  throw new Error("RPG shell is missing required DOM nodes.");
}

const canvas = canvasNode;
const hpLabel = hpLabelNode;
const shardsLabel = shardsLabelNode;
const waveLabel = waveLabelNode;
const statusLabel = statusLabelNode;
const slashButton = slashButtonNode;
const novaButton = novaButtonNode;

type Enemy = {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  elite: boolean;
  hitFlash: number;
};

type Loot = {
  mesh: THREE.Mesh;
  value: number;
};

type Burst = {
  mesh: THREE.Object3D;
  ttl: number;
  maxTtl: number;
};

const ARENA_RADIUS = 11.2;
const PLAYER_SPEED = 6.2;
const ATTACK_RANGE = 1.65;
const ATTACK_DAMAGE = 18;
const PLAYER_RADIUS = 0.44;
const ENEMY_LIMIT = 7;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x100b12);
scene.fog = new THREE.Fog(0x100b12, 12, 30);

const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
camera.position.set(0, 13.5, 12.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const scratch = new THREE.Vector3();

const player = makePlayer();
scene.add(player);

const moveTarget = new THREE.Vector3(0, 0, 0);
const facing = new THREE.Vector3(0, 0, -1);
const enemies: Enemy[] = [];
const loot: Loot[] = [];
const bursts: Burst[] = [];
const keys = new Set<string>();

let hp = 100;
let shards = 0;
let wave = 1;
let kills = 0;
let spawnTimer = 0;
let attackTimer = 0;
let slashCooldown = 0;
let novaCooldown = 0;
let ended = false;
let lastTime = performance.now();

buildArena();
spawnPack(3);
resize();
requestAnimationFrame(loop);

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === "q") castSlash();
  if (event.key.toLowerCase() === "e") castNova();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener("pointerdown", (event) => {
  if (ended) return;
  const point = pointerToArena(event);
  if (!point) return;
  moveTarget.copy(clampToArena(point));
});
slashButton.addEventListener("click", castSlash);
novaButton.addEventListener("click", castNova);

function loop(now: number): void {
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!ended) {
    update(delta);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function update(delta: number): void {
  slashCooldown = Math.max(0, slashCooldown - delta);
  novaCooldown = Math.max(0, novaCooldown - delta);
  attackTimer = Math.max(0, attackTimer - delta);
  spawnTimer -= delta;

  movePlayer(delta);
  updateEnemies(delta);
  updateCombat();
  updateLoot(delta);
  updateBursts(delta);
  updateSpawns();
  updateHud();
}

function movePlayer(delta: number): void {
  const input = new THREE.Vector3(
    (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
    0,
    (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0)
  );
  if (input.lengthSq() > 0) {
    input.normalize();
    moveTarget.copy(player.position).addScaledVector(input, 1.2);
  }

  scratch.copy(moveTarget).sub(player.position);
  scratch.y = 0;
  if (scratch.lengthSq() < 0.04) return;
  scratch.normalize();
  facing.copy(scratch);
  player.position.addScaledVector(scratch, PLAYER_SPEED * delta);
  player.position.copy(clampToArena(player.position));
  player.rotation.y = Math.atan2(facing.x, facing.z);
}

function updateEnemies(delta: number): void {
  for (const enemy of enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
    const toPlayer = player.position.clone().sub(enemy.mesh.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance > enemy.radius + PLAYER_RADIUS + 0.15) {
      toPlayer.normalize();
      enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * delta);
    } else {
      hp -= enemy.damage * delta;
      addBurst(player.position, 0xd94d45, 0.22, 0.18);
    }
    enemy.mesh.lookAt(player.position.x, enemy.mesh.position.y, player.position.z);
    const body = enemy.mesh.children[0] as THREE.Mesh;
    const material = body.material as THREE.MeshStandardMaterial;
    material.emissive.setHex(enemy.hitFlash > 0 ? 0xff3b2f : enemy.elite ? 0x5c1111 : 0x140202);
  }

  if (hp <= 0) {
    ended = true;
    hp = 0;
    statusLabel.textContent = "The rift host overwhelmed the arena.";
  }
}

function updateCombat(): void {
  const target = nearestEnemy(ATTACK_RANGE);
  if (!target || attackTimer > 0) return;
  attackTimer = 0.46;
  damageEnemy(target, ATTACK_DAMAGE);
  addArc(player.position, target.mesh.position, 0xf4d77a);
  statusLabel.textContent = target.elite ? "Breaking the rift host." : "Blade contact.";
}

function updateLoot(delta: number): void {
  for (const drop of loot) {
    drop.mesh.rotation.y += delta * 3.4;
    drop.mesh.position.y = 0.38 + Math.sin(performance.now() * 0.004 + drop.value) * 0.05;
    if (drop.mesh.position.distanceTo(player.position) < 1.05) {
      shards += drop.value;
      scene.remove(drop.mesh);
      loot.splice(loot.indexOf(drop), 1);
      statusLabel.textContent = "Shard recovered.";
      return;
    }
  }
}

function updateBursts(delta: number): void {
  for (const burst of [...bursts]) {
    burst.ttl -= delta;
    const progress = 1 - burst.ttl / burst.maxTtl;
    burst.mesh.scale.setScalar(1 + progress * 2.4);
    const material = burst.mesh instanceof THREE.Mesh ? burst.mesh.material as THREE.Material & { opacity?: number } : undefined;
    if (material && "opacity" in material) material.opacity = Math.max(0, 1 - progress);
    if (burst.ttl <= 0) {
      scene.remove(burst.mesh);
      bursts.splice(bursts.indexOf(burst), 1);
    }
  }
}

function updateSpawns(): void {
  if (ended) return;
  if (kills >= 10 && !enemies.some((enemy) => enemy.elite)) {
    spawnEnemy(true);
    statusLabel.textContent = "Rift host entered the arena.";
  }
  if (spawnTimer <= 0 && enemies.length < ENEMY_LIMIT && kills < 10) {
    spawnTimer = Math.max(1.1, 2.2 - wave * 0.12);
    spawnEnemy(false);
  }
}

function castSlash(): void {
  if (ended || slashCooldown > 0) return;
  slashCooldown = 3.2;
  const origin = player.position.clone();
  let hit = 0;
  for (const enemy of enemies) {
    const toEnemy = enemy.mesh.position.clone().sub(origin);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > 3.1) continue;
    toEnemy.normalize();
    if (toEnemy.dot(facing) < 0.12) continue;
    damageEnemy(enemy, 34);
    hit += 1;
  }
  addBurst(origin.clone().addScaledVector(facing, 1.3), 0xf4d77a, 0.68, 0.34);
  statusLabel.textContent = hit ? `Rift slash hit ${hit}.` : "Slash cut empty air.";
}

function castNova(): void {
  if (ended || novaCooldown > 0) return;
  novaCooldown = 7;
  let hit = 0;
  for (const enemy of enemies) {
    if (enemy.mesh.position.distanceTo(player.position) > 3.4) continue;
    damageEnemy(enemy, 28);
    const push = enemy.mesh.position.clone().sub(player.position).setY(0).normalize();
    enemy.mesh.position.addScaledVector(push, 0.9);
    hit += 1;
  }
  addBurst(player.position, 0x9debd9, 1.05, 0.44);
  statusLabel.textContent = hit ? `Nova staggered ${hit}.` : "Nova armed the space.";
}

function damageEnemy(enemy: Enemy, amount: number): void {
  enemy.hp -= amount;
  enemy.hitFlash = 0.16;
  addBurst(enemy.mesh.position, enemy.elite ? 0xff5a43 : 0xd94d45, 0.28, 0.2);
  if (enemy.hp > 0) return;

  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  scene.remove(enemy.mesh);
  dropShard(enemy.mesh.position, enemy.elite ? 8 : 1);
  kills += enemy.elite ? 4 : 1;
  wave = Math.min(5, 1 + Math.floor(kills / 3));
  if (enemy.elite) {
    ended = true;
    statusLabel.textContent = "Rift host defeated. Arena clear.";
    addBurst(enemy.mesh.position, 0xf7df8a, 1.7, 0.8);
  }
}

function nearestEnemy(range: number): Enemy | undefined {
  let best: Enemy | undefined;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    const distance = enemy.mesh.position.distanceTo(player.position);
    if (distance < range && distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function spawnPack(count: number): void {
  for (let i = 0; i < count; i += 1) spawnEnemy(false);
}

function spawnEnemy(elite: boolean): void {
  const angle = Math.random() * Math.PI * 2;
  const radius = ARENA_RADIUS - 1.2;
  const mesh = makeEnemy(elite);
  mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  scene.add(mesh);
  enemies.push({
    mesh,
    hp: elite ? 220 : 54 + wave * 8,
    maxHp: elite ? 220 : 54 + wave * 8,
    speed: elite ? 1.45 : 1.22 + wave * 0.05,
    damage: elite ? 6.5 : 1.2 + wave * 0.25,
    radius: elite ? 0.82 : 0.48,
    elite,
    hitFlash: 0
  });
}

function dropShard(position: THREE.Vector3, value: number): void {
  const geometry = new THREE.OctahedronGeometry(value > 1 ? 0.34 : 0.22);
  const material = new THREE.MeshStandardMaterial({
    color: value > 1 ? 0xf7df8a : 0x9debd9,
    emissive: value > 1 ? 0x7a4d14 : 0x14534b,
    roughness: 0.34
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position).setY(0.4);
  mesh.castShadow = true;
  scene.add(mesh);
  loot.push({ mesh, value });
}

function makePlayer(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.72, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x39484a, emissive: 0x071115, roughness: 0.72 })
  );
  body.position.y = 0.78;
  body.castShadow = true;
  group.add(body);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 1.08),
    new THREE.MeshStandardMaterial({ color: 0xded7bd, emissive: 0x4b3b18, roughness: 0.28 })
  );
  blade.position.set(0.48, 0.86, 0.14);
  blade.rotation.y = 0.2;
  group.add(blade);
  const mantle = new THREE.Mesh(
    new THREE.ConeGeometry(0.46, 0.92, 5),
    new THREE.MeshStandardMaterial({ color: 0x6d1f2b, roughness: 0.84 })
  );
  mantle.position.set(0, 0.38, 0.18);
  mantle.rotation.x = Math.PI;
  group.add(mantle);
  return group;
}

function makeEnemy(elite: boolean): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    elite ? new THREE.DodecahedronGeometry(0.9) : new THREE.IcosahedronGeometry(0.52, 0),
    new THREE.MeshStandardMaterial({
      color: elite ? 0x24141a : 0x1a1415,
      emissive: elite ? 0x5c1111 : 0x140202,
      roughness: 0.78
    })
  );
  body.position.y = elite ? 0.9 : 0.55;
  body.castShadow = true;
  group.add(body);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(elite ? 0.12 : 0.07, 12, 8),
    new THREE.MeshBasicMaterial({ color: elite ? 0xff5a43 : 0xd94d45 })
  );
  eye.position.set(0, elite ? 0.96 : 0.6, elite ? -0.8 : -0.5);
  group.add(eye);
  return group;
}

function buildArena(): void {
  scene.add(new THREE.HemisphereLight(0xb6a38a, 0x08060a, 1.8));
  const key = new THREE.DirectionalLight(0xffd48a, 3.4);
  key.position.set(-5, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rift = new THREE.PointLight(0xb75aff, 4, 12);
  rift.position.set(0, 3.2, -5);
  scene.add(rift);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 0.28, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a2324, roughness: 0.88 })
  );
  floor.receiveShadow = true;
  floor.position.y = -0.16;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_RADIUS * 0.88, 0.05, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x9debd9, transparent: true, opacity: 0.38 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  scene.add(ring);

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const height = 1.8 + (i % 3) * 0.22;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, height, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x3a3031, roughness: 0.92 })
    );
    pillar.position.set(Math.cos(angle) * 10.2, height / 2 - 0.1, Math.sin(angle) * 10.2);
    pillar.rotation.y = angle;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  }

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.08, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0xb75aff, transparent: true, opacity: 0.68 })
  );
  portal.position.set(0, 1.35, -5.8);
  scene.add(portal);
}

function addBurst(position: THREE.Vector3, color: number, size: number, ttl: number): void {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.34, size, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  mesh.position.copy(position).setY(0.045);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
  bursts.push({ mesh, ttl, maxTtl: ttl });
}

function addArc(from: THREE.Vector3, to: THREE.Vector3, color: number): void {
  const mid = from.clone().lerp(to, 0.5).setY(0.8);
  const length = Math.max(0.6, from.distanceTo(to));
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, length),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  mesh.position.copy(mid);
  mesh.lookAt(to.x, mid.y, to.z);
  scene.add(mesh);
  bursts.push({ mesh, ttl: 0.16, maxTtl: 0.16 });
}

function pointerToArena(event: PointerEvent): THREE.Vector3 | undefined {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3()) ?? undefined;
}

function clampToArena(point: THREE.Vector3): THREE.Vector3 {
  const next = point.clone();
  next.y = 0;
  if (next.length() > ARENA_RADIUS - 0.8) next.setLength(ARENA_RADIUS - 0.8);
  return next;
}

function updateHud(): void {
  hpLabel.textContent = `HP ${Math.ceil(hp)}`;
  shardsLabel.textContent = `Shards ${shards}`;
  waveLabel.textContent = ended && hp > 0 ? "Clear" : `Wave ${wave}`;
  slashButton.textContent = slashCooldown > 0 ? `Q ${slashCooldown.toFixed(1)}` : "Q Slash";
  novaButton.textContent = novaCooldown > 0 ? `E ${novaCooldown.toFixed(1)}` : "E Nova";
  slashButton.disabled = slashCooldown > 0 || ended;
  novaButton.disabled = novaCooldown > 0 || ended;
}

function resize(): void {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
