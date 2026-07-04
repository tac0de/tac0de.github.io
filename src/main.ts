import "./style.css";
import * as THREE from "three";

const canvasNode = document.querySelector<HTMLCanvasElement>("#game");
const stickNode = document.querySelector<HTMLDivElement>("#stick");
const stickKnobNode = document.querySelector<HTMLDivElement>("#stick-knob");
const signalLabelNode = document.querySelector<HTMLSpanElement>("#signal");
const zoneLabelNode = document.querySelector<HTMLSpanElement>("#zone");
const beaconNode = document.querySelector<HTMLDivElement>("#beacon");
const statusNode = document.querySelector<HTMLDivElement>("#status");

if (!canvasNode || !stickNode || !stickKnobNode || !signalLabelNode || !zoneLabelNode || !beaconNode || !statusNode) {
  throw new Error("Game shell is missing required DOM nodes.");
}

const canvas = canvasNode;
const stick = stickNode;
const stickKnob = stickKnobNode;
const signalLabel = signalLabelNode;
const zoneLabel = zoneLabelNode;
const beacon = beaconNode;
const statusText = statusNode;

const TILE = 4;
const WALL_HEIGHT = 3.1;
const CHUNK_SIZE = 8;
const CHUNK_RADIUS = 2;
const MAX_INSTANCES = 960;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 4.15;
const LOOK_SENSITIVITY = 0.0032;
const LOFI_RENDER_SCALE = 0.42;
const EXIT_RADIUS = 1.45;
const MAX_PROPS = 520;

const AUDIO_PROFILE = {
  masterVolume: 0.22,
  humFrequency: 49,
  humVolume: 0.22,
  humLowpass: 140,
  noiseVolume: 0.025,
  noiseBandpass: 820,
  dangerHumBoost: 0.22,
  dangerNoiseBoost: 0.08,
  blackoutNoiseBoost: 0.16
};

const LEVEL_THEMES = [
  {
    label: "LEVEL 0",
    hint: "Find the humming exit",
    fogColor: 0x17140b,
    fogDensity: 0.036,
    palette: 7,
    blackoutStart: 0.28,
    wallColor: 0xd9c766,
    floorColor: 0x6f6440,
    ceilingColor: 0xbba956,
    lampColor: 0xf7df8a,
    exitCell: { x: 7, z: 0 },
    echoCells: [
      { x: 2, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 6 }
    ],
    signalNoise: 0.05
  },
  {
    label: "LOST TIME",
    hint: "Follow the wrong signal",
    fogColor: 0x11171a,
    fogDensity: 0.033,
    palette: 6,
    blackoutStart: 0.34,
    wallColor: 0x81928a,
    floorColor: 0x303d3c,
    ceilingColor: 0x52645d,
    lampColor: 0x9cc9c0,
    exitCell: { x: 7, z: 7 },
    echoCells: [
      { x: 2, z: 2 },
      { x: 5, z: 1 },
      { x: 1, z: 6 }
    ],
    signalNoise: 0.22
  }
];

type Cell = {
  x: number;
  z: number;
  open: boolean;
  exit: boolean;
  echo: boolean;
  landmark: boolean;
};

type Chunk = {
  key: string;
  cx: number;
  cz: number;
  cells: Cell[];
};

type TouchRole = "move" | "look";

class AudioDirector {
  private ctx: AudioContext;
  private master: GainNode;
  private humGain: GainNode;
  private noiseGain: GainNode;
  private panicGain: GainNode;
  private panner: StereoPannerNode;
  private dropoutUntil = 0;
  private stepAccumulator = 0;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = AUDIO_PROFILE.masterVolume;
    this.master.connect(this.ctx.destination);

    this.panner = this.ctx.createStereoPanner();
    this.panner.connect(this.master);

    const hum = this.ctx.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = AUDIO_PROFILE.humFrequency;
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.value = AUDIO_PROFILE.humLowpass;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = AUDIO_PROFILE.humVolume;
    hum.connect(humFilter);
    humFilter.connect(this.humGain);
    this.humGain.connect(this.panner);
    hum.start();

