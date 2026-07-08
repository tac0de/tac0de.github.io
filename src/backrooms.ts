import "./style.css";
import * as THREE from "three";

const canvasNode = document.querySelector<HTMLCanvasElement>("#game");
const stickNode = document.querySelector<HTMLDivElement>("#stick");
const stickKnobNode = document.querySelector<HTMLDivElement>("#stick-knob");
const signalLabelNode = document.querySelector<HTMLSpanElement>("#signal");
const zoneLabelNode = document.querySelector<HTMLSpanElement>("#zone");
const saveStateNode = document.querySelector<HTMLSpanElement>("#save-state");
const beaconNode = document.querySelector<HTMLDivElement>("#beacon");
const statusNode = document.querySelector<HTMLDivElement>("#status");
const normalChoiceNode = document.querySelector<HTMLButtonElement>("#normal-choice");
const anomalyChoiceNode = document.querySelector<HTMLButtonElement>("#anomaly-choice");
const resetRunNode = document.querySelector<HTMLButtonElement>("#reset-run");

if (
  !canvasNode ||
  !stickNode ||
  !stickKnobNode ||
  !signalLabelNode ||
  !zoneLabelNode ||
  !saveStateNode ||
  !beaconNode ||
  !statusNode ||
  !normalChoiceNode ||
  !anomalyChoiceNode ||
  !resetRunNode
) {
  throw new Error("Game shell is missing required DOM nodes.");
}

const canvas = canvasNode;
const stick = stickNode;
const stickKnob = stickKnobNode;
const signalLabel = signalLabelNode;
const zoneLabel = zoneLabelNode;
const saveStateLabel = saveStateNode;
const beacon = beaconNode;
const statusText = statusNode;
const normalChoice = normalChoiceNode;
const anomalyChoice = anomalyChoiceNode;
const resetRun = resetRunNode;

const TILE = 4;
const WALL_HEIGHT = 3.1;
const CHUNK_SIZE = 8;
const CHUNK_RADIUS = 2;
const MAX_INSTANCES = 3200;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 4.15;
const LOOK_SENSITIVITY = 0.0032;
const LOFI_RENDER_SCALE = 0.72;
const EXIT_RADIUS = 1.45;
const MAX_PROPS = 520;
const FIRST_PLAY_HELP_SECONDS = 10;
const TARGET_EXITS = 8;
const SAVE_KEY = "backrooms-drift.anomaly-save.v1";

