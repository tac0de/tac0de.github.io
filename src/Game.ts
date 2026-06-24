import * as THREE from "three";
import { AudioSystem } from "./audio/AudioSystem";
import { HorrorDirector } from "./horror/HorrorDirector";
import { InputSystem } from "./input/InputSystem";
import { InteractionSystem } from "./interactions/InteractionSystem";
import { Renderer } from "./rendering/Renderer";
import { SaveSystem } from "./save/SaveSystem";
import { UI } from "./ui/UI";
import { World } from "./world/World";

const PLAYER_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.34;

type GameDeps = {
  renderer: Renderer;
  input: InputSystem;
  ui: UI;
  audio: AudioSystem;
  save: SaveSystem;
};

export class Game {
  private readonly renderer: Renderer;
  private readonly input: InputSystem;
  private readonly ui: UI;
  private readonly audio: AudioSystem;
  private readonly save: SaveSystem;
  private readonly world: World;
  private readonly interactions: InteractionSystem;
  private readonly horror: HorrorDirector;
  private readonly loop: number;
  private readonly velocity = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private lastTime = performance.now();
  private isRunning = false;
  private isCctv = false;
  private ended = false;

  constructor({ renderer, input, ui, audio, save }: GameDeps) {
    this.renderer = renderer;
    this.input = input;
    this.ui = ui;
    this.audio = audio;
    this.save = save;
    this.loop = this.save.getLoop();
    this.world = new World(this.loop);
    this.interactions = new InteractionSystem(this.world, this.ui, this.audio);
    this.horror = new HorrorDirector(this.world, this.ui, this.audio, this.loop);
  }

  start(): void {
    this.renderer.scene.add(this.world.group);
    this.renderer.camera.position.set(0, PLAYER_HEIGHT, 5.2);
    this.renderer.camera.rotation.order = "YXZ";
    this.renderer.setPixelStyle();
    this.input.onInteract = () => this.handleInteract();
    this.input.onFlashlight = () => this.toggleFlashlight();
    this.input.onStart = () => {
      this.audio.resume();
      this.horror.begin();
      this.isRunning = true;
    };
    this.ui.setStartLoop(this.loop);
    this.ui.onReset = () => this.reset();
    this.ui.onContinue = () => window.location.reload();
    this.ui.bindInput(this.input);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.isRunning && !this.ended) {
      this.updateLook(dt);
      this.updateMovement(dt);
      this.horror.update(dt, this.renderer.camera.position);
      this.interactions.update(this.renderer.camera);
      this.updateCctvMode();

      if (this.horror.isChaseActive()) {
        this.updateChase(dt);
      }
    }

    this.world.update(dt, this.renderer.camera.position);
    this.ui.setPrompt(this.interactions.prompt);
    this.renderer.render(this.isCctv ? this.world.cctvCamera : undefined);
  }

  private updateLook(dt: number): void {
    const look = this.input.consumeLookDelta();
    const sensitivity = this.input.isTouch ? 1.35 : 0.0022;
    this.renderer.camera.rotation.y -= look.x * sensitivity;
    this.renderer.camera.rotation.x -= look.y * sensitivity;
    this.renderer.camera.rotation.x = THREE.MathUtils.clamp(
      this.renderer.camera.rotation.x,
      -1.35,
      1.25,
    );
    this.world.flashlight.target.position
      .copy(this.renderer.camera.position)
      .add(this.renderer.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5));
    this.world.flashlight.position.copy(this.renderer.camera.position);
    this.world.flashlight.intensity = THREE.MathUtils.lerp(
      this.world.flashlight.intensity,
      this.world.isFlashlightOn ? 8 : 0,
      8 * dt,
    );
  }

  private updateMovement(dt: number): void {
    const move = this.input.getMovement();
    const forward = new THREE.Vector3();
    this.renderer.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    this.direction.set(0, 0, 0);
    this.direction.addScaledVector(forward, move.y);
    this.direction.addScaledVector(right, move.x);
    if (this.direction.lengthSq() > 1) this.direction.normalize();

    const speed = this.horror.isChaseActive() ? 4.25 : 2.65;
    this.velocity.copy(this.direction).multiplyScalar(speed);
    const next = this.renderer.camera.position.clone().addScaledVector(this.velocity, dt);
    next.y = PLAYER_HEIGHT;

    if (this.world.canStandAt(next, PLAYER_RADIUS)) {
      this.renderer.camera.position.copy(next);
    } else {
      const xOnly = new THREE.Vector3(next.x, PLAYER_HEIGHT, this.renderer.camera.position.z);
      const zOnly = new THREE.Vector3(this.renderer.camera.position.x, PLAYER_HEIGHT, next.z);
      if (this.world.canStandAt(xOnly, PLAYER_RADIUS)) this.renderer.camera.position.copy(xOnly);
      if (this.world.canStandAt(zOnly, PLAYER_RADIUS)) this.renderer.camera.position.copy(zOnly);
    }
  }

  private handleInteract(): void {
    if (!this.isRunning) {
      this.ui.start();
      return;
    }
    if (this.isCctv) {
      this.isCctv = false;
      this.ui.setCctv(false);
      return;
    }
    const action = this.interactions.interact(this.renderer.camera);
    if (action?.type === "cctv") {
      this.isCctv = true;
      this.ui.setCctv(true);
      this.horror.mark("cctv");
    }
    if (action?.type === "read-book") this.horror.mark("book");
    if (action?.type === "answer-phone") this.horror.mark("phone");
    if (action?.type === "inspect-203") this.horror.mark("room203");
    if (action?.type === "take-key") this.horror.mark("key");
    if (action?.type === "reset-breaker") this.horror.mark("breaker");
    if (action?.type === "exit") this.finish();
  }

  private toggleFlashlight(): void {
    this.world.isFlashlightOn = !this.world.isFlashlightOn;
    this.audio.click();
  }

  private updateCctvMode(): void {
    if (this.isCctv && this.input.consumeCancel()) {
      this.isCctv = false;
      this.ui.setCctv(false);
    }
  }

  private updateChase(dt: number): void {
    const threat = this.world.threat;
    threat.visible = true;
    const player = this.renderer.camera.position;
    const toPlayer = player.clone().sub(threat.position);
    toPlayer.y = 0;
    if (toPlayer.length() > 0.1) {
      threat.position.addScaledVector(toPlayer.normalize(), 1.85 * dt);
      threat.lookAt(player.x, threat.position.y, player.z);
    }
    if (threat.position.distanceTo(player) < 1.15) {
      this.ended = true;
      this.ui.showEnding("The lobby bell rings once. Nobody is at the desk.");
      this.audio.stinger();
    }
    if (player.z > 11.5 && player.x > -2.5 && player.x < 2.5) {
      this.finish();
    }
  }

  private finish(): void {
    this.ended = true;
    const nextLoop = this.save.completeLoop();
    const text =
      nextLoop === 1
        ? "No incidents reported. The guest book disagrees."
        : nextLoop === 2
          ? "One guest unaccounted for. The desk key is missing."
          : "Room 203 occupied. Staff reassigned for the next audit.";
    this.ui.showEnding(text);
    this.audio.endTone();
  }

  private reset(): void {
    this.save.reset();
    window.location.reload();
  }
}