    const panic = this.ctx.createOscillator();
    panic.type = "triangle";
    panic.frequency.value = AUDIO_PROFILE.humFrequency * 1.41;
    this.panicGain = this.ctx.createGain();
    this.panicGain.gain.value = 0;
    panic.connect(this.panicGain);
    this.panicGain.connect(this.panner);
    panic.start();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.makeNoiseBuffer(2);
    noise.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = AUDIO_PROFILE.noiseBandpass;
    noiseFilter.Q.value = 0.8;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = AUDIO_PROFILE.noiseVolume;
    noise.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.panner);
    noise.start();
  }

  resume(): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  update(args: {
    time: number;
    danger: number;
    blackout: number;
    speed: number;
    level: number;
    transitioning: boolean;
  }): void {
    this.resume();
    const now = this.ctx.currentTime;
    const drop = args.time < this.dropoutUntil ? 0.04 : 1;
    const lostTime = args.level % 2 === 1 ? 1 : 0;

    this.humGain.gain.setTargetAtTime(
      (AUDIO_PROFILE.humVolume + args.danger * AUDIO_PROFILE.dangerHumBoost + lostTime * 0.08) * drop,
      now,
      0.08
    );
    this.noiseGain.gain.setTargetAtTime(
      (
        AUDIO_PROFILE.noiseVolume +
        args.danger * AUDIO_PROFILE.dangerNoiseBoost +
        args.blackout * AUDIO_PROFILE.blackoutNoiseBoost +
        lostTime * 0.035
      ) * drop,
      now,
      0.04
    );
    this.panicGain.gain.setTargetAtTime((Math.max(0, args.danger - 0.55) * 0.08 + lostTime * 0.018) * drop, now, 0.09);
    this.panner.pan.setTargetAtTime(Math.sin(args.time * (lostTime ? 1.7 : 0.7)) * args.danger * 0.42, now, 0.1);

    this.stepAccumulator += args.speed * 0.9;
    if (!args.transitioning && this.stepAccumulator > 1) {
      this.stepAccumulator = 0;
      this.playFootstep(lostTime);
    }

    if (!args.transitioning && args.danger > 0.66 && Math.random() < 0.008) {
      this.triggerDropout(0.08 + Math.random() * 0.18, args.time);
    }
  }

  triggerDropout(duration: number, time: number): void {
    this.dropoutUntil = time + duration;
  }

  private playFootstep(lostTime: number): void {
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.makeNoiseBuffer(0.05);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lostTime ? 520 : 360;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(lostTime ? 0.07 : 0.045, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.panner);
    source.start(now);
    source.stop(now + 0.11);
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * seconds)), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17140b);
scene.fog = new THREE.FogExp2(0x17140b, 0.036);

const camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.05, 82);
camera.position.set(0, 1.55, 0);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;

const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let renderTarget = makeRenderTarget(320, 180);
const postMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: renderTarget.texture },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(320, 180) },
    uNoise: { value: 0.18 },
    uBlackout: { value: 0 },
    uPalette: { value: 7.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uNoise;
    uniform float uBlackout;
    uniform float uPalette;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      float scan = floor(uv.y * uResolution.y);
      float tear = step(0.985, hash(vec2(floor(uTime * 9.0), scan * 0.07)));
      uv.x += sin(uv.y * 75.0 + uTime * 8.0) * 0.0025;
      uv.x += tear * sin(uTime * 40.0) * 0.035;

      vec3 color;
      color.r = texture2D(tDiffuse, uv + vec2(0.0022, 0.0)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(0.0022, 0.0)).b;

      float n = hash(floor(uv * uResolution.xy) + floor(uTime * 24.0));
      color += (n - 0.5) * uNoise;
      color *= 0.86 + 0.14 * sin(scan * 3.14159);
      color = floor(max(color, vec3(0.0)) * uPalette) / uPalette;
      color *= 1.0 - smoothstep(0.3, 1.05, uBlackout);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  depthWrite: false,
  depthTest: false
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

const ambient = new THREE.HemisphereLight(0xf1dd92, 0x19140a, 1.45);
scene.add(ambient);

const playerLamp = new THREE.PointLight(0xffe7a6, 1.85, 12, 2.4);
playerLamp.position.copy(camera.position);
scene.add(playerLamp);

const texture = makeBackroomsTexture();
texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

const wallMaterial = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.92,
  metalness: 0,
  color: 0xd9c766
});
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x6f6440,
  roughness: 0.96,
  metalness: 0
});
const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0xbba956,
  roughness: 0.98,
  metalness: 0
});
const exitMaterial = new THREE.MeshStandardMaterial({
  color: 0xa4e6d4,
  emissive: 0x205e56,
  emissiveIntensity: 1.2,
  roughness: 0.65
});
const lampMaterial = new THREE.MeshBasicMaterial({
  color: 0xf7df8a
});
const stainMaterial = new THREE.MeshBasicMaterial({
  color: 0x17140b,
  transparent: true,
  opacity: 0.28,
  depthWrite: false
});
const echoMaterial = new THREE.MeshStandardMaterial({
  color: 0x9debd9,
  emissive: 0x2ed6bd,
  emissiveIntensity: 1.6,
  roughness: 0.45,
  metalness: 0
});
const landmarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d3520,
  roughness: 0.9,
  metalness: 0
});

const wallMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE, WALL_HEIGHT, 0.18),
  wallMaterial,
  MAX_INSTANCES
);
const floorMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE, 0.08, TILE),
  floorMaterial,
  MAX_INSTANCES
);
const ceilingMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE, 0.08, TILE),
  ceilingMaterial,
  MAX_INSTANCES
);
const exitMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE * 0.55, 2.35, 0.1),
  exitMaterial,
  24
);
const lampMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE * 0.46, 0.04, TILE * 0.16),
  lampMaterial,
  MAX_PROPS
);
const stainMesh = new THREE.InstancedMesh(
  new THREE.CircleGeometry(TILE * 0.28, 10),
  stainMaterial,
  MAX_PROPS
);
const echoMesh = new THREE.InstancedMesh(
  new THREE.OctahedronGeometry(0.36, 0),
  echoMaterial,
  12
);
const landmarkMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.28, WALL_HEIGHT * 0.9, 0.28),
  landmarkMaterial,
  MAX_PROPS
);
scene.add(wallMesh, floorMesh, ceilingMesh, exitMesh, lampMesh, stainMesh, echoMesh, landmarkMesh);

const chunks = new Map<string, Chunk>();
const openCells = new Set<string>();
const exitCells = new Set<string>();
const exitPositions: THREE.Vector3[] = [];
const echoPositions: THREE.Vector3[] = [];
const collectedEchoes = new Set<string>();
const wallRects: THREE.Box2[] = [];
const dummy = new THREE.Object3D();
const clock = new THREE.Clock();
const player = new THREE.Vector3(0, 1.55, 0);
const velocity = new THREE.Vector2();
const keys = new Set<string>();
const touches = new Map<number, TouchRole>();
const lookLast = new Map<number, { x: number; y: number }>();

let yaw = 0;
let pitch = 0;
let moveTouchId: number | null = null;
let stickCenter = new THREE.Vector2();
let needsMapRefresh = true;
let lastChunkKey = "";
let signal = 0;
let quality = 1;
let levelIndex = 0;
let blackout = 0;
let transitionTimer = 0;
let isTransitioning = false;
let nearestExit = new THREE.Vector3();
let signalTarget = new THREE.Vector3();
let audio: AudioDirector | null = null;
let movementAmount = 0;

applyTheme(LEVEL_THEMES[0]);
resize();
ensureChunks();
rebuildInstances();

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  startAudio();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
window.addEventListener("blur", () => {
  keys.clear();
  touches.clear();
  lookLast.clear();
  moveTouchId = null;
  velocity.set(0, 0);
  updateStick(0, 0);
});

renderer.setAnimationLoop(loop);

function loop(): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateMovement(delta);
  updateCamera(delta);
  updateWorld();
  updateGameState(delta);
  updateAudio(time);
  updatePost(delta, time);

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}

function updateMovement(delta: number): void {
  movementAmount = 0;
  if (isTransitioning) return;

  const input = new THREE.Vector2(velocity.x, velocity.y);

  if (keys.has("KeyW") || keys.has("ArrowUp")) input.y += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) input.y -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) input.x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) input.x += 1;

  if (input.lengthSq() > 1) input.normalize();
  movementAmount = input.length();

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const dx = (input.x * cos - input.y * sin) * WALK_SPEED * delta;
  const dz = (-input.x * sin - input.y * cos) * WALK_SPEED * delta;

  moveAxis(dx, 0);
  moveAxis(0, dz);
}