const ASSET_PATHS = {
  wallpaper: "/assets/wallpaper.png",
  carpet: "/assets/carpet.png",
  ceiling: "/assets/ceiling.png",
  signalBeacon: "/assets/signal-beacon.png",
  warningSign: "/assets/warning-sign.png",
  glyphs: [
    "/assets/generated/backrooms-glyph-eye.png",
    "/assets/generated/backrooms-glyph-arrow.png",
    "/assets/generated/backrooms-glyph-spiral.png",
    "/assets/generated/backrooms-glyph-tally.png",
    "/assets/generated/backrooms-glyph-warning.png",
    "/assets/generated/backrooms-glyph-door.png"
  ],
  vhsOverlay: "/assets/vhs-overlay.png"
};

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
    label: "EXIT 0/8",
    hint: "복도를 읽고 정상인지 이상인지 판정하세요",
    fogColor: 0x17140b,
    fogDensity: 0.026,
    palette: 10,
    blackoutStart: 0.28,
    wallColor: 0xd9c766,
    floorColor: 0x83764a,
    ceilingColor: 0xbba956,
    lampColor: 0xf7df8a,
    exitCell: { x: 7, z: 0 },
    echoCells: [],
    signalNoise: 0.05
  },
  {
    label: "DRIFT",
    hint: "틀렸습니다. 복도가 처음으로 돌아갑니다",
    fogColor: 0x11171a,
    fogDensity: 0.024,
    palette: 9,
    blackoutStart: 0.34,
    wallColor: 0x81928a,
    floorColor: 0x3f514f,
    ceilingColor: 0x52645d,
    lampColor: 0x9cc9c0,
    exitCell: { x: 7, z: 0 },
    echoCells: [],
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

type AnomalyId =
  | "extraDoor"
  | "redWarning"
  | "wrongArrow"
  | "missingLamp"
  | "tallHall"
  | "watchingWall"
  | "wetFloor"
  | "falseExit";

type Anomaly = {
  id: AnomalyId;
  title: string;
  missText: string;
};

type SaveState = {
  loop: number;
  best: number;
  failures: number;
  clears: number;
  seen: AnomalyId[];
  lastPlayedAt: number;
};

type TransitionMode = "next" | "fail" | "win" | null;

const ANOMALIES: Anomaly[] = [
  { id: "extraDoor", title: "문이 하나 더 있습니다", missText: "없는 문을 지나쳤습니다" },
  { id: "redWarning", title: "경고 표지가 붉게 켜졌습니다", missText: "표지가 색을 바꿨습니다" },
  { id: "wrongArrow", title: "화살표가 반대로 돌아갔습니다", missText: "방향이 거짓말을 했습니다" },
  { id: "missingLamp", title: "천장등 하나가 사라졌습니다", missText: "불빛의 간격이 달라졌습니다" },
  { id: "tallHall", title: "복도가 조금 길어졌습니다", missText: "거리감이 늘어났습니다" },
  { id: "watchingWall", title: "벽지가 눈처럼 보입니다", missText: "벽이 보고 있었습니다" },
  { id: "wetFloor", title: "카펫에 젖은 얼룩이 생겼습니다", missText: "발밑이 달라졌습니다" },
  { id: "falseExit", title: "출구 문틀이 두 겹입니다", missText: "출구가 한 번 더 접혔습니다" }
];

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
scene.fog = new THREE.FogExp2(0x17140b, 0.026);

const camera = new THREE.PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.05, 82);
camera.position.set(0, 1.55, 0);

const textureLoader = new THREE.TextureLoader();
const wallTexture = loadGameTexture(ASSET_PATHS.wallpaper, 2, 1);
const floorTexture = loadGameTexture(ASSET_PATHS.carpet, 2, 2);
const ceilingTexture = loadGameTexture(ASSET_PATHS.ceiling, 2, 2);
const signalTexture = loadGameTexture(ASSET_PATHS.signalBeacon, 1, 1);
const warningSignTexture = loadGameTexture(ASSET_PATHS.warningSign, 1, 1);
const glyphTextures = ASSET_PATHS.glyphs.map((path) => loadDecalTexture(path));
const vhsOverlayTexture = loadGameTexture(ASSET_PATHS.vhsOverlay, 1, 1);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

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
    uPalette: { value: 7.0 },
    uOverlayMix: { value: 0.16 },
    uCorruption: { value: 0 },
    tOverlay: { value: vhsOverlayTexture }
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
    uniform float uOverlayMix;
    uniform float uCorruption;
    uniform sampler2D tOverlay;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      float scan = floor(uv.y * uResolution.y);
      float tear = step(mix(1.01, 0.982, uCorruption), hash(vec2(floor(uTime * 9.0), scan * 0.07)));
      uv.x += sin(uv.y * 75.0 + uTime * 8.0) * 0.0008 * (0.25 + uCorruption);
      uv.x += tear * sin(uTime * 40.0) * 0.034 * uCorruption;

      vec3 color;
      float chroma = 0.0005 + 0.0022 * uCorruption;
      color.r = texture2D(tDiffuse, uv + vec2(chroma, 0.0)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(chroma, 0.0)).b;

      float n = hash(floor(uv * uResolution.xy) + floor(uTime * 24.0));
      color += (n - 0.5) * uNoise;

      vec3 overlay = texture2D(tOverlay, fract(uv + vec2(uTime * 0.006, uTime * -0.002))).rgb;
      float overlayKey = distance(overlay, vec3(0.0, 1.0, 0.0));
      float overlayAlpha = smoothstep(0.10, 0.42, overlayKey) * uOverlayMix;
      color = mix(color, color + (overlay - vec3(0.0, 0.55, 0.0)) * 0.45, overlayAlpha);

      color *= 0.98 + 0.02 * sin(scan * 3.14159);
      vec3 quantized = floor(max(color, vec3(0.0)) * uPalette) / uPalette;
      color = mix(color, quantized, 0.18 + uCorruption * 0.55);
      color *= 1.0 - smoothstep(0.3, 1.05, uBlackout);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  depthWrite: false,
  depthTest: false
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