function moveAxis(dx: number, dz: number): void {
  if (dx === 0 && dz === 0) return;

  const nextX = player.x + dx;
  const nextZ = player.z + dz;
  const point = new THREE.Vector2(nextX, nextZ);

  for (const wall of wallRects) {
    const expanded = wall.clone().expandByScalar(PLAYER_RADIUS);
    if (expanded.containsPoint(point)) return;
  }

  player.x = nextX;
  player.z = nextZ;
}

function updateCamera(delta: number): void {
  const breathing = Math.sin(clock.elapsedTime * 6.2) * 0.015;
  camera.position.set(player.x, player.y + breathing, player.z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");

  playerLamp.position.copy(camera.position);
  const danger = signal / 100;
  playerLamp.intensity = 1.55 + Math.sin(clock.elapsedTime * 17.0) * (0.08 + danger * 0.35);
  ambient.intensity = 1.38 - danger * 0.22;
  texture.offset.x = Math.sin(clock.elapsedTime * 2.0) * 0.003 + danger * Math.sin(clock.elapsedTime * 13.0) * 0.01;

  signal = THREE.MathUtils.damp(signal, nearestSignal(), 2.6, delta);
  const echoesLeft = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].echoCells.length - collectedEchoes.size;
  signalLabel.textContent = echoesLeft > 0
    ? `ECHO ${collectedEchoes.size}/3 · ${Math.round(signal).toString().padStart(2, "0")}%`
    : `EXIT · ${Math.round(signal).toString().padStart(2, "0")}%`;
  updateSignalStatus();
  updateBeacon();
}

function updateWorld(): void {
  const cx = Math.floor(player.x / (CHUNK_SIZE * TILE));
  const cz = Math.floor(player.z / (CHUNK_SIZE * TILE));
  const chunkKey = key(cx, cz);

  if (chunkKey !== lastChunkKey) {
    lastChunkKey = chunkKey;
    ensureChunks();
  }

  if (needsMapRefresh) {
    needsMapRefresh = false;
    rebuildInstances();
  }
}

function ensureChunks(): void {
  const centerX = Math.floor(player.x / (CHUNK_SIZE * TILE));
  const centerZ = Math.floor(player.z / (CHUNK_SIZE * TILE));
  const keep = new Set<string>();

  for (let z = centerZ - CHUNK_RADIUS; z <= centerZ + CHUNK_RADIUS; z += 1) {
    for (let x = centerX - CHUNK_RADIUS; x <= centerX + CHUNK_RADIUS; x += 1) {
      const chunkKey = key(x, z);
      keep.add(chunkKey);
      if (!chunks.has(chunkKey)) {
        chunks.set(chunkKey, generateChunk(x, z));
        needsMapRefresh = true;
      }
    }
  }

  for (const chunkKey of chunks.keys()) {
    if (!keep.has(chunkKey)) {
      chunks.delete(chunkKey);
      needsMapRefresh = true;
    }
  }
}

function rebuildInstances(): void {
  openCells.clear();
  exitCells.clear();
  exitPositions.length = 0;
  echoPositions.length = 0;
  wallRects.length = 0;

  const cells = [...chunks.values()].flatMap((chunk) => chunk.cells);
  for (const cell of cells) {
    if (cell.open) openCells.add(cellKey(cell.x, cell.z));
    if (cell.exit) {
      exitCells.add(cellKey(cell.x, cell.z));
      exitPositions.push(new THREE.Vector3(cell.x * TILE, 1.2, cell.z * TILE));
    }
    if (cell.echo && !collectedEchoes.has(echoKey(cell.x, cell.z))) {
      echoPositions.push(new THREE.Vector3(cell.x * TILE, 1.25, cell.z * TILE));
    }
  }

  let wallCount = 0;
  let floorCount = 0;
  let ceilingCount = 0;
  let exitCount = 0;
  let lampCount = 0;
  let stainCount = 0;
  let echoCount = 0;
  let landmarkCount = 0;

  for (const cell of cells) {
    if (!cell.open) continue;

    const wx = cell.x * TILE;
    const wz = cell.z * TILE;

    setBox(floorMesh, floorCount, wx, -0.04, wz, 1, 1, 1, 0);
    floorCount += 1;

    setBox(ceilingMesh, ceilingCount, wx, WALL_HEIGHT, wz, 1, 1, 1, 0);
    ceilingCount += 1;

    if ((cell.x + cell.z + levelIndex) % 3 === 0 && lampCount < MAX_PROPS) {
      setBox(lampMesh, lampCount, wx, WALL_HEIGHT - 0.09, wz, 1, 1, 1, (cell.x % 2) * Math.PI / 2);
      lampCount += 1;
    }

    if (noise(cell.x * 5 + levelIndex * 17, cell.z * 5 - 3) > (levelIndex % 2 === 0 ? 0.72 : 0.55) && stainCount < MAX_PROPS) {
      setTransform(stainMesh, stainCount, wx + (noise(cell.x, cell.z) - 0.5) * 1.6, 0.012, wz + (noise(cell.z, cell.x) - 0.5) * 1.6, 1, 1, 1, -Math.PI / 2, 0, noise(cell.x + 9, cell.z - 4) * Math.PI);
      stainCount += 1;
    }

    if (cell.exit && exitCount < 24) {
      setBox(exitMesh, exitCount, wx, 1.22, wz - TILE * 0.46, 1, 1, 1, 0);
      exitCount += 1;
    }

    if (cell.echo && !collectedEchoes.has(echoKey(cell.x, cell.z)) && echoCount < 12) {
      setTransform(echoMesh, echoCount, wx, 1.32 + Math.sin(clock.elapsedTime * 2 + cell.x) * 0.08, wz, 1, 1, 1, 0, noise(cell.x, cell.z) * Math.PI, 0);
      echoCount += 1;
    }

    if (cell.landmark && landmarkCount < MAX_PROPS - 4) {
      const inset = TILE * 0.38;
      setBox(landmarkMesh, landmarkCount, wx - inset, WALL_HEIGHT * 0.45, wz - inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 1, wx + inset, WALL_HEIGHT * 0.45, wz - inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 2, wx - inset, WALL_HEIGHT * 0.45, wz + inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 3, wx + inset, WALL_HEIGHT * 0.45, wz + inset, 1, 1, 1, 0);
      landmarkCount += 4;
    }

    wallCount = addBoundaryWall(cell.x, cell.z, 0, -1, wx, wz - TILE / 2, 0, wallCount);
    wallCount = addBoundaryWall(cell.x, cell.z, 0, 1, wx, wz + TILE / 2, 0, wallCount);
    wallCount = addBoundaryWall(cell.x, cell.z, -1, 0, wx - TILE / 2, wz, Math.PI / 2, wallCount);
    wallCount = addBoundaryWall(cell.x, cell.z, 1, 0, wx + TILE / 2, wz, Math.PI / 2, wallCount);
  }

  wallMesh.count = wallCount;
  floorMesh.count = floorCount;
  ceilingMesh.count = ceilingCount;
  exitMesh.count = exitCount;
  lampMesh.count = lampCount;
  stainMesh.count = stainCount;
  echoMesh.count = echoCount;
  landmarkMesh.count = landmarkCount;
  wallMesh.instanceMatrix.needsUpdate = true;
  floorMesh.instanceMatrix.needsUpdate = true;
  ceilingMesh.instanceMatrix.needsUpdate = true;
  exitMesh.instanceMatrix.needsUpdate = true;
  lampMesh.instanceMatrix.needsUpdate = true;
  stainMesh.instanceMatrix.needsUpdate = true;
  echoMesh.instanceMatrix.needsUpdate = true;
  landmarkMesh.instanceMatrix.needsUpdate = true;
}

function addBoundaryWall(
  cellX: number,
  cellZ: number,
  nx: number,
  nz: number,
  wx: number,
  wz: number,
  rotation: number,
  wallCount: number
): number {
  if (openCells.has(cellKey(cellX + nx, cellZ + nz)) || wallCount >= MAX_INSTANCES) {
    return wallCount;
  }

  setBox(wallMesh, wallCount, wx, WALL_HEIGHT / 2, wz, 1, 1, 1, rotation);

  const halfX = nx === 0 ? TILE / 2 : 0.1;
  const halfZ = nz === 0 ? TILE / 2 : 0.1;
  wallRects.push(new THREE.Box2(
    new THREE.Vector2(wx - halfX, wz - halfZ),
    new THREE.Vector2(wx + halfX, wz + halfZ)
  ));

  return wallCount + 1;
}