const ambient = new THREE.HemisphereLight(0xf1dd92, 0x19140a, 1.82);
scene.add(ambient);

const playerLamp = new THREE.PointLight(0xffe7a6, 3.05, 17, 2.1);
playerLamp.position.copy(camera.position);
scene.add(playerLamp);

const wallMaterial = new THREE.MeshStandardMaterial({
  map: wallTexture,
  roughness: 0.92,
  metalness: 0,
  color: 0xd9c766
});
const floorMaterial = new THREE.MeshStandardMaterial({
  map: floorTexture,
  color: 0x83764a,
  roughness: 0.96,
  metalness: 0
});
const ceilingMaterial = new THREE.MeshStandardMaterial({
  map: ceilingTexture,
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
const landmarkPanelMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a3b2d,
  emissive: 0x3d0d0a,
  emissiveIntensity: 0.72,
  roughness: 0.72,
  metalness: 0
});
const landmarkLightMaterial = new THREE.MeshBasicMaterial({
  color: 0xe45b43
});
const echoSpriteMaterial = makeChromaKeyMaterial(signalTexture, 1.45, 0.95);
const warningSignMaterial = makeChromaKeyMaterial(warningSignTexture, 1.0, 0.88);
const glyphMaterials = glyphTextures.map((texture) => makeGlyphMaterial(texture));
const introGlyphMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.62), glyphMaterials[0]);
introGlyphMesh.position.set(0, 1.72, -TILE * 0.43);

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
  new THREE.PlaneGeometry(1.45, 1.45),
  echoSpriteMaterial,
  12
);
const landmarkMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.28, WALL_HEIGHT * 0.9, 0.28),
  landmarkMaterial,
  MAX_PROPS
);
const landmarkPanelMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE * 0.68, WALL_HEIGHT * 0.62, 0.12),
  landmarkPanelMaterial,
  MAX_PROPS
);
const landmarkLightMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(TILE * 0.48, 0.08, 0.08),
  landmarkLightMaterial,
  MAX_PROPS
);
const warningSignMesh = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(1.72, 2.52),
  warningSignMaterial,
  MAX_PROPS
);
const glyphMeshes = glyphMaterials.map(
  (material) => new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MAX_PROPS)
);
scene.add(
  wallMesh,
  floorMesh,
  ceilingMesh,
  exitMesh,
  lampMesh,
  stainMesh,
  echoMesh,
  landmarkMesh,
  landmarkPanelMesh,
  landmarkLightMesh,
  warningSignMesh,
  introGlyphMesh,
  ...glyphMeshes
);

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
let saveState = loadSaveState();
let currentAnomaly: Anomaly | null = chooseAnomaly(saveState.loop, saveState.failures);
let decisionLocked = false;
let transitionMode: TransitionMode = null;
let endingShown = false;