function generateChunk(cx: number, cz: number): Chunk {
  const theme = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length];
  const lostTime = levelIndex % 2 === 1;
  const cells: Cell[] = [];
  const startX = cx * CHUNK_SIZE;
  const startZ = cz * CHUNK_SIZE;

  for (let z = 0; z < CHUNK_SIZE; z += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      const gx = startX + x;
      const gz = startZ + z;
      const n = noise(gx + levelIndex * 19, gz - levelIndex * 23);
      const corridor = lostTime
        ? gx === 0 || gz === 0 || Math.abs(gx + gz) % 5 === 0 || Math.abs(gx - gz) % 6 === 0
        : gx === 0 || gz === 0 || gx % 4 === 0 || gz % 5 === 0;
      const room = lostTime
        ? n > 0.28 && n < 0.82 && ((gx * 2 + gz) % 4 !== 0)
        : n > 0.36 && n < 0.74 && ((gx + gz) % 3 !== 0);
      const voidPocket = n > (lostTime ? 0.94 : 0.9) && gx !== 0 && gz !== 0;
      const open = !voidPocket && (corridor || room || connectsToEdge(x, z));
      const guaranteedExit = cx === 0 && cz === 0 && gx === theme.exitCell.x && gz === theme.exitCell.z;
      const echo = cx === 0 && cz === 0 && theme.echoCells.some((cell) => cell.x === gx && cell.z === gz);
      const landmark = open && !guaranteedExit && !echo && noise(gx * 7 + levelIndex, gz * 7 - levelIndex) > (lostTime ? 0.93 : 0.96);
      const exit = guaranteedExit || (open && Math.abs(gx) + Math.abs(gz) > 22 && noise(gx * 3 + 7 + levelIndex * 11, gz * 3 - 11) > 0.965);

      cells.push({ x: gx, z: gz, open: open || guaranteedExit || echo, exit, echo, landmark });
    }
  }

  if (cx === 0 && cz === 0) {
    for (const cell of cells) {
      if (Math.abs(cell.x) <= 1 && Math.abs(cell.z) <= 1) {
        cell.open = true;
      }
    }
  }

  return { key: key(cx, cz), cx, cz, cells };
}

function connectsToEdge(x: number, z: number): boolean {
  return x === 0 || z === 0 || x === CHUNK_SIZE - 1 || z === CHUNK_SIZE - 1;
}

function nearestSignal(): number {
  let nearest = Infinity;
  const targets = echoPositions.length > 0 ? echoPositions : exitPositions;

  for (const target of targets) {
    const distance = Math.hypot(player.x - target.x, player.z - target.z);
    if (distance < nearest) {
      signalTarget.copy(target);
      if (echoPositions.length === 0) nearestExit.copy(target);
    }
    nearest = Math.min(nearest, distance);
  }

  if (!Number.isFinite(nearest)) {
    return Math.min(18, Math.hypot(player.x, player.z) * 0.45);
  }

  const theme = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length];
  const drift = Math.sin(clock.elapsedTime * 1.7 + player.x * 0.05) * theme.signalNoise * 100;
  return THREE.MathUtils.clamp(100 - nearest * (levelIndex % 2 === 0 ? 3.2 : 2.7) + drift, 0, 100);
}

function updateGameState(delta: number): void {
  for (const echo of echoPositions) {
    if (Math.hypot(player.x - echo.x, player.z - echo.z) < 1.15) {
      collectedEchoes.add(echoKey(Math.round(echo.x / TILE), Math.round(echo.z / TILE)));
      statusText.textContent = collectedEchoes.size >= LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].echoCells.length
        ? "Exit signal unlocked"
        : "Echo recorded";
      needsMapRefresh = true;
      triggerDropout(0.16);
      break;
    }
  }

  const exitUnlocked = collectedEchoes.size >= LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].echoCells.length;
  const exitDistance = exitUnlocked ? nearestExitDistance() : Infinity;

  if (!isTransitioning && exitDistance < EXIT_RADIUS) {
    isTransitioning = true;
    transitionTimer = 0;
    statusText.textContent = "The room forgets you";
    triggerDropout(0.85);
  }

  if (!isTransitioning) return;

  transitionTimer += delta;
  blackout = THREE.MathUtils.damp(blackout, 1, 5.8, delta);

  if (transitionTimer > 1.45) {
    advanceLevel();
  }
}