applyTheme(LEVEL_THEMES[0]);
syncHud();
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
normalChoice.addEventListener("click", () => handleDecision(false));
anomalyChoice.addEventListener("click", () => handleDecision(true));
resetRun.addEventListener("click", resetRunState);

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
  const introHelp = levelIndex === 0 ? 1 - THREE.MathUtils.smoothstep(clock.elapsedTime, 0, FIRST_PLAY_HELP_SECONDS) : 0;
  camera.position.set(player.x, player.y + breathing, player.z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");

  playerLamp.position.copy(camera.position);
  const danger = signal / 100;
  playerLamp.intensity = 2.55 + introHelp * 0.85 + Math.sin(clock.elapsedTime * 17.0) * (0.04 + danger * 0.16);
  ambient.intensity = 1.74 + introHelp * 0.32 - danger * 0.12;
  wallTexture.offset.x = Math.sin(clock.elapsedTime * 2.0) * 0.003 + danger * Math.sin(clock.elapsedTime * 13.0) * 0.01;

  signal = THREE.MathUtils.damp(signal, nearestSignal(), 2.6, delta);
  signalLabel.textContent = `SIGNAL ${Math.round(signal).toString().padStart(2, "0")}%`;
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
  let landmarkPanelCount = 0;
  let landmarkLightCount = 0;
  let warningSignCount = 0;
  const glyphCounts = glyphMeshes.map(() => 0);

  for (const cell of cells) {
    if (!cell.open) continue;

    const wx = cell.x * TILE;
    const wz = cell.z * TILE;

    setBox(floorMesh, floorCount, wx, -0.04, wz, 1, 1, 1, 0);
    floorCount += 1;

    setBox(ceilingMesh, ceilingCount, wx, WALL_HEIGHT, wz, 1, 1, 1, 0);
    ceilingCount += 1;

    const lampMissing = currentAnomaly?.id === "missingLamp" && cell.x === 4 && cell.z === 0;
    if (!lampMissing && (cell.x + cell.z + levelIndex) % 3 === 0 && lampCount < MAX_PROPS) {
      setBox(lampMesh, lampCount, wx, WALL_HEIGHT - 0.09, wz, 1, 1, 1, (cell.x % 2) * Math.PI / 2);
      lampCount += 1;
    }

    const forcedWetFloor = currentAnomaly?.id === "wetFloor" && cell.x === 3 && cell.z === 0;
    if ((forcedWetFloor || noise(cell.x * 5 + levelIndex * 17, cell.z * 5 - 3) > (levelIndex % 2 === 0 ? 0.72 : 0.55)) && stainCount < MAX_PROPS) {
      setTransform(stainMesh, stainCount, wx + (noise(cell.x, cell.z) - 0.5) * 1.6, 0.012, wz + (noise(cell.z, cell.x) - 0.5) * 1.6, 1, 1, 1, -Math.PI / 2, 0, noise(cell.x + 9, cell.z - 4) * Math.PI);
      stainCount += 1;
    }

    if (cell.exit && exitCount < 24) {
      setBox(exitMesh, exitCount, wx, 1.22, wz - TILE * 0.46, 1, 1, 1, 0);
      exitCount += 1;
      if (currentAnomaly?.id === "falseExit" && exitCount < 24) {
        setBox(exitMesh, exitCount, wx, 1.22, wz - TILE * 0.58, 1.22, 1.04, 1, 0);
        exitCount += 1;
      }
    }

    if (cell.echo && !collectedEchoes.has(echoKey(cell.x, cell.z)) && echoCount < 12) {
      setTransform(echoMesh, echoCount, wx, 1.38, wz, 1, 1, 1, 0, Math.PI, 0);
      echoCount += 1;
    }

    if (cell.landmark && landmarkCount < MAX_PROPS - 4) {
      const inset = TILE * 0.38;
      setBox(landmarkMesh, landmarkCount, wx - inset, WALL_HEIGHT * 0.45, wz - inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 1, wx + inset, WALL_HEIGHT * 0.45, wz - inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 2, wx - inset, WALL_HEIGHT * 0.45, wz + inset, 1, 1, 1, 0);
      setBox(landmarkMesh, landmarkCount + 3, wx + inset, WALL_HEIGHT * 0.45, wz + inset, 1, 1, 1, 0);
      landmarkCount += 4;

      const faceNorth = noise(cell.x * 2, cell.z * 2) > 0.5;
      if (landmarkPanelCount < MAX_PROPS) {
        setTransform(
          landmarkPanelMesh,
          landmarkPanelCount,
          wx + (faceNorth ? 0 : TILE * 0.49),
          WALL_HEIGHT * 0.48,
          wz + (faceNorth ? -TILE * 0.49 : 0),
          1,
          1,
          1,
          0,
          faceNorth ? 0 : Math.PI / 2,
          0
        );
        landmarkPanelCount += 1;
      }

      if (landmarkLightCount < MAX_PROPS) {
        setTransform(
          landmarkLightMesh,
          landmarkLightCount,
          wx + (faceNorth ? 0 : TILE * 0.42),
          WALL_HEIGHT - 0.34,
          wz + (faceNorth ? -TILE * 0.42 : 0),
          1,
          1,
          1,
          0,
          faceNorth ? 0 : Math.PI / 2,
          0
        );
        landmarkLightCount += 1;
      }

      if (warningSignCount < MAX_PROPS) {
        const isRedWarning = currentAnomaly?.id === "redWarning" && cell.x === 3 && cell.z === 0;
        setTransform(
          warningSignMesh,
          warningSignCount,
          wx + (faceNorth ? 0 : TILE * 0.42),
          isRedWarning ? 1.65 : 1.38,
          wz + (faceNorth ? -TILE * 0.42 : 0),
          isRedWarning ? 1.26 : 1,
          isRedWarning ? 1.26 : 1,
          1,
          0,
          faceNorth ? 0 : Math.PI / 2,
          0
        );
        warningSignCount += 1;
      }

      const anomalyGlyph = currentAnomaly?.id === "watchingWall" && cell.x === 5 && cell.z === 0
        ? 0
        : currentAnomaly?.id === "wrongArrow" && cell.x === 2 && cell.z === 0
          ? 1
          : null;
      const glyphIndex = anomalyGlyph ?? Math.floor(noise(cell.x * 11 + levelIndex * 5, cell.z * 11 - levelIndex * 3) * glyphMeshes.length);
      const glyphMesh = glyphMeshes[glyphIndex];
      const glyphCount = glyphCounts[glyphIndex];
      if (glyphMesh && glyphCount < MAX_PROPS) {
        const wideGlyph = glyphIndex === 0 || glyphIndex === 1;
        const tallGlyph = glyphIndex === 4 || glyphIndex === 5;
        setTransform(
          glyphMesh,
          glyphCount,
          wx + (faceNorth ? 0 : TILE * 0.41),
          tallGlyph ? 1.55 : 1.72,
          wz + (faceNorth ? -TILE * 0.41 : 0),
          wideGlyph ? 2.2 : 1.65,
          tallGlyph ? 2.05 : 1.55,
          1,
          0,
          faceNorth ? 0 : Math.PI / 2,
          currentAnomaly?.id === "wrongArrow" && cell.x === 2 && cell.z === 0 ? Math.PI : 0
        );
        glyphCounts[glyphIndex] += 1;
      }
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
  landmarkPanelMesh.count = landmarkPanelCount;
  landmarkLightMesh.count = landmarkLightCount;
  warningSignMesh.count = warningSignCount;
  glyphMeshes.forEach((mesh, index) => {
    mesh.count = glyphCounts[index];
  });
  wallMesh.instanceMatrix.needsUpdate = true;
  floorMesh.instanceMatrix.needsUpdate = true;
  ceilingMesh.instanceMatrix.needsUpdate = true;
  exitMesh.instanceMatrix.needsUpdate = true;
  lampMesh.instanceMatrix.needsUpdate = true;
  stainMesh.instanceMatrix.needsUpdate = true;
  echoMesh.instanceMatrix.needsUpdate = true;
  landmarkMesh.instanceMatrix.needsUpdate = true;
  landmarkPanelMesh.instanceMatrix.needsUpdate = true;
  landmarkLightMesh.instanceMatrix.needsUpdate = true;
  warningSignMesh.instanceMatrix.needsUpdate = true;
  glyphMeshes.forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
  });
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
  const longHallBonus = currentAnomaly?.id === "tallHall" ? 2 : 0;

  for (let z = 0; z < CHUNK_SIZE; z += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      const gx = startX + x;
      const gz = startZ + z;
      const n = noise(gx + levelIndex * 19, gz - levelIndex * 23);
      const mainHall = gz === 0 && gx >= -1 && gx <= theme.exitCell.x + longHallBonus;
      const sidePocket = !lostTime && ((gx === 2 && Math.abs(gz) <= 1) || (gx === 5 && gz >= -1 && gz <= 1));
      const driftPocket = lostTime && (Math.abs(gx + gz) % 5 === 0 || (gx === 3 && Math.abs(gz) <= 2));
      const anomalyPocket = currentAnomaly?.id === "extraDoor" && gx === 4 && gz === -1;
      const open = mainHall || sidePocket || driftPocket || anomalyPocket || connectsToEdge(x, z);
      const guaranteedExit = cz === 0 && gx === theme.exitCell.x + longHallBonus && gz === theme.exitCell.z;
      const echo = false;
      const landmark = open && !guaranteedExit && (gx === 2 || gx === 4 || gx === 6 || n > (lostTime ? 0.88 : 0.94));
      const exit = guaranteedExit;

      cells.push({ x: gx, z: gz, open, exit, echo, landmark });
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
  void x;
  void z;
  return false;
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
  const introHelp = levelIndex === 0 ? 1 - THREE.MathUtils.smoothstep(clock.elapsedTime, 0, FIRST_PLAY_HELP_SECONDS) : 0;
  return THREE.MathUtils.clamp(100 - nearest * (levelIndex % 2 === 0 ? 3.2 : 2.7) + drift + introHelp * 12, 0, 100);
}

function handleDecision(markedAnomaly: boolean): void {
  if (decisionLocked || isTransitioning || endingShown) return;

  startAudio();
  decisionLocked = true;
  normalChoice.disabled = true;
  anomalyChoice.disabled = true;

  const wasCorrect = markedAnomaly === Boolean(currentAnomaly);
  if (wasCorrect) {
    const nextLoop = saveState.loop + 1;
    saveState.loop = nextLoop;
    saveState.best = Math.max(saveState.best, nextLoop);
    if (currentAnomaly && !saveState.seen.includes(currentAnomaly.id)) {
      saveState.seen.push(currentAnomaly.id);
    }

    if (nextLoop >= TARGET_EXITS) {
      saveState.clears += 1;
      saveState.loop = 0;
      persistSaveState();
      transitionMode = "win";
      statusText.textContent = "8번째 출구가 열렸습니다";
    } else {
      persistSaveState();
      transitionMode = "next";
      statusText.textContent = markedAnomaly ? "이상 기록. 다음 복도로 이동합니다" : "정상 통과. 다음 복도로 이동합니다";
    }
  } else {
    saveState.failures += 1;
    saveState.loop = 0;
    persistSaveState();
    transitionMode = "fail";
    statusText.textContent = currentAnomaly?.missText ?? "정상이었지만 의심했습니다";
  }

  syncHud();
  isTransitioning = true;
  transitionTimer = 0;
  triggerDropout(wasCorrect ? 0.4 : 0.9);
}

function updateGameState(delta: number): void {
  if (!isTransitioning && !decisionLocked && nearestExitDistance() < EXIT_RADIUS) {
    statusText.textContent = "출구 앞입니다. 정상인지 이상인지 판정하세요";
  }

  if (!isTransitioning) return;

  transitionTimer += delta;
  blackout = THREE.MathUtils.damp(blackout, 1, 5.8, delta);

  if (transitionTimer > 1.45) {
    resolveTransition();
  }
}

function resolveTransition(): void {
  if (transitionMode === "win") {
    isTransitioning = false;
    transitionTimer = 0;
    blackout = 0.64;
    endingShown = true;
    decisionLocked = true;
    normalChoice.disabled = true;
    anomalyChoice.disabled = true;
    statusText.textContent = "탈출 기록 저장됨. RESET으로 다시 시작할 수 있습니다";
    syncHud();
    return;
  }

  const wasFail = transitionMode === "fail";
  levelIndex = wasFail ? 1 : 0;
  const theme = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length];
  isTransitioning = false;
  transitionMode = null;
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
  decisionLocked = false;
  normalChoice.disabled = false;
  anomalyChoice.disabled = false;
  currentAnomaly = chooseAnomaly(saveState.loop, saveState.failures);
  applyTheme(theme);
  statusText.textContent = wasFail ? theme.hint : getRoundPrompt();
  syncHud();
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
  landmarkPanelMaterial.color.setHex(levelIndex % 2 === 0 ? 0x5a3b2d : 0x263c3c);
  landmarkPanelMaterial.emissive.setHex(levelIndex % 2 === 0 ? 0x3d0d0a : 0x0b3132);
  landmarkLightMaterial.color.setHex(levelIndex % 2 === 0 ? 0xe45b43 : 0x9debd9);
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
  const introHelp = levelIndex === 0 ? 1 - THREE.MathUtils.smoothstep(clock.elapsedTime, 0, FIRST_PLAY_HELP_SECONDS) : 0;
  const strength = THREE.MathUtils.clamp(signal / 100 + introHelp * 0.24, 0.28, 1);
  beacon.style.opacity = `${strength}`;
  beacon.style.transform = `translate(-50%, -50%) scale(${0.86 + strength * 0.34}) rotate(${bearing}rad)`;
}

function updateSignalStatus(): void {
  if (isTransitioning || decisionLocked || endingShown) return;

  if (levelIndex === 0 && clock.elapsedTime < FIRST_PLAY_HELP_SECONDS && saveState.loop === 0) {
    statusText.textContent = "반복되는 복도를 기억하세요. 달라진 점이 있으면 이상입니다";
    return;
  }

  if (signal > 86) {
    statusText.textContent = "출구 앞에서 판정하세요";
  } else if (signal > 62) {
    statusText.textContent = currentAnomaly ? "무언가 달라졌을 수 있습니다" : "이번 복도는 조용합니다";
  } else if (signal > 34) {
    statusText.textContent = "복도를 읽으면서 앞으로 가세요";
  } else {
    statusText.textContent = getRoundPrompt();
  }
}

function updatePost(delta: number, time: number): void {
  if (!isTransitioning) {
    blackout = THREE.MathUtils.damp(blackout, 0, 3.4, delta);
  }

  const danger = signal / 100;
  const corruption = THREE.MathUtils.clamp(Math.pow(danger, 3) * 0.5 + blackout * 0.86 + (isTransitioning ? 0.55 : 0), 0, 1);
  postMaterial.uniforms.uTime.value = time;
  const introHelp = levelIndex === 0 ? 1 - THREE.MathUtils.smoothstep(clock.elapsedTime, 0, FIRST_PLAY_HELP_SECONDS) : 0;
  postMaterial.uniforms.uNoise.value = Math.max(0.01, 0.018 + corruption * 0.12 - introHelp * 0.01);
  postMaterial.uniforms.uBlackout.value = blackout;
  postMaterial.uniforms.uPalette.value = LEVEL_THEMES[levelIndex % LEVEL_THEMES.length].palette;
  postMaterial.uniforms.uOverlayMix.value = Math.max(0.004, 0.01 + corruption * 0.08 - introHelp * 0.006);
  postMaterial.uniforms.uCorruption.value = corruption;
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
  if (event.target instanceof Element && event.target.closest("button, a")) {
    return;
  }

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
  const pixelRatio = Math.min(window.devicePixelRatio, 1.45) * quality;
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

function loadGameTexture(path: string, repeatX: number, repeatY: number): THREE.Texture {
  const loadedTexture = textureLoader.load(path);
  loadedTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTexture.wrapS = THREE.RepeatWrapping;
  loadedTexture.wrapT = THREE.RepeatWrapping;
  loadedTexture.repeat.set(repeatX, repeatY);
  loadedTexture.magFilter = THREE.NearestFilter;
  loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
  loadedTexture.generateMipmaps = true;
  loadedTexture.anisotropy = 2;
  return loadedTexture;
}

function loadDecalTexture(path: string): THREE.Texture {
  const loadedTexture = textureLoader.load(path);
  loadedTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
  loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
  loadedTexture.magFilter = THREE.LinearFilter;
  loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
  loadedTexture.generateMipmaps = true;
  loadedTexture.anisotropy = 2;
  return loadedTexture;
}

function makeGlyphMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.08,
    opacity: 0.94,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function makeChromaKeyMaterial(source: THREE.Texture, glow: number, opacity: number): THREE.ShaderMaterial {
  source.wrapS = THREE.ClampToEdgeWrapping;
  source.wrapT = THREE.ClampToEdgeWrapping;

  return new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: source },
      uGlow: { value: glow },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tMap;
      uniform float uGlow;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec4 texel = texture2D(tMap, vUv);
        float greenKey = distance(texel.rgb, vec3(0.0, 1.0, 0.0));
        float alpha = smoothstep(0.12, 0.34, greenKey) * uOpacity;
        vec3 keyedColor = max(texel.rgb - vec3(0.0, 0.55, 0.0), vec3(0.0));
        keyedColor += keyedColor * uGlow * 0.18;
        if (alpha < 0.04) discard;
        gl_FragColor = vec4(keyedColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function chooseAnomaly(loop: number, failures: number): Anomaly | null {
  const chance = THREE.MathUtils.clamp(0.42 + loop * 0.05 + Math.min(failures, 4) * 0.03, 0.42, 0.78);
  const roll = noise(loop * 17 + failures * 29 + Date.now() * 0.00001, failures * 13 + loop);
  if (loop === 0 && failures === 0 && roll < 0.5) return null;
  if (roll > chance) return null;
  const index = Math.floor(noise(loop * 37 + failures * 11 + performance.now() * 0.001, loop * 5 - failures) * ANOMALIES.length);
  return ANOMALIES[Math.min(ANOMALIES.length - 1, index)];
}

function getRoundPrompt(): string {
  const exit = saveState.loop + 1;
  if (endingShown) return "탈출 기록 저장됨. RESET으로 다시 시작할 수 있습니다";
  if (levelIndex % 2 === 1) return "틀렸습니다. 백룸이 복도를 다시 만들고 있습니다";
  return `${exit}번째 출구. 같은 복도인지 확인하세요`;
}

function syncHud(): void {
  zoneLabel.textContent = endingShown ? "CLEARED" : `EXIT ${saveState.loop}/${TARGET_EXITS}`;
  saveStateLabel.textContent = `BEST ${saveState.best} · FAIL ${saveState.failures}`;
}

function loadSaveState(): SaveState {
  const fallback: SaveState = {
    loop: 0,
    best: 0,
    failures: 0,
    clears: 0,
    seen: [],
    lastPlayedAt: Date.now()
  };

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      loop: clampInteger(parsed.loop, 0, TARGET_EXITS - 1),
      best: clampInteger(parsed.best, 0, TARGET_EXITS),
      failures: clampInteger(parsed.failures, 0, 999),
      clears: clampInteger(parsed.clears, 0, 999),
      seen: Array.isArray(parsed.seen)
        ? parsed.seen.filter((id): id is AnomalyId => ANOMALIES.some((anomaly) => anomaly.id === id))
        : [],
      lastPlayedAt: typeof parsed.lastPlayedAt === "number" ? parsed.lastPlayedAt : Date.now()
    };
  } catch {
    return fallback;
  }
}

function persistSaveState(): void {
  saveState.lastPlayedAt = Date.now();
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
}

function resetRunState(): void {
  startAudio();
  saveState.loop = 0;
  endingShown = false;
  decisionLocked = false;
  transitionMode = null;
  isTransitioning = false;
  transitionTimer = 0;
  blackout = 0.4;
  normalChoice.disabled = false;
  anomalyChoice.disabled = false;
  player.set(0, 1.55, 0);
  yaw = 0;
  pitch = 0;
  levelIndex = 0;
  currentAnomaly = chooseAnomaly(saveState.loop, saveState.failures);
  chunks.clear();
  openCells.clear();
  exitCells.clear();
  exitPositions.length = 0;
  echoPositions.length = 0;
  wallRects.length = 0;
  lastChunkKey = "";
  needsMapRefresh = true;
  persistSaveState();
  syncHud();
  applyTheme(LEVEL_THEMES[0]);
  ensureChunks();
  rebuildInstances();
  statusText.textContent = getRoundPrompt();
}

function clampInteger(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
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