function advanceLevel(): void {
  levelIndex += 1;
  const theme = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length];
  isTransitioning = false;
  transitionTimer = 0;
  blackout = theme.blackoutStart;
  player.set(0, 1.55, 0);
  yaw = 0;
  pitch = 0;
  chunks.clear();
  openCells.clear();
  exitCells.clear();
  exitPositions.length = 0;
  echoPositions.length = 0;
  collectedEchoes.clear();
  wallRects.length = 0;
  lastChunkKey = "";
  needsMapRefresh = true;
  applyTheme(theme);
  zoneLabel.textContent = levelIndex > 1 && levelIndex % 2 === 0 ? `LEVEL ${levelIndex}` : theme.label;
  statusText.textContent = theme.hint;
  ensureChunks();
  rebuildInstances();
  triggerDropout(0.28);
}

function nearestExitDistance(): number {
  let nearest = Infinity;
  for (const exit of exitPositions) {
    const distance = Math.hypot(player.x - exit.x, player.z - exit.z);
    if (distance < nearest) nearestExit.copy(exit);
    nearest = Math.min(nearest, distance);
  }
  return nearest;
}

function applyTheme(theme: (typeof LEVEL_THEMES)[number]): void {
  scene.background = new THREE.Color(theme.fogColor);
  scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
  wallMaterial.color.setHex(theme.wallColor);
  floorMaterial.color.setHex(theme.floorColor);
  ceilingMaterial.color.setHex(theme.ceilingColor);
  lampMaterial.color.setHex(theme.lampColor);
  stainMaterial.color.setHex(theme.fogColor);
  echoMaterial.emissive.setHex(theme.lampColor);
  landmarkMaterial.color.setHex(theme.floorColor);
}

function updateBeacon(): void {
  if ((echoPositions.length === 0 && exitPositions.length === 0) || isTransitioning) {
    beacon.style.opacity = "0";
    return;
  }

  const dx = signalTarget.x - player.x;
  const dz = signalTarget.z - player.z;
  const wrongness = levelIndex % 2 === 1 ? Math.sin(clock.elapsedTime * 1.3) * 0.42 : 0;
  const bearing = Math.atan2(dx, dz) + yaw + wrongness;
  const strength = THREE.MathUtils.clamp(signal / 100, 0.16, 1);
  beacon.style.opacity = `${strength}`;
  beacon.style.transform = `translate(-50%, -50%) scale(${0.86 + strength * 0.34}) rotate(${bearing}rad)`;
}

function updateSignalStatus(): void {
  if (isTransitioning) return;
  const totalEchoes = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].echoCells.length;
  const echoesLeft = totalEchoes - collectedEchoes.size;

  if (echoesLeft > 0) {
    if (signal > 80) {
      statusText.textContent = levelIndex % 2 === 0 ? "Echo is close" : "Echo changed position";
    } else if (signal > 44) {
      statusText.textContent = "Tune the hum";
    } else {
      statusText.textContent = `Record ${echoesLeft} echo${echoesLeft === 1 ? "" : "es"}`;
    }
    return;
  }

  if (signal > 86) {
    statusText.textContent = levelIndex % 2 === 0 ? "Exit is in the room" : "It is looking back";
  } else if (signal > 62) {
    statusText.textContent = levelIndex % 2 === 0 ? "Signal locked" : "Signal is lying";
  } else if (signal > 34) {
    statusText.textContent = "Follow the hum";
  } else {
    statusText.textContent = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].hint;
  }
}

function updatePost(delta: number, time: number): void {
  if (!isTransitioning) {
    blackout = THREE.MathUtils.damp(blackout, 0, 3.4, delta);
  }

  const danger = signal / 100;
  postMaterial.uniforms.uTime.value = time;
  postMaterial.uniforms.uNoise.value = 0.14 + danger * 0.22 + blackout * 0.55;
  postMaterial.uniforms.uBlackout.value = blackout;
  postMaterial.uniforms.uPalette.value = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].palette;
}

function setBox(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  ry: number
): void {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, ry, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function setTransform(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rx: number,
  ry: number,
  rz: number
): void {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function onPointerDown(event: PointerEvent): void {
  event.preventDefault();
  startAudio();

  if (event.clientX < window.innerWidth * 0.45 && moveTouchId === null) {
    moveTouchId = event.pointerId;
    touches.set(event.pointerId, "move");
    const rect = stick.getBoundingClientRect();
    stickCenter = new THREE.Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2);
    updateMoveTouch(event.clientX, event.clientY);
    return;
  }

  touches.set(event.pointerId, "look");
  lookLast.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

function onPointerMove(event: PointerEvent): void {
  const role = touches.get(event.pointerId);
  if (!role) return;

  event.preventDefault();

  if (role === "move") {
    updateMoveTouch(event.clientX, event.clientY);
    return;
  }

  const last = lookLast.get(event.pointerId);
  if (!last) return;

  const dx = event.clientX - last.x;
  const dy = event.clientY - last.y;
  yaw -= dx * LOOK_SENSITIVITY;
  pitch = THREE.MathUtils.clamp(pitch - dy * LOOK_SENSITIVITY, -1.18, 1.18);
  lookLast.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

function onPointerUp(event: PointerEvent): void {
  const role = touches.get(event.pointerId);
  touches.delete(event.pointerId);
  lookLast.delete(event.pointerId);

  if (role === "move") {
    moveTouchId = null;
    velocity.set(0, 0);
    updateStick(0, 0);
  }
}

function updateMoveTouch(x: number, y: number): void {
  const delta = new THREE.Vector2(x - stickCenter.x, y - stickCenter.y);
  const max = 42;

  if (delta.length() > max) delta.setLength(max);

  velocity.set(delta.x / max, -delta.y / max);
  updateStick(delta.x, delta.y);
}

function updateStick(x: number, y: number): void {
  stickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const longSide = Math.max(width, height);
  quality = longSide > 1100 ? 0.9 : 1;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.2) * quality;
  const targetWidth = Math.max(160, Math.floor(width * LOFI_RENDER_SCALE));
  const targetHeight = Math.max(90, Math.floor(height * LOFI_RENDER_SCALE));

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderTarget.setSize(targetWidth, targetHeight);
  postMaterial.uniforms.uResolution.value.set(targetWidth, targetHeight);
}

function makeRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: true,
    stencilBuffer: false,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    generateMipmaps: false,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace
  });

  target.texture.name = "lofi-backbuffer";
  return target;
}

function startAudio(): void {
  if (audio) {
    audio.resume();
    return;
  }
  audio = new AudioDirector();
}

function updateAudio(time: number): void {
  if (!audio) return;
  const danger = signal / 100;
  audio.update({
    time,
    danger,
    blackout,
    speed: movementAmount,
    level: levelIndex,
    transitioning: isTransitioning
  });
}

function triggerDropout(duration: number): void {
  if (!audio) return;
  audio.triggerDropout(duration, clock.elapsedTime);
}

function makeBackroomsTexture(): THREE.CanvasTexture {
  const size = 128;
  const paint = document.createElement("canvas");
  paint.width = size;
  paint.height = size;
  const ctx = paint.getContext("2d");

  if (!ctx) throw new Error("Canvas 2D context is unavailable.");

  ctx.fillStyle = "#d0bd61";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      const shade = 178 + Math.floor(noise(x, y) * 32);
      ctx.fillStyle = `rgb(${shade + 30}, ${shade + 18}, ${shade - 36})`;
      ctx.fillRect(x, y, 15, 15);
    }
  }

  ctx.strokeStyle = "rgba(68, 57, 24, 0.34)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(paint);
}

function noise(x: number, z: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function key(x: number, z: number): string {
  return `${x}:${z}`;
}

function cellKey(x: number, z: number): string {
  return `${x}:${z}`;
}

function echoKey(x: number, z: number): string {
  return `${levelIndex}:${x}:${z}`;
}
